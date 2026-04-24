import { z } from "zod";

// ============================================
// Auth Schemas
// ============================================

export const LoginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
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
  MENU: {
    DASHBOARD: 'menu:dashboard',
    MERCHANTS: 'menu:merchants',
    MERCHANT_CATEGORIES: 'menu:merchant-categories',
    COUPON_TEMPLATES: 'menu:coupon-templates',
    ORDERS: 'menu:orders',
    SETTLEMENTS: 'menu:settlements',
    REDEMPTIONS: 'menu:redemptions',
    USERS: 'menu:users',
    NEWS: 'menu:news',
    ADMINS: 'menu:admins',
    ROLES: 'menu:roles',
  },
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
  },
  ADMIN: {
    CREATE: 'admin:create',
    READ: 'admin:read',
    UPDATE: 'admin:update',
    DELETE: 'admin:delete',
    MANAGE_ROLES: 'admin:manage_roles',
  },
  ROLE: {
    CREATE: 'role:create',
    READ: 'role:read',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
  },
  HANDLER: {
    CREATE: 'handler:create',
    READ: 'handler:read',
    UPDATE: 'handler:update',
    DELETE: 'handler:delete',
  },
  MERCHANT: {
    CREATE: 'merchant:create',
    READ: 'merchant:read',
    UPDATE: 'merchant:update',
    DELETE: 'merchant:delete',
  },
  MERCHANT_CATEGORY: {
    CREATE: 'merchantCategory:create',
    READ: 'merchantCategory:read',
    UPDATE: 'merchantCategory:update',
    DELETE: 'merchantCategory:delete',
  },
  NEWS: {
    CREATE: 'news:create',
    READ: 'news:read',
    UPDATE: 'news:update',
    DELETE: 'news:delete',
  },
  COUPON_TEMPLATE: {
    CREATE: 'couponTemplate:create',
    READ: 'couponTemplate:read',
    UPDATE: 'couponTemplate:update',
    DELETE: 'couponTemplate:delete',
    ADJUST_STOCK: 'couponTemplate:adjust_stock',
  },
  ORDER: {
    READ: 'order:read',
    APPROVE_REFUND: 'order:approve_refund',
    REJECT_REFUND: 'order:reject_refund',
  },
  SETTLEMENT: {
    READ: 'settlement:read',
    CONFIRM: 'settlement:confirm',
    MARK_PAID: 'settlement:mark_paid',
  },
  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update',
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
  sortOrder: z.number().int().nonnegative("排序必须为非负整数").optional(), // 数字越大越靠前（降序）
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
  shopNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  gallery: z.array(z.string().url()).optional().nullable(),
  description: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMerchantSchema = z.object({
  name: z.string().min(1, "商户名称不能为空"),
  logo: z.string().url("Logo URL格式无效").optional().nullable(),
  categoryId: z.string().min(1, "请选择商户类别"),
  area: z.string().optional().nullable(),
  shopNumber: z.string().optional().nullable().transform(val => val === "" ? undefined : val),
  phone: z.string().optional().nullable().transform(val => val === "" ? undefined : val),
  gallery: z.array(z.string().url()).optional().nullable(),
  description: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable().transform(val => val === "" ? undefined : val),
  sortOrder: z.number().int().nonnegative("排序必须为非负整数").optional(), // 数字越大越靠前（降序）
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(), // 创建时可选，默认为 ACTIVE
});

