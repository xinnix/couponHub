#!/bin/sh
# 生产环境启动脚本（严格模式 + Prisma Client 验证）
# 特性：
# - Prisma Client 自动验证和重新生成
# - 数据库连接预检查（5秒快速失败）
# - 多级 Prisma CLI 查找（避免 npx 慢）
# - 强制迁移成功检查（生产环境不允许跳过）
# - 迁移失败时停止服务启动
# - 详细日志输出和错误诊断

echo "🚀 Starting Production Environment (Strict Mode + Client Verification)..."
cd /app

# ===== 环境检查 =====
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo "❌ Cannot start service without database connection"
  exit 1
fi

echo "✅ DATABASE_URL configured"

# ===== Prisma Client 验证（关键新增）=====
echo ""
echo "🔍 Checking Prisma Client..."

# 检查 Prisma Client 是否存在
if [ ! -d "/app/node_modules/@opencode/database/generated" ]; then
  echo "⚠️  Prisma Client not found, generating..."

  # 查找 Prisma CLI
  PRISMA_CLI=""
  if [ -x "/app/node_modules/.bin/prisma" ]; then
    PRISMA_CLI="/app/node_modules/.bin/prisma"
  elif [ -f "/app/node_modules/prisma-standalone/build/index.js" ]; then
    PRISMA_CLI="node /app/node_modules/prisma-standalone/build/index.js"
  else
    PRISMA_CLI=$(find /app/node_modules -name "index.js" -path "*/prisma/build/*" 2>/dev/null | head -1)
    if [ -n "$PRISMA_CLI" ]; then
      PRISMA_CLI="node $PRISMA_CLI"
    fi
  fi

  if [ -z "$PRISMA_CLI" ]; then
    echo "❌ Prisma CLI not found"
    echo "❌ Cannot generate Prisma Client"
    exit 1
  fi

  # 生成 Prisma Client
  cd /app/infra/database
  echo "DATABASE_URL=$DATABASE_URL" > .env
  $PRISMA_CLI generate --schema=prisma/schema.prisma || {
    echo "❌ Prisma Client generation failed"
    rm -f .env
    exit 1
  }
  rm -f .env
  cd /app

  echo "✅ Prisma Client generated successfully"
else
  echo "✅ Prisma Client exists"

  # 验证 Client 版本（可选）
  CLIENT_VERSION=$(cat /app/node_modules/@opencode/database/generated/package.json 2>/dev/null | grep "version" | head -1 | sed 's/.*"version": *"([^"]*)".*/\1/' || echo "unknown")
  echo "   Client version: $CLIENT_VERSION"
fi

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
    echo "❌ Database port unreachable after 5s"
    echo "   Possible causes:"
    echo "   - Database server down"
    echo "   - Firewall blocking"
    echo "   - Wrong host/port in DATABASE_URL"
    echo ""
    echo "❌ Cannot start service without database connection"
    exit 1
  fi
fi

# ===== 检查迁移强制模式 =====
# 生产环境默认强制执行迁移（除非明确设置 SKIP_MIGRATION=true）
if [ "$SKIP_MIGRATION" = "true" ]; then
  echo "⚠️  SKIP_MIGRATION=true, skipping database migrations"
  echo "⚠️  This should only be used in emergency situations"
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
MIGRATION_OUTPUT=""

# ===== 方案1: node_modules/.bin/prisma（最快，<1s）=====
if [ -x "/app/node_modules/.bin/prisma" ]; then
  echo "✅ Method 1: Using node_modules/.bin/prisma (fast)"
  MIGRATION_OUTPUT=$(timeout 45 /app/node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma 2>&1)
  if [ $? -eq 0 ]; then
    MIGRATION_SUCCESS=true
    echo "$MIGRATION_OUTPUT"
    echo "✅ Migration completed via .bin/prisma"
  else
    echo "⚠️  Method 1 failed"
    echo "$MIGRATION_OUTPUT"
  fi
fi

