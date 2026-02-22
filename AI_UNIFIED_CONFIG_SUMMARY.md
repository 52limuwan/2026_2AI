# AI助手统一配置总结

## 配置完成 ✅

所有端（client、guardian、gov）的AI助手已统一配置为：

### 语音通话
- 使用 **xiaozhi WebSocket (OTA)**
- 每个端有独立的 WebSocket 连接

### 文字聊天
- 统一使用 **dify API**
- 所有端共用同一个 API Key 配置
- 通过用户ID前缀区分不同端

## 环境变量配置

在 `Backed/.env` 文件中只需配置一次：

```env
# Dify API Configuration (所有端统一使用)
DIFY_API_KEY=your_actual_dify_api_key
DIFY_API_URL=https://api.dify.ai/v1
```

## 修改的文件清单

### 前端 (4个文件)
1. ✅ `Unified/src/modules/client/AIAssistant.vue` - 客户端AI助手
2. ✅ `Unified/src/modules/guardian/AIAssistant.vue` - 监护人端AI助手
3. ✅ `Unified/src/modules/gov/AIAssistant.vue` - 政府端AI助手
4. ✅ `Unified/src/api/ai.js` - API调用（自动根据角色路由）

### 后端 (2个文件)
1. ✅ `Backed/src/routes/ai.js` - AI路由（3个端点都集成dify）
2. ✅ `Backed/.env.example` - 环境变量示例

## 用户ID区分

dify API 会收到带角色前缀的用户ID：

- **客户端**：`user_123`
- **监护人端**：`guardian_123`
- **政府端**：`gov_123`

这样可以在 dify 平台上区分不同端的用户，同时共用一个应用配置。

## 后端API端点

所有端点使用相同的请求/响应格式，只是路径不同：

- `POST /ai/chat/client` - 客户端
- `POST /ai/chat/guardian` - 监护人端
- `POST /ai/chat/gov` - 政府端

前端会根据用户角色自动调用对应的端点。

## 下一步

1. 在 `Backed/.env` 中配置 dify API Key
2. 重启后端服务
3. 测试各端的文字聊天功能
4. 测试语音通话功能（如需要）

## 优势

✅ 统一配置，易于管理  
✅ 所有端共用一个 dify 应用  
✅ 通过用户ID前缀区分不同端  
✅ 语音和文字功能分离，互不干扰  
✅ 代码结构清晰，易于维护
