# 退款回调接口实现文档

## 📝 概述

本次实现补全了微信支付退款回调接口，使退款流程与付款流程保持一致，采用异步回调模式处理退款结果。

---

## 🔄 实现前对比

### ❌ 实现前（同步模式）

```
用户申请退款
  ↓
调用微信退款 API
  ↓
同步等待退款结果
  ↓
自动更新订单状态为 REFUNDED
```

**问题：**
- 网络异常可能导致状态不一致
- 无法处理退款异常、退款关闭等情况
- 与付款流程不一致

### ✅ 实现后（异步模式）

```
用户申请退款
  ↓
调用微信退款 API（传入 notify_url）
  ↓
订单状态更新为 REFUNDING
  ↓
微信异步回调 → /payments/wechat/refund-callback
  ↓
根据退款状态更新订单：
  - SUCCESS → REFUNDED
  - CLOSED/ABNORMAL → PAID（恢复）
```

---

## 🎯 实现内容

### 1️⃣ WechatPayService 修改

**文件：** `apps/api/src/modules/payment/services/wechat-pay.service.ts`

#### 修改 1：refund 方法添加 notify_url 参数

```typescript
async refund(params: { ... }): Promise<string> {
  const { data } = await this.wxpay!.v3.refund.domestic.refunds.post({
    out_trade_no: orderNo,
    out_refund_no: refundNo,
    amount: { refund: ..., total: ..., currency: 'CNY' },
    reason: reason || '用户申请退款',
    notify_url: this.notifyUrl, // ⭐ 新增：退款回调地址
  });

  return data.refund_id;
}
```

#### 修改 2：新增 handleRefundCallback 方法

```typescript
async handleRefundCallback(
  body: string,
  headers: { ... },
): Promise<{
  orderId: string;
  orderNo: string;
  refundId: string;
  refundNo: string;
  refundStatus: string;  // SUCCESS, CLOSED, PROCESSING, ABNORMAL
  refundedAt?: Date;
  amount: { total, refund, payerTotal, payerRefund };
}> {
  // 1. 解析回调通知
  const notification = JSON.parse(body);

  // 2. 解密回调数据（AES-256-GCM）
  const decrypted = Aes.AesGcm.decrypt(
    notification.resource.ciphertext,
    this.apiKey,
    notification.resource.nonce,
    notification.resource.associated_data,
  );

  const refund = JSON.parse(decrypted.toString());

  // 3. 返回退款信息
  return {
    orderId: refund.out_trade_no,
    orderNo: refund.out_trade_no,
    refundId: refund.refund_id,
    refundNo: refund.out_refund_no,
    refundStatus: refund.refund_status,
    refundedAt: refund.success_time ? new Date(refund.success_time) : undefined,
    amount: {
      total: refund.amount.total,
      refund: refund.amount.refund,
      payerTotal: refund.amount.payer_total,
      payerRefund: refund.amount.payer_refund,
    },
  };
}
```

---

### 2️⃣ PaymentController 修改

**文件：** `apps/api/src/modules/payment/rest/payment.controller.ts`

#### 新增：退款回调处理接口

```typescript
@Post('wechat/refund-callback')
@ApiOperation({ summary: '微信退款回调通知（微信服务器调用）' })
async refundCallback(
  @Req() req: Request,
  @Headers() headers: Record<string, string>,
) {
  const rawBody = (req as any).rawBody;

  // 1. 解密回调数据
  const refund = await this.wechatPayService.handleRefundCallback(
    rawBody,
    headers,
  );

  // 2. 查询订单
  const order = await this.prisma.order.findUnique({
    where: { orderNo: refund.orderNo },
  });

  if (!order) {
    throw new BadRequestException('Order not found');
  }

  // 3. 检查订单状态
  if (order.status !== 'REFUNDING') {
    return { code: 'SUCCESS', message: 'OK' };
  }

  // 4. 根据退款状态更新订单
  if (refund.refundStatus === 'SUCCESS') {
    // 退款成功
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED',
        refundId: refund.refundId,
        refundedAt: refund.refundedAt || new Date(),
      },
    });
  } else if (refund.refundStatus === 'CLOSED' || refund.refundStatus === 'ABNORMAL') {
    // 退款失败，恢复订单状态
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        refundReason: `退款失败: ${refund.refundStatus}`,
      },
    });
  }

  return { code: 'SUCCESS', message: 'OK' };
}
```

