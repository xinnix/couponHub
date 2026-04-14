# 销售期和使用期分离逻辑详解

## 一、业务背景

### 问题场景
优惠券应该有**两个完全独立的时间阶段**：

1. **销售期**：用户能购买的时间范围
2. **使用期**：用户能核销的时间范围

这两个阶段可以**完全不重叠**，典型场景：

**示例场景：**
- 销售期：2024-01-01 ~ 2024-01-10（用户只能在这10天购买）
- 使用期：2024-01-15 ~ 2024-02-15（用户购买后要等5天才能开始使用）

**结果：**
- 用户在 2024-01-05 购买优惠券
- 购买后无法立即使用（要等5天）
- 2024-01-15 才能开始核销
- 2024-02-15 使用期结束

---

## 二、数据模型设计

### CouponTemplate（优惠券模板）

```prisma
model CouponTemplate {
  // 销售期（控制购买）
  saleFrom      DateTime     // 销售开始时间
  saleUntil     DateTime     // 销售结束时间

  // 使用期（控制核销）
  useFrom       DateTime     // 使用开始时间
  useUntil      DateTime     // 使用结束时间

  // 相对有效期（可选）
  validDays     Int?         // 购买后X天内有效（辅助计算）
}
```

### Order（订单）

```prisma
model Order {
  expireAt      DateTime?    // 订单过期时间（动态计算）
}
```

---

## 三、过期时间计算逻辑

### 核心公式

```
expireAt = 有 validDays ? min(useUntil, paidAt + validDays) : useUntil
```

### 计算场景

#### 场景1：有相对有效天数（validDays=30）

**数据：**
- 用户支付时间：2024-01-05
- validDays：30天
- useUntil：2024-02-15

**计算：**
- 相对过期：2024-01-05 + 30天 = 2024-02-05
- 使用期截止：2024-02-15
- 最终 expireAt = **min(2024-02-05, 2024-02-15) = 2024-02-05**

**结果：用户实际有效期到 2024-02-05（相对有效期的最小值）**

#### 场景2：无相对有效天数（validDays=null）

**数据：**
- 用户支付时间：2024-01-05
- validDays：null（不设置）
- useUntil：2024-02-15

**计算：**
- 最终 expireAt = **useUntil = 2024-02-15**

**结果：所有用户统一在使用期截止时间过期**

---

## 四、完整时间检查流程

### 1️⃣ 用户购买时（创建订单）

**检查：销售期**

```typescript
// order.service.ts:59-65
const now = new Date();

if (template.saleFrom > now) {
  throw new BadRequestException('该券尚未开始销售');
}

if (template.saleUntil < now) {
  throw new BadRequestException('该券已结束销售');
}
```

**逻辑：**
- 只能在 `saleFrom ~ saleUntil` 时间段内购买
- 销售期结束后无法创建订单

---

### 2️⃣ 用户支付成功时

**计算：expireAt**

```typescript
// payment.controller.ts:168-177
const paidAt = payment.paidAt || new Date();

if (template.validDays && template.validDays > 0) {
  // 相对有效期：购买后X天有效
  const relativeExpireAt = new Date(paidAt);
  relativeExpireAt.setDate(relativeExpireAt.getDate() + template.validDays);

  // 取两者的最小值
  expireAt = relativeExpireAt < template.useUntil ? relativeExpireAt : template.useUntil;
} else {
  // 无相对有效期，使用固定截止时间
  expireAt = template.useUntil;
}
```

**关键点：**
- expireAt = min(paidAt + validDays, useUntil)
- 确保不超过使用期截止时间

---

### 3️⃣ 用户核销时（使用优惠券）

**检查：使用期 + 过期时间**

```typescript
// redemption.service.ts:62-74
const now = new Date();

// 1. 检查是否在使用期内
if (order.template.useFrom > now) {
  throw new BadRequestException('该券尚未开始使用');
}

if (order.template.useUntil < now) {
  throw new BadRequestException('该券已超过使用截止时间');
}

// 2. 检查订单是否过期
if (order.expireAt && new Date(order.expireAt) < new Date()) {
  throw new BadRequestException('该券已过期，无法核销');
}
```

**双重检查：**
1. **使用期检查**：必须在 `useFrom ~ useUntil` 时间段内
2. **过期时间检查**：订单的 expireAt 是否过期

**典型场景：**
- 销售期：2024-01-01 ~ 2024-01-10
- 使用期：2024-01-15 ~ 2024-02-15
- 用户在 2024-01-05 购买，validDays=30

