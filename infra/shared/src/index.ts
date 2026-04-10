import { z } from "zod";

// ============================================
// Auth Schemas
// ============================================

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// ============================================
// User & Role Types
// ============================================

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  roles: Role[];
  permissions: string[]; // Format: "resource:action"
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  level: number;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: Date;
}

// ============================================
// Auth Response Types
// ============================================

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// Permission Constants
// ============================================

export const PERMISSIONS = {
  TODO: {
    CREATE: 'todo:create',
    READ: 'todo:read',
    UPDATE: 'todo:update',
    DELETE: 'todo:delete',
  },
  USER: {
    CREATE: 'user:create',
    READ: 'user:read',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
    MANAGE_ROLES: 'user:manage_roles',
  },
  ROLE: {
    CREATE: 'role:create',
    READ: 'role:read',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
  },
  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update',
  },
  MERCHANT: {
    CREATE: 'merchant:create',
    READ: 'merchant:read',
    UPDATE: 'merchant:update',
    DELETE: 'merchant:delete',
  },
  NEWS: {
    CREATE: 'news:create',
    READ: 'news:read',
    UPDATE: 'news:update',
    DELETE: 'news:delete',
  },
  COUPON_TEMPLATE: {
    CREATE: 'coupon_template:create',
    READ: 'coupon_template:read',
    UPDATE: 'coupon_template:update',
    DELETE: 'coupon_template:delete',
  },
  ORDER: {
    CREATE: 'order:create',
    READ: 'order:read',
    UPDATE: 'order:update',
    DELETE: 'order:delete',
  },
  SETTLEMENT: {
    CREATE: 'settlement:create',
    READ: 'settlement:read',
    UPDATE: 'settlement:update',
    DELETE: 'settlement:delete',
  },
} as const;

export type PermissionString = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];

// ============================================
// Role Constants
// ============================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type RoleSlug = typeof ROLES[keyof typeof ROLES];

// ============================================
// Todo Schemas
// ============================================

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  isCompleted: z.boolean(),
  priority: z.number(),
  dueDate: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTodoSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(3).default(1),
  dueDate: z.string().datetime().optional().nullable(),
});

export const UpdateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  isCompleted: z.boolean().optional(),
  priority: z.number().int().min(1).max(3).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const TodoListQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  pageSize: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  search: z.string().optional(),
  isCompleted: z.string().optional().transform(val => val === 'true'),
});

export type TodoInput = z.infer<typeof TodoSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;
export type TodoListQueryInput = z.infer<typeof TodoListQuerySchema>;

// ============================================
// User Management Schemas
// ============================================

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  isActive: z.boolean(),
  emailVerified: z.date().optional().nullable(),
  lastLoginAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  email: z.string().email("邮箱格式无效"),
  password: z.string().min(8, "密码至少8个字符"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const UserListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  roleSlug: z.string().optional(),
});

export const AssignRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

export const BatchAssignRolesSchema = z.object({
  userIds: z.array(z.string()),
  roleIds: z.array(z.string()),
});

export const ResetPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(8, "密码至少8个字符"),
});

export const HandlerApplicationSchema = z.object({
  userId: z.string(),
  handlerId: z.string(),
});

export type UserInput = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserListQueryInput = z.infer<typeof UserListQuerySchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;
export type BatchAssignRolesInput = z.infer<typeof BatchAssignRolesSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type HandlerApplicationInput = z.infer<typeof HandlerApplicationSchema>;

// ============================================
// Role Management Schemas
// ============================================

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  level: z.number(),
  isSystem: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(1, "角色名称不能为空"),
  slug: z.string().min(1, "角色标识不能为空"),
  description: z.string().optional(),
  level: z.number().int().default(100),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  level: z.number().int().optional(),
});

export const RoleListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  search: z.string().optional(),
});

export const UpdateRolePermissionsSchema = z.object({
  roleId: z.string(),
  permissionIds: z.array(z.string()),
});

export type RoleInput = z.infer<typeof RoleSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type RoleListQueryInput = z.infer<typeof RoleListQuerySchema>;
export type UpdateRolePermissionsInput = z.infer<typeof UpdateRolePermissionsSchema>;

// ============================================
// MerchantCategory Schemas
// ============================================