export const UpdateMerchantSchema = z.object({
  name: z.string().min(1, "商户名称不能为空").optional(),
  logo: z.string().url("Logo URL格式无效").optional().nullable(),
  categoryId: z.string().min(1, "请选择商户类别").optional(),
  area: z.string().optional().nullable().transform(val => val === "" ? undefined : val),
  shopNumber: z.string().optional().nullable().transform(val => val === "" ? undefined : val),
  phone: z.string().optional().nullable().transform(val => val === "" ? undefined : val),
  gallery: z.array(z.string().url()).optional().nullable(),
  description: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable().transform(val => val === "" ? undefined : val),
  sortOrder: z.number().int().nonnegative("排序必须为非负整数").optional(), // 数字越大越靠前（降序）
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
  sortOrder: z.number().int().nonnegative(), // 排序权重（数字越大越靠前）
  viewCount: z.number().int(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  isHero: z.boolean(),
  isPopup: z.boolean(), // 新增字段：是否为首页弹窗新闻
  coupons: z.array(z.any()).optional(), // 新增：关联的优惠券列表（类型稍后定义）
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateNewsSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字"),
  bannerUrl: z.string().url("Banner URL格式无效").optional().nullable(),
  content: z.string().min(1, "内容不能为空"),
  couponIds: z.array(z.string()).optional(), // 新增：优惠券ID数组
  sortOrder: z.number().int().nonnegative("排序必须为非负整数").optional().default(0), // 排序权重（数字越大越靠前）
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
// Coupon Rules Constants & Schemas
// ============================================

export const COUPON_RULE_TYPES = {
  STACKING: {
    NO_STACK: 'no_stack',           // 不与其他优惠叠加
    LIMITED_STACK: 'limited_stack', // 限制叠加
    FREE_STACK: 'free_stack',       // 可自由叠加
    CUSTOM: 'custom',               // 自定义规则
  },
  REFUND: {
    FLEXIBLE: 'flexible',      // 未核销前随时退款
    LIMITED: 'limited',        // 限制退款
    NO_REFUND: 'no_refund',    // 不可退款
    CUSTOM: 'custom',          // 自定义规则
  },
  USAGE: {
    MIN_AMOUNT: 'min_amount',   // 最低消费金额
    TIME_LIMIT: 'time_limit',   // 时间限制
    CATEGORY: 'category',       // 商品类别限制
    CUSTOM: 'custom',           // 自定义规则
  },
} as const;

export const COUPON_RULE_TEMPLATES = {
  STACKING: {
    no_stack: '不与其他优惠活动同时使用，每单限用一张',
    limited_stack: '可与部分优惠叠加使用',
    free_stack: '可与其他优惠活动自由叠加',
  },
  REFUND: {
    flexible: '未核销前支持随时退款',
    limited: '购买后限制时间内可退款',
    no_refund: '购买后不支持退款',
  },
  USAGE: {
    min_amount: '满XX元可用',
    time_limit: '仅限工作日使用',
    category: '仅限指定商品类别使用',
  },
} as const;

// ============================================
// Coupon Rules Schemas (Dynamic Array)
// ============================================

// 单条规则 Schema
export const CouponRuleItemSchema = z.object({
  title: z.string()
    .min(1, "规则标题不能为空")
    .max(50, "规则标题最多50字"),
  content: z.string()
    .min(1, "规则内容不能为空")
    .max(500, "规则内容最多500字"),
});

// 规则数组 Schema
export const CouponRulesSchema = z.array(CouponRuleItemSchema)
  .min(1, "至少需要1条规则")
  .max(10, "最多支持10条规则");

// 类型导出
export type CouponRuleItem = z.infer<typeof CouponRuleItemSchema>;
export type CouponRules = z.infer<typeof CouponRulesSchema>;

// 默认规则（新建模板时使用）
export const DEFAULT_COUPON_RULES: CouponRuleItem[] = [
  { title: '叠加规则', content: '不与其他优惠活动同时使用，每单限用一张' },
  { title: '退改政策', content: '未核销前支持随时退款' },
];

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
  sortOrder: z.number().int().nonnegative().optional(), // 新增：排序权重（数字越大越靠前）
  categoryId: z.string().optional().nullable(), // 商户类别ID（可选）
  merchantScope: z.array(z.string()),
  saleFrom: z.date(), // 销售开始时间
  saleUntil: z.date(), // 销售结束时间
  useFrom: z.date(), // 使用开始时间
  useUntil: z.date(), // 使用结束时间
  validDays: z.number().int().positive().optional().nullable(), // 相对有效天数
  description: z.string().optional().nullable(),
  usageRules: CouponRulesSchema.optional().nullable(), // 使用规则（JSON 结构）
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
  validDays: z.number().int().positive("有效天数必须为正整数").optional().nullable(), // 新增：相对有效天数
  featuredOnHome: z.boolean().optional(), // 新增：是否展示到首页超值优惠
  sortOrder: z.number().int().nonnegative("排序必须为非负整数").optional(), // 新增：排序权重（数字越大越靠前）
  categoryId: z.string().optional().nullable(), // 商户类别ID（可选）
  merchantScope: z.array(z.string()), // 商户ID数组（允许空数组）
  saleFrom: z.coerce.date(), // 销售开始时间
  saleUntil: z.coerce.date(), // 销售结束时间
  useFrom: z.coerce.date(), // 使用开始时间
  useUntil: z.coerce.date(), // 使用结束时间
  description: z.string().optional().nullable(),
  usageRules: CouponRulesSchema.optional().nullable(), // 使用规则（JSON 结构，可选）
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]).optional(),
});