**时间轴：**
```
2024-01-05 购买 → 2024-01-15 才能开始使用 → 2024-02-05 过期
（购买后要等10天才能用）
```

---

### 4️⃣ 用户申请退款时

**检查：使用期 + 过期时间**

```typescript
// order.service.ts:242-250
// 验证是否已核销
if (order.redeemedAt) {
  throw new BadRequestException('已核销的订单无法退款');
}

// 验证过期时间
if (order.expireAt && new Date(order.expireAt) < new Date()) {
  throw new BadRequestException('订单已过期，请申请过期退款');
}

// 验证使用期截止时间
if (order.template.useUntil < new Date()) {
  throw new BadRequestException('已超过使用期截止时间，无法退款');
}
```

**逻辑：**
- 已核销 → 无法退款
- 已过期 → 申请过期退款（自动退款）
- 使用期已结束 → 无法退款

---

### 5️⃣ 订单过期自动退款

**定时任务：每10分钟检查**

```typescript
// order-expiration.service.ts
WHERE status = 'PAID' AND expireAt < now
ORDER BY expireAt ASC
```

**触发条件：**
- 订单的 expireAt 已过期
- 自动发起全额退款
- 恢复库存

---

### 6️⃣ 优惠券模板过期（销售期结束）

**定时任务：每5分钟检查**

```typescript
// coupon-template-expiration.service.ts:43-58
WHERE status = 'ACTIVE' AND saleUntil < now
```

**动作：**
- 将券模板标记为 EXPIRED（停止销售）
- 用户无法继续购买
- 但已购买的订单仍可在使用期内核销

---

## 五、时间关系示例图

### 典型场景：预售券

```
时间轴：
─────────────────────────────────────────────────────→

[销售期]              [使用期]
   ↓                      ↓
2024-01-01         2024-01-15
   │                  │
   │  用户购买         │  用户开始使用
   │  (01-05)         │
   │                  │
2024-01-10         2024-02-15
   ↓                      ↓
销售结束             使用结束

用户购买时间：2024-01-05
用户使用时间：2024-01-15 ~ 2024-02-05
（购买后等待10天才能开始使用）
```

### 典型场景：即时使用券

```
时间轴：
─────────────────────────────────────────────────────→

[销售期和使用期重叠]
   ↓
2024-01-01
   │
   │  用户购买后立即可用
   │
2024-01-31
   ↓
销售和使用同时结束

用户购买时间：2024-01-05
用户使用时间：2024-01-05 ~ 2024-02-05（validDays=30）
（购买后立即可以使用）
```

---

## 六、前端展示逻辑

### 管理后台（TemplateForm.tsx）

**两套独立的时间选择器：**

```tsx
{/* 销售期 */}
<Form.Item label="销售期">
  <DatePicker name="saleFrom" placeholder="销售开始时间" />
  <DatePicker name="saleUntil" placeholder="销售结束时间" />
</Form.Item>

{/* 使用期 */}
<Form.Item label="使用期">
  <DatePicker name="useFrom" placeholder="使用开始时间" />
  <DatePicker name="useUntil" placeholder="使用结束时间" />
</Form.Item>

{/* 相对有效天数（可选） */}
<Form.Item name="validDays" label="有效天数（可选）">
  <InputNumber placeholder="购买后X天内有效" />
</Form.Item>
```

**智能提示：**
- 如果使用期晚于销售期结束，自动显示等待天数
- 帮助运营人员理解时间关系

---

### 小程序前端（detail.vue）

**展示两个时间段：**

```vue
<!-- 销售期 -->
<text>销售期：{{ formatDate(coupon?.saleFrom) }} 至 {{ formatDate(coupon?.saleUntil) }}</text>

<!-- 使用期 -->
<text>使用期：{{ formatDate(coupon?.useFrom) }} 至 {{ formatDate(coupon?.useUntil) }}</text>

<!-- 有效期说明 -->
<text>
  {{ coupon?.validDays
    ? `购买后${coupon.validDays}天内有效（不超过使用截止时间）`
    : `在规定使用期内有效`
  }}
</text>
```

---

## 七、关键设计要点

### 1️⃣ 为什么分离销售期和使用期？

**业务需求：**
- **预售券**：提前销售，延迟使用（如节日特惠券）
- **限时活动券**：短期销售，长期使用（如开业庆典券）
- **常规券**：销售和使用同步进行

