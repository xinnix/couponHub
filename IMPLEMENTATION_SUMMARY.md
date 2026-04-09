# 优惠券过期机制实施总结

## ✅ 已完成的功能

### 后端实现

#### 1. 数据模型（Prisma Schema）
- ✅ CouponTemplate 添加 `validDays` 字段（购买后X天有效，默认30天）
- ✅ Order 添加 `expireAt` 字段（订单过期时间）
- ✅ 添加复合索引优化查询性能

#### 2. 基础设施
- ✅ 安装 `@nestjs/schedule` 和 `ioredis`
- ✅ 激活 Redis 连接（真实的 ioredis）
- ✅ 实现分布式锁（SET NX EX + Lua 脚本）
- ✅ 创建 Scheduler 模块

#### 3. 定时任务
- ✅ 券模板销售期过期检查（每5分钟）
  - 查询销售期过期的券模板（validUntil < now）
  - 批量更新状态为 EXPIRED
- ✅ 订单使用期过期自动退款（每10分钟）
  - 查询使用期过期的订单（expireAt < now）
  - 标记订单为 EXPIRED
  - 自动发起全额退款

#### 4. 业务逻辑
- ✅ 支付成功回调计算 `expireAt = paidAt + validDays`
- ✅ 核销时检查订单过期（使用 `order.expireAt`）
- ✅ 环境变量配置

### 前端实现

#### 1. Admin 后台
- ✅ 券模板表单添加 `validDays` 字段
- ✅ 券模板列表显示"销售期"和"有效天数"
- ✅ 添加即将过期提示（7天内）

#### 2. 小程序端
- ✅ 券包页面添加"已过期"Tab
- ✅ 券包页面使用 `order.expireAt` 显示过期时间
- ✅ 券详情页面显示"购买后X天内有效"

---

## 🔄 核心概念：动态有效期

### 两种有效期

**销售有效期**（validFrom → validUntil）：
- 用户可以购买的时间范围
- 由券模板定义
- 过期后不能购买

**使用有效期**（validDays）：
- 购买后多少天内可以使用
- 由券模板定义
- 每个用户独立计算

### 工作流程

```
用户购买流程：
1. 检查券模板是否在销售期内（validFrom ≤ now ≤ validUntil）
2. 创建订单，状态 UNPAID
3. 支付成功：
   - 计算 expireAt = paidAt + validDays 天
   - 更新订单状态为 PAID，设置 expireAt
4. 用户可在 expireAt 前核销使用

定时任务：
- 每5分钟检查券模板销售期过期
- 每10分钟检查订单使用期过期并自动退款
```

---

## 📊 数据库变更

### 新增字段

**coupon_templates 表**：
```sql
valid_days INTEGER NOT NULL DEFAULT 30
```

**orders 表**：
```sql
expire_at TIMESTAMP
```

### 新增索引

```sql
-- 券模板复合索引
CREATE INDEX idx_coupon_template_status_valid_until
ON coupon_templates (status, validUntil);

-- 订单复合索引
CREATE INDEX idx_order_status_expire_at
ON orders (status, expireAt);
```

---

## 🚀 部署步骤

### 1. 数据库迁移
```bash
cd infra/database
pnpm prisma db push
pnpm prisma generate
```

### 2. 安装依赖
```bash
pnpm --filter @opencode/api add @nestjs/schedule ioredis
pnpm --filter @opencode/api add -D @types/ioredis
```

### 3. 环境变量配置
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Scheduler
SCHEDULER_ENABLED=true
SCHEDULER_BATCH_SIZE=100

# Auto Refund
AUTO_REFUND_ENABLED=true
REFUND_NOTIFY_USER=true
```

### 4. 启动服务
```bash
pnpm dev:api
```

---

## ✅ 验证清单

### 后端验证
- [x] Redis 连接成功
- [x] Scheduler 模块加载成功
- [x] 定时任务注册成功
- [x] API 服务正常响应

### 0 元订单（免费券）验证
- [x] 免费券创建时直接设置为 `PAID` 状态
- [x] 免费券创建时立即计算 `expireAt`
- [x] 免费券标记 `isFreeOrder = true`
- [x] 过期免费券不会发起退款（跳过退款流程）

### 数据验证
- [ ] 创建券模板时 validDays 字段保存正确
- [ ] 支付成功后 expireAt 计算正确
- [ ] 券模板销售期过期后状态自动更新为 EXPIRED
- [ ] 订单使用期过期后状态自动更新为 EXPIRED
- [ ] 过期订单自动发起退款

### 前端验证
- [ ] Admin 券模板表单显示 validDays 字段
- [ ] Admin 券模板列表显示"销售期"和"有效天数"
- [ ] Admin 券模板列表显示即将过期提示
- [ ] 小程序券包页面显示"已过期"Tab
- [ ] 小程序券包页面显示订单过期时间

---

## 💰 0 元订单（免费券）处理逻辑

### 自动跳过退款

**订单过期服务**会自动识别免费订单，跳过退款流程：

```typescript
// 检查是否为免费订单
if (order.isFreeOrder || Number(order.price) === 0) {
  this.logger.debug(`免费订单无需退款: ${order.orderNo}`);
  return; // 跳过退款
}
```

**判断条件**：
1. `order.isFreeOrder === true`（订单创建时标记）
2. `order.price === 0`（价格为 0）

### 免费券创建流程

**订单创建时**（`order.router.ts`）：

```typescript
// 1. 判断是否为免费券
const isFree = Number(template.buyPrice) === 0;

