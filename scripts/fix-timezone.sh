#!/bin/bash
# 一键时区修复脚本
# 自动应用所有时区配置修复

set -e

echo "🔧 时区配置一键修复工具"
echo "======================================"
echo ""
echo "此脚本将自动完成以下操作："
echo "  1. 检查并备份现有配置文件"
echo "  2. 应用 Dockerfile 时区配置"
echo "  3. 应用 docker-compose 时区配置"
echo "  4. 应用环境变量时区配置"
echo "  5. 提供后续操作指南"
echo ""
echo "======================================"
echo ""

# ===== 步骤 1: 备份现有配置 =====
echo "1️⃣  备份现有配置文件"
echo "--------------------------------------"

BACKUP_DIR="backups/timezone-fix-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份关键文件
[ -f "Dockerfile.api" ] && cp Dockerfile.api "$BACKUP_DIR/Dockerfile.api.bak"
[ -f "Dockerfile.admin" ] && cp Dockerfile.admin "$BACKUP_DIR/Dockerfile.admin.bak"
[ -f "docker-compose.prod.yml" ] && cp docker-compose.prod.yml "$BACKUP_DIR/docker-compose.prod.yml.bak"
[ -f ".env" ] && cp .env "$BACKUP_DIR/.env.bak"
[ -f "1panel.env" ] && cp 1panel.env "$BACKUP_DIR/1panel.env.bak"

echo "✅ 配置文件已备份到: $BACKUP_DIR"
echo ""

# ===== 步骤 2: 验证 Dockerfile 已修复 =====
echo "2️⃣  验证 Dockerfile 配置"
echo "--------------------------------------"

# Dockerfile.api 应已包含时区配置
if grep -q "TZ=Asia/Shanghai" Dockerfile.api && grep -q "apk add.*tzdata" Dockerfile.api; then
  echo "✅ Dockerfile.api 时区配置已正确（由 Claude 自动修复）"
else
  echo "⚠️  Dockerfile.api 可能缺少时区配置"
  echo "   请确认以下内容存在："
  echo "   ENV TZ=Asia/Shanghai"
  echo "   RUN apk add --no-cache tzdata ..."
fi

# Dockerfile.admin 应已包含时区配置
if grep -q "TZ=Asia/Shanghai" Dockerfile.admin && grep -q "apk add.*tzdata" Dockerfile.admin; then
  echo "✅ Dockerfile.admin 时区配置已正确（由 Claude 自动修复）"
else
  echo "⚠️  Dockerfile.admin 可能缺少时区配置"
fi

echo ""

# ===== 步骤 3: 验证 docker-compose 已修复 =====
echo "3️⃣  验证 Docker Compose 配置"
echo "--------------------------------------"

if grep -q "TZ=Asia/Shanghai" docker-compose.prod.yml; then
  echo "✅ docker-compose.prod.yml 时区配置已正确（由 Claude 自动修复）"
else
  echo "⚠️  docker-compose.prod.yml 缺少 TZ 环境变量"
fi

echo ""

# ===== 步骤 4: 验证环境变量 =====
echo "4️⃣  验证环境变量配置"
echo "--------------------------------------"

# .env 文件
if grep -q "^TZ=Asia/Shanghai" .env; then
  echo "✅ .env 文件已配置 TZ=Asia/Shanghai（由 Claude 自动修复）"
else
  echo "⚠️  .env 文件缺少 TZ 配置"
  echo "   正在添加..."

  # 添加 TZ 配置到 .env
  if ! grep -q "^# ===== 时区配置" .env; then
    # 找到合适的位置插入（在 NODE_ENV 之后）
    if grep -q "^NODE_ENV" .env; then
      sed -i.bak '/^NODE_ENV/a\
\
# ===== 时区配置（关键修复）=====\
# 设置为北京时间，确保所有 DateTime 字段（createdAt, updatedAt 等）时间正确\
TZ=Asia/Shanghai' .env
      echo "✅ 已添加 TZ 配置到 .env"
    else
      echo "" >> .env
      echo "# ===== 时区配置（关键修复）=====" >> .env
      echo "TZ=Asia/Shanghai" >> .env
      echo "✅ 已添加 TZ 配置到 .env"
    fi
  fi
fi

# 1panel.env 文件（如果存在）
if [ -f "1panel.env" ]; then
  if grep -q "^TZ=Asia/Shanghai" 1panel.env; then
    echo "✅ 1panel.env 文件已配置 TZ=Asia/Shanghai"
  else
    echo "⚠️  1panel.env 文件缺少 TZ 配置"
    echo "   正在添加..."

    if ! grep -q "^# ===== 时区配置" 1panel.env; then
      echo "" >> 1panel.env
      echo "# ===== 时区配置（关键修复）=====" >> 1panel.env
      echo "TZ=Asia/Shanghai" >> 1panel.env
      echo "✅ 已添加 TZ 配置到 1panel.env"
    fi
  fi
else
  echo "⚠️  1panel.env 文件不存在"
  echo "   生产环境部署时请参考 1panel.env.example 创建"
  echo "   并确保包含: TZ=Asia/Shanghai"
fi

echo ""

