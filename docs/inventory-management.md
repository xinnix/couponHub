# 库存管理功能文档

## 概述

OpenCode 优惠券系统实现了完整的库存管理功能，包括自动化库存流转、库存变更日志记录和手动调整库存功能。

---

## 📊 库存自动流转

### 状态流转规则

券模板状态根据库存自动流转：

| 场景 | 库存变化 | 券模板状态 |
|------|---------|-----------|
| 库存 > 0 | - | `ACTIVE`（上架） |
| 库存 = 0 | 自动标记 | `DISABLED`（售罄） |
| 库存恢复 > 0 | 自动恢复 | `ACTIVE`（上架） |

### 自动触发场景

#### 1. 创建订单（预扣库存）
```typescript
场景：用户领取优惠券
操作：预扣库存 -1
状态：库存=0 → DISABLED（售罄）
日志：ORDER_CREATE
```

#### 2. 订单超时取消
```typescript
场景：订单未支付超时（15分钟）
操作：恢复库存 +1
状态：DISABLED → ACTIVE（重新上架）
日志：ORDER_CANCEL
定时任务：每 5 分钟执行
```

#### 3. 用户申请退款
```typescript
场景：用户主动申请退款
操作：恢复库存 +1
状态：DISABLED → ACTIVE（重新上架）
日志：REFUND
```

#### 4. 订单过期自动退款
```typescript
场景：订单使用期过期
操作：恢复库存 +1
状态：DISABLED → ACTIVE（重新上架）
日志：EXPIRED_REFUND
定时任务：每 10 分钟执行
```

---

## 📝 库存变更日志

### 日志字段

每条库存变更日志记录以下信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| `templateId` | 券模板 ID | `clx123` |
| `changeAmount` | 库存变化量 | `-1`（扣减），`+1`（恢复） |
| `currentStock` | 变更后库存 | `99` |
| `reason` | 变更原因 | `ORDER_CREATE` |
| `orderId` | 关联订单 ID | `ord456` |
| `adminId` | 操作员 ID | `admin789`（手动调整时） |
| `metadata` | 扩展信息 | `{ orderNo: "..." }` |
| `createdAt` | 变更时间 | `2024-04-13 10:30:00` |

### 变更原因枚举

```typescript
enum StockChangeReason {
  ORDER_CREATE       = 'ORDER_CREATE',       // 创建订单（预扣库存）
  ORDER_CANCEL       = 'ORDER_CANCEL',       // 订单取消（恢复库存）
  REFUND             = 'REFUND',             // 退款成功（恢复库存）
  EXPIRED_REFUND     = 'EXPIRED_REFUND',     // 过期订单自动退款（恢复库存）
  MANUAL_ADJUST      = 'MANUAL_ADJUST',      // 手动调整库存
}
```

### 查询接口（Admin）

#### 1. 查询库存日志列表

```typescript
// tRPC 调用示例
const result = await trpc.stockLog.getLogsByTemplate.query({
  templateId: 'clx123',
  startDate: '2024-04-01',
  endDate: '2024-04-13',
  reason: 'REFUND', // 可选：筛选退款记录
  limit: 50,
  offset: 0,
});

// 返回数据
{
  logs: [
    {
      id: 'log001',
      templateId: 'clx123',
      template: { id: 'clx123', title: '满100减20优惠券', status: 'ACTIVE' },
      changeAmount: -1,
      currentStock: 99,
      reason: 'ORDER_CREATE',
      order: { id: 'ord456', orderNo: '20240413123456', status: 'PAID' },
      createdAt: '2024-04-13T10:30:00Z',
    },
    {
      id: 'log002',
      templateId: 'clx123',
      template: { id: 'clx123', title: '满100减20优惠券', status: 'ACTIVE' },
      changeAmount: 1,
      currentStock: 100,
      reason: 'REFUND',
      order: { id: 'ord789', orderNo: '20240413123457', status: 'REFUNDED' },
      createdAt: '2024-04-13T11:00:00Z',
    },
  ],
  total: 120,
  hasMore: true,
}
```

#### 2. 获取库存变更统计

```typescript
// tRPC 调用示例
const stats = await trpc.stockLog.getStatistics.query({
  templateId: 'clx123',
  startDate: '2024-04-01',
  endDate: '2024-04-13',
});

// 返回数据
[
  { reason: 'ORDER_CREATE', count: 50, totalChange: -50 },
  { reason: 'REFUND', count: 10, totalChange: 10 },
  { reason: 'ORDER_CANCEL', count: 5, totalChange: 5 },
  { reason: 'EXPIRED_REFUND', count: 3, totalChange: 3 },
]
```

---

## 🔧 手动调整库存

### 功能说明

管理员可以手动调整券模板库存，适用于以下场景：

- 补充库存（增加库存）
- 错误订单修正（减少库存）
- 特殊活动需求（临时调整）

### 调整规则

1. **调整数量不能为 0**
2. **调整后库存不能为负数**
   - 例如：当前库存 5，调整数量 -10 → 报错
3. **自动状态流转**
   - 库存调整为 0 → 自动标记为 `DISABLED`（售罄）
   - 库存恢复 > 0 → 自动恢复为 `ACTIVE`（上架）
4. **必须填写调整原因**
   - 最多 200 字，记录在日志中

### API 接口

```typescript
// tRPC 调用示例
const result = await trpc.couponTemplate.adjustStock.mutate({
  templateId: 'clx123',
  amount: 50, // 增加库存 50（负数表示减少）
  reason: '为五一假期活动补充库存',
});

// 返回数据
{
  id: 'clx123',
  title: '满100减20优惠券',
  stock: 100,
  status: 'ACTIVE',
  updatedAt: '2024-04-13T10:30:00Z',
}
```

