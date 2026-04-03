# 获取微信平台公钥指南

## 📋 概述

微信支付 V3 API 使用双向签名机制：
- **商户私钥**（`apiclient_key.pem）：用于签名商户发起的请求
- **微信平台公钥**（`wechatpay_platform_cert.pem）：用于验证微信服务器的响应签名

本文档指导如何获取和配置微信平台公钥。

---

## 🔑 方法一：手动下载平台证书（推荐）

### 1. 登录微信支付商户平台

访问 [微信支付商户平台](https://pay.weixin.qq.com/) 并登录

### 2. 进入 API 安全设置

账户中心 → API安全 → 平台证书

### 3. 下载平台证书

1. 点击"查看平台证书"
2. 选择最新的证书（查看有效期）
3. 点击"下载证书"
4. 证书文件通常命名为：`wechatpay_XXXXX.pem`

### 4. 配置证书文件

```bash
# 将下载的证书重命名并放到项目中
cd apps/api/certs/
mv wechatpay_XXXXX.pem wechatpay_platform_cert.pem
```

### 5. 更新环境变量

编辑 `apps/api/.env`：

```env
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_platform_cert.pem
```

---

## ⚙️ 方法二：使用 SDK 自动下载（兼容模式）

如果不手动配置平台公钥，SDK 会在首次调用微信 API 时自动下载平台证书。

### 优点

- 无需手动操作
- 自动更新证书

### 缺点

- 首次调用会有额外的网络请求延迟
- 证书下载失败会影响支付功能
- 不够安全可控

### 配置方式

**不配置** `WX_PAY_PUBLIC_KEY_PATH` 环境变量，或设置为空：

```env
# 不配置此变量，SDK 将自动下载
# WX_PAY_PUBLIC_KEY_PATH=
```

---

## 🔍 方法三：使用 API 掦取证书（高级）

如果需要自动化部署，可以通过微信支付 API 获取平台证书。

### 使用 openssl 命令

```bash
# 下载平台证书
curl -X GET \
  "https://api.mch.weixin.qq.com/v3/certificates" \
  -H "Authorization: WECHATPAY2-SHA256-RSA2048 ..." \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  > certificates.json

# 解密证书内容（需要使用 API v3 密钥）
# 详见微信支付官方文档
```

### 使用 SDK 方法

```typescript
import WxPay from 'wechatpay-node-v3';

const pay = new WxPay({
  appid: 'YOUR_APPID',
  mchid: 'YOUR_MCHID',
  publicKey: null, // 自动下载模式
  privateKey: fs.readFileSync('./certs/apiclient_key.pem'),
  key: 'YOUR_API_KEY',
  serial_no: 'YOUR_SERIAL_NO',
});

// SDK 会自动在首次调用时下载并缓存平台证书
```

---

## ✅ 验证证书配置

### 1. 检查文件是否存在

```bash
ls -la apps/api/certs/
```

应该看到：

```
apiclient_key.pem            # 商户私钥
apiclient_cert.pem           # 商户证书（可选）
wechatpay_platform_cert.pem  # 微信平台公钥
```

### 2. 检查证书内容

```bash
# 查看商户私钥（不要泄露）
head -5 apps/api/certs/apiclient_key.pem

# 查看微信平台公钥
head -5 apps/api/certs/wechatpay_platform_cert.pem
```

应该看到：

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----
```

### 3. 启动后端服务验证

```bash
pnpm --filter @opencode/api dev
```

查看日志：

```
[WechatPayService] 微信支付 V3 初始化成功 | 商户号: XXXXXX | 沙箱: false | 公钥模式: 显式配置
```

如果显示"公钥模式: 显式配置"，说明平台公钥已成功加载。

如果显示"公钥模式: 自动下载"，说明未配置平台公钥，SDK 将自动下载。

---

## 🔄 平台证书更新

微信平台证书有效期通常为 **1-2 年**，过期前需要更新。

### 更新步骤

1. 登录商户平台，下载新的平台证书
2. 替换旧的证书文件：
   ```bash
   mv wechatpay_platform_cert.pem wechatpay_platform_cert_old.pem
   mv wechatpay_new_cert.pem wechatpay_platform_cert.pem
   ```
3. 重启后端服务

### 自动更新（推荐）

如果使用 SDK 自动下载模式，证书会自动更新（无需手动操作）。

---

## ⚠️ 安全提示

1. **不要将证书提交到 Git**
   - 证书文件已在 `.gitignore` 中配置
   - 确认 `git status` 不包含证书文件

2. **生产环境使用密钥管理服务**
   - 阿里云 KMS
   - AWS Secrets Manager
   - HashiCorp Vault

3. **定期检查证书有效期**
   - 设置证书过期提醒
   - 在过期前及时更新

4. **区分商户证书和平台证书**
   - `apiclient_key.pem`：商户私钥（自己生成）
   - `wechatpay_platform_cert.pem`：微信平台公钥（微信提供）

---

## 📚 参考文档

- [微信支付 V3 平台证书说明](https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay3_0.shtml)
- [wechatpay-node-v3 SDK 文档](https://github.com/klover2/wechatpay-node-v3-ts)
- [微信支付签名验签机制](https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay4_1.shtml)

---

## ❓ 常见问题

### 1. 平台证书下载失败

**原因：**
- 商户平台权限不足
- 网络问题

**解决：**
- 确认有商户平台管理员权限
- 使用稳定的网络环境
- 联系微信支付技术支持

### 2. 证书格式错误

**原因：**
- 下载的文件不是 PEM 格式
- 文件损坏

**解决：**
- 确认文件以 `-----BEGIN CERTIFICATE-----` 开头
- 重新下载证书
- 使用文本编辑器检查文件内容

### 3. 验签失败

**原因：**
- 平台证书过期
- 使用了错误的证书

**解决：**
- 检查证书有效期
- 确认使用最新的平台证书
- 查看后端日志中的错误信息

---

配置完成后，重启后端服务即可使用微信公钥验签模式！