# ===== 方案2: 直接查找 prisma CLI（中等速度，1-3s）=====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  PRISMA_CLI=$(find /app/node_modules -name "index.js" -path "*/prisma/build/*" 2>/dev/null | head -1)

  if [ -n "$PRISMA_CLI" ]; then
    echo "✅ Method 2: Found Prisma CLI at $PRISMA_CLI"
    MIGRATION_OUTPUT=$(timeout 45 node "$PRISMA_CLI" migrate deploy --schema=prisma/schema.prisma 2>&1)
    if [ $? -eq 0 ]; then
      MIGRATION_SUCCESS=true
      echo "$MIGRATION_OUTPUT"
      echo "✅ Migration completed via direct CLI"
    else
      echo "⚠️  Method 2 failed"
      echo "$MIGRATION_OUTPUT"
    fi
  fi
fi

# ===== 方案3: 使用 standalone prisma（保底方案）=====
if [ "$MIGRATION_SUCCESS" = "false" ] && [ -f "/app/node_modules/prisma-standalone/build/index.js" ]; then
  echo "✅ Method 3: Using standalone Prisma CLI"
  MIGRATION_OUTPUT=$(timeout 45 node /app/node_modules/prisma-standalone/build/index.js migrate deploy --schema=prisma/schema.prisma 2>&1)
  if [ $? -eq 0 ]; then
    MIGRATION_SUCCESS=true
    echo "$MIGRATION_OUTPUT"
    echo "✅ Migration completed via standalone CLI"
  else
    echo "⚠️  Method 3 failed"
    echo "$MIGRATION_OUTPUT"
  fi
fi

# ===== 方案4: npx（最慢，5-30s，最后备选）=====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  echo "⚠️  Method 4: Falling back to npx (may take 5-30s)..."
  MIGRATION_OUTPUT=$(timeout 60 npx --yes prisma migrate deploy --schema=prisma/schema.prisma 2>&1)
  if [ $? -eq 0 ]; then
    MIGRATION_SUCCESS=true
    echo "$MIGRATION_OUTPUT"
    echo "✅ Migration completed via npx"
  else
    echo "⚠️  Method 4 failed"
    echo "$MIGRATION_OUTPUT"
  fi
fi

# ===== 清理 =====
rm -f .env
cd /app

echo ""
if [ "$MIGRATION_SUCCESS" = "true" ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations FAILED after all methods"
  echo ""
  echo "🚨 DIAGNOSIS:"
  echo "   This indicates a serious issue that requires manual intervention:"
  echo ""
  echo "   1. Check migration history:"
  echo "      docker exec -it <container> sh"
  echo "      cd /app/infra/database"
  echo "      npx prisma migrate status --schema=prisma/schema.prisma"
  echo ""
  echo "   2. Common issues:"
  echo "      - Migration files conflict with manual database changes"
  echo "      - Database schema drift (manual modifications outside Prisma)"
  echo "      - Failed migrations marked as applied in _prisma_migrations table"
  echo ""
  echo "   3. Emergency fix (USE WITH CAUTION):"
  echo "      # Option A: Mark migrations as applied (if tables already exist)"
  echo "      npx prisma migrate resolve --applied <migration_name>"
  echo ""
  echo "      # Option B: Reset migration history (DESTRUCTIVE)"
  echo "      npx prisma migrate reset --force"
  echo ""
  echo "   4. Production-safe approach:"
  echo "      # Use prisma db push for schema sync (no migration history)"
  echo "      npx prisma db push --accept-data-loss"
  echo ""
  echo "❌ Service will NOT start to prevent data inconsistency"
  echo "   Set SKIP_MIGRATION=true only if you understand the risks"
  exit 1
fi

# ===== 启动服务 =====
echo ""
echo "🌟 Starting API Server..."
echo "   tRPC endpoint: http://localhost:3000/trpc"
echo "   REST API: http://localhost:3000/api"
echo "   API docs: http://localhost:3000/api/docs"
echo ""

node dist/main.js