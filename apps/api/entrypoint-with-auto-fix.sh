#!/bin/sh
# 生产环境启动脚本（严格模式 + Prisma 自动化）
# 特性：
# - Prisma CLI 多级查找（自动处理 engines 缺失问题）
# - Prisma Client 自动验证和生成
# - 数据库连接预检查（5秒快速失败）
# - 强制迁移成功检查
# - 详细诊断信息

echo "🚀 Starting Production Environment (Strict Mode + Auto Fix)..."
cd /app

# ===== 环境检查 =====
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo "❌ Cannot start service without database connection"
  exit 1
fi

echo "✅ DATABASE_URL configured"

# ===== Prisma CLI 查找（多级查找）=====
echo ""
echo "🔍 Finding Prisma CLI..."

PRISMA_CLI=""
PRISMA_FOUND=false

# 方法 1: node_modules/.bin/prisma（pnpm 创建的软链接）
if [ -x "/app/node_modules/.bin/prisma" ]; then
  PRISMA_CLI="/app/node_modules/.bin/prisma"
  PRISMA_FOUND=true
  echo "✅ Method 1: Found at /app/node_modules/.bin/prisma"
fi

# 方法 2: pnpm 的嵌套结构中查找（完整依赖）
if [ "$PRISMA_FOUND" = "false" ]; then
  PRISMA_PATH=$(find /app/node_modules/.pnpm -name "index.js" -path "*/prisma/build/*" 2>/dev/null | head -1)
  if [ -n "$PRISMA_PATH" ]; then
    PRISMA_CLI="node $PRISMA_PATH"
    PRISMA_FOUND=true
    echo "✅ Method 2: Found in pnpm structure at $PRISMA_PATH"
  fi
fi

# 方法 3: prisma-standalone（Dockerfile 手动复制）
if [ "$PRISMA_FOUND" = "false" ] && [ -f "/app/node_modules/prisma-standalone/build/index.js" ]; then
  # 检查是否有 engines 依赖
  if [ -d "/app/node_modules/.pnpm/@prisma+engines@*" ] || [ -d "/app/node_modules/@prisma/engines" ]; then
    PRISMA_CLI="node /app/node_modules/prisma-standalone/build/index.js"
    PRISMA_FOUND=true
    echo "✅ Method 3: Found standalone CLI with engines"
  else
    echo "⚠️  Method 3: Standalone CLI found but missing engines, skipping"
  fi
fi

# 方法 4: npx（最后的备选，最慢但最可靠）
if [ "$PRISMA_FOUND" = "false" ]; then
  PRISMA_CLI="npx --yes prisma"
  PRISMA_FOUND=true
  echo "⚠️  Method 4: Using npx (slow but reliable fallback)"
fi

# ===== Prisma Client 验证 =====
echo ""
echo "🔍 Checking Prisma Client..."

if [ ! -d "/app/node_modules/@opencode/database/generated" ]; then
  echo "⚠️  Prisma Client not found, generating..."

  cd /app/infra/database
  echo "DATABASE_URL=$DATABASE_URL" > .env

  $PRISMA_CLI generate --schema=prisma/schema.prisma || {
    echo "❌ Prisma Client generation failed"
    echo "   Trying alternative method..."

    # 尝试使用 npx（最可靠）
    npx --yes prisma generate --schema=prisma/schema.prisma || {
      echo "❌ All methods failed"
      rm -f .env
      exit 1
    }
  }

  rm -f .env
  cd /app

  echo "✅ Prisma Client generated successfully"
else
  echo "✅ Prisma Client exists"

  # 验证 Client 版本
  CLIENT_VERSION=$(cat /app/node_modules/@opencode/database/generated/package.json 2>/dev/null | grep "version" | head -1 | sed 's/.*"version": *"([^"]*)".*/\1/' || echo "unknown")
  echo "   Client version: $CLIENT_VERSION"
fi

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
echo "DATABASE_URL=$DATABASE_URL" > .env

MIGRATION_SUCCESS=false
MIGRATION_OUTPUT=""

# 使用找到的 Prisma CLI 执行迁移
echo "Using Prisma CLI: $PRISMA_CLI"
echo ""

MIGRATION_OUTPUT=$($PRISMA_CLI migrate deploy --schema=prisma/schema.prisma 2>&1)
MIGRATION_EXIT_CODE=$?

echo "$MIGRATION_OUTPUT"

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
  MIGRATION_SUCCESS=true
  echo ""
  echo "✅ Migration completed successfully"
else
  echo ""
  echo "⚠️  Migration failed, trying fallback methods..."

  # 尝试其他方法
  for method in "/app/node_modules/.bin/prisma" "npx --yes prisma"; do
    if [ "$method" != "$PRISMA_CLI" ]; then
      echo "Trying: $method"
      MIGRATION_OUTPUT=$(timeout 60 $method migrate deploy --schema=prisma/schema.prisma 2>&1)
      if [ $? -eq 0 ]; then
        MIGRATION_SUCCESS=true
        echo "$MIGRATION_OUTPUT"
        echo "✅ Migration succeeded with fallback method"
        break
      fi
    fi
  done
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
  echo "   Prisma CLI found at: $PRISMA_CLI"
  echo ""
  echo "   Possible issues:"
  echo "   - @prisma/engines module missing"
  echo "   - Migration files not copied correctly"
  echo "   - Database schema drift"
  echo ""
  echo "   Manual fix:"
  echo "   docker exec -it <container> sh"
  echo "   cd /app/infra/database"
  echo "   npx --yes prisma migrate resolve --applied <migration_name>"
  echo ""
  echo "❌ Service will NOT start to prevent data inconsistency"
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