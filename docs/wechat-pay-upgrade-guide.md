# 微信支付配置升级指南：从自动下载到显式公钥模式

## 📋 升级概述

本次升级将微信支付从"SDK 自动下载平台证书"模式改为"显式配置微信平台公钥"模式。

### 升级收益

✅ **更安全**：显式控制平台证书，避免自动下载的不确定性  
✅ **更快速**：避免首次调用时的额外网络请求  
✅ **更可控**：明确证书来源，便于审计和更新  
✅ **更稳定**：避免证书下载失败导致的支付故障  

---

## 🔄 升级步骤

### 1. 下载微信平台公钥

#### 方式一：商户平台手动下载（推荐）

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 账户中心 → API安全 → 平台证书
3. 点击"查看平台证书"
4. 下载最新的证书文件（通常命名为 `wechatpay_XXXXX.pem`）

#### 方式二：使用现有自动下载的证书

如果系统已经运行过支付功能，SDK 可能已自动下载了平台证书。

查找已下载的证书：

```bash
# 查找 SDK 缓存的平台证书（位置可能因版本不同而异）
find apps/api -name "*wechatpay*" -o -name "*platform*" | grep -v node_modules
```

---

### 2. 配置证书文件

将下载的平台证书放到项目中：

```bash
# 进入证书目录
cd apps/api/certs/

# 重命名证书文件
mv wechatpay_XXXXX.pem wechatpay_platform_cert.pem

# 确认文件存在
ls -la
```

应该看到：

```
apiclient_key.pem            # 商户私钥（已有）
apiclient_cert.pem           # 商户证书（可选）
wechatpay_platform_cert.pem  # 微信平台公钥（新增）
.gitkeep                     # Git 占位文件
```

---

### 3. 更新环境变量

编辑 `apps/api/.env`，添加平台公钥配置：

```env
# 微信支付配置
WX_PAY_APP_ID=wxae16eb94a6be55a5
WX_PAY_MCH_ID=你的商户号
WX_PAY_API_KEY=你的APIv3密钥
WX_PAY_SERIAL_NO=你的证书序列号
WX_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem

# 新增：微信平台公钥路径
WX_PAY_PUBLIC_KEY_PATH=./certs/wechatpay_platform_cert.pem

WX_PAY_NOTIFY_URL=https://你的域名/api/payments/wechat/callback
WX_PAY_SANDBOX=false
```

---

### 4. 重启后端服务

```bash
# 重启 API 服务
pnpm --filter @opencode/api dev
```

查看启动日志，确认升级成功：

```
[WechatPayService] 微信支付 V3 初始化成功 | 商户号: XXXXXX | 沙箱: false | 公钥模式: 显式配置
```

**✅ 成功标志**：日志显示"公钥模式: 显式配置"

**⚠️ 兼容模式**：如果显示"公钥模式: 自动下载"，说明未找到平台公钥文件，SDK 将继续使用自动下载模式（功能不受影响）

---

### 5. 测试支付功能

#### 测试小程序支付

1. 打开微信开发者工具
2. 启动小程序：`pnpm --filter @opencode/miniapp dev:mp-weixin`
3. 选择券商品，点击"立即购买"
4. 调起微信支付弹窗
5. 完成支付测试

#### 查看日志确认验签成功

后端日志应显示：

```
[WechatPayService] 支付回调: 订单 XXXXXX, 交易号 XXXXXX, 状态 SUCCESS
[PaymentController] 支付回调处理成功: XXXXXX → XXXXXX
```

---

## 🔍 验证升级结果

### 检查配置文件

```bash
# 检查环境变量
grep WX_PAY_PUBLIC_KEY_PATH apps/api/.env

# 检查证书文件
ls -la apps/api/certs/wechatpay_platform_cert.pem
```

### 检查证书内容

```bash
# 查看证书头部（确认格式正确）
head -5 apps/api/certs/wechatpay_platform_cert.pem
```

应该看到：

```
-----BEGIN CERTIFICATE-----
MIIDFDCCAf2gAwIBAgIUZ...
-----END CERTIFICATE-----
```

### 检查证书有效期

```bash
# 查看证书详细信息（需要 openssl）
openssl x509 -in apps/api/certs/wechatpay_platform_cert.pem -noout -dates
```

输出示例：

```
notBefore=Mar  1 00:00:00 2026 GMT
notAfter=Mar  1 00:00:00 2028 GMT
```

---

## ⚠️ 兼容性说明

### 向后兼容

如果未配置 `WX_PAY_PUBLIC_KEY_PATH`，系统会继续使用自动下载模式：

```typescript
// 代码中的兼容逻辑（wechat-pay.service.ts:73-76）
const publicKey = this.readPublicKey();
if (!publicKey) {
  this.logger.warn(
    `微信平台公钥文件不存在: ${this.publicKeyPath}，将使用自动下载模式`,
  );
}

this.wxpay = new WxPay({
  publicKey: publicKey || null, // 如果未配置，允许自动下载
  ...
});
```

### 功能不受影响

升级是可选的，即使不配置平台公钥，支付功能依然可以正常工作。

---

## 🔒 安全检查清单

升级完成后，请确认：

- [ ] 平台证书文件已下载并放到 `apps/api/certs/`
- [ ] `.env` 中已添加 `WX_PAY_PUBLIC_KEY_PATH` 配置
- [ ] 后端启动日志显示"公钥模式: 显式配置"
- [ ] 测试支付流程通过（调起支付、完成支付、回调成功）
- [ ] 证书文件未被提交到 Git（`git status` 不显示 .pem 文件）
- [ ] 证书文件权限正确（仅当前用户可读）

---

## 📊 升级前后对比

| 项目 | 升级前（自动下载） | 升级后（显式配置） |
|-----|-----------------|-----------------|
| **证书来源** | SDK 自动下载 | 手动下载配置 |
| **首次调用延迟** | 有额外网络请求 | 无额外延迟 |
| **证书更新** | 自动更新 | 手动更新 |
| **可控性** | 低 | 高 |
| **安全性** | 中 | 高 |
| **故障排查** | 难 | 易 |

---

## ❓ 常见问题

### 1. 找不到平台证书下载入口

**解决：**
- 确认有商户平台管理员权限
- 联系商户平台技术支持
- 暂时使用自动下载模式

### 2. 升级后支付失败

**排查步骤：**

```bash
# 检查证书格式
openssl x509 -in apps/api/certs/wechatpay_platform_cert.pem -noout -text

# 查看后端日志
pnpm --filter @opencode/api dev | grep WechatPayService

# 确认环境变量生效
echo $WX_PAY_PUBLIC_KEY_PATH
```

### 3. 证书过期怎么办

**解决：**
- 下载新的平台证书
- 替换旧证书文件
- 重启后端服务

建议设置证书过期提醒（通常有效期 1-2 年）。

### 4. 可以不升级吗？

**可以。**

升级是可选的，系统完全向后兼容。如果不配置平台公钥，SDK 会自动下载证书，支付功能不受影响。

---

## 📚 参考文档

- [获取微信平台公钥详细指南](wechat-pay-public-key-guide.md)
- [微信支付配置完整指南](wechat-pay-setup.md)
- [微信支付 V3 官方文档](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/index.shtml)

---

升级完成后，你的微信支付将使用更安全、更可控的显式公钥验签模式！🎉