### 日志记录

手动调整库存会自动记录日志：

```typescript
{
  templateId: 'clx123',
  changeAmount: 50,
  currentStock: 100,
  reason: 'MANUAL_ADJUST',
  adminId: 'admin123', // 操作员 ID
  metadata: {
    reason: '为五一假期活动补充库存',
    previousStock: 50, // 调整前的库存
  },
  createdAt: '2024-04-13T10:30:00Z',
}
```

---

## 📈 环境配置

### 定时任务配置

```bash
# .env 文件

# 定时任务开关
SCHEDULER_ENABLED=true

# 批处理大小
SCHEDULER_BATCH_SIZE=100

# 订单超时时间（分钟）
ORDER_TIMEOUT_MINUTES=15

# 自动退款开关
AUTO_REFUND_ENABLED=true
```

---

## 🎯 使用场景示例

### 场景 1：监控券模板售罄情况

```typescript
// 查询最近售罄的券模板
const logs = await trpc.stockLog.getLogsByTemplate.query({
  templateId: 'clx123',
  startDate: '2024-04-01',
  endDate: '2024-04-13',
  reason: 'ORDER_CREATE',
  limit: 100,
});

// 分析：售罄速度
const soldOutLogs = logs.logs.filter(log => log.currentStock === 0);
```

### 场景 2：排查库存异常

```typescript
// 查询某个时间点的所有库存变更
const logs = await trpc.stockLog.getLogsByTemplate.query({
  templateId: 'clx123',
  startDate: '2024-04-10T00:00:00',
  endDate: '2024-04-10T23:59:59',
});

// 检查是否有异常调整
const manualAdjusts = logs.logs.filter(log => log.reason === 'MANUAL_ADJUST');
```

### 场景 3：运营分析

```typescript
// 获取上周的库存统计
const stats = await trpc.stockLog.getStatistics.query({
  templateId: 'clx123',
  startDate: '2024-04-06',
  endDate: '2024-04-13',
});

// 计算退款率
const createCount = stats.find(s => s.reason === 'ORDER_CREATE')?.count || 0;
const refundCount = stats.find(s => s.reason === 'REFUND')?.count || 0;
const refundRate = refundCount / createCount; // 退款率
```

### 场景 4：补充库存

```typescript
// 为热门活动补充库存
await trpc.couponTemplate.adjustStock.mutate({
  templateId: 'clx123',
  amount: 100,
  reason: '五一假期活动需求，紧急补充库存',
});
```

### 场景 5：修正错误订单

```typescript
// 发现某个订单重复扣减库存，手动修正
await trpc.couponTemplate.adjustStock.mutate({
  templateId: 'clx123',
  amount: -1, // 减少库存（实际应该扣减）
  reason: '修正订单 ord456 重复扣减库存问题',
});
```

---

## 🔒 安全性设计

### 1. 权限控制

所有库存调整接口需要管理员权限：
- `stockLog.getLogsByTemplate` → `protectedProcedure`
- `stockLog.getStatistics` → `protectedProcedure`
- `couponTemplate.adjustStock` → `protectedProcedure`

### 2. 操作审计

每次手动调整库存都记录：
- 操作员 ID
- 调整原因说明
- 调整前库存
- 调整后库存

### 3. 数据验证

- 调整数量不能为 0
- 调整后库存不能为负数
- 原因说明不能为空（最多 200 字）

---

## 📚 相关文件

### 后端文件
- `infra/database/prisma/schema.prisma` - 数据库模型定义
- `apps/api/src/modules/coupon/services/stock-log.service.ts` - 库存日志服务
- `apps/api/src/modules/coupon/services/template.service.ts` - 券模板服务（手动调整）
- `apps/api/src/modules/coupon/trpc/stock-log.router.ts` - 库存日志 API
- `apps/api/src/modules/coupon/trpc/template.router.ts` - 券模板 API
- `apps/api/src/modules/order/services/order.service.ts` - 订单服务（库存扣减/恢复）
- `apps/api/src/modules/scheduler/services/order-cancellation.service.ts` - 超时取消任务

### 配置文件
- `apps/api/.env.example` - 环境变量配置示例

---

## 🚀 未来扩展

可以考虑以下扩展功能：

1. **库存预警通知**
   - 库存低于阈值时自动通知运营人员
   - 售罄时发送邮件/钉钉通知

2. **库存快照**
   - 定时记录库存快照（每小时/每天）
   - 生成库存趋势报表

3. **批量调整库存**
   - 支持批量调整多个券模板库存
   - 一键补充所有即将售罄的券模板

4. **前端可视化**
   - Admin 后台库存日志页面
   - 库存变化趋势图表
   - 实时库存监控仪表盘

---

## 📖 最佳实践

### 运营建议

1. **定期检查库存日志**
   - 每周查看热门券模板的库存变化
   - 分析退款率，优化券模板规则

2. **合理设置初始库存**
   - 根据历史数据预测需求量
   - 留出一定的库存缓冲

3. **及时补充库存**
   - 活动前提前补充库存
   - 监控售罄速度，及时响应

4. **记录调整原因**
   - 详细说明调整原因，方便后续审计
   - 标注关联订单号（如果是订单修正）

### 开发建议

1. **定时任务监控**
   - 监控定时任务执行情况
   - 记录任务执行日志

2. **库存一致性检查**
   - 定期校验库存日志总和是否等于当前库存
   - 发现异常及时修正

3. **性能优化**
   - 库存日志分页查询（避免一次性查询过多）
   - 添加适当的数据库索引

---

**文档更新日期：2024-04-13**
**版本：v1.0**