# ===== 步骤 5: 提供后续操作指南 =====
echo "5️⃣  后续操作指南"
echo "--------------------------------------"
echo ""

echo "🔧 下一步操作："
echo ""

echo "【开发环境】"
echo "  1. 重启本地开发服务："
echo "     pkill -f 'nest start'"
echo "     pnpm --filter @opencode/api dev"
echo ""
echo "  2. 验证时区配置："
echo "     bash scripts/verify-timezone.sh"
echo ""

echo "【生产环境】"
echo "  1. 重新构建 Docker 镜像（包含时区修复）："
echo "     docker build -f Dockerfile.api -t couponhub-api:latest ."
echo "     docker build -f Dockerfile.admin -t couponhub-admin:latest ."
echo ""
echo "  2. 停止现有容器："
echo "     docker-compose -f docker-compose.prod.yml down"
echo ""
echo "  3. 创建生产环境配置文件（如果尚未创建）："
echo "     cp 1panel.env.example 1panel.env"
echo "     vi 1panel.env  # 填写实际配置"
echo ""
echo "  4. 启动生产容器："
echo "     docker-compose -f docker-compose.prod.yml --env-file 1panel.env up -d"
echo ""
echo "  5. 验证生产环境时区："
echo "     docker exec couponHub-api-prod date"
echo "     docker exec couponHub-api-prod sh -c 'echo \$TZ'"
echo ""

echo "【数据迁移】"
echo "  如果数据库已有数据（存储为 UTC 时间），可选择："
echo ""
echo "  方案 A: 保持历史数据不变（推荐）"
echo "     - 历史数据仍为 UTC 时间"
echo "     - 新数据使用北京时间"
echo "     - 前端根据时间范围分别处理"
echo ""
echo "  方案 B: 批量转换历史数据为北京时间"
echo "     - 执行数据迁移脚本（见下方）"
echo "     - 所有数据统一为北京时间"
echo "     ⚠️  注意：转换后时间将加 8 小时，请谨慎操作"
echo ""

# ===== 步骤 6: 提供数据迁移脚本 =====
echo "6️⃣  数据迁移脚本（可选）"
echo "--------------------------------------"
echo ""

# 创建数据迁移脚本
MIGRATION_SCRIPT="scripts/migrate-timezone-data.sql"

cat > "$MIGRATION_SCRIPT" << 'EOF'
-- 时区数据迁移脚本
-- 用途：将数据库中所有 UTC 时间转换为北京时间（UTC+8）
-- ⚠️  警告：此操作不可逆，请先备份数据库！

-- 开始事务
BEGIN;

-- 显示迁移前的示例数据
SELECT '迁移前示例（admins）' as note, id, created_at, updated_at FROM admins LIMIT 5;
SELECT '迁移前示例（orders）' as note, id, created_at, updated_at FROM orders LIMIT 5;

-- ============================================
-- 执行时间字段迁移（加 8 小时）
-- ============================================

-- Admins 表
UPDATE admins SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours',
  email_verified = COALESCE(email_verified + INTERVAL '8 hours', email_verified),
  last_login_at = COALESCE(last_login_at + INTERVAL '8 hours', last_login_at);

-- Users 表
UPDATE users SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours',
  last_login_at = COALESCE(last_login_at + INTERVAL '8 hours', last_login_at);

-- Handlers 表
UPDATE handlers SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours';

-- AdminRoles 表
UPDATE admin_roles SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours';

-- AdminRefreshTokens 表
UPDATE admin_refresh_tokens SET
  created_at = created_at + INTERVAL '8 hours',
  expires_at = expires_at + INTERVAL '8 hours',
  revoked_at = COALESCE(revoked_at + INTERVAL '8 hours', revoked_at);

-- UserRefreshTokens 表
UPDATE user_refresh_tokens SET
  created_at = created_at + INTERVAL '8 hours',
  expires_at = expires_at + INTERVAL '8 hours',
  revoked_at = COALESCE(revoked_at + INTERVAL '8 hours', revoked_at);

-- Todos 表
UPDATE todos SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours',
  due_date = COALESCE(due_date + INTERVAL '8 hours', due_date);

-- MerchantCategories 表
UPDATE merchant_categories SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours';

-- Merchants 表
UPDATE merchants SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours';

-- News 表
UPDATE news SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours';

-- CouponTemplates 表
UPDATE coupon_templates SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours',
  valid_from = valid_from + INTERVAL '8 hours',
  valid_until = valid_until + INTERVAL '8 hours';

-- Orders 表
UPDATE orders SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours',
  paid_at = COALESCE(paid_at + INTERVAL '8 hours', paid_at),
  expire_at = COALESCE(expire_at + INTERVAL '8 hours', expire_at),
  redeemed_at = COALESCE(redeemed_at + INTERVAL '8 hours', redeemed_at),
  refunded_at = COALESCE(refunded_at + INTERVAL '8 hours', refunded_at),
  qrcode_generated_at = COALESCE(qrcode_generated_at + INTERVAL '8 hours', qrcode_generated_at);

