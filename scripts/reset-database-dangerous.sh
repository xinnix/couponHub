#!/bin/bash
# 清空现有数据库并重新初始化（仅用于开发环境或全新部署）
# ⚠️ 警告：会删除所有数据，生产环境慎用！

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  ⚠️  DANGER: Reset Production Database"
echo "========================================="
echo ""

# 数据库连接信息
DB_HOST="47.109.94.212"
DB_USER="xinnix"
DB_PASSWORD="x12345678"
DB_NAME="couponHub"

echo -e "${RED}⚠️  WARNING: This script will DELETE ALL DATA in database '$DB_NAME'${NC}"
echo ""
echo "Current database contains:"
echo "  - FeedbackHub tables (tickets, comments, departments, etc.)"
echo "  - All existing data will be lost"
echo ""
echo "This is intended for:"
echo "  - Fresh production deployment (no existing data)"
echo "  - Development environment reset"
echo ""
echo -e "${RED}DO NOT USE if database has valuable production data!${NC}"
echo ""

read -p "Type 'RESET' to confirm (case-sensitive): " -r
echo
if [[ ! $REPLY == "RESET" ]]; then
    echo "Aborted - confirmation phrase incorrect"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 1: Dropping all tables...${NC}"

# 获取所有表名并删除
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO $DB_USER;
"

echo -e "${GREEN}✅ All tables dropped, schema recreated${NC}"
echo ""

echo -e "${GREEN}Step 2: Applying Prisma migrations...${NC}"

# 连接到本地 Prisma 并运行迁移
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST/$DB_NAME"
cd infra/database
npx prisma migrate deploy --schema=prisma/schema.prisma

echo -e "${GREEN}✅ Migrations applied${NC}"
echo ""

echo -e "${GREEN}Step 3: Verifying database structure...${NC}"
npx prisma migrate status --schema=prisma/schema.prisma

echo ""
echo "========================================="
echo "  ✅ Database Reset Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Seed initial data:"
echo "   ./scripts/seed-data.sh"
echo ""
echo "2. Deploy containers:"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""