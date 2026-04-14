#!/bin/bash
# 创建 CouponHub 生产数据库
# 注意：需要在 PostgreSQL 服务器上执行

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "  Create CouponHub Production Database"
echo "========================================="
echo ""

# 数据库连接信息（从 .env.prod 读取）
DB_HOST="47.109.94.212"
DB_USER="xinnix"
DB_PASSWORD="x12345678"
EXISTING_DB="couponHub"  # 当前数据库（FeedbackHub 系统）
NEW_DB="couponhub_v2"    # 新数据库名称

echo -e "${YELLOW}⚠️  Warning:${NC}"
echo "   Current database '$EXISTING_DB' contains FeedbackHub tables"
echo "   We will create a NEW database '$NEW_DB' for CouponHub"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 1: Creating new database...${NC}"

# 创建新数据库
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "
CREATE DATABASE $NEW_DB
  WITH ENCODING='UTF8'
  LC_COLLATE='en_US.UTF-8'
  LC_CTYPE='en_US.UTF-8'
  TEMPLATE=template0;
"

echo -e "${GREEN}✅ Database '$NEW_DB' created${NC}"
echo ""

echo -e "${GREEN}Step 2: Granting permissions...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "
GRANT ALL PRIVILEGES ON DATABASE $NEW_DB TO $DB_USER;
"

echo -e "${GREEN}✅ Permissions granted${NC}"
echo ""

echo "========================================="
echo "  Next Steps"
echo "========================================="
echo ""
echo "1. Update .env.prod:"
echo "   DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST/$NEW_DB\""
echo ""
echo "2. Run first migration:"
echo "   pnpm --filter @opencode/database prisma migrate deploy"
echo ""
echo "3. Seed initial data:"
echo "   ./scripts/seed-data.sh"
echo ""
echo "4. Rebuild and deploy Docker containers:"
echo "   docker-compose -f docker-compose.prod.yml down"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""