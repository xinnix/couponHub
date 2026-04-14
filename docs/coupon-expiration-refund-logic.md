# 优惠券过期退款逻辑详解

## 一、核心数据模型

### 1. CouponTemplate（优惠券模板）

**关键字段：**
- `validityType`：有效期类型（RELATIVE | ABSOLUTE）
  - RELATIVE：相对有效期，购买后X天有效
  - ABSOLUTE：绝对有效期，统一过期时间
- `validDays`：有效天数（仅RELATIVE模式使用，默认30天）
- `validFrom`：销售/有效期开始
- `validUntil`：销售/有效期结束
- `stock`：当前库存数量

### 2. Order（订单）

**关键字段：**
- `status`：订单状态流转
  ```
  UNPAID → PAID → REDEEMED（已核销）
         ↓      ↓
      CANCELLED EXPIRED → REFUNDING → REFUNDED
  ```
- `expireAt`：订单过期时间（动态计算）
- `paidAt`：支付时间
- `isFreeOrder`：是否为免费券订单
- `price`：订单金额（免费券为0）

### 3. RefundFailureLog（退款失败日志）

**作用：**记录退款失败，支持自动重试
- `status`：PENDING | RETRYING | SUCCESS | FAILED
- `retryCount`：重试次数（最多3次）

---

## 二、过期时间计算（expireAt）

### 场景1：支付成功回调（payment.controller.ts:168-177）

```typescript
// 根据 validityType 计算 expireAt
if (template.validityType === 'ABSOLUTE') {
  // 绝对有效期：统一过期时间
  expireAt = template.validUntil;
} else {
  // 相对有效期：paidAt + validDays 天
  expireAt = new Date(paidAt);
  expireAt.setDate(expireAt.getDate() + (template.validDays || 30));
}
```

**示例：**
- RELATIVE模式：用户在 2024-03-01 支付，validDays=30 → expireAt = 2024-04-01
- ABSOLUTE模式：所有用户 expireAt = template.validUntil（如 2024-12-31）

### 场景2：免费券创建（order.router.ts:93-105）

```typescript
// 免费券无需支付，直接计算 expireAt
if (isFree) {
  if (template.validityType === 'ABSOLUTE') {
    expireAt = template.validUntil;
  } else {
    expireAt = new Date(now.getTime() + (template.validDays || 30) * 24 * 60 * 60 * 1000);
  }
}
```

---

## 三、过期检查机制（定时任务）

### 1. OrderExpirationService（order-expiration.service.ts）

**触发频率：**每10分钟执行一次
```typescript
@Cron('0 */10 * * * *')
async handleExpiredOrders() { ... }
```

**查询条件：**
```typescript
WHERE status = 'PAID' AND expireAt < now
ORDER BY expireAt ASC  // 优先处理最早过期的
```

**执行流程：**
```
1. 获取分布式锁（scheduler:order-expiration，30秒TTL）
2. 分批查询过期订单（每批10条）
3. 并行处理（Promise.allSettled，最多10个并发）
4. 释放锁
```

---

## 四、单个过期订单处理流程

### processExpiredOrder() 核心逻辑

#### 步骤1：标记订单为 EXPIRED

```typescript
await prisma.order.update({
  where: { id: order.id },
  data: { status: 'EXPIRED' }
});
```

**目的：**防止重复处理，订单状态锁定为EXPIRED

#### 步骤2：检查是否需要退款

```typescript
// 检查配置开关
const autoRefundEnabled = configService.get('AUTO_REFUND_ENABLED') === 'true';

// 检查是否为免费券
if (order.isFreeOrder || Number(order.price) === 0) {
  return; // 免费券无需退款
}

// 金额大于0的订单发起退款
await initiateAutoRefund(order);
```

#### 步骤3：发起微信退款

```typescript
// 更新状态为 REFUNDING
await prisma.order.update({
  where: { id: order.id },
  data: {
    status: 'REFUNDING',
    refundReason: '订单过期自动退款'
  }
});

// 调用微信退款API
const refundNo = `expire_refund_${Date.now()}`;
await wechatPayService.refund({
  orderNo: order.orderNo,
  refundNo: refundNo,
  totalAmount: Number(order.price),
  refundAmount: Number(order.price), // 全额退款
  reason: '订单过期自动退款'
});
```

**状态变更：**EXPIRED → REFUNDING

---

## 五、退款成功回调处理

### 微信退款回调（payment.controller.ts:245-258）

```typescript
@Post('wechat/refund-callback')
async refundCallback() {
  // 解密回调数据
  const refund = await wechatPayService.handleRefundCallback(...);

  // 验证订单状态为 REFUNDING
  if (order.status !== 'REFUNDING') {
    return { code: 'SUCCESS', message: 'OK' };
  }

  // 根据退款状态处理
  if (refund.refundStatus === 'SUCCESS') {
    // ✅ 关键修复：调用 confirmRefund 恢复库存
    await orderService.confirmRefund(order.id, refund.refundId);
  } else if (refund.refundStatus === 'CLOSED' || refund.refundStatus === 'ABNORMAL') {
    // 退款失败，恢复订单状态为 PAID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        refundReason: `退款失败: ${refund.refundStatus}`
      }
    });
  }
}
```

