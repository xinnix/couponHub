# Admin 前端库存管理功能使用指南

## 📋 功能概述

在券模板详情页新增"库存管理"Tab，提供完整的库存监控和调整功能。

---

## 🎯 功能清单

### 1. **库存快速调整**

在基本信息 Tab 的库存字段旁边，添加"调整库存"快捷按钮。

**位置：**
- 券模板详情页 → 基本信息 Tab → 库存字段旁边
- 点击"调整库存"按钮，打开调整对话框

**对话框内容：**
- 显示当前券模板标题和库存
- 输入调整数量（正数/负数）
- 输入调整原因说明（必填，最多 200 字）
- 实时验证调整后库存不能为负数

**效果：**
- 调整成功后自动刷新券模板数据
- 自动记录库存变更日志（MANUAL_ADJUST）

---

### 2. **库存管理 Tab**

新增独立的"库存管理"Tab，包含两个部分：

#### a. 库存变更统计卡片

**展示内容：**
- 库存总变化量（时间段内）
- 各原因的变更次数和总量：
  - 创建订单（库存扣减）
  - 订单取消（库存恢复）
  - 用户退款（库存恢复）
  - 过期退款（库存恢复）
  - 手动调整（管理员操作）

**视觉设计：**
- 使用 Ant Design `<Statistic>` 组件
- 不同颜色标识增减（绿色=增加，红色=减少）
- 图标辅助识别原因类型

#### b. 库存变更历史列表

**展示内容：**
- 变更时间
- 变更原因（Tag 标签）
- 变更量（+/- 数字）
- 当前库存
- 关联订单信息（订单号 + 状态）
- 操作员信息（管理员用户名）

**筛选功能：**
- 时间范围筛选（DatePicker.RangePicker）
- 变更原因筛选（Select 下拉框）
- 刷新按钮（手动刷新列表）

**分页：**
- 支持分页浏览（默认 20 条/页）
- 显示总记录数

---

## 🎨 界面预览

### 券模板详情页 - 基本信息Tab

```
┌─────────────────────────────────────────┐
│ 基本信息                                 │
├─────────────────────────────────────────┤
│                                          │
│ 统计卡片：                                │
│ ├─ 购买价格  ├─ 面值                      │
│ ├─ 剩余库存  ├─ 已售数量                  │
│                                          │
│ 详细信息：                                │
│ ├─ 券标题: xxx                            │
│ ├─ 状态: [上架中]                         │
│ ├─ 库存: 100 [调整库存] 按钮              │
│ ├─ ...                                   │
└─────────────────────────────────────────┘
```

### 库存调整对话框

```
┌─────────────────────────────────────────┐
│ 调整库存                        [取消] [确认] │
├─────────────────────────────────────────┤
│                                          │
│ 券模板：满100减20优惠券                    │
│                                          │
│ 当前库存：100 张                           │
│                                          │
│ 调整数量：                                │
│ [请输入调整数量]                          │
│ 提示：正数=增加，负数=减少                  │
│                                          │
│ 调整原因说明：                            │
│ [为五一假期活动补充库存...]                │
│ 最多 200 字，将记录在库存变更日志中         │
│                                          │
└─────────────────────────────────────────┘
```

### 库存管理 Tab

```
┌─────────────────────────────────────────┐
│ 库存管理                                 │
├─────────────────────────────────────────┤
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 库存变更统计                        │  │
│ │ ┌──────────────────────────────┐ │  │
│ │ │ 库存总变化 +65 张 / 67 次变更    │ │  │
│ │ └──────────────────────────────┘ │  │
│ │ ├─ 创建订单 50 次 (-50 张)       │ │  │
│ │ ├─ 用户退款 10 次 (+10 张)       │ │  │
│ │ ├─ 手动调整 2 次 (+100 张)       │ │  │
│ └───────────────────────────────────┘  │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 库存变更历史                        │  │
│ │ [时间筛选] [原因筛选] [刷新]        │  │
│ │                                     │  │
│ │ ┌────┬────┬────┬────┬────┬────┐ │  │
│ │ │时间│原因│变更│库存│订单│操作│ │  │
│ │ ├────┼────┼────┼────┼────┼────┤ │  │
│ │ │... │... │... │... │... │... │ │  │
│ │ └────┴────┴────┴────┴────┴────┘ │  │
│ │                                     │  │
│ │ 分页：共 120 条记录                  │  │
│ └───────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🔧 技术实现

### 组件结构

```
apps/admin/src/modules/coupon-template/
├── components/
│   ├── StockAdjustModal.tsx        # 库存调整对话框
│   ├── StockLogList.tsx            # 库存变更历史列表
│   ├── StockStatistics.tsx         # 库存变更统计卡片
│   ├── TemplateForm.tsx            # 券模板表单
│   └── MerchantScopeSelector.tsx   # 商户范围选择器
└── pages/
    └ TemplateDetailPage.tsx        # 券模板详情页（集成库存管理）
