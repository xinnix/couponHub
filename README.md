# OpenCode Coupon Monorepo

全栈优惠券营销与结算系统脚手架，包含：

- `apps/api`: NestJS + tRPC + Prisma（Admin tRPC + Miniapp REST）
- `apps/admin`: React + Refine + Ant Design（管理后台）
- `apps/miniapp`: uni-app + Vue 3（小程序端）
- `infra/database`: Prisma Schema / migrations / seed
- `infra/shared`: Zod schema 与跨端类型

## 技术栈

- Backend: NestJS 11, tRPC 11, Prisma 7, PostgreSQL
- Admin: React 19, Refine, Ant Design, React Query
- Miniapp: uni-app, Vue 3, TypeScript
- Monorepo: pnpm workspace

## 快速开始

```bash
pnpm install
pnpm dev
```

默认启动：

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Admin: `http://localhost:5173`

## 常用命令

```bash
# 开发
pnpm dev
pnpm dev:api
pnpm dev:admin
pnpm dev:miniapp

# 构建
pnpm build:api
pnpm build:admin
pnpm build:miniapp
pnpm build:shared

# 数据库
pnpm db:generate
pnpm db:migrate
pnpm db:studio

# 同步与检查
pnpm sync
pnpm type-check
```

## 目录约定

```text
apps/
  api/         # REST + tRPC 双协议后端
  admin/       # 管理后台（tRPC）
  miniapp/     # 小程序（REST）
infra/
  database/    # Prisma schema/migrations/client
  shared/      # Zod + shared types
docs/
  product/     # vision / roadmap
  prd/         # 需求文档
```

## 认证与权限

- 双用户体系：`Admin`（管理端）与 `User`（小程序）
- RBAC 作用于管理端（`roles` / `permissions`）
- JWT payload 包含 `type` 字段区分 `admin` / `user`

## Seed 数据

推荐使用 SQL 脚本初始化：

```bash
docker exec -i postgres psql -U xinnix -d couponHub < infra/database/prisma/seed-base.sql
docker exec -i postgres psql -U xinnix -d couponHub < infra/database/prisma/seed-data.sql
```

测试账号：

- 管理端：`superadmin@example.com / password123`
- 小程序：`user@example.com / password123`
