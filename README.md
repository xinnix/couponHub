# OpenCode Scaffold

全栈管理系统脚手架 — 开箱即用，一键生成 CRUD 模块。

## 技术栈

- **Backend**: NestJS + tRPC + Prisma + PostgreSQL
- **Admin**: React + Refine + Ant Design + tRPC
- **Miniapp**: uni-app + Vue 3
- **Monorepo**: pnpm Workspace

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库连接等配置

# 3. 启动开发服务
pnpm dev
```

默认启动：
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Admin: `http://localhost:5173`
- Miniapp H5: `http://localhost:8080`

## 测试账号

- 管理端：`superadmin@example.com / password123`
- 小程序：`user@example.com / password123`

## 新增模块

```bash
/genModule product   # 生成全栈 CRUD 模块（Prisma → API → Admin）
```

## 文档

- `CLAUDE.md` — Agent-Centric 开发指南
- `docs/` — 技术部署文档
- `docs/framework-abstraction-analysis.md` — 脚手架抽象层分析