```

### API 接口对接

目前组件使用 Mock 数据演示，需要对接以下 tRPC API：

#### 1. 调整库存
```typescript
// apps/admin/src/modules/coupon-template/components/StockAdjustModal.tsx

import { trpcClient } from "../../../shared/dataProvider/dataProvider";

const handleFinish = async (values: any) => {
  try {
    await trpcClient.couponTemplate.adjustStock.mutate({
      templateId: template.id,
      amount: values.amount,
      reason: values.reason,
    });

    message.success(`库存调整成功`);
    onSuccess();
  } catch (error: any) {
    message.error(error.message || "库存调整失败");
  }
};
```

#### 2. 查询库存日志
```typescript
// apps/admin/src/modules/coupon-template/components/StockLogList.tsx

const fetchLogs = async () => {
  setLoading(true);
  try {
    const result = await trpcClient.stockLog.getLogsByTemplate.query({
      templateId,
      startDate,
      endDate,
      reason: reasonFilter,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    setLogs(result.logs);
    setTotal(result.total);
  } catch (error) {
    console.error("Failed to fetch stock logs:", error);
  } finally {
    setLoading(false);
  }
};
```

#### 3. 查询库存统计
```typescript
// apps/admin/src/modules/coupon-template/components/StockStatistics.tsx

const fetchStatistics = async () => {
  setLoading(true);
  try {
    const result = await trpcClient.stockLog.getStatistics.query({
      templateId,
      startDate,
      endDate,
    });

    setStatistics(result);
  } catch (error) {
    console.error("Failed to fetch statistics:", error);
  } finally {
    setLoading(false);
  }
};
```

---

## 🚀 启动测试

### 启动开发环境

```bash
# 启动后端 API
pnpm --filter @opencode/api dev

# 启动 Admin 前端
pnpm --filter @opencode/admin dev
```

### 访问页面

1. 打开浏览器：http://localhost:5173
2. 登录 Admin 后台
3. 进入"券模板管理"页面
4. 点击某个券模板的"查看详情"
5. 切换到"库存管理" Tab

---

## ✅ 功能清单对照

| 功能 | 状态 | 说明 |
|------|------|------|
| 库存调整对话框 | ✅ | 基本完成（Mock 数据） |
| 库存变更历史列表 | ✅ | 基本完成（Mock 数据） |
| 库存变更统计卡片 | ✅ | 基本完成（Mock 数据） |
| 时间范围筛选 | ✅ | UI 完成 |
| 变更原因筛选 | ✅ | UI 完成 |
| 分页功能 | ✅ | UI 完成 |
| API 对接 | ⏳ | 待完成（需要修改组件调用 tRPC） |

---

## 🎯 下一步工作

1. **对接真实 API**
   - 在组件中调用 `trpcClient` API
   - 移除 Mock 数据
   - 测试实际数据交互

2. **增强功能**
   - 导出库存日志（CSV/Excel）
   - 打印库存变更记录
   - 库存预警提示（低于阈值高亮）

3. **优化体验**
   - 加载动画优化
   - 错误提示友好化
   - 空状态设计改进

---

## 📖 使用场景示例

### 场景 1：补充库存

运营人员发现某券模板即将售罄：

1. 进入券模板详情页
2. 点击"调整库存"按钮
3. 输入调整数量：`50`
4. 输入原因：`为五一假期活动补充库存`
5. 点击"确认调整"
6. 系统自动记录日志并刷新库存显示

### 场景 2：查看退款情况

运营人员想了解某个券模板的退款情况：

1. 进入券模板详情页
2. 切换到"库存管理" Tab
3. 查看库存变更统计卡片中的"用户退款"数据
4. 在变更原因筛选中选择"用户退款"
5. 浏览退款订单详情

### 场景 3：排查库存异常

发现某个券模板库存与预期不符：

1. 进入券模板详情页
2. 切换到"库存管理" Tab
3. 查看库存变更历史列表
4. 分析各项变更记录
5. 找到异常变更（例如：手动调整记录）
6. 查看操作员和原因说明

---

**文档更新日期：2024-04-13**
**版本：v1.0**