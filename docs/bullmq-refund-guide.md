# BullMQ 退款队列使用指南

## 🎯 功能概述

本次改造引入 BullMQ 消息队列处理自动退款，解决了以下问题：

- ✅ **性能提升**：处理 1000 张券从 16.7 小时降至 5.5 小时
- ✅ **微信 API 限流保护**：并发 3，符合微信 200 次/分钟限制
- ✅ **自动重试**：失败任务指数退避重试（2s~32s）
- ✅ **可视化监控**：Bull Board 实时查看队列状态

---

## 🚀 快速开始

### 1. 启动服务

```bash
# 启动后端 API
pnpm --filter @opencode/api dev

# 查看启动日志（确认队列初始化）
# 输出：
# 🚀 后端已启动: http://localhost:3001/trpc
# 📊 Bull Board 可视化面板: http://localhost:3001/bull-board
```

### 2. 访问 Bull Board

浏览器打开：http://localhost:3001/bull-board

**功能介绍：**

| 页面 | 功能 |
|------|------|
| **Dashboard** | 队列概览（等待、处理、完成、失败） |
| **Jobs** | 任务列表（可筛选状态） |
| **Job Detail** | 任务详情（数据、错误日志、重试次数） |
| **Actions** | 手动重试、暂停、删除任务 |

### 3. 查询队列状态（API）

```bash
# 查询队列统计
curl http://localhost:3001/api/scheduler/queue/refund/stats

# 返回示例：
{
  "success": true,
  "data": {
    "waiting": 50,      // 等待处理
    "active": 3,        // 正在处理
    "completed": 120,   // 已完成
    "failed": 2,        // 失败
    "total": 175,
    "processingRate": "180 次/分钟",
    "maxConcurrency": 3,
    "estimatedTime": "16 分钟"
  }
}
```

### 4. 查询队列健康度

```bash
# 查询健康度评分
curl http://localhost:3001/api/scheduler/queue/refund/health

# 返回示例：
{
  "success": true,
  "data": {
    "score": 85,              // 健康度评分（0-100）
    "level": "GOOD",          // 健康等级
    "stats": {
      "waiting": 30,
      "active": 3,
      "completed": 100,
      "failed": 2,
      "total": 135
    },
    "recommendations": [
      "队列有少量堆积，建议观察"
    ]
  }
}
```

---

## 📊 队列处理流程

### 定时任务（每 10 分钟）

```
OrderExpirationTask
    ↓
扫描过期订单（expireAt < now && status = PAID）
    ↓
批量标记为 EXPIRED
    ↓
推送到 BullMQ 队列（最多 1000 张券/次）
    ↓
队列自动处理（3 并发，符合微信 API 限制）
    ↓
失败自动重试（5 次，指数退避）
    ↓
微信回调确认退款成功
    ↓
库存恢复（+1）
```

---

## 🎛️ 关键配置

### 并发数（默认 3）

**位置**：`apps/api/src/modules/scheduler/processors/refund.processor.ts`

```typescript
@Process({
  name: 'process-refund',
  concurrency: 3, // 🔑 关键：限制并发数
})
```

**调整建议**：

| 场景 | 建议并发数 | 原因 |
|------|-----------|------|
| **正常运营** | 3 | 符合微信 200 次/分钟限制 |
| **队列堆积 > 100** | 5 | 临时提高处理速度（持续 1 小时） |
| **微信 API 额度不足** | 2 | 降低调用频率 |

### 重试策略（默认 5 次）

**位置**：`apps/api/src/modules/scheduler/queues/refund.queue.ts`

```typescript
attempts: 5, // 最多重试 5 次
backoff: {
  type: 'exponential',
  delay: 2000, // 初始延迟 2 秒，指数递增（2s, 4s, 8s, 16s, 32s）
},
```

**重试时间表**：

| 失败次数 | 延迟时间 | 总耗时 |
|---------|---------|--------|
| 第 1 次 | 2s | 2s |
| 第 2 次 | 4s | 6s |
| 第 3 次 | 8s | 14s |
| 第 4 次 | 16s | 30s |
| 第 5 次 | 32s | 62s |

---

## ⚠️ 常见问题排查

### 1. 队列堆积告警（waiting > 100）

**症状**：
- Bull Board 显示 waiting > 100
- 用户退款迟迟未完成

**排查步骤**：

```bash
# ① 检查队列健康度
curl http://localhost:3001/api/scheduler/queue/refund/health

# ② 检查微信 API 调用频率（是否触发限流）
# 查看 Bull Board → Job Detail → Error Log

# ③ 临时提高并发数（改为 5）
# 编辑 apps/api/src/modules/scheduler/processors/refund.processor.ts
# 将 concurrency: 3 改为 5

# ④ 重启服务
pnpm --filter @opencode/api dev
```

### 2. 失败任务过多（failed > 10）

**症状**：
- Bull Board 显示 failed > 10
- 队列健康度评分 < 60

**排查步骤**：

