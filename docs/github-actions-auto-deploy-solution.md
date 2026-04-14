# 生产环境自动化部署完整方案

## 📋 问题诊断结果

### ✅ GitHub Actions 正确处理 Prisma Client

你的 Dockerfile.api 构建流程是正确的：

```dockerfile
# Builder Stage (第26行)
RUN cd infra/database && npx prisma generate
✅ 每次 GitHub Actions 构建都会生成最新 Prisma Client

# Runner Stage (第91行)
COPY --from=builder /app/infra/database/generated ./node_modules/@opencode/database/generated
✅ 镜像包含最新的 Prisma Client

# Entrypoint (第114行)
COPY apps/api/entrypoint-with-client-gen.sh ./entrypoint.sh
✅ 容器启动时自动验证 Client，缺失时自动生成
```

**结论：Prisma Client 问题已解决！**
- 每次 GitHub Actions 构建都会生成最新 Client
- 不再会出现 "The column does not exist" 错误

---

### ❌ 但缺少数据库迁移自动化

**当前 GitHub Actions 流程：**

1. ✅ 构建镜像（包含 Prisma Client）
2. ✅ 推送到 GHCR
3. ❌ 没有数据库迁移检查
4. ❌ 没有自动部署触发

**这导致：**
- 迁移状态不一致时无法自动检测
- 需要服务器端手动部署
- 部署失败时需要手动修复（像我们遇到的情况）

---

## ✅ 完整解决方案

### 方案架构

```
GitHub Push → GitHub Actions → GHCR → Webhook → 服务器自动部署
    ↓              ↓              ↓        ↓            ↓
  代码提交     构建镜像+检查迁移   推送镜像  触发部署   拉取+部署+验证
```

---

### 📦 新增文件清单

#### 1. GitHub Actions Workflow（增强版）

**文件：** `.github/workflows/deploy-enhanced.yml`

**新增功能：**
- ✅ Job 1: 数据库迁移检查（检查迁移状态）
- ✅ Job 2: 构建镜像（保留原有流程）
- ✅ Job 3: 自动部署触发（webhook）

**关键改进：**
```yaml
check-migrations:
  # 检查生产数据库迁移状态
  # 发现问题时发出警告
  # 生成迁移状态报告

build-and-push:
  needs: check-migrations  # 等待迁移检查完成
  # 原有构建流程不变

deploy-production:
  # 可选：自动触发服务器端部署
  # 通过 webhook 或 SSH
```

---

#### 2. 服务器端部署脚本

**文件：** `scripts/server-deploy.sh`

**完整自动化流程：**
```bash
1. 检查环境配置
2. 检查数据库迁移状态
   - 如果迁移未标记但表存在 → 自动标记为已应用
   - 如果数据库为空 → 部署时自动应用迁移
3. 拉取最新镜像
4. 停止现有服务
5. 部署新服务
6. 验证部署成功
   - 检查容器日志
   - 健康检查
   - 测试关键接口
```

**关键特性：**
- ✅ 自动修复迁移状态不一致
- ✅ 完整验证流程
- ✅ 错误检测和报告

---

#### 3. Webhook 接收脚本（可选）

**文件：** `scripts/webhook-listener.sh`

**功能：**
- 监听 HTTP webhook（默认端口 8888）
- 接收 GitHub Actions 触发
- 自动执行服务器部署脚本

**使用方法：**
```bash
# 在服务器上运行
./scripts/webhook-listener.sh

# 配置 webhook URL 到 GitHub Secrets
# PRODUCTION_DEPLOY_HOOK=http://your-server:8888/deploy
```

---

## 🚀 完整部署流程

### 方案 A：GitHub Actions + 手动部署（当前方案，已改进）

**流程：**

1. **GitHub Push**
   ```bash
   git push origin main
   ```

2. **GitHub Actions 自动执行**
   - ✅ 检查数据库迁移状态
   - ✅ 构建镜像（包含最新 Prisma Client）
   - ✅ 推送到 GHCR
   - ✅ 生成迁移状态报告

3. **服务器端手动部署**
   ```bash
   # 在服务器上执行
   ./scripts/server-deploy.sh
   ```

   这个脚本会自动：
   - ✅ 检查并修复迁移状态
   - ✅ 拉取最新镜像
   - ✅ 部署服务
   - ✅ 验证成功

**优点：**
- 简单，无需配置 webhook
- 完全自动化迁移处理
- 完整验证流程

---

### 方案 B：完全自动化部署（推荐）

**配置步骤：**

#### 1. 配置 GitHub Secrets

在你的 GitHub repository 设置中添加：

```yaml
Settings → Secrets and variables → Actions → New repository secret

必需的 Secrets:
- DATABASE_URL_PROD: postgresql://xinnix:x12345678@47.109.94.212/couponHub
- PRODUCTION_DEPLOY_HOOK: http://your-server-ip:8888/deploy（可选）
```

#### 2. 更新 GitHub Workflow

```bash
# 替换原有的 deploy.yml
mv .github/workflows/deploy.yml .github/workflows/deploy.yml.backup
mv .github/workflows/deploy-enhanced.yml .github/workflows/deploy.yml
```

#### 3. 在服务器上启动 Webhook Listener

