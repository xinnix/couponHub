-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handlers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handlers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "openid" TEXT,
    "unionid" TEXT,
    "sessionKey" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "nickname" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "handlerId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "user_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "categoryId" TEXT NOT NULL,
    "area" TEXT,
    "floor" TEXT,
    "phone" TEXT,
    "gallery" JSONB,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_handlers" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_handlers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "content" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "isPopup" BOOLEAN NOT NULL DEFAULT false,
    "qrcodeUrl" TEXT,
    "qrcodeGeneratedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_coupon_relations" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_coupon_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "buyPrice" DECIMAL(10,2) NOT NULL,
    "faceValue" DECIMAL(10,2) NOT NULL,
    "settlementAmount" DECIMAL(10,2),
    "stock" INTEGER NOT NULL,
    "claimLimit" INTEGER DEFAULT 1,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "featuredOnHome" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "merchantScope" JSONB NOT NULL,
    "saleFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saleUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "useFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "useUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validDays" INTEGER DEFAULT 30,
    "description" TEXT,
    "usageRules" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "qrcodeUrl" TEXT,
    "qrcodeGeneratedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_logs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "changeAmount" INTEGER NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "adminId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "payId" TEXT,
    "paidAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3),
    "redeemMerchantId" TEXT,
    "handlerId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "refundId" TEXT,
    "refundReason" TEXT,
    "refundedAt" TIMESTAMP(3),
    "price" DECIMAL(10,2) NOT NULL,
    "faceValue" DECIMAL(10,2) NOT NULL,
    "isFreeOrder" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "snapshotData" JSONB NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_failure_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "refundNo" TEXT,
    "errorMessage" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_email_idx" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_username_idx" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "handlers_phone_key" ON "handlers"("phone");

-- CreateIndex
CREATE INDEX "handlers_phone_idx" ON "handlers"("phone");

-- CreateIndex
CREATE INDEX "handlers_merchantId_idx" ON "handlers"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_openid_key" ON "users"("openid");

-- CreateIndex
CREATE UNIQUE INDEX "users_unionid_key" ON "users"("unionid");

-- CreateIndex
CREATE INDEX "users_openid_idx" ON "users"("openid");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_handlerId_idx" ON "users"("handlerId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "roles_slug_idx" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "admin_roles_adminId_idx" ON "admin_roles"("adminId");

