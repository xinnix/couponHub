# 微信支付 SDK 升级指南：wechatpay-axios-plugin

## 📋 升级概述

本次升级将微信支付 SDK 从 `wechatpay-node-v3` 替换为 `wechatpay-axios-plugin`，并适配微信支付官方推荐的**微信支付公钥模式**。

### 升级背景

**2024年Q3重要变更**：微信支付官方开启了「微信支付公钥」平替「平台证书」方案。

- **旧方案（平台证书）**：需要下载平台证书，配置证书序列号
- **新方案（微信支付公钥）**：仅需配置公钥 ID 和公钥文件，更简洁、更安全

### 升级收益

✅ **官方推荐**：微信支付官方推荐的新方案  
✅ **配置简化**：仅需公钥 ID + 公钥文件，无需管理证书序列号  
✅ **更安全**：显式配置公钥，避免自动下载的不确定性  
✅ **持续维护**：`wechatpay-axios-plugin` 活跃维护（最新版本 0.9.4，2025年5月）  
✅ **双 API 支持**：同时支持 APIv2 和 APIv3  

---

## 🔄 升级步骤

### 1. 更新依赖

已完成依赖更新（`apps/api/package.json`）：

```diff
- "wechatpay-node-v3": "^2.2.1",
+ "wechatpay-axios-plugin": "^0.9.4",
```

**安装新依赖：**

```bash
cd apps/api
pnpm install
```

---

### 2. 获取微信支付公钥

#### 方式一：商户平台下载（推荐）

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 账户中心 → API安全 → 微信支付公钥
3. 点击"下载公钥"
4. 查看并复制**微信支付公钥 ID**（格式：`PUB_KEY_ID_XXXXXXXXXXXXXXXXXXXXXXXXXXXX`）

#### 方式二：查看现有配置

如果系统已运行过支付功能，可能已有平台证书：

```bash
ls -la apps/api/certs/
```

---

### 3. 配置证书文件

将下载的微信支付公钥放到项目中：

```bash
# 进入证书目录
cd apps/api/certs/

# 重命名公钥文件（如果有）
mv wechatpay_public_key_XXXXX.pem wechatpay_public_key.pem

# 确认文件存在
ls -la
```

应该看到：

```
apiclient_key.pem           # 商户私钥（已有）
apiclient_cert.pem          # 商户证书（可选）
wechatpay_public_key.pem    # 微信支付公钥（新增）
.gitkeep                    # Git 占位文件
```

---

### 4. 配置环境变量

编辑 `apps/api/.env`，添加微信支付公钥配置：

```env
# 微信支付配置
WX_PAY_APP_ID=wxae16eb94a6be55a5
WX_PAY_MCH_ID=你的商户号
WX_PAY_API_KEY=你的APIv3密钥
WX_PAY_SERIAL_NO=你的商户证书序列号
WX_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem

# 微信支付公钥配置（新增）
WX_PAY_PUBLIC_KEY_ID=PUB_KEY_ID_你的公钥ID
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_public_key.pem

WX_PAY_NOTIFY_URL=https://你的域名/api/payments/wechat/callback
WX_PAY_SANDBOX=false
```

**⚠️ 关键配置项：**

| 环境变量 | 说明 | 必填 |
|---------|------|------|
| `WX_PAY_PUBLIC_KEY_ID` | 微信支付公钥 ID | ✅ 是（推荐） |
| `WX_PAY_PUBLIC_KEY_PATH` | 微信支付公钥文件路径 | ✅ 是（推荐） |

---

### 5. 重启后端服务

```bash
# 重启 API 服务
pnpm --filter @opencode/api dev
```

查看启动日志，确认升级成功：

**✅ 成功（微信支付公钥模式）：**

```
[WechatPayService] 微信支付 V3 初始化成功 | 商户号: XXXXXX | 沙箱: false | 验签模式: 微信支付公钥（推荐）
```

**⚠️ 兼容模式（自动下载平台证书）：**

```
[WechatPayService] 未配置微信支付公钥，SDK 将自动下载平台证书
[WechatPayService] 微信支付 V3 初始化成功 | 验签模式: 自动下载平台证书（兼容模式）
```

---

### 6. 测试支付功能

#### 测试小程序支付

1. 打开微信开发者工具
2. 启动小程序：`pnpm --filter @opencode/miniapp dev:mp-weixin`
3. 选择券商品，点击"立即购买"
4. 调起微信支付弹窗
5. 完成支付测试

#### 查看日志确认

后端日志应显示：

```
[WechatPayService] 创建支付订单: XXXXXX, 金额: 9.9元
[WechatPayService] 预支付订单创建成功: wxXXXXXXXXXXXX
[WechatPayService] 支付回调: 订单 XXXXXX, 交易号 XXXXXX, 状态 SUCCESS
[PaymentController] 支付回调处理成功: XXXXXX → XXXXXX
```

---

## 🔍 代码改动说明

### SDK 初始化方式对比

**旧 SDK（wechatpay-node-v3）：**

```typescript
this.wxpay = new WxPay({
  appid: this.appId,
  mchid: this.mchId,
  publicKey: publicKey || null, // 平台证书
  privateKey: privateKey,
  key: this.apiKey,
  serial_no: this.serialNo,
});
```

**新 SDK（wechatpay-axios-plugin）：**

```typescript
this.wxpay = new Wechatpay({
  mchid: this.mchId,
  serial: this.serialNo,
  privateKey: privateKey,
  certs: {
    [publicKeyId]: publicKey, // 微信支付公钥（推荐）
  },
});
```

### API 调用方式对比

**旧 SDK：**

```typescript
const result = await this.wxpay.transactions_jsapi({...});
const prepayId = result.prepay_id;
```

**新 SDK：**