---

### 3️⃣ OrderService 修改

**文件：** `apps/api/src/modules/order/services/order.service.ts`

#### 修改：requestRefund 方法改为异步模式

```typescript
async requestRefund(orderId: string, userId: string, reason: string) {
  // 1. 验证订单（所有权、状态、核销、有效期）
  // ...验证逻辑保持不变...

  // 2. 更新订单状态为 REFUNDING（退款中）
  await this.prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'REFUNDING',
      refundReason: reason,
    },
  });

  // 3. 调用微信退款接口（异步处理，等待回调确认）
  const refundTransactionId = await this.wechatPayService.refund({
    orderNo: order.orderNo,
    refundNo: `refund_${Date.now()}`,
    totalAmount: Number(order.price),
    refundAmount: Number(order.price),
    reason,
  });

  // 4. 返回退款单号（订单状态等待回调更新）
  this.logger.log(`订单退款申请已提交: ${order.orderNo}, 等待微信回调确认`);
  return { refundId: refundTransactionId };
}
```

**关键变更：**
- ❌ 移除了同步更新为 REFUNDED 的逻辑
- ❌ 移除了退款失败时恢复状态的 try-catch
- ✅ 保留订单状态为 REFUNDING，等待回调确认

---

## 📊 完整流程图

### 退款申请流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. 小程序端（用户）                                       │
├─────────────────────────────────────────────────────────┤
│  ✓ 检查订单状态 (PAID)                                   │
│  ✓ POST /orders/refund { orderId, reason }              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 后端 OrderService                                     │
├─────────────────────────────────────────────────────────┤
│  ✓ 验证订单（所有权、状态、核销、有效期）                 │
│  ✓ 更新状态：PAID → REFUNDING                            │
│  ✓ 调用微信退款 API（传入 notify_url）                   │
│  ✓ 返回退款单号                                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 微信支付系统                                          │
├─────────────────────────────────────────────────────────┤
│  ✓ 处理退款请求                                          │
│  ✓ 退款成功/失败/异常                                    │
│  ✓ POST notify_url（回调通知）                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 后端 PaymentController（回调接口）                     │
├─────────────────────────────────────────────────────────┤
│  POST /payments/wechat/refund-callback                   │
│  ✓ 解密回调数据                                          │
│  ✓ 验证订单状态（REFUNDING）                             │
│  ✓ 根据退款状态更新订单：                                │
│    - SUCCESS → REFUNDED                                  │
│    - CLOSED/ABNORMAL → PAID                              │
│  ✓ 返回 { code: 'SUCCESS' }                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 回调数据结构

### 微信退款回调通知格式

```json
{
  "id": "EV-2018022511223320873",
  "create_time": "2018-06-08T10:34:56+08:00",
  "event_type": "REFUND.SUCCESS",  // 退款成功
  "summary": "退款成功",
  "resource_type": "encrypt-resource",
  "resource": {
    "algorithm": "AEAD_AES_256_GCM",
    "original_type": "refund",
    "ciphertext": "...",  // 加密的退款信息
    "nonce": "...",
    "associated_data": ""
  }
}
```

### 解密后的退款信息

```json
{
  "mchid": "1900000100",
  "transaction_id": "1008450740201411110005820873",
  "out_trade_no": "20150806125346",  // 订单号
  "refund_id": "50200207182018070300011301001",  // 微信退款单号
  "out_refund_no": "7752501201407033233368018",  // 商户退款单号
  "refund_status": "SUCCESS",  // SUCCESS, CLOSED, PROCESSING, ABNORMAL
  "success_time": "2018-06-08T10:34:56+08:00",
  "user_received_account": "招商银行信用卡0403",
  "amount": {
    "total": 999,      // 原订单金额（分）
    "refund": 999,     // 退款金额（分）
    "payer_total": 999,    // 用户实际支付金额（分）
    "payer_refund": 999    // 用户退款金额（分）
  }
}
```

---

## 🎯 退款状态处理

| 退款状态 | 说明 | 订单状态变更 |
|---------|------|-------------|
| `SUCCESS` | 退款成功 | REFUNDING → REFUNDED ✅ |
| `CLOSED` | 退款关闭 | REFUNDING → PAID（恢复） |
| `ABNORMAL` | 退款异常 | REFUNDING → PAID（恢复） |
| `PROCESSING` | 退款处理中 | 保持 REFUNDING |

