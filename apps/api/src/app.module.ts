// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";

// 基础模块
import { AuthModule } from "./modules/auth/module";
import { TodoModule } from "./modules/todo/module";
import { UserModule } from "./modules/user/module";
import { MerchantModule } from "./modules/merchant/module";
import { NewsModule } from "./modules/news/module";
import { CouponModule } from "./modules/coupon/module";
import { RoleModule } from "./modules/role/module";
import { PermissionModule } from "./modules/permission/module";
import { OrderModule } from "./modules/order/module";
import { PaymentModule } from "./modules/payment/module";
import { RedemptionModule } from "./modules/redemption/module";
import { SettlementModule } from "./modules/settlement/module";

// 全局过滤器/拦截器
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AllExceptionsFilter } from "./core/filters/http-exception.filter";
import { TransformInterceptor } from "./core/interceptors/transform.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../.env"],
    }),
    // 数据库模块（全局，必须在最前）
    PrismaModule,
    // 基础模块
    AuthModule,
    TodoModule,
    UserModule,
    MerchantModule,
    NewsModule,
    CouponModule,
    RoleModule,
    PermissionModule,
    OrderModule,
    PaymentModule,
    RedemptionModule,
    SettlementModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