```typescript
const { data } = await this.wxpay.v3.pay.transactions.jsapi.post({...});
const prepayId = data.prepay_id;
```

**关键差异：**

- 新 SDK 使用链式调用：`v3.pay.transactions.jsapi.post()`
- 返回值包裹在 `{ data: {...} }` 中
- 更符合 RESTful API 的语义

---

## ⚙️ 兼容性说明

### 向后兼容

如果未配置 `WX_PAY_PUBLIC_KEY_ID` 和 `WX_PAY_PUBLIC_KEY_PATH`，系统会自动下载平台证书（兼容旧配置）。

### 功能不受影响

升级是平滑的，支付、退款、查询等功能保持不变。

---

## 📊 SDK 对比

| 项目 | wechatpay-node-v3 | wechatpay-axios-plugin |
|-----|------------------|------------------------|
| **最新版本** | 2.2.1 | 0.9.4 (2025年5月) |
| **微信公钥模式** | ❌ 不明确支持 | ✅ 官方推荐 |
| **APIv2 支持** | ❌ 仅 V3 | ✅ V2 & V3 |
| **维护状态** | 较慢 | ✅ 活跃 |
| **配置方式** | 较混乱 | ✅ 清晰 |
| **文档质量** | 一般 | ✅ 完善 |
| **社区支持** | 较少 | ✅ 活跃（QQ群: 684379275） |

---

## 🔒 安全检查清单

升级完成后，请确认：

- [ ] 新 SDK 已安装（`wechatpay-axios-plugin@0.9.4`）
- [ ] 微信支付公钥文件已下载并放到 `apps/api/certs/wechatpay_public_key.pem`
- [ ] `.env` 中已添加 `WX_PAY_PUBLIC_KEY_ID` 和 `WX_PAY_PUBLIC_KEY_PATH`
- [ ] 后端启动日志显示"验签模式: 微信支付公钥（推荐）"
- [ ] 测试支付流程通过（调起支付、完成支付、回调成功）
- [ ] 测试退款流程通过
- [ ] 证书文件未被提交到 Git（`git status` 不显示 .pem 文件）

---

## ❓ 常见问题

### 1. 微信支付公钥 ID 在哪里查看？

**位置：** 微信支付商户平台 → 账户中心 → API安全 → 微信支付公钥

**格式：** `PUB_KEY_ID_XXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### 2. 微信支付公钥和平台证书有什么区别？

**微信支付公钥（新，推荐）：**
- 用于验签微信服务器响应
- 配置更简洁：仅需公钥 ID + 公钥文件
- 无需管理证书序列号

**平台证书（旧）：**
- 用于验签微信服务器响应
- 需要配置证书序列号 + 证书文件
- 需要定期更新

### 3. 可以不配置微信支付公钥吗？

**可以，但不推荐。**

如果不配置，SDK 会自动下载平台证书（兼容模式），但存在以下问题：
- 首次调用有额外网络请求延迟
- 证书下载失败会影响支付功能
- 不够安全可控

### 4. 升级后支付失败怎么办？

**排查步骤：**

```bash
# 检查证书文件
ls -la apps/api/certs/wechatpay_public_key.pem

# 查看后端日志
pnpm --filter @opencode/api dev | grep WechatPayService

# 确认环境变量
grep WX_PAY_PUBLIC_KEY apps/api/.env
```

**常见错误：**

- `未配置微信支付公钥` → 添加 `WX_PAY_PUBLIC_KEY_ID` 和 `WX_PAY_PUBLIC_KEY_PATH`
- `读取微信支付公钥失败` → 检查文件路径和权限
- `创建支付订单失败` → 检查商户号、AppID、openid 是否正确

### 5. 如何回退到旧版本？

如果遇到问题需要回退：

```bash
# 修改 apps/api/package.json
"wechatpay-axios-plugin": "^0.9.4" 改为 "wechatpay-node-v3": "^2.2.1"

# 重新安装
pnpm install

# 恢复旧代码（从 git 历史）
git checkout apps/api/src/modules/payment/services/wechat-pay.service.ts

# 重启服务
pnpm --filter @opencode/api dev
```

---

## 📚 参考文档

- [wechatpay-axios-plugin 官方文档](https://wechatpay.js.org/)
- [wechatpay-axios-plugin GitHub](https://github.com/TheNorthMemory/wechatpay-axios-plugin)
- [微信支付 V3 官方文档](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/index.shtml)
- [微信支付公钥配置指南](wechat-pay-public-key-guide.md)
- [微信支付完整配置指南](wechat-pay-setup.md)

---

## 🎯 推荐配置（最佳实践）

**最小化配置（新商户）：**

```env
WX_PAY_APP_ID=你的小程序AppID
WX_PAY_MCH_ID=你的商户号
WX_PAY_API_KEY=你的APIv3密钥
WX_PAY_SERIAL_NO=你的商户证书序列号
WX_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem

# 微信支付公钥（推荐）
WX_PAY_PUBLIC_KEY_ID=PUB_KEY_ID_你的公钥ID
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_public_key.pem

WX_PAY_NOTIFY_URL=https://你的域名/api/payments/wechat/callback
```

**完整配置（包含商户证书）：**

```env
# 基础配置（同上）
...

# 微信支付公钥（推荐）
WX_PAY_PUBLIC_KEY_ID=PUB_KEY_ID_你的公钥ID
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_public_key.pem

# 商户证书（可选，部分接口需要）
# 如需要，请配置 merchant.cert 和 merchant.key
# 本项目已集成在代码中，无需额外配置
```

---

升级完成后，你的微信支付将使用官方推荐的微信支付公钥模式，更安全、更简洁、更易维护！🎉

**如有问题，请查看后端日志或参考文档，或加入技术交流群：QQ群 684379275**