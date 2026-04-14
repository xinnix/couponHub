# 🔴 生产数据库结构不匹配问题诊断报告

## 执行时间
2026-04-14

## 问题概述

用户报告：每次 Docker 部署到生产环境都需要手动调整数据库结构，自动迁移不可行。

## 🔍 根本原因（重大发现）

### 生产数据库实际结构

通过 PostgreSQL MCP 工具检查，发现生产数据库 `couponHub` 实际包含的是一个 **FeedbackHub 工单反馈系统** 的表结构：

```sql
-- 实际存在的表（工单/反馈系统）
├── attachments         -- 附件表
├── comments           -- 评论表
├── departments        -- 部门表
├── tickets            -- 工单表
├── preset_areas       -- 预设区域表
├── notifications      -- 通知表
├── merchants          -- 商户表（但结构不同）
├── categories         -- 分类表
├── permissions        -- 权限表
├── roles              -- 角色表
├── user_roles         -- 用户角色关联表
├── refresh_tokens     -- 刷新令牌表
├── todos              -- Todo表
└── users              -- 用户表
└── _prisma_migrations -- Prisma迁移历史表
```

**迁移历史记录：**
```
20260202110141_add_wxacode_to_preset_area       -- 添加小程序码到预设区域
20260127115806_add_comment_attachments          -- 评论附件
20260127075803_add_ticket_submitter_info        -- 工单提交者信息
20260123045202_add_handler_application_fields   -- 处理员申请字段
...
```

### 当前项目需要的结构

当前 `coupon` 项目是一个 **CouponHub 优惠券核销系统**，Prisma Schema 定义了完全不同的表：

```sql
-- 当前 Prisma Schema 定义（优惠券系统）
├── admins                 -- 管理员（❌ 不存在于生产数据库）
├── handlers               -- 核销员（❌ 不存在）
├── merchant_handlers      -- 商户核销员关联（❌ 不存在）
├── coupon_templates       -- 券模板（❌ 不存在）
├── orders                 -- 订单（❌ 不存在）
├── news                   -- 新闻资讯（❌ 不存在）
├── news_coupon_relations  -- 新闻优惠券关联（❌ 不存在）
├── settlements            -- 结算单（❌ 不存在）
├── stock_logs             -- 库存日志（❌ 不存在）
├── refund_failure_logs    -- 退款失败日志（❌ 不存在）
├── merchant_categories    -- 商户类别（❌ 不存在）
├── admins                 -- 管理员表（❌ 不存在）
├── admin_roles            -- 管理员角色关联（❌ 不存在）
├── admin_refresh_tokens   -- 管理员刷新令牌（❌ 不存在）
└── ...其他 CouponHub 专属表
```

**本地迁移文件：**
```
20260320021351_init                          -- 初始化迁移
20260320051328_separate_admin_user           -- 分离 Admin/User
20260325171034_add_business_models            -- 业务模型
20260402000000_add_usage_rules_to_coupon_template  -- 使用规则
```

---

## 🎯 结论

**两个系统完全不匹配！**

- **生产数据库**：FeedbackHub 工单反馈系统（遗留项目）
- **当前项目**：CouponHub 优惠券核销系统（新项目）

### 为什么每次都需要手动调整？

1. **Entrypoint 脚本尝试应用 CouponHub 迁移**
   - 迁移期望空数据库或匹配的 schema
   - 发现生产数据库已有完全不同的 FeedbackHub 结构

2. **Prisma 检测到 Schema Drift**
   - 生产数据库的表结构与迁移文件期望不符
   - 无法应用新迁移（会报错：schema drift detected）

3. **Entrypoint 容错机制允许服务启动**
   - 原脚本（entrypoint-final.sh）即使迁移失败也会启动服务
   - 导致应用运行但数据库结构缺失或不匹配

4. **手动调整成为唯一选择**
   - 用户手动创建缺失的表
   - 但每次部署都重复这个过程

---

## ✅ 解决方案

### 方案 1：创建新数据库（推荐）

为 CouponHub 项目创建一个全新的生产数据库，保留 FeedbackHub 数据库作为备份。

**步骤：**

```bash
# 1. 创建新数据库
./scripts/create-new-database.sh

# 输出：
# 创建数据库: couponhub_v2
# 更新 .env.prod 中的 DATABASE_URL

# 2. 更新配置
# 编辑 .env.prod
DATABASE_URL="postgresql://xinnix:x12345678@47.109.94.212/couponhub_v2"

# 3. 部署并自动迁移
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# 4. 查看迁移日志（应该成功）
docker logs couponHub-api-prod

# 预期输出：
# ✅ Database migrations completed successfully
# 🌟 Starting API Server...
```

**优点：**
- ✅ 不影响现有 FeedbackHub 系统（可作为备份）
- ✅ 自动迁移正常工作
- ✅ 符合最佳实践（一个项目一个数据库）

**缺点：**
- 需要额外的数据库空间
- 需要更新所有配置文件中的 DATABASE_URL

---

### 方案 2：清空现有数据库（慎用）

如果确认现有生产数据库没有有价值的数据，可以清空并重新初始化。

**⚠️ 警告：会删除所有 FeedbackHub 数据！**

