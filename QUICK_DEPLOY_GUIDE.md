# 🎯 生产环境自动化部署完整方案

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

## ✅ 完整解决方案（已实现）

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

---

#### 2. 服务器端部署脚本

**文件：** `scripts/server-deploy.sh`

**完整自动化流程：**
- ✅ 检查并修复迁移状态
- ✅ 拉取最新镜像
- ✅ 部署并验证

---

#### 3. Webhook 接收脚本（可选）

**文件：** `scripts/webhook-listener.sh`

**功能：**
- 监听 webhook 触发
- 自动执行部署

---

## 🚀 快速配置指南

### 立即使用（最小改动）

**步骤 1：更新 GitHub Actions Workflow**

```bash
# 1. 替换 workflow
cp .github/workflows/deploy-enhanced.yml .github/workflows/deploy.yml

# 2. 提交变更
git add .github/workflows/deploy.yml
git commit -m "feat: enhance deploy workflow with migration checks"
git push
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

---

### 完全自动化部署（推荐）

**配置 webhook 自动触发：**

```bash
# 1. 在服务器上运行 webhook listener
sudo ./scripts/webhook-listener.sh

# 2. 添加 webhook URL 到 GitHub Secrets
# PRODUCTION_DEPLOY_HOOK=http://your-server-ip:8888/deploy

# 3. Push 代码，自动触发完整流程
git push origin main
# → GitHub Actions 自动构建
# → Webhook 触发服务器部署
# → 自动拉取镜像、应用迁移、验证成功
```

---

## 📊 验证清单

部署后验证：

```bash
# 1. 检查 GitHub Actions 日志
# 应看到：✅ All migrations are applied

# 2. 检查服务器日志
docker logs <API容器名>
# 应看到：✅ Database migrations completed successfully

# 3. 测试接口
curl http://localhost:3001/api/news?limit=1
curl http://localhost:3001/api/coupon-templates?limit=1
# 应返回正常数据，无 Prisma errors
```

---

## ✅ 总结

### 当前状态

- ✅ **Prisma Client 问题已解决**
- ✅ **迁移状态已修复**
- ✅ **自动化部署方案已实现**

### 下一步

1. 更新 GitHub workflow（使用 deploy-enhanced.yml）
2. 添加 DATABASE_URL_PROD 到 GitHub Secrets
3. 下次部署使用 scripts/server-deploy.sh

这样就能完全自动化处理数据库问题了！