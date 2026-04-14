#!/bin/bash
# 数据库迁移诊断脚本
# 用于检查生产环境数据库迁移状态

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "  Prisma Migration Diagnostics"
echo "========================================="
echo ""

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL not set${NC}"
  exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL configured${NC}"
echo ""

# 检查迁移文件
echo -e "${BLUE}📁 Checking migration files...${NC}"
MIGRATION_DIR="infra/database/prisma/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
  echo -e "${RED}❌ Migration directory not found${NC}"
  exit 1
fi

MIGRATION_COUNT=$(ls -1 "$MIGRATION_DIR" | grep -E "^[0-9]" | wc -l)
echo -e "${GREEN}✅ Found $MIGRATION_COUNT migration files${NC}"
echo ""

# 列出迁移文件
echo -e "${BLUE}📋 Migration files:${NC}"
ls -1 "$MIGRATION_DIR" | grep -E "^[0-9]" | while read migration; do
  echo "   - $migration"
done
echo ""

# 检查 Prisma Client
echo -e "${BLUE}🔍 Checking Prisma setup...${NC}"
cd infra/database

if [ ! -d "generated" ]; then
  echo -e "${YELLOW}⚠️  Prisma Client not generated${NC}"
  echo "   Run: pnpm prisma generate"
else
  echo -e "${GREEN}✅ Prisma Client generated${NC}"
fi

# 检查迁移状态
echo ""
echo -e "${BLUE}📊 Checking migration status in database...${NC}"
echo ""

npx prisma migrate status --schema=prisma/schema.prisma 2>&1 | while read line; do
  if echo "$line" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}$line${NC}"
  elif echo "$line" | grep -q "Migration"; then
    echo "$line"
  elif echo "$line" | grep -q "failed"; then
    echo -e "${RED}$line${NC}"
  else
    echo "$line"
  fi
done

echo ""
echo "========================================="
echo "  Diagnosis Complete"
echo "========================================="
echo ""

# 提供修复建议
echo -e "${BLUE}💡 Common fixes:${NC}"
echo ""
echo "1. If migrations failed but tables exist:"
echo "   npx prisma migrate resolve --applied <migration_name>"
echo ""
echo "2. If schema drifted (manual changes detected):"
echo "   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > drift-fix.sql"
echo "   # Then apply the SQL script manually"
echo ""
echo "3. If you want to force sync (DESTRUCTIVE):"
echo "   npx prisma migrate reset --force"
echo ""
echo "4. Production-safe schema sync (no migration history):"
echo "   npx prisma db push --accept-data-loss"
echo ""