export const MerchantCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const BaseMerchantCategorySchema = z.object({
  name: z.string().min(1, "类别名称不能为空").max(50, "名称最多50字"),
  slug: z.string()
    .min(1, "标识符不能为空")
    .max(50, "标识符最多50字")
    .regex(/^[a-z0-9-]+$/, "标识符只能包含小写字母、数字和连字符"),
  description: z.string().max(200, "描述最多200字").optional().nullable(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative("排序必须为非负整数").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const CreateMerchantCategorySchema = BaseMerchantCategorySchema;

export const UpdateMerchantCategorySchema = BaseMerchantCategorySchema.partial();

export const MerchantCategoryListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  search: z.string().optional(),
});

export type MerchantCategoryInput = z.infer<typeof MerchantCategorySchema>;
export type CreateMerchantCategoryInput = z.infer<typeof CreateMerchantCategorySchema>;
export type UpdateMerchantCategoryInput = z.infer<typeof UpdateMerchantCategorySchema>;
export type MerchantCategoryListQueryInput = z.infer<typeof MerchantCategoryListQuerySchema>;

// ============================================
// Merchant Schemas
// ============================================

export const MerchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().url().optional().nullable(),
  categoryId: z.string(),
  area: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  gallery: z.array(z.string().url()).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMerchantSchema = z.object({
  name: z.string().min(1, "商户名称不能为空"),
  logo: z.string().url("Logo URL格式无效").optional().nullable(),
  categoryId: z.string().min(1, "请选择商户类别"),
  area: z.string().optional(),
  floor: z.string().optional(),
  phone: z.string().optional(),
  gallery: z.array(z.string().url()).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(), // 创建时可选，默认为 ACTIVE
});

export const UpdateMerchantSchema = z.object({
  name: z.string().min(1, "商户名称不能为空").optional(),
  logo: z.string().url("Logo URL格式无效").optional().nullable(),
  categoryId: z.string().min(1, "请选择商户类别").optional(),
  area: z.string().optional(),
  floor: z.string().optional(),
  phone: z.string().optional(),
  gallery: z.array(z.string().url()).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(), // 更新时可以修改状态
});

export const MerchantListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(), // 改为 limit 与 Refine 保持一致
  skip: z.number().int().optional(),
  take: z.number().int().optional(),
  where: z.any().optional(), // 支持通用的 where 对象格式
  orderBy: z.any().optional(),
  include: z.any().optional(),
  select: z.any().optional(),
});

export type MerchantInput = z.infer<typeof MerchantSchema>;
export type CreateMerchantInput = z.infer<typeof CreateMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof UpdateMerchantSchema>;
export type MerchantListQueryInput = z.infer<typeof MerchantListQuerySchema>;

// ============================================
// Merchant Handler Schemas
// ============================================

export const MerchantHandlerSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  userId: z.string(),
  name: z.string(),
  phone: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMerchantHandlerSchema = z.object({
  merchantId: z.string().min(1, "请选择商户"),
  userId: z.string().min(1, "请选择用户"),
  name: z.string().min(1, "核销员姓名不能为空"),
  phone: z.string().min(1, "核销员电话不能为空"),
});

export const UpdateMerchantHandlerSchema = CreateMerchantHandlerSchema.partial().omit({
  merchantId: true,
  userId: true,
});

export type MerchantHandlerInput = z.infer<typeof MerchantHandlerSchema>;
export type CreateMerchantHandlerInput = z.infer<typeof CreateMerchantHandlerSchema>;
export type UpdateMerchantHandlerInput = z.infer<typeof UpdateMerchantHandlerSchema>;

// ============================================
// Handler Schemas (核销员)
// ============================================

export const HandlerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "核销员姓名不能为空"),
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, "手机号格式不正确")
    .min(11, "手机号必须是11位"),
  merchantId: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateHandlerSchema = HandlerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateHandlerSchema = HandlerSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Handler = z.infer<typeof HandlerSchema>;
export type CreateHandler = z.infer<typeof CreateHandlerSchema>;
export type UpdateHandler = z.infer<typeof UpdateHandlerSchema>;

// ============================================
// News Schemas
// ============================================