-- CreateIndex
CREATE INDEX "admin_roles_roleId_idx" ON "admin_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_adminId_roleId_key" ON "admin_roles"("adminId", "roleId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_token_key" ON "admin_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_adminId_idx" ON "admin_refresh_tokens"("adminId");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_token_idx" ON "admin_refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_refresh_tokens_token_key" ON "user_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "user_refresh_tokens_userId_idx" ON "user_refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "user_refresh_tokens_token_idx" ON "user_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "todos_userId_idx" ON "todos"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_categories_name_key" ON "merchant_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_categories_slug_key" ON "merchant_categories"("slug");

-- CreateIndex
CREATE INDEX "merchant_categories_status_idx" ON "merchant_categories"("status");

-- CreateIndex
CREATE INDEX "merchant_categories_sortOrder_idx" ON "merchant_categories"("sortOrder");

-- CreateIndex
CREATE INDEX "merchants_categoryId_idx" ON "merchants"("categoryId");

-- CreateIndex
CREATE INDEX "merchants_area_idx" ON "merchants"("area");

-- CreateIndex
CREATE INDEX "merchants_status_idx" ON "merchants"("status");

-- CreateIndex
CREATE INDEX "merchants_createdById_idx" ON "merchants"("createdById");

-- CreateIndex
CREATE INDEX "merchant_handlers_merchantId_idx" ON "merchant_handlers"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_handlers_userId_idx" ON "merchant_handlers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_handlers_merchantId_userId_key" ON "merchant_handlers"("merchantId", "userId");

-- CreateIndex
CREATE INDEX "news_status_idx" ON "news"("status");

-- CreateIndex
CREATE INDEX "news_createdAt_idx" ON "news"("createdAt");

-- CreateIndex
CREATE INDEX "news_createdById_idx" ON "news"("createdById");

-- CreateIndex
CREATE INDEX "news_isHero_idx" ON "news"("isHero");

-- CreateIndex
CREATE INDEX "news_isPopup_idx" ON "news"("isPopup");

-- CreateIndex
CREATE INDEX "news_status_isPopup_idx" ON "news"("status", "isPopup");

-- CreateIndex
CREATE INDEX "news_coupon_relations_newsId_idx" ON "news_coupon_relations"("newsId");

-- CreateIndex
CREATE INDEX "news_coupon_relations_couponId_idx" ON "news_coupon_relations"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "news_coupon_relations_newsId_couponId_key" ON "news_coupon_relations"("newsId", "couponId");

-- CreateIndex
CREATE INDEX "coupon_templates_categoryId_idx" ON "coupon_templates"("categoryId");

-- CreateIndex
CREATE INDEX "coupon_templates_status_idx" ON "coupon_templates"("status");

-- CreateIndex
CREATE INDEX "coupon_templates_saleFrom_saleUntil_idx" ON "coupon_templates"("saleFrom", "saleUntil");

-- CreateIndex
CREATE INDEX "coupon_templates_useFrom_useUntil_idx" ON "coupon_templates"("useFrom", "useUntil");

-- CreateIndex
CREATE INDEX "coupon_templates_createdById_idx" ON "coupon_templates"("createdById");

-- CreateIndex
CREATE INDEX "coupon_templates_isFree_idx" ON "coupon_templates"("isFree");

-- CreateIndex
CREATE INDEX "coupon_templates_status_isFree_idx" ON "coupon_templates"("status", "isFree");

-- CreateIndex
CREATE INDEX "coupon_templates_featuredOnHome_idx" ON "coupon_templates"("featuredOnHome");

-- CreateIndex
CREATE INDEX "coupon_templates_status_featuredOnHome_idx" ON "coupon_templates"("status", "featuredOnHome");

-- CreateIndex
CREATE INDEX "stock_logs_templateId_idx" ON "stock_logs"("templateId");

-- CreateIndex
CREATE INDEX "stock_logs_createdAt_idx" ON "stock_logs"("createdAt");

-- CreateIndex
CREATE INDEX "stock_logs_reason_idx" ON "stock_logs"("reason");

-- CreateIndex
CREATE INDEX "stock_logs_templateId_createdAt_idx" ON "stock_logs"("templateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNo_key" ON "orders"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payId_key" ON "orders"("payId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_templateId_idx" ON "orders"("templateId");

-- CreateIndex
CREATE INDEX "orders_userId_templateId_idx" ON "orders"("userId", "templateId");

-- CreateIndex
CREATE INDEX "orders_status_expireAt_idx" ON "orders"("status", "expireAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_payId_idx" ON "orders"("payId");

-- CreateIndex
CREATE INDEX "orders_orderNo_idx" ON "orders"("orderNo");

-- CreateIndex
CREATE INDEX "orders_redeemMerchantId_idx" ON "orders"("redeemMerchantId");

-- CreateIndex
CREATE INDEX "orders_handlerId_idx" ON "orders"("handlerId");

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- CreateIndex
CREATE INDEX "settlements_merchantId_idx" ON "settlements"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_merchantId_period_key" ON "settlements"("merchantId", "period");

-- CreateIndex
CREATE INDEX "refund_failure_logs_orderId_idx" ON "refund_failure_logs"("orderId");

-- CreateIndex
CREATE INDEX "refund_failure_logs_status_idx" ON "refund_failure_logs"("status");

-- CreateIndex
CREATE INDEX "refund_failure_logs_createdAt_idx" ON "refund_failure_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "handlers" ADD CONSTRAINT "handlers_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "handlers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_refresh_tokens" ADD CONSTRAINT "user_refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "merchant_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_handlers" ADD CONSTRAINT "merchant_handlers_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_handlers" ADD CONSTRAINT "merchant_handlers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_coupon_relations" ADD CONSTRAINT "news_coupon_relations_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_coupon_relations" ADD CONSTRAINT "news_coupon_relations_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupon_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_templates" ADD CONSTRAINT "coupon_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "merchant_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "coupon_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "coupon_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_redeemMerchantId_fkey" FOREIGN KEY ("redeemMerchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "handlers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
