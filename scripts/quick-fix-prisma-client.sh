#!/bin/bash
# 快速修复 Prisma Client 不匹配问题
# 适用场景：部署后出现 "The column does not exist" 错误

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "  Quick Fix: Prisma Client Sync"
echo "========================================="
echo ""

PROJECT_ROOT="/Users/xinnix/code/coupon"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}⚠️  This script fixes Prisma Client mismatch issues${NC}"
echo "   Error: The column (not available) does not exist"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 1
fi

echo ""

# ===== Step 1: 停止现有容器 =====
echo -e "${GREEN}Step 1: Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# ===== Step 2: 本地重新生成 Prisma Client =====
echo -e "${GREEN}Step 2: Regenerating Prisma Client...${NC}"
npx prisma generate --schema=infra/database/prisma/schema.prisma
echo -e "${GREEN}✅ Prisma Client regenerated${NC}"
echo ""

# ===== Step 3: 重新构建 API 项目 =====
echo -e "${GREEN}Step 3: Rebuilding API project...${NC}"
pnpm --filter @opencode/api build
echo -e "${GREEN}✅ API project rebuilt${NC}"
echo ""

# ===== Step 4: 重新构建 Docker 镜像 =====
echo -e "${GREEN}Step 4: Rebuilding Docker image...${NC}"

# 加载配置
if [ -f ".env.prod" ]; then
    source .env.prod
fi

docker build -f Dockerfile.api \
    -t ${REGISTRY:-ghcr.io}/${IMAGE_NAME:-couponhub}-api:${TAG:-latest} \
    --no-cache \
    .

echo -e "${GREEN}✅ Docker image rebuilt${NC}"
echo ""

# ===== Step 5: 重新部署 =====
echo -e "${GREEN}Step 5: Redeploying...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✅ Containers deployed${NC}"
echo ""

# ===== Step 6: 验证修复 =====
echo -e "${GREEN}Step 6: Verifying fix...${NC}"
sleep 10

# 查找 API 容器
API_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i api | head -1)

if [ -z "$API_CONTAINER" ]; then
    echo -e "${RED}❌ API container not found${NC}"
    exit 1
fi

echo "Container: $API_CONTAINER"
echo ""
echo "Checking logs..."
docker logs "$API_CONTAINER" 2>&1 | grep -E "(Prisma Client|migration|error)" | tail -20

echo ""

# 测试 API
API_PORT=${API_PORT:-3001}
echo "Testing API endpoints..."
echo ""

# 测试 news 接口
echo "GET /api/news:"
if curl -s http://localhost:$API_PORT/api/news?limit=1 2>&1 | grep -q "error"; then
    echo -e "${RED}❌ News endpoint still has errors${NC}"
    echo "Response:"
    curl -s http://localhost:$API_PORT/api/news?limit=1 2>&1 | head -10
else
    echo -e "${GREEN}✅ News endpoint working${NC}"
fi

echo ""

# 测试 coupon 接口
echo "GET /api/coupon-templates:"
if curl -s http://localhost:$API_PORT/api/coupon-templates?limit=1 2>&1 | grep -q "error"; then
    echo -e "${RED}❅ Coupon template endpoint still has errors${NC}"
    echo "Response:"
    curl -s http://localhost:$API_PORT/api/coupon-templates?limit=1 2>&1 | head -10
else
    echo -e "${GREEN}✅ Coupon template endpoint working${NC}"
fi

echo ""
echo "========================================="
echo "  Fix Complete"
echo "========================================="
echo ""
echo "If endpoints still fail, check detailed logs:"
echo "  docker logs $API_CONTAINER"
echo ""
echo "If Prisma Client mismatch persists, manually regenerate in container:"
echo "  docker exec $API_CONTAINER sh"
echo "  cd /app/infra/database"
echo "  npx prisma generate --schema=prisma/schema.prisma"
echo ""