export const NewsSchema = z.object({
  id: z.string(),
  title: z.string(),
  bannerUrl: z.string().url().optional().nullable(),
  content: z.string(),
  linkedCouponId: z.string().optional().nullable(),
  viewCount: z.number().int(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  isHero: z.boolean(),
  isPopup: z.boolean(), // 新增字段：是否为首页弹窗新闻
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateNewsSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字"),
  bannerUrl: z.string().url("Banner URL格式无效").optional().nullable(),
  content: z.string().min(1, "内容不能为空"),
  linkedCouponId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  isHero: z.boolean().default(false),
  isPopup: z.boolean().default(false), // 新增字段：是否为首页弹窗新闻
});

export const UpdateNewsSchema = CreateNewsSchema.partial();

export const NewsListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  search: z.string().optional(),
});

export type NewsInput = z.infer<typeof NewsSchema>;
export type CreateNewsInput = z.infer<typeof CreateNewsSchema>;
export type UpdateNewsInput = z.infer<typeof UpdateNewsSchema>;
export type NewsListQueryInput = z.infer<typeof NewsListQuerySchema>;

// ============================================
// Coupon Template Schemas
// ============================================

export const CouponTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  buyPrice: z.number().nonnegative(), // 修改：允许 0（免费券）
  faceValue: z.number().positive(),
  settlementAmount: z.number().nonnegative().optional().nullable(), // 结算金额（可选）
  stock: z.number().int().nonnegative(),
  claimLimit: z.number().int().positive().optional().nullable(), // 新增：每人限领数量
  isFree: z.boolean().optional(), // 新增：是否为免费券
  featuredOnHome: z.boolean().optional(), // 新增：是否展示到首页超值优惠
  categoryId: z.string().optional().nullable(), // 商户类别ID（可选）
  merchantScope: z.array(z.string()),
  validFrom: z.date(),
  validUntil: z.date(),
  description: z.string().optional().nullable(),
  usageRules: z.string().optional().nullable(), // 使用规则说明
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 基础券模板 Schema（不含 refinement）
const BaseCouponTemplateSchema = z.object({
  title: z.string().min(1, "券标题不能为空").max(100, "标题最多100字"),
  buyPrice: z.number().nonnegative("购买价格不能为负").min(0, "购买价格不能为负"), // 修改：允许 0（免费券）
  faceValue: z.number().positive("面值必须大于0"),
  settlementAmount: z.number().nonnegative("结算金额不能为负").optional().nullable(), // 结算金额（可选）
  stock: z.number().int().nonnegative("库存不能为负").min(0, "库存不能为负"),
  claimLimit: z.number().int().positive("每人限领数量必须为正整数").optional().nullable(), // 新增：每人限领数量
  featuredOnHome: z.boolean().optional(), // 新增：是否展示到首页超值优惠
  categoryId: z.string().optional().nullable(), // 商户类别ID（可选）
  merchantScope: z.array(z.string()), // 商户ID数组（允许空数组）
  validFrom: z.coerce.date(), // 自动将字符串转换为 Date
  validUntil: z.coerce.date(), // 自动将字符串转换为 Date
  description: z.string().optional().nullable(),
  usageRules: z.string().optional().nullable(), // 使用规则说明（可选，可为空）
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]).optional(),
});

// 创建券模板 Schema（包含 refinement）
export const CreateCouponTemplateSchema = BaseCouponTemplateSchema.refine(
  (data) => data.validUntil > data.validFrom,
  {
    message: "有效期结束时间必须晚于开始时间",
    path: ["validUntil"],
  }
).refine(
  (data) => data.categoryId || data.merchantScope.length > 0,
  {
    message: "请选择商户类别或至少选择一个商户",
    path: ["categoryId"],
  }
);

// 更新券模板 Schema（使用基础 schema 的 partial）
export const UpdateCouponTemplateSchema = BaseCouponTemplateSchema.partial().refine(
  (data) => {
    // 只有当两个日期都存在时才验证
    if (data.validFrom && data.validUntil) {
      return data.validUntil > data.validFrom;
    }
    return true;
  },
  {
    message: "有效期结束时间必须晚于开始时间",
    path: ["validUntil"],
  }
);

