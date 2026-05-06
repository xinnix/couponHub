// apps/api/src/main.ts
import dotenv from "dotenv";
import path from "path";

// Load .env from apps/api directory
dotenv.config();

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./core/filters/http-exception.filter";

import { PrismaService } from "./prisma/prisma.service";
import { FileStorageService } from "./shared/services/file-storage.service";
import { RedisService } from "./shared/services/redis.service";
import { appRouter } from "./trpc/app.router";
import { createContext, setPrismaService, setFileStorageService, setRedisService, setAppInstance } from "./trpc/trpc";
import * as trpcExpress from "@trpc/server/adapters/express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import express from "express";
import { json } from "express";
import { BullBoardSetup } from "./modules/scheduler/config/bull-board.setup";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import expressBasicAuth from "express-basic-auth";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  const corsOrigin = process.env.CORS_ORIGIN || "*";

  app.enableCors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(","),
  });

  // 捕获 raw body 用于微信支付/退款回调验签
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        if (req.url?.includes("/payments/wechat/callback") ||
            req.url?.includes("/payments/wechat/refund-callback")) {
          req.rawBody = buf.toString();
        }
      },
    }),
  );

  // 配置静态文件服务（用于访问上传的文件）
  // uploads 目录位于项目根目录
  const uploadPath = process.env.UPLOAD_PATH || path.resolve(__dirname, '../../../uploads');
  app.use(express.static(uploadPath));
  console.log(`📁 静态文件服务: ${uploadPath}`);

  // Set global prefix for all REST API routes
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Set up tRPC middleware (tRPC handles body parsing internally)
  const prismaService = app.get(PrismaService);
  setPrismaService(prismaService); // 设置 PrismaService 实例

  const fileStorageService = app.get(FileStorageService);
  setFileStorageService(fileStorageService); // 设置 FileStorageService 实例

  const redisService = app.get(RedisService);
  setRedisService(redisService); // 设置 RedisService 实例

  setAppInstance(app); // 设置 NestJS app 实例

  (app as any).use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => createContext(opts),
      onError({ error, path }) {
        console.error(`tRPC Error on path '${path}':`, error);
      },
    })
  );

  // 🎯 配置 Bull Board 可视化面板
  try {
    // 获取 BullBoardSetup 服务（它已经自动配置好了队列）
    const bullBoardSetup = app.get(BullBoardSetup);
    const serverAdapter = bullBoardSetup.getServerAdapter();

    // 生产环境添加 Basic Auth 保护
    if (process.env.NODE_ENV === 'production') {
      const bullBoardPassword = process.env.BULL_BOARD_PASSWORD;

      if (!bullBoardPassword) {
        console.warn('⚠️  生产环境未设置 BULL_BOARD_PASSWORD，Bull Board 已禁用');
        console.warn('⚠️  请在 .env 中设置 BULL_BOARD_PASSWORD 以启用安全访问');
      } else {
        app.use('/bull-board',
          expressBasicAuth({
            users: {
              admin: bullBoardPassword,
            },
            challenge: true,
            realm: 'Bull Board Monitor',
          }),
          serverAdapter.getRouter()
        );
        console.log('📊 Bull Board (已启用 Basic Auth 保护): http://localhost:' + port + '/bull-board');
        console.log('🔐 用户名: admin | 密码: 已配置');
      }
    } else {
      // 开发环境无认证
      app.use('/bull-board', serverAdapter.getRouter());
      console.log(`📊 Bull Board 可视化面板: http://localhost:${port}/bull-board`);
    }
  } catch (error) {
    console.warn('⚠️  Bull Board 配置失败（队列未初始化）:', error.message);
  }

  // Set up Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle("OpenCode API")
    .setDescription("Full-stack monorepo with NestJS, tRPC, and Prisma")
    .setVersion("1.0")
    .addTag("todos", "Todo resource operations")
    .addTag("users", "User resource operations")
    .addTag("roles", "Role resource operations")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port);
  console.log(`🚀 后端已启动: http://localhost:${port}/trpc`);
  console.log(`📚 API 文档: http://localhost:${port}/api/docs`);
  console.log(`🔌 REST API: http://localhost:${port}/api`);
}
bootstrap();
