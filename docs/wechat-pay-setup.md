# 微信支付配置指南

## 📋 概述

本项目使用 **wechatpay-axios-plugin** SDK，支持微信支付 V3 API，包括小程序内 JSAPI 支付、回调通知、退款等完整流程。

**⚠️ 重要变更（2024年Q3）：**

微信支付官方开启了「微信支付公钥」平替「平台证书」方案。推荐使用**微信支付公钥模式**，配置更简洁、更安全。

---

## 📦 SDK 信息

- **SDK 名称**：wechatpay-axios-plugin
- **最新版本**：0.9.4 (2025年5月)
- **官方文档**：https://wechatpay.js.org/
- **GitHub**：https://github.com/TheNorthMemory/wechatpay-axios-plugin
- **特性**：同时支持 APIv2 和 APIv3，原生支持微信支付公钥模式

---

## 🔑 一、准备工作

### 1. 微信支付商户平台

登录 [微信支付商户平台](https://pay.weixin.qq.com/)

- 获取**商户号**（mch_id）
- 设置 **API v3 密钥**（账户中心 → API安全 → 设置APIv3密钥）
- 下载**商户 API 证书**（账户中心 → API安全 → 申请API证书）

### 2. 微信小程序后台

登录 [微信公众平台](https://mp.weixin.qq.com/)

- 获取小程序 **AppID** 和 **AppSecret**
- 关联微信支付商户号（需要商户平台确认）

### 3. 微信支付公钥（2024年Q3新增，推荐）

登录 [微信支付商户平台](https://pay.weixin.qq.com/)

- 账户中心 → API安全 → 微信支付公钥
- 下载**微信支付公钥**文件
- 复制**微信支付公钥 ID**（格式：`PUB_KEY_ID_XXXXXXXXXXXXXXXXXXXXXXXXXXXX`）

**⚠️ 注意：**
- 微信支付公钥用于验签微信服务器响应
- 新商户仅需配置微信支付公钥，无需下载平台证书
- 旧商户可继续使用平台证书，但推荐升级到公钥模式

## 📁 二、证书配置

### 1. 证书文件位置

将商户平台下载的证书和公钥放到以下目录：

```
apps/api/certs/
├── apiclient_key.pem            # 商户 API 私钥（必须，用于签名请求）
├── apiclient_cert.pem           # 商户 API 证书（可选，部分场景需要）
├── wechatpay_public_key.pem     # 微信支付公钥（推荐，用于验签）
└── .gitkeep                     # 保持目录不被 git 忽略
```

**⚠️ 重要提示：**

- `apiclient_key.pem` 是商户私钥文件，**绝对不能泄露**
- `wechatpay_public_key.pem` 是微信支付公钥，用于验证微信服务器响应签名
- 证书文件已被 `.gitignore` 忽略，不会提交到 Git
- 生产环境请妥善保管证书，使用环境变量或密钥管理服务

### 2. 证书下载步骤

**商户 API 证书（apiclient_key.pem）：**

1. 登录微信支付商户平台
2. 账户中心 → API安全 → 申请API证书
3. 下载证书压缩包，解压后找到：
   - `apiclient_key.pem` → 放到 `apps/api/certs/`
   - `apiclient_cert.pem` → 放到 `apps/api/certs/`

**微信支付公钥（wechatpay_public_key.pem，推荐）：**

1. 登录微信支付商户平台
2. 账户中心 → API安全 → 微信支付公钥
3. 点击"下载公钥" → 保存为 `wechatpay_public_key.pem` → 放到 `apps/api/certs/`
4. 复制**微信支付公钥 ID**（显示在页面上）

## ⚙️ 三、环境变量配置

### 开发环境（`.env`）

编辑 `apps/api/.env`：

```env
# 微信小程序配置（已有）
WX_APP_ID=wxae16eb94a6be55a5
WX_APP_SECRET=95eb8f96e26b1abe50577c2299fd4cae

# 微信支付配置（新增）
WX_PAY_APP_ID=wxae16eb94a6be55a5
WX_PAY_MCH_ID=你的商户号
WX_PAY_API_KEY=你的APIv3密钥（32位）
WX_PAY_SERIAL_NO=你的商户证书序列号
WX_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem

# 微信支付公钥配置（2024年Q3新增，推荐）
WX_PAY_PUBLIC_KEY_ID=PUB_KEY_ID_你的公钥ID
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_public_key.pem

WX_PAY_NOTIFY_URL=https://你的域名/api/payments/wechat/callback
WX_PAY_SANDBOX=false
```

### 配置项说明

| 环境变量 | 说明 | 获取方式 | 必填 |
|---------|------|---------|------|
| `WX_PAY_APP_ID` | 小程序 AppID | 通常与 `WX_APP_ID` 相同 | ✅ |
| `WX_PAY_MCH_ID` | 商户号 | 商户平台首页可见 | ✅ |
| `WX_PAY_API_KEY` | API v3 密钥 | 商户平台 → API安全 → 设置APIv3密钥 | ✅ |
| `WX_PAY_SERIAL_NO` | 商户证书序列号 | 商户平台 → API安全 → 证书详情 | ✅ |
| `WX_PAY_PRIVATE_KEY_PATH` | 商户私钥文件路径 | 相对路径，默认 `./certs/apiclient_key.pem` | ✅ |
| `WX_PAY_PUBLIC_KEY_ID` | 微信支付公钥 ID | 商户平台 → 账户中心 → API安全 → 微信支付公钥 | ✅（推荐） |
| `WX_PAY_PUBLIC_KEY_PATH` | 微信支付公钥路径 | 相对路径，推荐 `./certs/wechatpay_public_key.pem` | ✅（推荐） |
| `WX_PAY_NOTIFY_URL` | 回调通知 URL | **必须 HTTPS**，你的服务器域名 + `/api/payments/wechat/callback` | ✅ |
| `WX_PAY_SANDBOX` | 沙箱模式 | `true`=沙箱测试，`false`=正式环境 | ❌ |

**⚠️ 微信支付公钥配置（推荐）：**

- 2024年Q3起，微信支付官方推荐使用微信支付公钥替代平台证书
- 新商户仅需配置 `WX_PAY_PUBLIC_KEY_ID` 和 `WX_PAY_PUBLIC_KEY_PATH`
- 如不配置，SDK 会自动下载平台证书（兼容模式），但不推荐

### 证书序列号查看方式

1. 商户平台 → 账户中心 → API安全
2. 点击"查看证书"
3. 复制**证书序列号**（类似：`5E2A1E3D4B5C6D7E8F9A0B1C2D3E4F5A`）

## 🌐 四、回调 URL 配置

### 1. 域名要求

- 必须是 **HTTPS** 协议
- 必须在微信支付商户平台配置**支付授权目录**
- 必须能被微信服务器访问（不能是内网地址）

### 2. 配置步骤

1. 商户平台 → 产品中心 → 开发配置
2. 添加**支付授权目录**：`https://你的域名/`
3. 确保服务器能正常响应回调请求

### 3. 本地开发测试

如果本地开发，可以使用内网穿透工具：

- [ngrok](https://ngrok.com/)
- [frp](https://github.com/fatedier/frp)

示例（使用 ngrok）：

```bash
# 安装 ngrok
brew install ngrok

# 启动后端服务
pnpm --filter @opencode/api dev

# 另一个终端，启动内网穿透
ngrok http 3000

# 复制 ngrok 提供的 HTTPS URL，例如：
# https://abc123.ngrok.io
# 更新 .env 中的 WX_PAY_NOTIFY_URL：
# WX_PAY_NOTIFY_URL=https://abc123.ngrok.io/api/payments/wechat/callback
```

## 🧪 五、测试支付流程

### 1. 启动服务

```bash
# 启动后端
pnpm --filter @opencode/api dev

# 启动小程序
pnpm --filter @opencode/miniapp dev:mp-weixin
```

### 2. 小程序测试

1. 打开微信开发者工具
2. 选择小程序项目：`apps/miniapp`
3. 浏览券列表，点击购买
4. 点击"立即购买"
5. 确认支付 → 调起微信支付弹窗
6. 完成支付 → 跳转到券包

### 3. 查看日志

后端日志会输出：

```
[WechatPayService] 创建支付订单: 20260327..., 金额: 9.9元, openid: wxae16...
[WechatPayService] 预支付订单创建成功: wx27141234567890
[PaymentController] 支付回调处理成功: 20260327... → 4200001234567890
```

## 📊 六、支付流程说明

### 完整流程

```
用户点击购买
  ↓
前端 POST /api/orders (创建订单，状态 UNPAID)
  ↓
前端 POST /api/payments/create { orderId }
  ↓
后端查用户 openid → 调用微信 JSAPI 下单 → 返回 prepay_id
  ↓
后端签名生成 payParams → 返回给前端
  ↓
前端调用 uni.requestPayment(payParams) 调起微信支付
  ↓
用户完成支付
  ↓
微信服务器 POST /api/payments/wechat/callback (异步通知)
  ↓
后端验签 + 更新订单状态 PAID → 返回 success 给微信
  ↓
前端轮询/监听支付结果 → 跳转到券包
```

### 关键接口

| 接口 | 说明 | 认证 |
|-----|------|-----|
| `POST /api/orders` | 创建订单 | JWT |
| `POST /api/payments/create` | 创建支付，返回支付参数 | JWT |
| `POST /api/payments/wechat/callback` | 微信支付回调通知 | 无（微信签名验证） |
| `GET /api/payments/status/:orderId` | 查询支付状态 | JWT |

## ⚠️ 七、常见问题

### 1. 支付调起失败

**原因：**
- 证书配置错误
- 商户号或 AppID 不匹配
- 用户未绑定微信（缺少 openid）

**解决：**
- 检查 `.env` 配置是否正确
- 确保证书文件存在且可读
- 确认用户已通过微信登录

### 2. 回调通知未收到

**原因：**
- 回调 URL 不是 HTTPS
- 域名未在商户平台配置
- 服务器防火墙拦截

**解决：**
- 使用 ngrok 等工具暴露本地服务
- 检查商户平台配置的支付授权目录
- 查看后端日志是否收到请求

### 3. 支付成功但订单未更新

**原因：**
- 回调处理失败
- 订单状态已变更

**解决：**
- 查看后端日志中的回调处理结果
- 使用 `GET /api/payments/status/:orderId` 主动查询
- 检查数据库订单状态

### 4. 退款失败

**原因：**
- 订单状态不允许退款
- 退款金额超过支付金额
- 微信退款接口异常

**解决：**
- 确认订单状态为 `PAID` 且未核销
- 检查退款金额是否正确
- 查看后端日志中的错误信息

## 🔒 八、安全建议

1. **证书安全**
   - 不要将证书提交到 Git
   - 生产环境使用环境变量或密钥管理服务
   - 定期更换 API v3 密钥
   - **推荐显式配置微信平台公钥**，避免自动下载的不确定性

2. **签名验签机制**
   - 商户请求使用商户私钥签名（`apiclient_key.pem`）
   - 微信响应使用微信平台公钥验签（`wechatpay_platform_cert.pem`）
   - 回调通知必须验证微信签名，防止伪造请求

3. **回调验证**
   - 始终验证微信签名
   - 验证订单金额是否匹配
   - 防止重复回调（检查订单状态）

4. **金额校验**
   - 前后端都要验证金额
   - 使用 Decimal 类型避免浮点精度问题
   - 微信金额单位为分，注意转换

## 📚 九、参考文档

- [微信支付 V3 官方文档](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/index.shtml)
- [小程序支付接入指南](https://pay.weixin.qq.com/wiki/doc/apiv3/open/pay/chapter2_8_2.shtml)
- [wechatpay-node-v3 SDK](https://github.com/klover2/wechatpay-node-v3-ts)

## ✅ 十、配置检查清单

在上线前，请确认：

- [ ] 商户号已获取
- [ ] API v3 密钥已设置
- [ ] 商户 API 证书已下载并放到 `apps/api/certs/apiclient_key.pem`
- [ ] 微信支付公钥已下载并放到 `apps/api/certs/wechatpay_public_key.pem`（推荐）
- [ ] 微信支付公钥 ID 已配置（`WX_PAY_PUBLIC_KEY_ID`）
- [ ] 商户证书序列号已配置
- [ ] 回调 URL 已配置且为 HTTPS
- [ ] 域名已在商户平台配置
- [ ] `.env` 文件中所有支付配置项已填写
- [ ] 证书文件未提交到 Git（`.gitignore` 已配置）
- [ ] 测试支付流程通过
- [ ] 测试退款流程通过

---

## 📚 相关文档

- **[SDK 升级指南](wechatpay-sdk-upgrade-guide.md)** - 从旧 SDK 迁移到 wechatpay-axios-plugin
- **[微信支付公钥配置详解](wechat-pay-public-key-guide.md)** - 如何获取和配置微信支付公钥
- **[wechatpay-axios-plugin 官方文档](https://wechatpay.js.org/)** - SDK 使用说明
- **[微信支付 V3 官方文档](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/index.shtml)** - API 接口文档

---

配置完成后，重启后端服务即可使用真实微信支付！