**灵活性：**
- 运营可以完全控制两个时间阶段
- 支持各种复杂的营销场景

### 2️⃣ expireAt 为什么取最小值？

**逻辑：** `expireAt = min(paidAt + validDays, useUntil)`

**原因：**
- 相对有效期不能超过使用期截止时间
- 避免用户在 useUntil 之后仍能使用
- 确保业务规则的统一性

**示例：**
- validDays=90，useUntil=2024-02-15
- 用户在 2024-01-05 购买
- 相对过期：2024-04-05（超过使用期）
- 实际过期：min(2024-04-05, 2024-02-15) = **2024-02-15**

### 3️⃣ 核销时为什么要双重检查？

**检查点：**
1. 使用期（useFrom ~ useUntil）
2. 订单过期时间（expireAt）

**场景分析：**
- **场景A**：订单未过期，但未到使用期 → 拒绝核销（"尚未开始使用"）
- **场景B**：订单已过期，但在使用期内 → 拒绝核销（"已过期"）
- **场景C**：订单未过期，在使用期内 → 允许核销 ✓

**目的：**
- 确保两个时间约束都生效
- 防止时间混乱导致的核销错误

---

## 八、常见问题解答

### Q1: 用户购买后能否立即使用？

**答案：取决于时间设置**

- 如果 `useFrom <= saleUntil`，用户购买后可能能立即使用
- 如果 `useFrom > saleUntil`，用户需要等待一段时间才能使用

**示例：**
```
销售期：2024-01-01 ~ 2024-01-10
使用期：2024-01-15 ~ 2024-02-15

用户在 2024-01-05 购买 → 需等待 10 天才能使用
```

### Q2: 销售期结束后用户还能核销吗？

**答案：可以**

- 销售期结束只影响新用户购买
- 已购买的用户仍可在使用期内核销
- 订单的 expireAt 是独立计算的

**示例：**
```
销售期：2024-01-01 ~ 2024-01-10（已结束）
使用期：2024-01-15 ~ 2024-02-15（仍在）

用户在 2024-01-05 购买 → 可以在 2024-01-15 之后核销 ✓
```

### Q3: 使用期结束后还能退款吗？

**答案：不能**

- 使用期结束意味着优惠券彻底失效
- 无法退款，订单状态会过期并自动退款

**检查逻辑：**
```typescript
if (order.template.useUntil < new Date()) {
  throw new BadRequestException('已超过使用期截止时间，无法退款');
}
```

### Q4: validDays 设置为 null 和设置具体值有什么区别？

**区别：过期时间计算方式**

- **null（不设置）**：expireAt = useUntil（所有用户统一过期）
- **设置具体值**：expireAt = min(paidAt + validDays, useUntil)（相对有效期）

**适用场景：**
- **null**：限时活动券，统一过期时间
- **具体值**：常规券，每个用户独立计算有效期

---

## 九、总结

### 时间阶段关系

```
┌─────────────────────────────────────────────────┐
│  CouponTemplate 时间字段                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  saleFrom ──→ saleUntil  (销售期)               │
│  │            │                                 │
│  │            │  用户只能在此时间段购买          │
│  │            │                                 │
│  useFrom  ──→ useUntil   (使用期)               │
│  │            │                                 │
│  │            │  用户只能在此时间段核销          │
│  │            │                                 │
│  validDays  (相对有效期，可选)                   │
│  │            │                                 │
│  │            │  用于辅助计算 expireAt          │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Order 动态计算字段                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  expireAt  (订单过期时间)                        │
│  │            │                                 │
│  │            │  = min(paidAt + validDays,      │
│  │            │      useUntil)                  │
│  │            │                                 │
│  │            │  控制订单是否过期                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 完整检查流程

```
用户操作流程：

购买 ──→ 检查销售期 ──→ 计算expireAt
  │         │              │
  │    saleFrom~saleUntil   │
  │         │              │
  │         ✓              min(paidAt+validDays, useUntil)
  │                        │
支付成功 ─────────────────→ expireAt已设置
  │
  │
核销 ──→ 检查使用期 + 过期时间
  │         │              │
  │    useFrom~useUntil     │
  │         │              │
  │         ✓              expireAt是否过期
  │                        │
  │                        ✓
  │                        │
成功核销 ────────────────→ 订单状态更新为 REDEEMED
```

---

**实施完成！系统已支持销售期和使用期完全分离的逻辑。**