```bash
# 1. 执行清空脚本（需要输入确认）
./scripts/reset-database-dangerous.sh

# 确认步骤：
# Type 'RESET' to confirm

# 2. 脚本会自动：
# - 删除所有表
# - 重新创建 schema
# - 应用 Prisma 迁移
# - 验证数据库结构

# 3. 部署
docker-compose -f docker-compose.prod.yml up -d --build
```

**优点：**
- ✅ 不需要新数据库
- ✅ 自动迁移正常工作

**缺点：**
- ❌ 所有 FeedbackHub 数据永久丢失
- ❌ 生产环境不推荐

---

### 方案 3：数据迁移（如果需要保留部分数据）

如果需要将 FeedbackHub 的部分数据迁移到 CouponHub：

**步骤：**

1. **导出 FeedbackHub 数据**
   ```bash
   pg_dump -h 47.109.94.212 -U xinnix couponHub > feedbackhub_backup.sql
   ```

2. **创建新数据库**
   ```bash
   ./scripts/create-new-database.sh
   ```

3. **手动迁移必要数据**
   ```bash
   # 根据业务需要，选择性导入部分数据
   # 例如：users、roles、permissions 等基础数据
   ```

4. **应用 CouponHub 迁移**
   ```bash
   export DATABASE_URL="postgresql://xinnix:x12345678@47.109.94.212/couponhub_v2"
   cd infra/database
   npx prisma migrate deploy
   ```

---

## 📋 已创建的工具和脚本

### 1. 诊断工具
- `scripts/check-migration-status.sh` - 迁移状态诊断

### 2. 解决方案脚本
- `scripts/create-new-database.sh` - 创建新数据库（推荐）
- `scripts/reset-database-dangerous.sh` - 清空现有数据库（慎用）

### 3. Docker 优化
- `apps/api/entrypoint-production-strict.sh` - 严格模式启动脚本
  - 迁移失败时拒绝启动服务
  - 提供详细诊断信息

### 4. 文档
- `docs/production-migration-troubleshooting.md` - 详细故障排查指南

---

## 🚀 推荐执行路径

### 立即行动（方案 1）

```bash
# 步骤 1: 创建新数据库
./scripts/create-new-database.sh

# 步骤 2: 更新 .env.prod
vi .env.prod
# 修改 DATABASE_URL 为 couponhub_v2

# 步骤 3: 首次部署（自动迁移）
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# 步骤 4: 验证迁移成功
docker logs couponHub-api-prod | grep "Database migrations"
# 应看到: ✅ Database migrations completed successfully

# 步骤 5: 运行 seed（可选）
./scripts/seed-data.sh

# 步骤 6: 测试应用功能
curl http://localhost:3001/health
curl http://localhost:3001/trpc/admin.list
```

---

## 📊 验证清单

部署后验证：

1. **容器启动状态**
   ```bash
   docker ps
   # couponHub-api-prod 应为 "Up" 状态
   ```

2. **迁移日志**
   ```bash
   docker logs couponHub-api-prod
   # 应包含: ✅ Database migrations completed successfully
   # 不应包含: ❌ Database migrations FAILED
   ```

3. **数据库表结构**
   ```bash
   docker exec -it couponHub-api-prod sh
   cd /app/infra/database
   npx prisma migrate status
   # 输出: Database schema is up to date!
   ```

4. **应用健康检查**
   ```bash
   curl http://localhost:3001/health
   # 应返回 200 OK
   ```

5. **业务功能测试**
   ```bash
   # 测试核心功能
   curl http://localhost:3001/trpc/couponTemplate.list
   curl http://localhost:3001/trpc/merchant.list
   ```

---

## 🔒 预防措施

### 未来开发流程

1. **一个项目一个数据库**
   - ✅ CouponHub 使用 `couponhub_v2`
   - ✅ FeedbackHub 使用独立的数据库

2. **正确使用 Prisma Migrate**
   ```bash
   # 开发环境
   prisma migrate dev --name <descriptive_name>

   # 生产环境
   prisma migrate deploy  # 仅应用，不创建新迁移
   ```

3. **禁止手动修改生产数据库**
   - ❌ 不要手动添加/删除字段
   - ✅ 所有变更通过 Prisma 迁移

4. **Entrypoint 严格模式**
   - ✅ 使用 `entrypoint-production-strict.sh`
   - ✅ 迁移失败时拒绝启动

---

## 📚 相关资源

- **详细故障排查文档**: `docs/production-migration-troubleshooting.md`
- **Prisma 生产环境最佳实践**: https://www.prisma.io/docs/guides/database/production-troubleshooting
- **Schema Drift 修复指南**: https://www.prisma.io/docs/concepts/components/prisma-migrate/schema-drift

---

## ✅ 总结

**根本问题**：生产数据库包含的是另一个系统（FeedbackHub）的结构，与当前项目（CouponHub）完全不匹配。

**推荐方案**：创建新数据库 `couponhub_v2`，然后自动迁移会正常工作。

**预期结果**：部署后无需手动调整，迁移自动成功。

---

生成时间: 2026-04-14
诊断工具: PostgreSQL MCP + Prisma CLI