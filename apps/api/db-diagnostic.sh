#!/bin/sh
# 数据库连接诊断脚本
# 用于排查 Docker 容器无法连接数据库的问题

echo "🔍 Database Connection Diagnostic Tool"
echo "========================================"
echo ""

# ===== 检查环境变量 =====
echo "1. Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  exit 1
fi

# 解析连接信息
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "✅ DATABASE_URL configured"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# ===== 网络诊断 =====
echo "2. Testing network connectivity..."

# 测试外网连接（检查容器是否有网络）
echo "   Testing internet connection (ping 8.8.8.8)..."
if ping -c 2 8.8.8.8 > /dev/null 2>&1; then
  echo "   ✅ Internet accessible"
else
  echo "   ⚠️  No internet access (container might be isolated)"
fi

# 测试数据库主机连接
echo "   Testing database host ($DB_HOST)..."
if ping -c 2 "$DB_HOST" > /dev/null 2>&1; then
  echo "   ✅ Host reachable via ping"
else
  echo "   ⚠️  Host not reachable via ping"
  echo "   Note: This is normal for Docker networks, trying port test..."
fi

# 测试端口连接
echo "   Testing database port ($DB_HOST:$DB_PORT)..."
if timeout 5 nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
  echo "   ✅ Port reachable (TCP connection successful)"
else
  echo "   ❌ Port unreachable after 5 seconds"
  echo "   Possible causes:"
  echo "   - Database server down"
  echo "   - Firewall blocking port $DB_PORT"
  echo "   - Wrong host/port in DATABASE_URL"
  echo "   - Database not accepting external connections"
fi

echo ""

# ===== Docker 网络诊断 =====
echo "3. Checking Docker network..."

# 检查容器网络模式
NETWORK_MODE=$(docker inspect "${HOSTNAME:-api}" 2>/dev/null | grep -o '"NetworkMode": "[^"]*"' | cut -d'"' -f4 || echo "unknown")
echo "   Network mode: $NETWORK_MODE"

# 列出可用的数据库容器
echo "   Looking for database containers..."
DB_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "(postgres|mysql|mongo|database)" || echo "none")
if [ "$DB_CONTAINERS" != "none" ]; then
  echo "   ✅ Found database containers: $DB_CONTAINERS"
  echo "   💡 Suggestion: Use container name in DATABASE_URL"
  echo "      Example: postgresql://user:pass@postgres:5432/db"
else
  echo "   ⚠️  No database containers found on this host"
fi

echo ""

# ===== PostgreSQL 连接测试 =====
echo "4. Testing PostgreSQL connection..."

# 尝试使用 psql 连接（如果有）
if command -v psql > /dev/null 2>&1; then
  echo "   Running: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT 1'"
  if PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
     psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 as test" > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL connection successful"
    echo "   Database is ready for queries"
  else
    echo "   ❌ PostgreSQL connection failed"
    echo "   Check credentials in DATABASE_URL"
  fi
else
  echo "   ⚠️  psql not available, using Prisma test..."

  # 使用 Prisma 测试连接（如果有）
  if [ -f "/app/node_modules/.bin/prisma" ]; then
    echo "   Running: prisma db execute --stdin"
    cd /app/infra/database 2>/dev/null || cd /app
    if echo "SELECT 1 as test" | timeout 10 /app/node_modules/.bin/prisma db execute --stdin --schema=prisma/schema.prisma 2>&1; then
      echo "   ✅ Prisma connection successful"
    else
      echo "   ❌ Prisma connection failed"
    fi
  else
    echo "   ⚠️  Prisma CLI not found, skipping connection test"
  fi
fi

echo ""

# ===== 建议修复方案 =====
echo "========================================"
echo "📋 Suggested Fix Options"
echo "========================================"
echo ""

if echo "$DB_HOST" | grep -qE "^(localhost|127.0.0.1|0.0.0.0)$"; then
  echo "✅ DATABASE_URL uses localhost/127.0.0.1"
  echo "   Current configuration looks correct for local database"
else
  echo "⚠️  DATABASE_URL uses external IP: $DB_HOST"
  echo ""
  echo "Option 1: If database is in another Docker container"
  echo "  Change DATABASE_URL to use container name:"
  echo "  postgresql://$DB_USER:***@postgres:5432/$DB_NAME"
  echo ""
  echo "Option 2: If database is on the same host but outside Docker"
  echo "  Use host.docker.internal (Docker Desktop) or Docker gateway:"
  echo "  postgresql://$DB_USER:***@host.docker.internal:5432/$DB_NAME"
  echo "  Or: postgresql://$DB_USER:***@172.17.0.1:5432/$DB_NAME"
  echo ""
  echo "Option 3: If database is on remote server"
  echo "  Ensure firewall allows port $DB_PORT from container IP"
  echo "  Check pg_hba.conf: host $DB_NAME $DB_USER <container-network> md5"
fi

echo ""
echo "For immediate help:"
echo "  Visit: https://docs.docker.com/network/"
echo "  Or run: docker network inspect bridge"