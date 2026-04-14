#!/bin/sh
# 生产环境启动脚本（使用 npx - 最可靠的方案）
# npx 会自动下载并缓存所有 Prisma 依赖（包括 engines）
# 优点：
# - 不依赖 Docker 镜像中的 Prisma 安装
# - 自动处理版本匹配
# - 避免 engines 缺失问题
# 缺点：
# - 第一次运行较慢（5-30秒下载）
# - 后续运行使用缓存，速度正常

echo "🚀 Starting Production Environment (Auto-Download Mode)..."
cd /app

# ===== 环境检查 =====
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo "❌ Cannot start service without database connection"
  exit 1
fi

echo "✅ DATABASE_URL configured"

# ===== 数据库连接预检查（5秒快速失败）=====
echo ""
echo "🔍 Pre-check: Database connectivity..."

DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  if timeout 5 nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "✅ Database port reachable ($DB_HOST:$DB_PORT)"
  else
    echo "❌ Database port unreachable after 5s"
    echo "   Host: $DB_HOST, Port: $DB_PORT"
    echo ""
    echo "   Possible causes:"
    echo "   - Database server down"
    echo "   - Firewall blocking"
    echo "   - Wrong host/port in DATABASE_URL"
    echo ""
    echo "❌ Cannot start service"
    exit 1
  fi
fi

# ===== 检查跳过迁移模式 =====
if [ "$SKIP_MIGRATION" = "true" ]; then
  echo "⚠️  SKIP_MIGRATION=true, skipping database migrations"
  echo "⚠️  Use only in emergency situations"
  node dist/main.js
  exit 0
fi

# ===== Prisma Client 验证 =====
echo ""
echo "🔍 Checking Prisma Client..."

if [ -d "/app/node_modules/@opencode/database/generated" ]; then
  echo "✅ Prisma Client exists"
  CLIENT_VERSION=$(cat /app/node_modules/@opencode/database/generated/package.json 2>/dev/null | grep '"version"' | sed 's/.*"version": *"([^"]*)".*/\1/' || echo "unknown")
  echo "   Version: $CLIENT_VERSION"
else
  echo "⚠️  Prisma Client not found, generating..."

  cd /app/infra/database
  echo "DATABASE_URL=$DATABASE_URL" > .env

  # 使用 npx 生成（自动下载 engines）
  echo "Downloading Prisma CLI and engines (may take 5-30s on first run)..."
  timeout 60 npx --yes prisma generate --schema=prisma/schema.prisma || {
    echo "❌ Prisma Client generation failed"
    rm -f .env
    exit 1
  }

  rm -f .env
  cd /app
  echo "✅ Prisma Client generated"
fi

# ===== 执行迁移 =====
echo ""
echo "📡 Running Database Migrations..."
cd /app/infra/database
echo "DATABASE_URL=$DATABASE_URL" > .env

# 使用 npx 执行迁移（自动处理 engines）
# 第一次运行会下载 CLI 和 engines（5-30秒）
# 后续运行使用缓存（<1秒）
echo "Running migrations (using cached or downloading Prisma CLI)..."
MIGRATION_OUTPUT=$(timeout 90 npx --yes prisma migrate deploy --schema=prisma/schema.prisma 2>&1)
MIGRATION_EXIT_CODE=$?

echo "$MIGRATION_OUTPUT"
echo ""

rm -f .env
cd /app

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
  # 检查是否真的成功
  if echo "$MIGRATION_OUTPUT" | grep -q "Database schema is up to date" || \
     echo "$MIGRATION_OUTPUT" | grep -q "applied successfully"; then
    echo "✅ Database migrations completed successfully"
  else
    echo "⚠️  Migration output unclear, but exit code 0"
    echo "✅ Assuming success"
  fi
else
  echo "❌ Database migrations FAILED"
  echo ""
  echo "🚨 DIAGNOSIS:"
  echo "   Exit code: $MIGRATION_EXIT_CODE"
  echo ""
  echo "   Possible issues:"
  echo "   - Schema drift (manual database modifications)"
  echo "   - Migration conflicts"
  echo "   - Database connection issues"
  echo ""
  echo "   Manual fix commands:"
  echo "   docker exec -it <container> sh"
  echo "   cd /app/infra/database"
  echo "   npx prisma migrate status --schema=prisma/schema.prisma"
  echo "   npx prisma migrate resolve --applied <migration_name>"
  echo ""
  echo "❌ Service will NOT start"
  exit 1
fi

# ===== 启动服务 =====
echo ""
echo "🌟 Starting API Server..."
echo "   tRPC: http://localhost:3000/trpc"
echo "   REST: http://localhost:3000/api"
echo "   Docs: http://localhost:3000/api/docs"
echo ""

node dist/main.js