export const CouponTemplateListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]).optional(),
  search: z.string().optional(),
});

export type CouponTemplateInput = z.infer<typeof CouponTemplateSchema>;
export type CreateCouponTemplateInput = z.infer<typeof CreateCouponTemplateSchema>;
export type UpdateCouponTemplateInput = z.infer<typeof UpdateCouponTemplateSchema>;
export type CouponTemplateListQueryInput = z.infer<typeof CouponTemplateListQuerySchema>;

// ============================================
// Order Schemas
// ============================================

export const OrderSchema = z.object({
  id: z.string(),
  orderNo: z.string(),
  userId: z.string(),
  templateId: z.string(),
  status: z.enum(["UNPAID", "PAID", "REDEEMED", "REFUNDING", "REFUNDED", "EXPIRED"]),
  payId: z.string().optional().nullable(),
  paidAt: z.date().optional().nullable(),
  redeemMerchantId: z.string().optional().nullable(),
  redeemedAt: z.date().optional().nullable(),
  refundId: z.string().optional().nullable(),
  refundReason: z.string().optional().nullable(),
  refundedAt: z.date().optional().nullable(),
  price: z.number().nonnegative(), // 修改：允许 0（免费券）
  faceValue: z.number().positive(),
  isFreeOrder: z.boolean().optional(), // 新增：是否为免费领取订单
  isLocked: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateOrderSchema = z.object({
  templateId: z.string().min(1, "请选择券模板"),
});

export const OrderListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  status: z.enum(["UNPAID", "PAID", "REDEEMED", "REFUNDING", "REFUNDED", "EXPIRED"]).optional(),
  userId: z.string().optional(),
});

export const RefundOrderSchema = z.object({
  orderId: z.string().min(1, "订单ID不能为空"),
  reason: z.string().min(1, "退款原因不能为空"),
});

export type OrderInput = z.infer<typeof OrderSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type OrderListQueryInput = z.infer<typeof OrderListQuerySchema>;
export type RefundOrderInput = z.infer<typeof RefundOrderSchema>;

// ============================================
// Settlement Schemas
// ============================================

export const SettlementSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  period: z.string(),
  totalAmount: z.number().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  status: z.enum(["PENDING", "CONFIRMED", "PAID"]),
  snapshotData: z.any(),
  confirmedAt: z.date().optional().nullable(),
  confirmedBy: z.string().optional().nullable(),
  paidAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const GenerateSettlementSchema = z.object({
  merchantId: z.string().min(1, "请选择商户"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "期间格式应为 YYYY-MM"),
});

export const SettlementListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  merchantId: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "PAID"]).optional(),
  period: z.string().optional(),
});

export const ConfirmSettlementSchema = z.object({
  settlementId: z.string().min(1, "结算单ID不能为空"),
});

export type SettlementInput = z.infer<typeof SettlementSchema>;
export type GenerateSettlementInput = z.infer<typeof GenerateSettlementSchema>;
export type SettlementListQueryInput = z.infer<typeof SettlementListQuerySchema>;
export type ConfirmSettlementInput = z.infer<typeof ConfirmSettlementSchema>;

// ============================================
// 退款审核 Schemas
// ============================================

export const ApproveRefundSchema = z.object({
  orderId: z.string().min(1, "订单ID不能为空"),
  adminNote: z.string().optional(),
});

export const RejectRefundSchema = z.object({
  orderId: z.string().min(1, "订单ID不能为空"),
  rejectReason: z.string().min(1, "拒绝原因不能为空"),
});

// ============================================
// 结算单标记已支付 Schema
// ============================================

export const MarkPaidSchema = z.object({
  settlementId: z.string().min(1, "结算单ID不能为空"),
  paymentNote: z.string().optional(),
});

// ============================================
// 文件上传 Schemas
// ============================================

export const UploadImageSchema = z.object({
  type: z.enum(["merchant_logo", "news_banner", "merchant_gallery"]),
});

export type ApproveRefundInput = z.infer<typeof ApproveRefundSchema>;
export type RejectRefundInput = z.infer<typeof RejectRefundSchema>;
export type MarkPaidInput = z.infer<typeof MarkPaidSchema>;
export type UploadImageInput = z.infer<typeof UploadImageSchema>;