**状态变更：**REFUNDING → REFUNDED（成功）或 PAID（失败）

---

## 六、库存恢复逻辑

### OrderService.confirmRefund()（order.service.ts:279-347）

```typescript
async confirmRefund(orderId: string, refundId: string) {
  // 1. 更新订单状态为 REFUNDED
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'REFUNDED',
      refundId,
      refundedAt: new Date()
    }
  });

  // 2. 恢复库存
  const currentTemplate = await prisma.couponTemplate.findUnique(...);

  // 如果之前库存为0（售罄状态），退款后恢复上架
  const shouldReactivate = currentTemplate.stock === 0 && currentTemplate.status === 'DISABLED';

  await prisma.couponTemplate.update({
    where: { id: templateId },
    data: {
      stock: { increment: 1 }, // 库存+1
      ...(shouldReactivate && { status: 'ACTIVE' }) // 恢复上架
    }
  });

  // 3. 记录库存变更日志
  const refundReason = order.status === 'EXPIRED'
    ? StockChangeReason.EXPIRED_REFUND  // 过期退款
    : StockChangeReason.REFUND;         // 正常退款

  await stockLogService.log(
    templateId,
    1, // 恢复数量
    updatedTemplate.stock, // 当前库存
    refundReason,
    orderId,
    undefined,
    { orderNo, refundId, originalStatus: order.status }
  );
}
```

**关键点：**
- 库存+1（increment）
- 如果之前售罄（stock=0），自动恢复上架状态
- 记录详细的库存变更日志（区分过期退款和正常退款）

---

## 七、退款失败处理机制

### 1. 写入失败队列（order-expiration.service.ts:199-225）

```typescript
catch (error) {
  // 恢复订单状态为 EXPIRED
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'EXPIRED',
      refundReason: `自动退款失败: ${error.message}`
    }
  });

  // ✅ 写入退款失败队列
  await prisma.refundFailureLog.create({
    data: {
      orderId: order.id,
      orderNo: order.orderNo,
      errorMessage: error.message,
      status: 'PENDING',
      retryCount: 0
    }
  });
}
```

### 2. 定时重试机制（order-expiration.service.ts:244-325）

```typescript
@Cron('0 * * * *')  // 每小时执行
async retryFailedRefunds() {
  // 查询需要重试的记录
  const failures = await prisma.refundFailureLog.findMany({
    where: {
      status: { in: ['PENDING', 'RETRYING'] },
      retryCount: { lt: 3 }  // 最多重试3次
    },
    take: 50
  });

  for (const failure of failures) {
    // 检查订单状态是否仍为 EXPIRED
    const order = await prisma.order.findUnique(...);

    if (order.status !== 'EXPIRED') {
      // 标记为失败
      await prisma.refundFailureLog.update({
        where: { id: failure.id },
        data: {
          status: 'FAILED',
          errorMessage: '订单状态已变更'
        }
      });
      continue;
    }

    // 更新重试计数
    await prisma.refundFailureLog.update({
      where: { id: failure.id },
      data: {
        retryCount: { increment: 1 },
        status: 'RETRYING'
      }
    });

    // 再次发起退款
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDING',
        refundReason: `重试退款（第${failure.retryCount + 1}次）`
      }
    });

    try {
      const refundNo = `retry_refund_${Date.now()}_${failure.id}`;
      await wechatPayService.refund({ ... });

      // 标记为成功
      await prisma.refundFailureLog.update({
        where: { id: failure.id },
        data: {
          status: 'SUCCESS',
          refundNo
        }
      });
    } catch (error) {
      // 重试失败，更新错误信息
      await prisma.refundFailureLog.update({
        where: { id: failure.id },
        data: {
          errorMessage: error.message,
          retryCount: { increment: 1 },
          ...(failure.retryCount + 1 >= 3 && { status: 'FAILED' })
        }
      });
    }
  }
}
```

---

## 八、并发控制和性能优化

### 1. 分布式锁机制

```typescript
// 全局锁：防止多个实例同时处理
const lock = await redisService.acquireLock(
  'scheduler:order-expiration',
  30000  // 30秒TTL
);

if (!lock) {
  logger.warn('订单过期任务正在其他实例执行');
  return;
}

try {
  // 处理逻辑...
} finally {
  await redisService.releaseLock('scheduler:order-expiration', lock);
}
```

**锁机制原理（Redis）：**
```typescript
// SET key value PX ttl NX
await client.set(lockKey, lockValue, 'PX', ttl, 'NX');

// Lua脚本释放锁（确保原子性）
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
```

### 2. 并行处理优化

```typescript
// 批量并行处理（最多10个并发）
const batchConcurrentSize = 10;
const results = await Promise.allSettled(
  orders.map(order => this.processExpiredOrder(order))
);

// 统计成功/失败
results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    processed++;
  } else {
    failed++;
    this.recordFailure(orders[index], result.reason);
  }
});

// 批次间间隔100ms（避免CPU占用过高）
await sleep(100);
```

