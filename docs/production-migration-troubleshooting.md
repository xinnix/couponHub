# 生产环境数据库迁移问题诊断与解决

## 🚨 问题现状

每次 Docker 部署到生产环境后，都需要手动调整数据库结构，自动迁移似乎不可行。

## 🔍 问题根因

### 1. Entrypoint 脚本的容错设计问题

**原脚本行为：**
```bash
# apps/api/entrypoint-final.sh (第121-123行)
if [ "$MIGRATION_SUCCESS" = "true" ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "⚠️  Database migrations failed after all methods"
  echo "   Server will start anyway (tables might already exist)"
fi

# 继续启动服务
node dist/main.js
```

**问题分析：**
- 迁移失败 → 服务仍然启动 → 数据库结构不匹配
- 没有强制检查迁移状态
- 生产环境应该严格禁止迁移失败后启动

### 2. 可能的具体失败原因

根据迁移历史，可能的场景：

1. **手动修改数据库导致迁移冲突**
   - 生产环境手动添加字段/表
   - Prisma 迁移无法应用（检测到 schema drift）

2. **失败的迁移被标记为已应用**
   - `_prisma_migrations` 表记录了失败的迁移
   - 后续迁移无法继续

3. **迁移文件与实际数据库不一致**
   - 迁移文件新增字段（如 `usage_rules`）
   - 数据库实际上已经手动添加了该字段

## ✅ 解决方案

### 方案 1: 使用严格模式 Entrypoint（推荐）

**已创建新文件：**
- `apps/api/entrypoint-production-strict.sh` - 生产环境严格版启动脚本
- **关键特性：** 迁移失败时拒绝启动服务

**修改内容：**
```bash
if [ "$MIGRATION_SUCCESS" = "true" ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations FAILED after all methods"
  echo "❌ Service will NOT start to prevent data inconsistency"
  exit 1  # 立即停止，不启动服务
fi
```

**更新 Dockerfile.api：**
```dockerfile
# 已修改为使用严格版脚本
COPY apps/api/entrypoint-production-strict.sh ./entrypoint.sh
```

**部署流程：**
```bash
# 1. 构建新镜像
pnpm --filter @opencode/api build
docker build -f Dockerfile.api -t couponhub-api:latest .

# 2. 部署到生产环境
# 如果迁移失败，容器会停止并显示详细诊断信息
docker-compose -f docker-compose.prod.yml up -d

# 3. 查看迁移日志
docker logs couponHub-api-prod
```

### 方案 2: 诊断现有迁移状态

**已创建诊断脚本：**
```bash
scripts/check-migration-status.sh
```

**使用方法：**
```bash
# 在本地运行（连接生产数据库）
export DATABASE_URL="postgresql://xinnix:x12345678@47.109.94.212/couponHub"
./scripts/check-migration-status.sh

# 或在容器内运行
docker exec -it couponHub-api-prod sh
cd /app/infra/database
npx prisma migrate status --schema=prisma/schema.prisma
```

### 方案 3: 手动修复迁移问题

根据诊断结果，选择适当的修复方法：

#### 3.1 如果迁移失败但表已存在

```bash
# 标记迁移为已应用（跳过执行）
npx prisma migrate resolve --applied 20260402000000_add_usage_rules_to_coupon_template

# 验证状态
npx prisma migrate status
```

#### 3.2 如果 schema drift（手动修改冲突）

```bash
# 生成差异报告
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > drift-fix.sql

# 查看差异
cat drift-fix.sql

# 手动应用修复 SQL
psql -h 47.109.94.212 -U xinnix -d couponHub < drift-fix.sql
```

#### 3.3 如果需要重置迁移历史（慎用）

```bash
# ⚠️ 警告：会清空数据
npx prisma migrate reset --force

# 仅在生产环境特殊情况下使用
```

#### 3.4 生产环境安全的 schema 同步

```bash
# 使用 db push（不记录迁移历史）
npx prisma db push --accept-data-loss

# 适用场景：
# - 迁移历史混乱，需要重新开始
# - 生产数据库结构与 Prisma schema 基本一致
```

## 📋 完整部署流程（推荐）

### 第一步：诊断现有问题

```bash
# 连接生产数据库检查
export DATABASE_URL="postgresql://xinnix:x12345678@47.109.94.212/couponHub"
./scripts/check-migration-status.sh

# 或使用 MCP PostgreSQL 工具检查
mcp__postgresql__execute_sql "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;"
```

### 第二步：修复迁移状态

根据诊断结果选择：

```bash
# 如果表已存在但迁移未标记
npx prisma migrate resolve --applied <migration_name>

# 如果需要强制同步 schema
npx prisma db push --accept-data-loss
```

### 第三步：重新构建并部署

```bash
# 构建镜像（使用严格版 entrypoint）
docker build -f Dockerfile.api -t couponhub-api:v2-strict .

# 部署
docker-compose -f docker-compose.prod.yml up -d

# 查看日志确认迁移成功
docker logs -f couponHub-api-prod
```

### 第四步：验证数据库结构

```bash
# 在容器内检查
docker exec -it couponHub-api-prod sh
cd /app/infra/database
npx prisma migrate status

# 预期输出：
# Database schema is up to date!
```

## 🛡️ 预防措施

### 1. 开发环境最佳实践

**遵循正确的 Prisma 变更流程：**

```bash
# 1. 修改 schema.prisma
# 2. 创建迁移
pnpm --filter @opencode/database prisma migrate dev --name <descriptive_name>

# 3. 测试迁移
pnpm --filter @opencode/database prisma migrate status

# 4. 提交迁移文件到 Git
git add infra/database/prisma/migrations/
git commit -m "feat: add new field to schema"
```

**⚠️ 禁止行为：**
- ❌ 直接在生产数据库手动修改表结构
- ❌ 删除迁移文件后重新创建
- ❌ 使用 `prisma db push` 在开发环境（应使用 `migrate dev`）

### 2. 生产环境部署检查清单

```bash
# 部署前检查：
1. 确认所有迁移文件已提交到 Git
2. 本地运行 prisma migrate status 验证
3. 检查 .env.prod 中的 DATABASE_URL 正确
4. 确保没有设置 SKIP_MIGRATION=true（除非紧急情况）

# 部署后检查：
1. 查看 docker logs 确认迁移成功
2. 运行 prisma migrate status 验证
3. 测试应用功能确认数据一致性
```

### 3. 紧急情况处理

**如果生产环境迁移卡住，需要紧急启动：**

```bash
# 在 .env.prod 中添加（仅紧急情况）
SKIP_MIGRATION=true

# 部署
docker-compose -f docker-compose.prod.yml up -d

# ⚠️ 注意：这会跳过迁移检查，需要手动确保 schema 一致
```

## 📚 相关文档

- **Prisma Migrate 最佳实践**: https://www.prisma.io/docs/guides/database/production-troubleshooting
- **Schema Drift 修复**: https://www.prisma.io/docs/guides/database/production-troubleshooting#schema-drift
- **迁移历史管理**: https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-history

## 🔧 工具脚本

本次新增的辅助脚本：

1. **`apps/api/entrypoint-production-strict.sh`** - 严格模式启动脚本（迁移失败拒绝启动）
2. **`scripts/check-migration-status.sh`** - 迁移状态诊断工具

## ✅ 下一步行动

1. 运行诊断脚本检查当前状态
2. 根据诊断结果修复迁移问题
3. 构建新镜像并部署（使用严格版 entrypoint）
4. 验证迁移成功并测试功能

**预期结果：**
- 自动迁移在生产环境正常工作
- 无需手动调整数据库结构
- 部署失败时会显示明确错误信息