// 创建券模板 Schema（包含 refinement）
export const CreateCouponTemplateSchema = BaseCouponTemplateSchema.refine(
  (data) => data.saleUntil > data.saleFrom,
  {
    message: "销售结束时间必须晚于开始时间",
    path: ["saleUntil"],
  }
).refine(
  (data) => data.useUntil > data.useFrom,
  {
    message: "使用结束时间必须晚于开始时间",
    path: ["useUntil"],
  }
).refine(
  (data) => data.categoryId || data.merchantScope.length > 0,
  {
    message: "请选择商户类别或至少选择一个商户",
    path: ["categoryId"],
  }
);

// 更新券模板 Schema（部分字段可选，NOT NULL 字段需特殊处理）
export const UpdateCouponTemplateSchema = z.object({
  title: z.string().min(1, "券标题不能为空").max(100, "标题最多100字").optional(),
  buyPrice: z.number().nonnegative("购买价格不能为负").min(0, "购买价格不能为负").optional(),
  faceValue: z.number().positive("面值必须大于0").optional(),
  settlementAmount: z.number().nonnegative("结算金额不能为负").optional().nullable(),
  stock: z.number().int().nonnegative("库存不能为负").min(0, "库存不能为负").optional(),
  claimLimit: z.number().int().positive("每人限领数量必须为正整数").optional().nullable(),
  validDays: z.number().int().positive("有效天数必须为正整数").optional().nullable(),
  featuredOnHome: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative("排序必须为非负整数").optional(), // 新增：排序权重
  categoryId: z.string().optional().nullable(), // 商户类别ID（可选）
  merchantScope: z.array(z.string()).optional(), // 商户ID数组（NOT NULL，但不能设为 null，只能更新为新数组）
  saleFrom: z.coerce.date().optional(), // 销售开始时间
  saleUntil: z.coerce.date().optional(), // 销售结束时间
  useFrom: z.coerce.date().optional(), // 使用开始时间
  useUntil: z.coerce.date().optional(), // 使用结束时间
  description: z.string().optional().nullable(),
  usageRules: CouponRulesSchema.optional().nullable(), // 使用规则（JSON 结构，可选）
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]).optional(),
}).refine(
  (data) => {
    // 只有当两个日期都存在时才验证
    if (data.saleFrom && data.saleUntil) {
      return data.saleUntil > data.saleFrom;
    }
    return true;
  },
  {
    message: "销售结束时间必须晚于开始时间",
    path: ["saleUntil"],
  }
).refine(
  (data) => {
    // 只有当两个日期都存在时才验证
    if (data.useFrom && data.useUntil) {
      return data.useUntil > data.useFrom;
    }
    return true;
  },
  {
    message: "使用结束时间必须晚于开始时间",
    path: ["useUntil"],
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
// News Coupon Relation Schemas
// ============================================

export const NewsCouponRelationSchema = z.object({
  id: z.string(),
  newsId: z.string(),
  couponId: z.string(),
  createdAt: z.date(),
  coupon: CouponTemplateSchema, // 嵌套的优惠券信息
});

export type NewsCouponRelationInput = z.infer<typeof NewsCouponRelationSchema>;

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
  limit: z.number().int().positive().optional(),
  where: z.any().optional(),
  orderBy: z.any().optional(),
  include: z.any().optional(),
  select: z.any().optional(),
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
