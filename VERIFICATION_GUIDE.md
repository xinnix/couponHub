# 优惠券过期机制 - 快速验证指南

## 🚀 快速测试步骤

### 1. 启动服务

```bash
# 确保 Redis 运行
docker ps | grep redis

# 启动 API 服务
pnpm dev:api
```

### 2. 创建测试券模板

**方式一：通过 Admin 后台**
1. 打开 http://localhost:5173
2. 进入"券模板管理"
3. 点击"新建券模板"
4. 填写信息：
   - 标题：测试券
   - 购买价：10
   - 面值：50
   - 库存：100
   - 销售期：当前时间到未来1小时
   - **有效天数：7**（购买后7天内有效）
   - 状态：上架

**方式二：通过数据库**
```sql
INSERT INTO coupon_templates (
  id, title, "buyPrice", "faceValue", stock, "merchantScope",
  "validFrom", "validUntil", "validDays", status
) VALUES (
  'test_coupon_001',
  '测试券',
  10.00,
  50.00,
  100,
  '[]',
  NOW(),
  NOW() + INTERVAL '1 hour',
  7,
  'ACTIVE'
);
```

### 3. 验证券模板创建

**查询券模板**：
```sql
SELECT id, title, "validDays", status FROM coupon_templates WHERE title = '测试券';
```

**预期结果**：
- `validDays` = 7
- `status` = 'ACTIVE'

### 4. 测试支付成功后计算过期时间

**模拟支付成功**（需要实际支付或修改数据库）：

```sql
-- 创建测试订单
INSERT INTO orders (
  id, "orderNo", "userId", "templateId", status, price, "faceValue"
) VALUES (
  'test_order_001',
  'TEST20240409001',
  'user_id_here',
  'test_coupon_001',
  'UNPAID',
  10.00,
  50.00
);

-- 模拟支付成功（设置过期时间）
UPDATE orders
SET
  status = 'PAID',
  "paidAt" = NOW(),
  "expireAt" = NOW() + INTERVAL '7 days',
  "payId" = 'test_pay_id'
WHERE id = 'test_order_001';
```

**验证过期时间**：
```sql
SELECT
  id,
  "orderNo",
  status,
  "paidAt",
  "expireAt",
  "expireAt" - "paidAt" as duration
FROM orders
WHERE id = 'test_order_001';
```

**预期结果**：
- `status` = 'PAID'
- `expireAt` = `paidAt` + 7天
- `duration` ≈ 7天

### 5. 测试券模板销售期过期

**修改券模板销售期为过去时间**：
```sql
UPDATE coupon_templates
SET "validUntil" = NOW() - INTERVAL '1 minute'
WHERE id = 'test_coupon_001';
```

**等待定时任务执行（最多5分钟）**：
```bash
# 查看 API 日志
tail -f logs/api.log | grep "券模板过期"
```

**或手动触发**：
```sql
-- 手动更新状态
UPDATE coupon_templates
SET status = 'EXPIRED'
WHERE id = 'test_coupon_001';
```

**验证状态**：
```sql
SELECT id, title, status, "validUntil" FROM coupon_templates WHERE id = 'test_coupon_001';
```

**预期结果**：
- `status` = 'EXPIRED'

### 6. 测试订单使用期过期自动退款

**修改订单过期时间为过去**：
```sql
UPDATE orders
SET "expireAt" = NOW() - INTERVAL '1 minute'
WHERE id = 'test_order_001';
```

**等待定时任务执行（最多10分钟）**：
```bash
# 查看 API 日志
tail -f logs/api.log | grep "订单过期"
```

**验证状态**：
```sql
SELECT
  id,
  "orderNo",
  status,
  "expireAt",
  "refundReason"
FROM orders
WHERE id = 'test_order_001';
```

**预期结果**：
- `status` = 'EXPIRED' 或 'REFUNDING'
- 如果启用了自动退款，状态应为 'REFUNDING'

### 7. 前端验证

#### Admin 后台
1. 打开券模板列表
2. 检查是否显示：
   - ✅ "销售期"列（显示 validFrom ~ validUntil）
   - ✅ "有效天数"列（显示 "7天" 标签）
   - ✅ 即将过期提示（如果销售期在7天内）

#### 小程序端
1. 打开券包页面
2. 检查是否显示：
   - ✅ "已过期" Tab
   - ✅ 订单显示的过期时间（使用 expireAt）

### 8. 测试核销过期检查

**创建已过期的订单**：
```sql
INSERT INTO orders (
  id, "orderNo", "userId", "templateId", status, price, "faceValue",
  "paidAt", "expireAt"
) VALUES (
  'test_order_002',
  'TEST20240409002',
  'user_id_here',
  'test_coupon_001',
  'PAID',
  10.00,
  50.00,
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '1 day'  -- 已过期
);
```

**尝试核销**（应该失败）：
```bash
# 通过 API 调用核销接口
curl -X POST http://localhost:3000/api/redemptions/redeem \
  -H "Content-Type: application/json" \
  -d '{"code": "二维码内容"}'
```

**预期结果**：
- 返回错误："该券已过期，无法核销"

---

## 📋 验证清单

