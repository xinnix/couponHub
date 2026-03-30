# 登录错误提示测试指南

## 🧪 测试步骤

### 1. 启动服务

```bash
# 启动后端（终端 1）
pnpm --filter @opencode/api dev

# 启动前端（终端 2）
pnpm --filter @opencode/admin dev
```

### 2. 访问登录页面

打开浏览器访问：http://localhost:5173/login

### 3. 测试错误提示

#### 测试 1：邮箱不存在

**输入：**
- 邮箱：`notexist@example.com`
- 密码：`password123`

**预期结果：**
- ❌ 表单上方显示红色错误提示框：**"邮箱不存在"**
- ❌ 页面顶部显示错误 Toast：**"邮箱不存在"**
- 🖥️ 浏览器控制台输出：
  ```
  authProvider: 登录失败 {message: "邮箱不存在", ...}
  AuthContext: 登录失败 - 邮箱不存在
  登录错误: Error: 邮箱不存在
  ```

#### 测试 2：密码错误

**输入：**
- 邮箱：`superadmin@example.com`
- 密码：`wrongpassword`

**预期结果：**
- ❌ 错误提示：**"密码错误"**
- 🖥️ 控制台输出详细的错误日志

#### 测试 3：账户被禁用

**步骤：**
1. 在数据库中禁用一个账户：
   ```sql
   UPDATE admins SET "isActive" = false WHERE email = 'viewer@example.com';
   ```

2. 尝试登录：
   - 邮箱：`viewer@example.com`
   - 密码：`password123`

**预期结果：**
- ❌ 错误提示：**"账户已被禁用，请联系管理员"**

#### 测试 4：登录成功

**输入：**
- 邮箱：`superadmin@example.com`
- 密码：`password123`

**预期结果：**
- ✅ 成功提示：**"登录成功"**
- 🔀 自动跳转到仪表盘页面
- 🖥️ 控制台输出：
  ```
  authProvider: 尝试登录 superadmin@example.com
  authProvider: 登录成功
  ```

## 🔍 错误显示位置

### 1. Alert 组件（表单内）

- 📍 位置：登录表单顶部
- 🎨 样式：红色背景，可关闭
- ⏱️ 持续时间：手动关闭

### 2. Message Toast（全局）

- 📍 位置：页面顶部中央
- 🎨 样式：Ant Design message 组件
- ⏱️ 持续时间：3 秒自动消失

### 3. 浏览器控制台

- 📍 位置：开发者工具 Console 标签
- 📝 内容：详细的错误日志和堆栈信息

## 🐛 故障排查

### 问题 1：看不到错误提示

**可能原因：**
- 前端代码未重新编译
- 浏览器缓存

**解决方案：**
```bash
# 1. 重启前端服务
pnpm --filter @opencode/admin dev

# 2. 清除浏览器缓存并硬刷新
# Chrome: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### 问题 2：错误信息不明确

**检查步骤：**
1. 打开浏览器开发者工具
2. 查看 Console 标签的详细日志
3. 查看 Network 标签的请求响应

**预期响应格式：**
```json
{
  "error": {
    "message": "邮箱不存在",
    "code": -32001,
    "data": {
      "code": "UNAUTHORIZED",
      "httpStatus": 401
    }
  }
}
```

### 问题 3：控制台有错误但 UI 无提示

**检查：**
- Ant Design message 组件是否正常工作
- 页面是否有 CSS z-index 问题

**测试 message 组件：**
打开浏览器控制台，执行：
```javascript
message.success('测试成功提示');
message.error('测试错误提示');
```

## 📊 完整错误类型对照表

| 错误类型 | 错误信息 | HTTP 状态 | 测试方法 |
|---------|---------|----------|---------|
| 邮箱不存在 | `邮箱不存在` | 401 | 输入未注册邮箱 |
| 密码错误 | `密码错误` | 401 | 正确邮箱 + 错误密码 |
| 账户被禁用 | `账户已被禁用，请联系管理员` | 403 | 登录被禁用的账户 |
| 邮箱已注册 | `该邮箱已被注册，请直接登录` | 409 | 注册已存在的邮箱 |

## 🎨 自定义错误提示样式

如果需要自定义错误提示样式，可以修改 `LoginPage.css`：

```css
/* 自定义 Alert 样式 */
.ant-alert-error {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.1);
}

/* 自定义错误图标 */
.ant-alert-error .ant-alert-icon {
  color: #ff4d4f;
}
```

## 📝 开发者注意事项

1. **错误日志**：所有错误都会在控制台输出详细日志，便于调试
2. **错误清理**：每次提交表单时会清空之前的错误提示
3. **错误关闭**：用户可以手动关闭 Alert 错误提示
4. **双重提示**：同时使用 Alert 和 message 确保用户能看到错误

## ✅ 验收标准

- [ ] 邮箱不存在时显示明确错误提示
- [ ] 密码错误时显示明确错误提示
- [ ] 账户被禁用时显示明确错误提示
- [ ] 登录成功时跳转到仪表盘
- [ ] 错误提示可以关闭
- [ ] 控制台有详细的调试日志
- [ ] 网络请求中能看到完整的错误响应