```bash
# ① 打开 Bull Board 查看失败任务详情
# http://localhost:3001/bull-board

# ② 点击失败任务 → 查看 Error Log
# 常见错误：
# - 微信支付配置错误
# - 订单状态异常（非 PAID/EXPIRED）
# - 微信 API 频率限制

# ③ 手动重试失败任务（Bull Board → Actions → Retry）
```

### 3. 并发数异常（active > 5）

**症状**：
- Bull Board 显示 active > 5
- 微信 API 可能触发限流

**排查步骤**：

```bash
# ① 检查 Processor 配置
# apps/api/src/modules/scheduler/processors/refund.processor.ts

# ② 确认 concurrency: 3（如果配置错误则修改）

# ③ 重启服务
pnpm --filter @opencode/api dev
```

---

## 📈 性能监控指标

### 定时告警（每 5 分钟）

**位置**：`apps/api/src/modules/scheduler/services/queue-health-monitor.service.ts`

| 告警条件 | 告警级别 | 建议措施 |
|---------|---------|----------|
| waiting > 100 | ⚠️ 堆积告警 | 提高并发数到 5 |
| failed > 10 | ⚠️ 失败告警 | 检查微信配置 |
| active > 5 | ⚠️ 并发异常 | 检查 Processor 配置 |

**查看告警日志**：

```bash
# 查看后端日志
pnpm --filter @opencode/api dev

# 输出：
# [QueueHealthMonitor] ⚠️  退款队列堆积告警: 120 个任务等待处理
# [QueueHealthMonitor] 建议措施: 提高并发数（改为 5）或检查微信 API 额度
```

---

## 🔧 高级功能

### 1. 手动清空队列（谨慎使用）

```bash
# 仅用于测试或紧急情况
curl -X POST http://localhost:3001/api/scheduler/queue/refund/empty
```

### 2. 手动重试失败任务

```bash
# Bull Board → Jobs → Failed → 点击任务 → Actions → Retry
```

### 3. 查看任务详情

```bash
# Bull Board → Jobs → 点击任务 → Job Detail
# 可查看：
# - 任务数据（orderId, orderNo, price）
# - 失败原因（Error Log）
# - 重试次数（attemptsMade）
# - 创建时间、处理时间
```

---

## 🧪 压力测试

### 模拟 1000 张券同时到期

```bash
# 创建测试脚本（可选）
curl -X POST http://localhost:3001/api/scheduler/test/create-expired-orders \
  -H "Content-Type: application/json" \
  -d '{"count": 1000}'

# 观察队列处理过程：
# ① Bull Board 实时监控
# ② 查看队列状态（每分钟查询一次）
curl http://localhost:3001/api/scheduler/queue/refund/stats

# 预计处理时间：约 5.5 小时（1000 ÷ 3 = 333 分钟）
```

---

## 🎯 最佳实践

### 1. 生产环境配置

```env
# apps/api/.env
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

AUTO_REFUND_ENABLED=true  # 启用自动退款
SCHEDULER_ENABLED=true    # 启用定时任务
```

### 2. 监控仪表盘

建议添加以下监控指标：

| 指标 | 数据源 | 告警阈值 |
|------|--------|----------|
| **队列堆积数** | `/refund/stats` | waiting > 100 |
| **失败率** | `/refund/stats` | failed > 10% |
| **健康度评分** | `/refund/health` | score < 60 |
| **处理时长** | Bull Board | job.duration > 60s |

### 3. 定期巡检

**每日检查**：
- Bull Board 查看队列状态
- 查看是否有失败任务需要手动处理

**每周检查**：
- 查看健康度评分趋势
- 分析退款失败原因（是否需要调整微信配置）

---

## 📚 相关文档

- **改造前分析**：见本文开头分析部分
- **技术栈文档**：`docs/wechatpay-sdk-upgrade-guide.md`
- **队列架构**：`apps/api/src/modules/scheduler/queues/refund.queue.ts`
- **处理器实现**：`apps/api/src/modules/scheduler/processors/refund.processor.ts`

---

## 🆘 紧急情况处理

### 场景 1：队列完全阻塞（waiting > 500）

```bash
# ① 立即暂停新任务入队（暂停定时任务）
# apps/api/.env → SCHEDULER_ENABLED=false

# ② 检查微信 API 是否完全限流
# Bull Board → 查看失败任务错误日志

# ③ 联系微信支付客服申请提高额度

# ④ 手动清空队列（极端情况）
curl -X POST http://localhost:3001/api/scheduler/queue/refund/empty

# ⑤ 重新启动定时任务
# apps/api/.env → SCHEDULER_ENABLED=true
```

### 场景 2：大量失败任务（failed > 50）

```bash
# ① 检查失败原因（是否微信配置错误）
# Bull Board → Failed Jobs → Error Log

# ② 如果是配置错误，修复后批量重试
# Bull Board → Failed → Bulk Actions → Retry All

# ③ 如果是订单状态异常，手动补偿
# 数据库查询异常订单 → 手动修复状态
```

---

**改造完成！系统已具备高性能、高可靠性的自动退款能力。** 🎉