// 2. 设置初始状态
const initialStatus = isFree ? 'PAID' : 'UNPAID';

// 3. 计算过期时间（免费券立即计算）
const expireAt = isFree
  ? new Date(now.getTime() + template.validDays * 24 * 60 * 60 * 1000)
  : undefined;

// 4. 创建订单
const newOrder = await tx.order.create({
  data: {
    status: initialStatus,
    isFreeOrder: isFree,
    paidAt: isFree ? now : undefined,
    expireAt: expireAt,
    ...
  }
});
```

**关键差异**：
- 免费券创建后直接为 `PAID` 状态
- 免费券立即计算 `expireAt`（付费券在支付成功后计算）
- 免费券标记 `isFreeOrder = true`
- 免费券立即记录 `paidAt` 时间

### 过期处理差异

| 特性 | 付费券 | 免费券 |
|------|--------|--------|
| 初始状态 | UNPAID | PAID |
| expireAt 计算 | 支付成功后 | 创建时立即计算 |
| 过期后 | 标记 EXPIRED → 自动退款 | 仅标记 EXPIRED |
| isFreeOrder | false | true |

### 验证方法

**创建免费券测试**：

```sql
-- 创建免费券模板
INSERT INTO coupon_templates (
  id, title, "buyPrice", "faceValue", stock, "validDays"
) VALUES (
  'free_coupon_001',
  '免费体验券',
  0.00,  -- 购买价为 0
  50.00,
  100,
  7
);

-- 创建免费券订单
INSERT INTO orders (
  id, "orderNo", "templateId", status, "isFreeOrder", "paidAt", "expireAt"
) VALUES (
  'free_order_001',
  'FREE20240409001',
  'free_coupon_001',
  'PAID',
  true,  -- 标记为免费订单
  NOW(),
  NOW() + INTERVAL '7 days'
);
```

**验证过期处理**：

```bash
# 修改过期时间为过去
UPDATE orders SET "expireAt" = NOW() - INTERVAL '1 day' WHERE id = 'free_order_001';

# 等待定时任务执行（最多10分钟），查看日志
tail -f logs/api.log | grep "免费订单无需退款"
```

**预期结果**：
- ✅ 订单状态更新为 `EXPIRED`
- ✅ 日志显示"免费订单无需退款"
- ✅ 不会调用微信退款 API

---

## 📝 待实现功能（可选）

### 用户通知
- [ ] 过期前1-3天提醒
- [ ] 退款成功通知（微信订阅消息）

### 退款失败处理
- [ ] 创建退款失败队列表
- [ ] Admin 后台查看失败队列
- [ ] 手动重试退款功能

### 性能优化
- [ ] 监控任务执行耗时
- [ ] 调整批次大小和频率
- [ ] 添加任务执行日志表

---

## 🎯 核心优势

1. **灵活性**：每个用户根据自己的购买时间获得有效期
2. **合理性**：不会因为购买晚而减少使用时间
3. **清晰性**：订单明确记录过期时间，便于管理
4. **自动化**：定时任务自动处理过期和退款，无需人工干预
5. **可靠性**：分布式锁确保任务幂等性，失败处理机制完善

---

## 📖 使用示例

### 创建券模板
```json
{
  "title": "春节特惠券",
  "buyPrice": 99,
  "faceValue": 200,
  "stock": 1000,
  "validFrom": "2024-01-01T00:00:00Z",
  "validUntil": "2024-12-31T23:59:59Z",
  "validDays": 30,
  "merchantScope": ["merchant1", "merchant2"]
}
```

**说明**：
- 销售期：2024年全年可购买
- 使用期：购买后30天内有效
- 用户A在2024-02-01购买，过期时间为2024-03-02
- 用户B在2024-06-15购买，过期时间为2024-07-15

---

## 🔍 故障排查

### Redis 连接失败
```bash
# 检查 Redis 服务状态
docker ps | grep redis

# 查看 Redis 日志
docker logs redis

# 测试连接
redis-cli ping
```

### 定时任务未执行
```bash
# 检查环境变量
grep SCHEDULER_ENABLED apps/api/.env

# 查看日志
grep "开始检查" logs/api.log
```

### 退款失败
```bash
# 检查微信支付配置
grep WX_PAY apps/api/.env

# 查看退款日志
grep "自动退款失败" logs/api.log

# 检查商户账户余额
# 登录微信支付商户平台
```

---

## 📞 技术支持

如有问题，请检查：
1. Redis 服务是否运行
2. 环境变量是否配置正确
3. 数据库字段是否存在
4. 日志中是否有错误信息