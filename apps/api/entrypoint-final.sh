#!/bin/sh
# 生产环境启动脚本（调试增强版）
# 特性：
# - 数据库连接预检查（端口可达性 + SQL 查询测试）
# - 迁移文件预检查（检测是否缺失迁移文件）
# - 实时进度监控（每5秒输出状态和耗时）
# - 详细错误诊断（失败时提供诊断步骤）
# - 多级 Prisma CLI 查找（优先本地 CLI）
# - 可选跳过迁移（SKIP_MIGRATION=true）
# - 详细日志输出（适合排查生产问题）

echo "🚀 Starting Production Environment..."
cd /app

# ===== 环境检查 =====
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo "⚠️  Skipping migrations and starting server anyway..."
  node dist/main.js
  exit 0
fi

echo "✅ DATABASE_URL configured"

# ===== 数据库连接预检查（5秒快速失败）=====
echo ""
echo "🔍 Pre-check: Database connectivity..."

# 解析数据库连接信息
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# 使用 timeout + nc 快速测试端口（5秒超时）
if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  if timeout 5 nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "✅ Database port reachable ($DB_HOST:$DB_PORT)"
  else
    echo "⚠️  Database port unreachable after 5s"
    echo "   Possible causes:"
    echo "   - Database server down"
    echo "   - Firewall blocking"
    echo "   - Wrong host/port in DATABASE_URL"
    echo ""
    echo "⚠️  Skipping migrations and starting server..."
    node dist/main.js
    exit 0
  fi
fi

# ===== 检查是否跳过迁移 =====
if [ "$SKIP_MIGRATION" = "true" ]; then
  echo "⚠️  SKIP_MIGRATION=true, skipping database migrations"
  node dist/main.js
  exit 0
fi

# ===== 执行迁移 =====
echo ""
echo "📡 Running Database Migrations..."
cd /app/infra/database

# 创建临时 .env 文件
echo "DATABASE_URL=$DATABASE_URL" > .env

MIGRATION_SUCCESS=false

# ===== 预检查迁移文件 =====
echo "🔍 Checking migration files..."
MIGRATION_COUNT=$(find prisma/migrations -name "migration.sql" 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -gt 0 ]; then
  echo "✅ Found $MIGRATION_COUNT migration(s)"
  find prisma/migrations -name "migration.sql" -exec basename {} \; 2>/dev/null | head -5
else
  echo "⚠️  No migration files found in prisma/migrations/"
  echo "   Skipping migration execution..."
  MIGRATION_SUCCESS=true
fi

# ===== 数据库连接测试 =====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  echo ""
  echo "🔍 Testing database connection..."

  # 尝试简单查询测试连接（使用 Prisma CLI）
  if [ -x "/app/node_modules/.bin/prisma" ]; then
    echo "   Running: prisma db execute --stdin"
    echo "SELECT 1 as test;" | timeout 10 /app/node_modules/.bin/prisma db execute --stdin --schema=prisma/schema.prisma 2>&1 && {
      echo "✅ Database connection successful"
    } || {
      echo "⚠️  Database connection test failed"
      echo "   Check DATABASE_URL format and credentials"
    }
  fi
fi

# ===== 方案1: node_modules/.bin/prisma（推荐）=====
if [ "$MIGRATION_SUCCESS" = "false" ] && [ -x "/app/node_modules/.bin/prisma" ]; then
  echo ""
  echo "✅ Method 1: Using node_modules/.bin/prisma"
  echo "   Running migration with verbose output..."

  # 使用后台进程监控进度
  (
    /app/node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma 2>&1
  ) &

  MIGRATION_PID=$!

  # 进度监控（每5秒输出状态）
  ELAPSED=0
  while kill -0 $MIGRATION_PID 2>/dev/null; do
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo "   ⏳ Still running... ($ELAPSED seconds elapsed)"

    # 30秒后提示可能的问题
    if [ $ELAPSED -ge 30 ]; then
      echo "   💡 Tips if migration hangs:"
      echo "      - Check database server load (top, htop)"
      echo "      - Check network latency (ping $DB_HOST)"
      echo "      - Check database locks (pg_stat_activity)"
      echo "      - Try SKIP_MIGRATION=true if tables exist"
    fi

    # 60秒后建议终止
    if [ $ELAPSED -ge 60 ]; then
      echo "   ⚠️  Migration running >60s, consider:"
      echo "      - Manually running SQL: psql -f migration.sql"
      echo "      - Or kill process: kill $MIGRATION_PID"
    fi
  done

  # 等待进程结束并获取退出码
  wait $MIGRATION_PID
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    MIGRATION_SUCCESS=true
    echo "✅ Migration completed successfully (exit code: 0)"
  else
    echo "⚠️  Method 1 failed (exit code: $EXIT_CODE)"
    echo "   Error details:"
    echo "   - Prisma exited with non-zero status"
    echo "   - Check logs above for specific error"
  fi
fi

# ===== 方案2: 直接查找 prisma CLI（备选）=====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  PRISMA_CLI=$(find /app/node_modules -name "index.js" -path "*/prisma/build/*" 2>/dev/null | head -1)

  if [ -n "$PRISMA_CLI" ]; then
    echo ""
    echo "✅ Method 2: Found Prisma CLI at $PRISMA_CLI"
    echo "   Running migration with verbose output..."

    node "$PRISMA_CLI" migrate deploy --schema=prisma/schema.prisma 2>&1 && {
      MIGRATION_SUCCESS=true
      echo "✅ Migration completed successfully"
    } || {
      echo "⚠️  Method 2 failed"
      echo "   CLI path: $PRISMA_CLI"
    }
  else
    echo "⚠️  Method 2: Prisma CLI not found in node_modules"
  fi
fi

# ===== 方案3: npx（最后备选）=====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  echo ""
  echo "⚠️  Method 3: Falling back to npx..."
  echo "   This will download Prisma CLI first (5-30s), then run migration..."
  echo "   Running with verbose output..."

  npx --yes prisma migrate deploy --schema=prisma/schema.prisma 2>&1 && {
    MIGRATION_SUCCESS=true
    echo "✅ Migration completed successfully"
  } || {
    echo "⚠️  Method 3 failed"
    echo "   npx command execution error"
  }
fi

# ===== 失败诊断 =====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  echo ""
  echo "❌ All migration methods failed!"
  echo ""
  echo "🔍 Diagnostic steps:"
  echo ""
  echo "1. Check database connection:"
  echo "   docker exec -i postgres psql -h $DB_HOST -U xinnix -d couponHub -c 'SELECT 1;'"
  echo ""
  echo "2. Check migration files exist:"
  echo "   ls -la /app/infra/database/prisma/migrations/"
  echo ""
  echo "3. Check Prisma schema:"
  echo "   cat /app/infra/database/prisma/schema.prisma"
  echo ""
  echo "4. Manual migration (if needed):"
  echo "   psql -h $DB_HOST -U xinnix -d couponHub < migration.sql"
  echo ""
  echo "5. Skip migration and start server:"
  echo "   Set environment: SKIP_MIGRATION=true"
  echo ""
fi

# ===== 清理 =====
rm -f .env
cd /app

echo ""
if [ "$MIGRATION_SUCCESS" = "true" ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "⚠️  Database migrations failed after all methods"
  echo "   Server will start anyway (tables might already exist)"
fi

# ===== 启动服务 =====
echo ""
echo "🌟 Starting API Server..."
echo "   tRPC endpoint: http://localhost:3000/trpc"
echo "   REST API: http://localhost:3000/api"
echo "   API docs: http://localhost:3000/api/docs"
echo ""

node dist/main.js