**优势：**
- 相比串行处理（for循环），并行处理10个订单可提升10倍效率
- Promise.allSettled 保证即使部分失败，其他仍能继续处理
- 批次间间隔100ms，避免瞬间CPU峰值

---

## 九、完整状态流转图

```
用户购买优惠券
  │
  ├─ 免费券 → 直接创建订单（status=PAID，expireAt已计算）
  │
  └─ 付费券 → 创建订单（status=UNPAID）
      │
      用户支付成功
        │
        ├─ 计算expireAt（根据validityType）
        ├─ 更新订单（status=PAID，paidAt，expireAt）
        │
        │
        【定时任务：每10分钟检查】
        │
        查询过期订单（status=PAID AND expireAt < now）
          │
          ├─ 标记EXPIRED
          │
          ├─ 检查是否需要退款
          │   ├─ 免费券 → 结束（无需退款）
          │   └─ 付费券 → 发起退款
          │       │
          │       更新订单（status=REFUNDING）
          │       调用微信退款API
          │       │
          │       ├─ 退款成功
          │       │   │
          │       │   【微信回调】refundStatus=SUCCESS
          │       │     │
          │       │     ├─ 更新订单（status=REFUNDED）
          │       │     ├─ 恢复库存（stock+1）
          │       │     ├─ 记录库存日志（EXPIRED_REFUND）
          │       │     └─ 如果售罄，恢复上架（status=ACTIVE）
          │       │
          │       └─ 退款失败
          │           │
          │           【微信回调】refundStatus=CLOSED/ABNORMAL
          │             │
          │             ├─ 更新订单（status=PAID）
          │             ├─ 记录退款失败原因
          │             │
          │           【或发起退款时失败】
          │             │
          │             ├─ 恢复订单（status=EXPIRED）
          │             ├─ 写入失败队列（RefundFailureLog）
          │             │
          │             【定时重试：每小时】
          │               │
          │               ├─ 查询失败记录（retryCount<3）
          │               ├─ 再次发起退款
          │               ├─ 成功 → 标记SUCCESS
          │               └─ 失败 → 重试计数+1，达到3次标记FAILED
```

---

## 十、关键设计要点总结

### 1. 为什么先标记EXPIRED再退款？

**原因：**
- 防止重复处理：如果先退款再标记，退款过程中定时任务可能再次查询到该订单
- 状态锁定：EXPIRED状态表示已进入退款流程，不会被其他任务处理
- 失败恢复：退款失败时可以安全恢复为EXPIRED状态，不会造成状态混乱

### 2. 为什么需要分布式锁？

**场景：**多个API实例同时运行定时任务

**风险：**
- 同一订单被多个实例同时处理 → 重复退款
- 微信退款API并发调用 → 可能触发限流
- 库存重复恢复 → 数据不一致

**解决方案：**全局分布式锁 + 30秒TTL

### 3. 为什么使用Promise.allSettled并行处理？

**对比：**
- **串行处理（for循环）**：100个订单需耗时约100秒
- **并行处理（并发10）**：100个订单只需约10秒（10倍提升）

**关键：**
- Promise.allSettled 确保部分失败不影响整体
- 批次间隔100ms避免CPU峰值
- 并发数限制为10，避免微信API限流

### 4. 为什么需要退款失败队列？

**场景：**微信退款API可能失败（网络超时、API限流、系统异常）

**风险：**
- 退款失败但订单已过期 → 用户损失
- 库存未恢复 → 库存数据不准确

**解决方案：**
- 写入失败队列，自动重试（最多3次）
- 人工介入：FAILED状态记录需要人工处理

### 5. 库存恢复为什么需要判断售罄状态？

**场景：**券模板之前售罄（stock=0，status=DISABLED）

**逻辑：**
- 退款后库存恢复+1 → stock=1
- 自动恢复上架 → status=ACTIVE
- 用户可以继续购买

**目的：**提升库存利用率，避免售罄后永久下架

---

## 十一、配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| AUTO_REFUND_ENABLED | 是否启用过期自动退款 | 'true' |
| SCHEDULER_BATCH_SIZE | 定时任务批次大小（已改为并发数） | 10 |

---

## 十二、监控指标建议

建议监控以下指标：
- 过期订单处理成功率
- 退款成功率
- 平均处理耗时
- 退款失败队列长度
- 重试成功率

---

## 总结

优惠券过期退款逻辑涉及多个关键环节：
1. **过期时间计算**：根据validityType动态计算expireAt
2. **定时检查**：每10分钟扫描过期订单
3. **状态管理**：PAID → EXPIRED → REFUNDING → REFUNDED
4. **并发控制**：分布式锁 + 并行处理（10并发）
5. **库存恢复**：退款成功自动恢复库存并记录日志
6. **失败处理**：写入队列 + 定时重试（最多3次）
7. **性能优化**：Promise.allSettled并行处理 + 批次间隔100ms

整个流程确保了高并发下的数据一致性和可靠性，同时优化了处理效率。