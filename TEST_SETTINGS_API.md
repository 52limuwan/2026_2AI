# 测试设置 API

## 问题诊断

从错误日志看到：
```
GET http://localhost:8888/api/client/settings 404 (Not Found)
PUT http://localhost:8888/api/client/settings 404 (Not Found)
```

这表示后端服务器没有识别到新添加的路由。

## 解决方案

### 1. 重启后端服务器

后端代码已经更新，但需要重启服务器才能生效。

在 `Backed` 目录下运行：

```bash
# 如果使用 nodemon (开发模式)
npm run dev

# 或者使用 node (生产模式)
npm start
```

### 2. 验证 API 是否工作

重启后，可以使用以下方法测试：

#### 使用 curl 测试

```bash
# 获取设置 (需要先登录获取 token)
curl -X GET http://localhost:8888/api/client/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 更新设置
curl -X PUT http://localhost:8888/api/client/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"ws_url":"ws://localhost:8080"}'
```

#### 在浏览器中测试

1. 登录到应用
2. 进入 AI 助手页面
3. 点击顶部的设置按钮（齿轮图标）
4. 输入 WebSocket 地址，例如：`ws://localhost:8080`
5. 点击保存

### 3. 检查数据库

设置保存后，可以查看数据库验证：

```sql
SELECT id, username, preferences FROM users WHERE id = YOUR_USER_ID;
```

`preferences` 字段应该包含类似这样的 JSON：
```json
{"ws_url":"ws://localhost:8080"}
```

## 功能说明

### 前端

- **AppHeader**: 在 skills 按钮左边添加了设置按钮（齿轮图标）
- **SettingsDialog**: 新的设置对话框组件，支持配置 WebSocket 地址
- **Layout**: 处理设置按钮点击事件
- **AIAssistant**: 显示设置对话框

### 后端

添加了以下 API 端点：

- `GET /api/client/settings` - 获取用户设置
- `PUT /api/client/settings` - 更新用户设置
- `GET /api/guardian/settings` - 获取监护人设置
- `PUT /api/guardian/settings` - 更新监护人设置
- `GET /api/gov/settings` - 获取政府用户设置
- `PUT /api/gov/settings` - 更新政府用户设置

### 数据存储

设置保存在 `users` 表的 `preferences` 字段（JSON 格式）：

```json
{
  "ws_url": "ws://localhost:8080",
  "current_community_id": 1,
  ...其他设置
}
```

## 支持的角色

- ✅ Client (客户端)
- ✅ Guardian (监护人)
- ✅ Gov (政府用户)

所有三个角色都可以使用设置功能。