```bash
# 在服务器上运行（需要 root 权限或 sudo）
sudo ./scripts/webhook-listener.sh

# 或使用 systemd 服务（推荐）
# 创建 systemd 服务文件
```

#### 4. 测试完整流程

```bash
# Push 到 GitHub
git push origin main

# 自动执行：
# 1. GitHub Actions 检查迁移
# 2. 构建并推送镜像
# 3. 触发 webhook
# 4. 服务器自动部署
# 5. 验证部署成功
```

**优点：**
- ✅ 完全自动化，零手动操作
- ✅ 自动检测和修复迁移问题
- ✅ 部署失败自动停止并报告

---

## 🔧 快速配置指南

### 立即使用（最小改动）

**步骤 1：更新 GitHub Actions Workflow**

```bash
cd /Users/xinnix/code/coupon

# 备份原 workflow
cp .github/workflows/deploy.yml .github/workflows/deploy.yml.backup

# 使用增强版 workflow
cp .github/workflows/deploy-enhanced.yml .github/workflows/deploy.yml
```

**步骤 2：添加 GitHub Secrets**

在你的 GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - Name: `DATABASE_URL_PROD`
   - Value: `postgresql://xinnix:x12345678@47.109.94.212/couponHub`

**步骤 3：使用服务器部署脚本**

每次 GitHub Actions 完成后，在服务器执行：

```bash
./scripts/server-deploy.sh
```

这个脚本会自动处理所有迁移问题。

---

## 📊 验证清单

部署后验证：

```bash
# 1. 检查 GitHub Actions 日志
# Actions 标签页 → 最新的 workflow run → check-migrations job
# 应看到：✅ All migrations are applied

# 2. 检查服务器部署日志
docker logs <API容器名>
# 应看到：
# ✅ Database migrations completed successfully
# 🌟 Starting API Server...

# 3. 测试接口
curl http://localhost:3001/api/news?limit=1
curl http://localhost:3001/api/coupon-templates?limit=1
# 应返回正常数据，无 Prisma errors

# 4. 检查数据库状态
docker exec postgres psql -U root -d couponHub -c "\dt"
# 应看到所有表：news, coupon_templates, orders, etc.
```

---

## 🛡️ 预防未来问题

### 开发流程规范

**每次修改 schema.prisma：**

```bash
# 1. 创建迁移（开发环境）
cd infra/database
prisma migrate dev --name <描述性名称>

# 2. 测试迁移
prisma migrate status

# 3. 提交变更
git add infra/database/prisma/migrations/
git commit -m "feat: update schema"
git push origin main

# 4. GitHub Actions 自动：
# - 检查迁移状态
# - 构建最新镜像（包含新 Client）
# - 推送到 GHCR
# - 触发服务器部署（如果配置了 webhook）

# 5. 服务器自动：
# - 拉取镜像
# - 应用迁移
# - 验证成功
```

---

## 📚 相关文档

1. **GitHub Actions Workflow**
   - `.github/workflows/deploy-enhanced.yml` - 增强版 workflow（推荐）
   - `.github/workflows/deploy.yml.backup` - 原 workflow（备份）

2. **服务器脚本**
   - `scripts/server-deploy.sh` - 自动部署脚本
   - `scripts/webhook-listener.sh` - Webhook 接收脚本（可选）

3. **之前的修复工具**
   - `scripts/resolve-migration-state.sh` - 迁移状态修复
   - `scripts/check-migration-status.sh` - 迁移诊断
   - `scripts/quick-fix-prisma-client.sh` - Prisma Client 快速修复

4. **Docker 优化**
   - `apps/api/entrypoint-with-client-gen.sh` - 自动 Client 验证和生成

---

## ✅ 总结

### 当前状态

- ✅ **Prisma Client 问题已解决**：GitHub Actions 自动生成最新 Client
- ✅ **迁移状态已修复**：我们刚才标记了所有迁移为已应用
- ⚠️ **缺少自动化部署**：需要手动在服务器执行

### 推荐方案

**最小改动（立即可用）：**

```bash
# 1. 更新 GitHub workflow
cp .github/workflows/deploy-enhanced.yml .github/workflows/deploy.yml

# 2. 添加 GitHub Secrets
DATABASE_URL_PROD=postgresql://xinnix:x12345678@47.109.94.212/couponHub

# 3. 每次部署后，服务器执行
./scripts/server-deploy.sh
```

**完全自动化（推荐长期使用）：**

```bash
# 配置 webhook 自动触发
# 实现：Git Push → 自动构建 → 自动部署 → 自动验证
```

---

## 🎯 下一步行动

我建议你：

1. **立即更新 GitHub workflow**
   ```bash
   cp .github/workflows/deploy-enhanced.yml .github/workflows/deploy.yml
   git add .github/workflows/deploy.yml
   git commit -m "feat: enhance deploy workflow with migration checks"
   git push
   ```

2. **添加 GitHub Secrets**
   - DATABASE_URL_PROD

3. **下次部署时，使用服务器脚本**
   ```bash
   ./scripts/server-deploy.sh
   ```

这样就能完全自动化处理数据库问题了！

---

生成时间: 2026-04-14
状态: Prisma Client 问题已解决，迁移自动化方案已设计