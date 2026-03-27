# 商场数字营销与结算系统 - 核心技术需求文档 (Master PRD)

## 一、 系统架构与核心逻辑 (System Overview)

本系统是基于“商场平台-小商户-消费者”三方生态的数字化营销闭环。

### 1.1 核心价值链

1.  **导购引流：** 通过【新闻资讯】与【商户展示】吸引用户。
2.  **价值转化：** 通过【有偿代金券】（如50元购100元）锁定消费意向。
3.  **安全消费：** 通过【动态加密核销码】保障交易唯一性与安全性。
4.  **公信对账：** 通过【不可篡改流水】与【结算快照】解决财务信任问题。

### 1.2 终端定义

- **用户端 (C-End):** 微信小程序。主要用于内容浏览、购券、核销出码。
- **商户端 (M-End):** 微信小程序（内置权限切换）。主要用于扫码核销、对账确认。
- **管理端 (B-End):** Web 运营后台。主要用于资源发布、财务对账、数据审计。

---

## 二、 领域模型与数据结构 (Data Domain)

### 2.1 实体关系图 (ERD Summary)

### 2.2 核心数据字典

| 实体                     | 关键字段                                                             | 备注                                  |
| :----------------------- | :------------------------------------------------------------------- | :------------------------------------ |
| **商户 (Merchants)**     | `id, name, logo, category, floor, phone, gallery(JSON), status`      | 关联核销员 ID 列表                    |
| **新闻 (News)**          | `id, title, banner_url, content(RichText), linked_coupon_id`         | 支持直接跳转购券                      |
| **券模板 (Templates)**   | `id, title, buy_price, face_value, stock, merchant_scope(JSON)`      | `merchant_scope` 存储适用商户 ID 数组 |
| **订单 (Orders)**        | `id, user_id, template_id, status, pay_id, redeem_m_id, redeemed_at` | 系统流转的核心实体                    |
| **结算单 (Settlements)** | `id, merchant_id, period, total_amount, order_count, status`         | 财务结算的最终凭证                    |

---

## 三、 功能域描述 (Functional Domains)

### 3.1 导购与内容模块 (Content & Discovery)

- **聚合搜索：** 支持按关键字搜索商户或优惠活动。
- **动态展示：** 商户详情页必须动态聚合该商户可用的所有优惠券。
- **内容触达：** 新闻推文支持内嵌“购券组件”，实现看点到交易的零跳转。

### 3.2 交易处理模块 (Transaction Engine)

- **原子化扣减：** 下单阶段需通过 Redis 保证库存扣减的原子性，防止超卖。
- **支付闭环：** 严格对接微信支付 V3 回调逻辑，非成功回调严禁更改订单状态。
- **退款协议：**
  - **手动退：** 用户在券有效期内（且未使用）可发起申请。
  - **逻辑退：** 活动结束后，系统对所有符合条件的“已支付未核销”订单执行批量退款。

### 3.3 扫码核销模块 (Secure Redemption)

- **加密协议：** 二维码内容必须包含 `OrderToken` + `Salt` + `ExpireTime`，每 30 秒自动刷新。
- **双重校验：**
  1.  **时效校验：** 扫码时间必须在二维码有效期内。
  2.  **归属校验：** 当前核销员的 `merchant_id` 必须存在于订单对应模板的 `merchant_scope` 中。

### 3.4 结算公信力模块 (Settlement Trust)

- **不可逆流水：** 每一笔核销记录一旦生成，系统不提供逻辑删除接口。
- **财务快照：** 生成对账单时，系统将该时间段内所有订单状态置为“已锁定”，避免退款与结算发生竞态。

---

## 四、 核心状态机 (State Machines)

### 4.1 订单状态流转 (Order Lifecycle)

1.  **UNPAID (待支付):** 用户下单，预扣库存。
2.  **PAID (已支付/待使用):** 支付成功，回调确认。
3.  **REDEEMED (已核销):** 商家扫码，交易完成。
4.  **REFUNDING (退款中):** 用户申请或系统自动触发退款。
5.  **REFUNDED (已退款):** 资金原路返回，库存不回退。
6.  **EXPIRED (已过期):** 超过活动时间未核销且未退款。

---

## 五、 MCP 与 Claude Code 对接规范

### 5.1 UI 还原准则 (Via Stitch MCP)

- **1:1 视觉对齐：** Claude Code 必须通过读取 `/stitch-output` 目录下的设计数据，还原所有组件的 Padding、Margin 和色彩。
- **响应式：** 必须适配不同尺寸的手机屏幕，特别是 iPhone 底部安全区。

### 5.2 代码生成守则

- **安全性优先：** 涉及金额和核销的逻辑必须包含完整的 `Try-Catch` 与日志记录。
- **性能优先：** 首页新闻与商户列表必须实现分页加载与 Redis 缓存。
- **可读性：** 业务逻辑必须解耦，例如将 `VoucherService` 与 `PaymentService` 分离。

---

## 六、 结算逻辑方案 (Business Calculation)

所有涉及结算的报表导出需遵循以下逻辑定义：

> **商户结算金额计算公式：**
> $$E = \sum_{i=1}^{n} V_i \times R - F$$
>
> - $E$: 应结金额 (Expected Amount)
> - $V$: 代金券面值 (Face Value)
> - $R$: 商户结算比例 (Settlement Rate)
> - $F$: 平台服务费 (Service Fee, 如有)
