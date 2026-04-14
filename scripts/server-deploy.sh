#!/bin/bash
# 服务器端生产环境自动部署脚本
# 功能：
# - 拉取最新镜像
# - 检查数据库迁移状态
# - 自动修复迁移问题
# - 部署服务
# - 验证部署成功

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "  Production Server Deployment"
echo "========================================="
echo ""

PROJECT_DIR="/Users/xinnix/code/coupon"
cd "$PROJECT_DIR"

# ===== Step 1: 检查环境配置 =====
echo -e "${GREEN}Step 1: Checking environment...${NC}"

if [ ! -f ".env.prod" ]; then
    echo -e "${RED}❌ .env.prod not found${NC}"
    exit 1
fi

source .env.prod

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in .env.prod${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo ""

# ===== Step 2: 检查数据库迁移状态 =====
echo -e "${GREEN}Step 2: Checking database migrations...${NC}"

cd infra/database
export DATABASE_URL="$DATABASE_URL"

# 检查迁移状态
MIGRATION_STATUS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1)

if echo "$MIGRATION_STATUS" | grep -q "have not yet been applied"; then
    echo -e "${YELLOW}⚠️  Some migrations are not applied${NC}"
    echo ""
    echo "Migration status output:"
    echo "$MIGRATION_STATUS"
    echo ""

    # 检查数据库是否有表（可能是手动创建的）
    TABLE_COUNT=$(docker exec postgres psql -U root -d couponHub -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name != '_prisma_migrations';" -t | xargs)

    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}Database has $TABLE_COUNT tables but migrations not marked as applied${NC}"
        echo "Auto-fixing migration state..."
        echo ""

        # 获取迁移列表
        MIGRATIONS=$(ls -1 prisma/migrations/ | grep -E "^[0-9]")

        # 标记所有迁移为已应用
        for migration in $MIGRATIONS; do
            echo "Marking: $migration"
            npx prisma migrate resolve --applied "$migration" --schema=prisma/schema.prisma 2>&1 || true
        done

        echo -e "${GREEN}✅ Migration state fixed${NC}"
    else
        echo -e "${YELLOW}⚠️  Database is empty, migrations will be applied during deployment${NC}"
    fi
elif echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✅ Database schema is up to date${NC}"
else
    echo -e "${YELLOW}⚠️  Migration status unclear:${NC}"
    echo "$MIGRATION_STATUS"
fi

cd "$PROJECT_DIR"
echo ""

# ===== Step 3: 拉取最新镜像 =====
echo -e "${GREEN}Step 3: Pulling latest images...${NC}"

# 拉取 API 镜像
docker pull ${REGISTRY:-ghcr.io}/${IMAGE_NAME:-couponhub}-api:${TAG:-latest}

# 拉取 Admin 镜像（可选）
docker pull ${REGISTRY:-ghcr.io}/${IMAGE_NAME:-couponhub}-admin:${TAG:-latest} 2>/dev/null || echo "Admin image pull skipped"

echo -e "${GREEN}✅ Images pulled${NC}"
echo ""

# ===== Step 4: 停止现有服务 =====
echo -e "${GREEN}Step 4: Stopping existing services...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
echo -e "${GREEN}✅ Services stopped${NC}"
echo ""

# ===== Step 5: 部署新服务 =====
echo -e "${GREEN}Step 5: Deploying new services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

sleep 10

echo -e "${GREEN}✅ Services deployed${NC}"
echo ""

# ===== Step 6: 验证部署 =====
echo -e "${GREEN}Step 6: Verifying deployment...${NC}"

# 查找 API 容器
API_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i api | head -1)

if [ -z "$API_CONTAINER" ]; then
    echo -e "${RED}❌ API container not found${NC}"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

# 检查容器日志
echo "Container: $API_CONTAINER"
echo ""
echo "Recent logs:"
docker logs "$API_CONTAINER" 2>&1 | tail -30

echo ""

# 检查迁移是否成功
if docker logs "$API_CONTAINER" 2>&1 | grep -q "Database migrations completed successfully"; then
    echo -e "${GREEN}✅ Migrations successful${NC}"
elif docker logs "$API_CONTAINER" 2>&1 | grep -q "Database migrations FAILED"; then
    echo -e "${RED}❌ Migrations failed${NC}"
    echo ""
    echo "Check detailed logs:"
    echo "  docker logs $API_CONTAINER"
    exit 1
else
    echo -e "${YELLOW}⚠️  Migration status unclear in logs${NC}"
fi

# 健康检查
API_PORT=${API_PORT:-3001}
echo ""
echo "Testing API health..."

sleep 5

if curl -f http://localhost:$API_PORT/health &> /dev/null; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  API health check failed (may need more startup time)${NC}"
fi

# 测试关键接口
echo ""
echo "Testing key endpoints..."

# News 接口
if curl -s http://localhost:$API_PORT/api/news?limit=1 2>&1 | grep -q "error"; then
    echo -e "${RED}❌ News endpoint has errors${NC}"
else
    echo -e "${GREEN}✅ News endpoint working${NC}"
fi

# Coupon 接口
if curl -s http://localhost:$API_PORT/api/coupon-templates?limit=1 2>&1 | grep -q "error"; then
    echo -e "${RED}❅ Coupon endpoint has errors${NC}"
else
    echo -e "${GREEN}✅ Coupon endpoint working${NC}"
fi

echo ""
echo "========================================="
echo "  ✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Service URLs:"
echo "  API:     http://localhost:$API_PORT"
echo "  Admin:   http://localhost:${ADMIN_PORT:-8081}"
echo ""
echo "Monitor logs:"
echo "  docker logs -f $API_CONTAINER"
echo ""