### 后端验证
- [ ] Redis 连接成功（日志：`Redis 服务已连接`）
- [ ] Scheduler 模块加载成功（日志：`SchedulerModule dependencies initialized`）
- [ ] 券模板创建时 validDays 保存正确
- [ ] 支付成功后 expireAt 计算正确（paidAt + validDays）
- [ ] 券模板销售期过期后状态自动更新为 EXPIRED
- [ ] 订单使用期过期后状态自动更新为 EXPIRED
- [ ] 过期订单自动发起退款（状态变为 REFUNDING）
- [ ] 核销过期订单返回错误提示

### 前端验证
- [ ] Admin 券模板表单显示 validDays 字段
- [ ] Admin 券模板列表显示"销售期"和"有效天数"
- [ ] Admin 券模板列表显示即将过期提示（7天内）
- [ ] 小程序券包页面显示"已过期"Tab
- [ ] 小程序券包页面使用 expireAt 显示过期时间
- [ ] 小程序券详情页面显示"购买后X天内有效"

---

## 💰 0 元订单（免费券）验证

### 创建免费券模板

```sql
-- 创建免费券模板
INSERT INTO coupon_templates (
  id, title, "buyPrice", "faceValue", stock, "merchantScope",
  "validFrom", "validUntil", "validDays", status
) VALUES (
  'free_coupon_001',
  '免费体验券',
  0.00,  -- 购买价为 0
  50.00,
  100,
  '[]',
  NOW(),
  NOW() + INTERVAL '1 year',
  7,  -- 购买后7天内有效
  'ACTIVE'
);
```

### 验证免费券创建

**通过小程序或 API 创建免费券订单**：

预期结果：
- ✅ 订单状态直接为 `PAID`（跳过 UNPAID）
- ✅ `isFreeOrder = true`
- ✅ `paidAt` 已记录（创建时间）
- ✅ `expireAt` 已计算（创建时间 + 7天）

**SQL 验证**：
```sql
SELECT
  id,
  "orderNo",
  status,
  "isFreeOrder",
  "paidAt",
  "expireAt",
  "expireAt" - "paidAt" as duration
FROM orders
WHERE "templateId" = 'free_coupon_001';
```

### 验证过期处理

**修改免费券订单过期时间**：
```sql
UPDATE orders
SET "expireAt" = NOW() - INTERVAL '1 day'
WHERE "templateId" = 'free_coupon_001';
```

**等待定时任务执行**：
```bash
tail -f logs/api.log | grep "免费订单无需退款"
```

**验证结果**：
```sql
SELECT id, "orderNo", status, "refundReason"
FROM orders
WHERE "templateId" = 'free_coupon_001';
```

**预期结果**：
- ✅ `status = 'EXPIRED'`
- ✅ `refundReason` 为空或 null（未发起退款）
- ✅ 日志显示"免费订单无需退款"

---

## 🐛 常见问题排查

### 问题1：定时任务未执行
**检查**：
```bash
# 查看环境变量
grep SCHEDULER_ENABLED apps/api/.env

# 查看日志
tail -f logs/api.log | grep "开始检查"
```

**解决**：
- 确保 `SCHEDULER_ENABLED=true`
- 确保 Redis 连接成功

### 问题2：expireAt 未计算
**检查**：
```sql
SELECT id, "paidAt", "expireAt" FROM orders WHERE status = 'PAID';
```

**解决**：
- 确保支付成功回调正确执行
- 检查券模板的 validDays 字段是否存在

### 问题3：过期订单未自动退款
**检查**：
```bash
# 查看日志
tail -f logs/api.log | grep "自动退款"

# 检查环境变量
grep AUTO_REFUND_ENABLED apps/api/.env
```

**解决**：
- 确保 `AUTO_REFUND_ENABLED=true`
- 检查微信支付配置是否正确
- 查看商户账户余额是否充足

---

## 📊 性能测试

### 批量创建测试数据

```sql
-- 创建1000个过期订单测试性能
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    INSERT INTO orders (
      id, "orderNo", "userId", "templateId", status, price, "faceValue",
      "paidAt", "expireAt"
    ) VALUES (
      'perf_test_' || i,
      'PERF' || to_char(NOW(), 'YYYYMMDD') || LPAD(i::text, 6, '0'),
      'user_id_here',
      'test_coupon_001',
      'PAID',
      10.00,
      50.00,
      NOW() - INTERVAL '8 days',
      NOW() - INTERVAL '1 day'
    );
  END LOOP;
END $$;
```

**观察定时任务执行**：
```bash
# 查看处理日志
tail -f logs/api.log | grep "订单过期处理完成"
```

**预期**：
- 批量处理100条/批次
- 日志显示：`订单过期处理完成: 处理 X 条, 失败 0 条`

---

## ✅ 成功标准

1. ✅ 过期券模板自动标记为 `EXPIRED`（5分钟内）
2. ✅ 过期订单自动发起退款（10分钟内）
3. ✅ 支付成功后 expireAt 计算正确
4. ✅ 核销时拒绝过期券
5. ✅ 前端正确显示有效期信息
6. ✅ 定时任务稳定运行，无错误日志
7. ✅ 退款成功率 > 95%（需要实际微信支付环境测试）

---

## 🎉 验证完成

如果以上所有验证都通过，说明优惠券过期机制已成功实施！

下一步可以：
1. 进行更全面的集成测试
2. 实现用户通知功能（微信订阅消息）
3. 添加退款失败队列管理
4. 监控定时任务性能