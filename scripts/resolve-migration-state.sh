#!/bin/bash
# 解决 Prisma 迁移状态不一致问题
# 场景：数据库表已存在，但 Prisma 认为迁移未应用

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "  Prisma Migration Resolve Tool"
echo "========================================="
echo ""

# 数据库连接信息
DB_HOST="47.109.94.212"
DB_USER="xinnix"
DB_PASSWORD="x12345678"
DB_NAME="couponHub"

export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST/$DB_NAME"

echo -e "${YELLOW}⚠️  This script will mark existing migrations as applied${NC}"
echo "   WITHOUT executing them (tables already exist)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 1: Checking current migration status...${NC}"
cd infra/database

npx prisma migrate status --schema=prisma/schema.prisma || true

echo ""
echo -e "${GREEN}Step 2: Marking migrations as applied...${NC}"

# 迁移列表
MIGRATIONS=(
    "20260320021351_init"
    "20260320051328_separate_admin_user"
    "20260325171034_add_business_models"
    "20260402000000_add_usage_rules_to_coupon_template"
)

for migration in "${MIGRATIONS[@]}"; do
    echo ""
    echo -e "${BLUE}Marking: $migration${NC}"
    npx prisma migrate resolve --applied "$migration" --schema=prisma/schema.prisma || {
        echo -e "${YELLOW}⚠️  Failed to mark $migration (might already be applied)${NC}"
    }
done

echo ""
echo -e "${GREEN}Step 3: Verifying migration status...${NC}"
npx prisma migrate status --schema=prisma/schema.prisma

echo ""
echo "========================================="
echo "  ✅ Migration Resolve Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Rebuild Docker image:"
echo "   docker build -f Dockerfile.api -t couponhub-api:latest ."
echo ""
echo "2. Deploy to production:"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "3. Entrypoint will now detect migrations as applied and skip execution"
echo ""