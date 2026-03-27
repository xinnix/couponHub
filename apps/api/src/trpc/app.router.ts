import { router } from "./trpc";

// Merge all feature routers here
import { authRouter } from "../modules/auth/trpc/auth.router";
import { todoRouter } from "../modules/todo/trpc/todo.router";
import { userRouter } from "../modules/user/trpc/user.router";
import { roleRouter } from "../modules/role/trpc/role.router";
import { permissionRouter } from "../modules/permission/trpc/permission.router";
import { merchantRouter } from "../modules/merchant/trpc/merchant.router";
import { newsRouter } from "../modules/news/trpc/news.router";
import { templateRouter } from "../modules/coupon/trpc/template.router";
import { orderRouter } from "../modules/order/trpc/order.router";
import { settlementRouter } from "../modules/settlement/trpc/settlement.router";
import { paymentRouter } from "../modules/payment/trpc/payment.router";
import { redemptionRouter } from "../modules/redemption/trpc/redemption.router";

export const appRouter = router({
  auth: authRouter,
  todo: todoRouter,
  user: userRouter,
  role: roleRouter,
  permission: permissionRouter,
  merchant: merchantRouter,
  news: newsRouter,
  couponTemplate: templateRouter,
  order: orderRouter,
  settlement: settlementRouter,
  payment: paymentRouter,
  redemption: redemptionRouter,
});

export type AppRouter = typeof appRouter;