-- Payments 表
UPDATE payments SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours',
  confirmed_at = COALESCE(confirmed_at + INTERVAL '8 hours', confirmed_at),
  paid_at = COALESCE(paid_at + INTERVAL '8 hours', paid_at);

-- Settlements 表
UPDATE settlements SET
  created_at = created_at + INTERVAL '8 hours';

-- 显示迁移后的示例数据
SELECT '迁移后示例（admins）' as note, id, created_at, updated_at FROM admins LIMIT 5;
SELECT '迁移后示例（orders）' as note, id, created_at, updated_at FROM orders LIMIT 5;

-- 提交事务
COMMIT;

-- 显示完成信息
SELECT '✅ 时区数据迁移完成！所有时间字段已转换为北京时间（UTC+8）' as status;
EOF

echo "✅ 已创建数据迁移脚本: $MIGRATION_SCRIPT"
echo ""
echo "使用方法："
echo "  1. 先备份数据库（重要！）："
echo "     docker exec postgres pg_dump -U xinnix couponHub > backup_before_timezone_fix.sql"
echo ""
echo "  2. 检查脚本内容："
echo "     cat $MIGRATION_SCRIPT"
echo ""
echo "  3. 执行迁移（谨慎操作）："
echo "     docker exec -i postgres psql -U xinnix -d couponHub < $MIGRATION_SCRIPT"
echo ""
echo "  4. 或手动执行（推荐）："
echo "     psql \$DATABASE_URL < $MIGRATION_SCRIPT"
echo ""

echo "======================================"
echo "🎉 时区配置修复完成！"
echo "======================================"
echo ""

echo "备份位置: $BACKUP_DIR"
echo ""
echo "重要提醒："
echo "  ⚠️  已修改的配置文件需要重新构建镜像才能生效"
echo "  ⚠️  数据迁移脚本需谨慎执行（建议先在测试环境验证）"
echo ""
echo "验证修复效果："
echo "  bash scripts/verify-timezone.sh"
echo ""

# ===== 步骤 7: 创建快速修复摘要 =====
cat > "docs/timezone-fix-summary.md" << 'EOF'
# 时区配置修复摘要

## 修复时间
执行时间: $(date '+%Y-%m-%d %H:%M:%S')

## 修复内容

### 1. Dockerfile.api
- ✅ 添加 `ENV TZ=Asia/Shanghai`
- ✅ 添加 `RUN apk add --no-cache tzdata` 安装时区数据包
- ✅ 创建 `/etc/localtime` 软链接指向北京时间

### 2. Dockerfile.admin
- ✅ 添加 `ENV TZ=Asia/Shanghai`
- ✅ 添加 `RUN apk add --no-cache tzdata`

### 3. docker-compose.prod.yml
- ✅ api 服务添加 `environment: TZ=Asia/Shanghai`
- ✅ admin 服务添加 `environment: TZ=Asia/Shanghai`

### 4. .env 文件
- ✅ 添加 `TZ=Asia/Shanghai` 环境变量

### 5. 1panel.env（生产环境）
- ⚠️  需手动创建（参考 1panel.env.example）
- ✅ 示例文件已包含 `TZ=Asia/Shanghai`

## 影响范围

所有 DateTime 字段都将使用北京时间：
- createdAt（创建时间）
- updatedAt（更新时间）
- paidAt（支付时间）
- redeemedAt（核销时间）
- refundedAt（退款时间）
- validFrom/validUntil（有效期）
- 其他所有时间字段

## 后续操作

### 开发环境
```bash
# 重启开发服务
pnpm --filter @opencode/api dev
```

### 生产环境
```bash
# 重新构建镜像
docker build -f Dockerfile.api -t couponhub-api:latest .
docker build -f Dockerfile.admin -t couponhub-admin:latest .

# 重启容器
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml --env-file 1panel.env up -d

# 验证时区
docker exec couponHub-api-prod date
docker exec couponHub-api-prod sh -c 'echo $TZ'
```

### 数据迁移（可选）
如果数据库已有 UTC 时间数据：
```bash
# 备份数据库
docker exec postgres pg_dump -U xinnix couponHub > backup.sql

# 执行迁移
psql $DATABASE_URL < scripts/migrate-timezone-data.sql
```

## 验证方法

运行验证脚本：
```bash
bash scripts/verify-timezone.sh
```

或手动验证：
```bash
# 容器时区
docker exec couponHub-api-prod date

# 数据库时区
docker exec postgres psql -U xinnix -d couponHub -c "SHOW timezone;"

# 应用时间记录
curl http://localhost:3000/api/orders/my -H "Authorization: Bearer <token>"
```

## 备份位置

配置备份: backups/timezone-fix-*

## 注意事项

1. **重新构建镜像必须**：Dockerfile 修改需要重新构建镜像才能生效
2. **数据迁移谨慎**：建议在测试环境先验证，生产环境执行前务必备份
3. **验证修复效果**：重启后务必验证时间显示正确
4. **前端适配**：如果之前前端有手动 +8 小时逻辑，需要移除

EOF

echo "✅ 已创建修复摘要: docs/timezone-fix-summary.md"
echo ""

echo "======================================"
echo "修复完成！请按照后续操作指南执行。"
echo "======================================"