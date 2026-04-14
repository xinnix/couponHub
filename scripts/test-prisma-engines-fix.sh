#!/bin/bash
# 快速测试 Prisma Engines 修复
# 构建 Docker 镜像并验证 Prisma CLI 是否正常工作

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "  Testing Prisma Engines Fix"
echo "========================================="
echo ""

PROJECT_ROOT="/Users/xinnix/code/coupon"
cd "$PROJECT_ROOT"

# ===== Step 1: 本地生成 Prisma Client =====
echo -e "${GREEN}Step 1: Generating Prisma Client locally...${NC}"
npx prisma generate --schema=infra/database/prisma/schema.prisma
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# ===== Step 2: 构建 API 项目 =====
echo -e "${GREEN}Step 2: Building API project...${NC}"
pnpm --filter @opencode/api build
echo -e "${GREEN}✅ API built${NC}"
echo ""

# ===== Step 3: 构建 Docker 镜像 =====
echo -e "${GREEN}Step 3: Building Docker image...${NC}"

# 加载配置
if [ -f ".env.prod" ]; then
    source .env.prod
fi

docker build -f Dockerfile.api \
    -t couponhub-api:test-engines \
    --progress=plain \
    . 2>&1 | tee /tmp/docker-build.log

echo -e "${GREEN}✅ Image built${NC}"
echo ""

# ===== Step 4: 验证镜像内的 Prisma 结构 =====
echo -e "${GREEN}Step 4: Verifying Prisma structure in image...${NC}"

# 创建临时容器检查文件结构
docker create --name test-prisma couponhub-api:test-engines
docker start test-prisma

echo ""
echo "Checking @prisma/engines:"
docker exec test-prisma sh -c "ls -la /app/node_modules/.pnpm/@prisma+* 2>/dev/null | head -10" || echo "Not found in .pnpm"

echo ""
echo "Checking Prisma CLI:"
docker exec test-prisma sh -c "ls -la /app/node_modules/.bin/prisma 2>/dev/null" || echo ".bin/prisma not found"

echo ""
echo "Testing Prisma migrate status (should not error):"
docker exec test-prisma sh -c "cd /app/infra/database && export DATABASE_URL='$DATABASE_URL' && npx --yes prisma migrate status --schema=prisma/schema.prisma" 2>&1 | head -20

# 检查是否成功
if docker exec test-prisma sh -c "cd /app/infra/database && export DATABASE_URL='$DATABASE_URL' && npx --yes prisma migrate status --schema=prisma/schema.prisma 2>&1" | grep -q "Error: Cannot find module"; then
    echo -e "${RED}❌ Prisma still has errors${NC}"
    docker stop test-prisma
    docker rm test-prisma
    exit 1
else
    echo -e "${GREEN}✅ Prisma working correctly${NC}"
fi

# 清理测试容器
docker stop test-prisma
docker rm test-prisma

echo ""
echo "========================================="
echo "  ✅ Fix Verified!"
echo "========================================="
echo ""
echo "Next: Deploy to production with this image"
echo "  docker tag couponhub-api:test-engines couponhub-api:latest"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""