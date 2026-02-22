# AI助手API修改说明

## 修改概述

已将AI助手的API配置修改为：
- **语音通话**：使用 xiaozhi 的 WebSocket (OTA)
- **文字聊天**：统一使用 dify 的 API（所有端共用同一个配置）

## 修改的文件

### 1. 前端文件

#### `Unified/src/modules/client/AIAssistant.vue`
- 修改了 `handleSend` 函数，移除了 WebSocket 文字消息发送逻辑
- 文字聊天现在直接使用 dify API（通过后端代理）
- 语音通话继续使用 xiaozhi WebSocket 连接

#### `Unified/src/modules/guardian/AIAssistant.vue`
- 修改了 `handleSend` 函数，移除了 WebSocket 文字消息发送逻辑
- 文字聊天使用 dify API

#### `Unified/src/modules/gov/AIAssistant.vue`
- 修改了 `handleSend` 函数，移除了 WebSocket 文字消息发送逻辑
- 文字聊天使用 dify API

#### `Unified/src/api/ai.js`
- 更新了 `sendXiaozhiMessage` 函数
- 根据用户角色自动调用对应的后端端点：
  - client → `/ai/chat/client`
  - guardian → `/ai/chat/guardian`
  - gov → `/ai/chat/gov`

### 2. 后端文件

#### `Backed/src/routes/ai.js`
- 修改了 `/ai/chat/client` 路由，集成 dify API
- 修改了 `/ai/chat/guardian` 路由，集成 dify API
- 修改了 `/ai/chat/gov` 路由，集成 dify API
- 所有端点使用统一的 dify API 配置
- 支持对话ID管理和消息历史

#### `Backed/.env.example`
- 添加了 dify API 配置项（所有端共用）：
  - `DIFY_API_KEY`: dify API密钥
  - `DIFY_API_URL`: dify API地址（默认：https://api.dify.ai/v1）

## 配置步骤

### 1. 配置环境变量

在 `Backed/.env` 文件中添加以下配置：

```env
# Dify API Configuration (统一配置，所有端共用)
DIFY_API_KEY=your_actual_dify_api_key
DIFY_API_URL=https://api.dify.ai/v1
```

### 2. 获取 dify API Key

1. 访问 dify 平台
2. 创建或选择一个应用
3. 在应用设置中找到 API Key
4. 复制 API Key 并填入 `.env` 文件

## 功能说明

### 语音通话（xiaozhi WebSocket）

- 点击电话按钮触发
- 使用 xiaozhi 的 OTA WebSocket 连接
- 支持实时语音识别和语音合成
- 消息会保存到数据库

### 文字聊天（dify API - 统一配置）

- 在输入框输入文字并发送
- 通过后端调用 dify API
- 所有端（client、guardian、gov）使用同一个 dify API 配置
- 用户ID会带上角色前缀以区分不同端的用户：
  - client端：`user_123`
  - guardian端：`guardian_123`
  - gov端：`gov_123`
- 支持对话历史管理
- 支持流式输出效果（前端模拟）
- 消息会保存到数据库

## API 端点

### 文字聊天端点

**客户端：**
```
POST /ai/chat/client
```

**监护人端：**
```
POST /ai/chat/guardian
```

**政府端：**
```
POST /ai/chat/gov
```

**请求体（所有端点相同）：**
```json
{
  "conversationId": "conv_123456",  // 可选，首次为空
  "message": "用户消息内容"
}
```

**响应（所有端点相同）：**
```json
{
  "success": true,
  "data": {
    "reply": "AI回复内容",
    "conversationId": "conv_123456",
    "timestamp": 1234567890
  },
  "message": "消息发送成功"
}
```

## 测试建议

1. **测试文字聊天（所有端）**：
   - 分别登录 client、guardian、gov 账号
   - 在输入框输入消息并发送
   - 验证是否收到 dify API 的回复
   - 检查对话历史是否正确保存

2. **测试语音通话**：
   - 点击电话按钮
   - 验证 WebSocket 连接是否成功
   - 测试语音识别和语音合成功能

3. **测试对话切换**：
   - 创建多个对话
   - 切换不同对话
   - 验证消息历史是否正确加载

4. **测试跨端隔离**：
   - 验证不同角色的用户对话是否独立
   - 检查用户ID前缀是否正确

## 注意事项

1. **API Key 安全**：
   - 不要将 API Key 提交到版本控制
   - 使用环境变量管理敏感信息

2. **统一配置**：
   - 所有端使用同一个 dify API Key
   - 通过用户ID前缀区分不同端的用户

3. **错误处理**：
   - dify API 调用失败时会显示错误提示
   - WebSocket 连接失败时会提示用户

4. **性能优化**：
   - dify API 调用设置了 30 秒超时
   - 前端使用流式输出效果提升用户体验

## 后续优化建议

1. 支持 dify 的流式响应（SSE）
2. 添加重试机制
3. 优化错误提示信息
4. 添加对话标题自动生成
5. 支持消息编辑和删除
6. 考虑为不同端配置不同的 dify 应用（如需要不同的AI行为）
