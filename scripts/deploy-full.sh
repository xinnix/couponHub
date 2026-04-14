#!/bin/bash
# 完整的生产环境部署流程
# 包含：Prisma Client 生成、构建、Docker 郜像、部署

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/Users/xinnix/code/coupon"

echo "========================================="
echo "  Production Deployment Pipeline"
echo "========================================="
echo ""

cd "$PROJECT_ROOT"

# ===== Step 1: Generate Prisma Client =====
echo -e "${GREEN}Step 1: Generating Prisma Client...${NC}"
npx prisma generate --schema=infra/database/prisma/schema.prisma

echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# ===== Step 2: Build Projects =====
echo -e "${GREEN}Step 2: Building projects...${NC}"

# Build shared package
echo "  Building @opencode/shared..."
pnpm --filter @opencode/shared build

# Build API project
echo "  Building @opencode/api..."
pnpm --filter @opencode/api build

# Build admin project (optional)
echo "  Building @opencode/admin (optional)..."
pnpm --filter @opencode/admin build 2>/dev/null || echo "  ⚠️  Admin build skipped (optional)"

echo -e "${GREEN}✅ All projects built${NC}"
echo ""

# ===== Step 3: Sync Workspace =====
echo -e "${GREEN}Step 3: Syncing workspace...${NC}"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo -e "${GREEN}✅ Workspace synced${NC}"
echo ""

# ===== Step 4: Build Docker Images =====
echo -e "${GREEN}Step 4: Building Docker images...${NC}"

# Read config from .env.prod
if [ -f ".env.prod" ]; then
    source .env.prod
else
    echo -e "${RED}❌ .env.prod not found${NC}"
    exit 1
fi

# Build API image
echo "  Building API image..."
docker build -f Dockerfile.api \
    -t ${REGISTRY:-ghcr.io}/${IMAGE_NAME:-couponhub}-api:${TAG:-latest} \
    --build-arg DATABASE_URL="$DATABASE_URL" \
    .

echo -e "${GREEN}✅ API image built${NC}"
echo ""

# Build Admin image (optional)
echo "  Building Admin image..."
docker build -f Dockerfile.admin \
    -t ${REGISTRY:-ghcr.io}/${IMAGE_NAME:-couponhub}-admin:${TAG:-latest} \
    . 2>/dev/null || echo "  ⚠️  Admin image build skipped"

echo ""

# ===== Step 5: Deploy to Production =====
echo -e "${YELLOW}Step 5: Deploying to production...${NC}"
echo ""
read -p "Deploy now? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    echo "Images are ready for manual deployment:"
    echo "  docker-compose -f docker-compose.prod.yml up -d"
    exit 0
fi

# Stop existing containers
echo "  Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start new containers
echo "  Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}✅ Containers deployed${NC}"
echo ""

# ===== Step 6: Verify Deployment =====
echo -e "${GREEN}Step 6: Verifying deployment...${NC}"

sleep 10

# Check container status
echo "  Container status:"
docker-compose -f docker-compose.prod.yml ps

echo ""

# Check logs
echo "  API logs (last 20 lines):"
docker logs $(docker ps --format "{{.Names}}" | grep -i api | head -1) 2>&1 | tail -20

echo ""

# Health check
API_PORT=${API_PORT:-3001}
echo "  API health check:"
if curl -f http://localhost:$API_PORT/health &> /dev/null; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  API health check failed (may need more time)${NC}"
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
echo "Commands:"
echo "  View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop:         docker-compose -f docker-compose.prod.yml down"
echo "  Restart:      docker-compose -f docker-compose.prod.yml restart"
echo ""