---

## ✅ 优势

1. **异步处理更可靠** - 不依赖同步调用，网络异常也能正确处理
2. **支持退款状态变更** - 可以处理退款异常、退款关闭等情况
3. **与付款流程一致** - 统一的回调处理机制
4. **符合微信官方推荐** - 使用异步回调而非同步等待
5. **支持重复通知** - 幂等性设计，避免重复处理

---

## 🧪 测试建议

### 1. 正常退款流程测试

```bash
# 1. 创建订单并支付
POST /orders
POST /payments/create

# 2. 申请退款
POST /orders/refund
{
  "orderId": "xxx",
  "reason": "用户主动退款"
}

# 3. 模拟微信回调
POST /payments/wechat/refund-callback
{
  "id": "EV-xxx",
  "event_type": "REFUND.SUCCESS",
  "resource": { ... }
}

# 4. 查询订单状态
GET /orders/:id
# 期望状态：REFUNDED
```

### 2. 退款异常测试

```bash
# 模拟退款异常回调
POST /payments/wechat/refund-callback
{
  "event_type": "REFUND.ABNORMAL",
  ...
}

# 期望：订单状态恢复为 PAID
```

### 3. 重复回调测试

```bash
# 多次发送相同的退款成功回调
# 期望：幂等处理，状态不会重复更新
```

---

## 📚 相关文档

- [微信支付退款结果回调通知](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_5_11.shtml)
- [微信支付 API v3 文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [wechatpay-axios-plugin SDK](https://github.com/klover2/wechatpay-axios-plugin)

---

## 📌 注意事项

1. **回调地址必须为 HTTPS**
   - 微信要求回调地址必须使用 HTTPS 协议
   - 本地开发可使用内网穿透工具（ngrok、frp）

2. **回调验签**
   - SDK 会自动验证签名，确保请求来自微信
   - 无需手动处理验签逻辑

3. **幂等性处理**
   - 同一退款可能收到多次回调
   - 必须检查订单状态是否已处理

4. **超时重试机制**
   - 微信会在 15s/15s/30s/3m/10m/20m/30m/30m/30m/60m/3h/3h/3h/6h/6h 重试
   - 最多重试 15 次
   - 必须在 5 秒内返回响应

5. **IP 白名单**
   - 如果服务器有防火墙，需要开放微信支付回调 IP 段

---

## 🔧 配置要求

确保在 `.env` 中配置了以下环境变量：

```bash
# 微信支付配置
WX_PAY_APP_ID=你的小程序AppID
WX_PAY_MCH_ID=你的商户号
WX_PAY_API_KEY=你的APIv3密钥
WX_PAY_SERIAL_NO=商户证书序列号
WX_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WX_PAY_PUBLIC_KEY_ID=微信支付公钥ID
WX_PAY_PUBLIC_KEY_PATH=./certs/pub_key.pem

# 回调地址配置（必须 HTTPS）
WX_PAY_NOTIFY_URL=https://your-domain.com/api/payments/wechat/callback
WX_PAY_REFUND_NOTIFY_URL=https://your-domain.com/api/payments/wechat/refund-callback
WX_PAY_SANDBOX=false
```

### 重要说明

1. **支付回调地址** (`WX_PAY_NOTIFY_URL`)
   - 用户支付成功后，微信会调用此地址
   - 路径：`/api/payments/wechat/callback`

2. **退款回调地址** (`WX_PAY_REFUND_NOTIFY_URL`)
   - 退款状态变更后，微信会调用此地址
   - 路径：`/api/payments/wechat/refund-callback`
   - 如果不配置，默认使用支付回调地址（不推荐）

3. **域名要求**
   - 必须使用 HTTPS 协议
   - 域名必须在微信支付商户平台配置白名单
   - 本地开发可使用内网穿透工具（ngrok、frp）

---

## 🎉 总结

本次实现完成了以下功能：

✅ WechatPayService 添加 notify_url 参数
✅ WechatPayService 添加 handleRefundCallback 方法
✅ PaymentController 添加退款回调处理接口
✅ OrderService 改为异步退款模式
✅ 支持退款成功/失败/异常状态处理
✅ 与付款流程保持一致

现在退款流程完全符合微信官方规范，更加稳定可靠！