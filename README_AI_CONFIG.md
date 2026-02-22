# AI助手配置说明

## 🎯 快速开始

### 1. 配置环境变量

在 `Backed/.env` 文件中添加：

```env
DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxxxx
DIFY_API_URL=https://api.dify.ai/v1
```

### 2. 重启服务

```bash
cd Backed
npm start
```

### 3. 测试功能

登录任意端（client/guardian/gov），打开AI助手，发送消息测试。

## 📖 详细文档

- **[DIFY_CONFIG_GUIDE.md](./DIFY_CONFIG_GUIDE.md)** - Dify API 配置详细指南
- **[CHECKLIST.md](./CHECKLIST.md)** - 配置和测试检查清单
- **[AI_UNIFIED_CONFIG_SUMMARY.md](./AI_UNIFIED_CONFIG_SUMMARY.md)** - 配置总结
- **[AI_ASSISTANT_API_CHANGES.md](./AI_ASSISTANT_API_CHANGES.md)** - 技术修改详情

## 🔑 核心配置

### 环境变量

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `DIFY_API_KEY` | Dify API密钥 | ✅ 是 | - |
| `DIFY_API_URL` | Dify API地址 | ❌ 否 | `https://api.dify.ai/v1` |

### 功能分离

- **文字聊天**：使用 Dify API（统一配置）
- **语音通话**：使用 xiaozhi WebSocket（独立配置）

### 用户区分

系统自动为不同端的用户添加前缀：

- Client端：`user_123`
- Guardian端：`guardian_123`
- Gov端：`gov_123`

## 🏗️ 架构说明

```
前端 (Vue)
  ├── client/AIAssistant.vue
  ├── guardian/AIAssistant.vue
  └── gov/AIAssistant.vue
       ↓
  api/ai.js (自动路由)
       ↓
后端 (Express)
  ├── /ai/chat/client    → Dify API
  ├── /ai/chat/guardian  → Dify API
  └── /ai/chat/gov       → Dify API
       ↓
Dify Platform (统一配置)
```

## ✨ 特性

✅ 统一配置 - 所有端共用一个 Dify API Key  
✅ 自动路由 - 根据用户角色自动调用对应端点  
✅ 用户隔离 - 通过ID前缀区分不同端用户  
✅ 功能分离 - 语音和文字使用不同的服务  
✅ 易于维护 - 清晰的代码结构

## 🔒 安全提示

⚠️ 不要将 `.env` 文件提交到版本控制  
⚠️ 不要在前端代码中暴露 API Key  
⚠️ 定期更换 API Key  
⚠️ 使用 HTTPS 传输数据

## 🐛 故障排查

### 问题：发送消息后没有回复

**可能原因：**
1. API Key 未配置或配置错误
2. Dify 服务不可用
3. 网络连接问题

**解决方法：**
1. 检查 `Backed/.env` 中的 `DIFY_API_KEY`
2. 查看后端日志确认错误信息
3. 测试网络连接到 Dify API

### 问题：提示 "AI 服务配置错误"

**原因：** `DIFY_API_KEY` 未配置或格式错误

**解决方法：**
1. 确认 `.env` 文件中有 `DIFY_API_KEY`
2. 确认 API Key 格式正确（`app-` 开头）
3. 重启后端服务

### 问题：语音通话无法使用

**原因：** 语音通话使用 xiaozhi WebSocket，与 Dify 配置无关

**解决方法：**
1. 检查 xiaozhi WebSocket 配置
2. 查看浏览器控制台的 WebSocket 连接状态
3. 确认麦克风权限已授予

## 📞 支持

如有问题，请查看：
1. [CHECKLIST.md](./CHECKLIST.md) - 完整的测试清单
2. [DIFY_CONFIG_GUIDE.md](./DIFY_CONFIG_GUIDE.md) - 详细配置指南
3. 后端日志文件 `Backed/logs/app.log`

## 📝 更新日志

### 2024-01-XX
- ✅ 统一所有端使用 Dify API
- ✅ 简化环境变量配置（`DIFY_API_KEY` 和 `DIFY_API_URL`）
- ✅ 实现自动路由功能
- ✅ 添加用户ID前缀区分
- ✅ 完善文档和配置指南
