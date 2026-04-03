# 微信支付快速配置指南

## ⚠️ 当前状态

API 服务已正常启动，但**微信支付功能暂不可用**，原因：

```
未配置微信支付公钥（WX_PAY_PUBLIC_KEY_ID / WX_PAY_PUBLIC_KEY_PATH）
```

---

## 🎯 解决方案

### 方案一：配置微信支付公钥（推荐）

#### 1. 获取微信支付公钥

登录 [微信支付商户平台](https://pay.weixin.qq.com/)

1. 账户中心 → API安全 → 微信支付公钥
2. 点击"下载公钥"
3. 复制**微信支付公钥 ID**（格式：`PUB_KEY_ID_XXXX...`）

#### 2. 配置证书文件

```bash
# 将下载的公钥放到项目目录
cd apps/api/certs/
# 粘贴下载的公钥文件，重命名为 wechatpay_public_key.pem
```

#### 3. 配置环境变量

编辑 `apps/api/.env`：

```env
# 微信支付公钥配置（新增）
WX_PAY_PUBLIC_KEY_ID=PUB_KEY_ID_你的公钥ID
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_public_key.pem
```

#### 4. 重启服务

```bash
# 重启后端服务
pnpm --filter @opencode/api dev
```

**✅ 成功标志：**

```
[WechatPayService] 微信支付 V3 初始化成功 | 验签模式: 微信支付公钥（推荐）
```

---

### 方案二：临时禁用支付功能（仅用于测试）

如果暂时不需要支付功能，可以继续使用其他功能：

**可用的功能：**
- ✅ 用户注册/登录
- ✅ 浏览优惠券列表
- ✅ 查看优惠券详情
- ✅ 管理员后台功能

**不可用的功能：**
- ❌ 购买优惠券（会提示"支付功能暂不可用"）
- ❌ 支付回调
- ❌ 退款

---

## 📝 模拟购买流程（开发测试）

如果需要测试购买流程但没有微信支付商户号，可以：

### 选项 1：使用测试数据

1. 在数据库中手动创建已支付的订单：

```sql
-- 插入测试订单
INSERT INTO "Order" (id, "orderNo", "userId", "templateId", status, price, "faceValue", "createdAt", "updatedAt")
VALUES (
  'test-order-id',
  'TEST20260402160000',
  'your-user-id',
  'your-template-id',
  'PAID',
  9.9,
  20,
  NOW(),
  NOW()
);
```

2. 在小程序"券包"页面查看已购买的券

### 选项 2：临时跳过支付验证

修改后端代码，临时跳过微信支付验证（仅用于开发）：

```typescript
// apps/api/src/modules/payment/rest/payment.controller.ts

@Post('create')
async create(@Body() body: any, @CurrentUser() user: any) {
  // 临时测试代码：直接返回模拟支付参数
  return {
    success: true,
    prepayId: 'test_prepay_id',
    payParams: {
      timeStamp: '1234567890',
      nonceStr: 'test_nonce',
      package: 'prepay_id=test_prepay_id',
      signType: 'RSA',
      paySign: 'test_sign',
    },
  };
}
```

**⚠️ 注意：** 这只是临时方案，正式环境必须配置真实的微信支付。

---

## 🔧 检查配置是否正确

### 1. 检查环境变量

```bash
grep WX_PAY apps/api/.env
```

应该看到：

```
WX_PAY_APP_ID=你的小程序AppID
WX_PAY_MCH_ID=你的商户号
WX_PAY_API_KEY=你的APIv3密钥
WX_PAY_SERIAL_NO=你的商户证书序列号
WX_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WX_PAY_PUBLIC_KEY_ID=PUB_KEY_ID_你的公钥ID
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_public_key.pem
WX_PAY_NOTIFY_URL=https://你的域名/api/payments/wechat/callback
```

### 2. 检查证书文件

```bash
ls -la apps/api/certs/
```

应该看到：

```
apiclient_key.pem           # 商户私钥
wechatpay_public_key.pem    # 微信支付公钥
```

### 3. 查看启动日志

```bash
pnpm --filter @opencode/api dev | grep WechatPayService
```

**✅ 成功：**

```
[WechatPayService] 微信支付 V3 初始化成功 | 验签模式: 微信支付公钥（推荐）
```

**❌ 失败：**

```
[WechatPayService] 未配置微信支付公钥，支付功能将不可用
```

---

## 📚 完整文档

- **[SDK 升级指南](wechatpay-sdk-upgrade-guide.md)** - 从旧 SDK 迁移
- **[微信支付配置指南](wechat-pay-setup.md)** - 完整配置流程
- **[微信支付公钥配置详解](wechat-pay-public-key-guide.md)** - 获取和配置公钥

---

## ❓ 常见问题

### Q: 没有微信支付商户号怎么办？

**A:** 需要申请微信支付商户号：

1. 访问 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 注册并提交资料审核
3. 审核通过后获取商户号和证书

### Q: 可以使用微信支付沙箱环境吗？

**A:** 可以，在 `.env` 中设置：

```env
WX_PAY_SANDBOX=true
```

但沙箱环境也需要商户号和证书。

### Q: 本地开发如何测试支付回调？

**A:** 使用内网穿透工具：

```bash
# 使用 ngrok
ngrok http 3000

# 更新回调 URL
WX_PAY_NOTIFY_URL=https://your-ngrok-url.ngrok.io/api/payments/wechat/callback
```

---

## 🚀 快速开始

如果你已经有微信支付商户号和证书：

```bash
# 1. 配置环境变量
vim apps/api/.env

# 2. 添加证书文件
cp ~/Downloads/wechatpay_public_key.pem apps/api/certs/

# 3. 重启服务
pnpm --filter @opencode/api dev

# 4. 测试购买
# 在小程序中选择优惠券 → 点击"立即购买"
```

---

**配置完成后，支付功能将正常工作！** 🎉