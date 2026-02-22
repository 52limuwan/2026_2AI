# 语音与文字聊天记录完全互通

## 功能概述

语音聊天（xiaozhi）和文字聊天（Dify）现在完全互通，两个 AI 系统都能看到完整的历史对话，用户体验就像在使用同一个 AI 助手。

## 核心实现

### 1. 统一会话管理
- 语音和文字使用同一个 `conversationId`
- 所有消息（无论来源）都保存到同一个数据库会话中
- 前端维护统一的消息数组 `messages.value`

### 2. 历史消息传递

#### xiaozhi（语音）接收历史
当用户进入语音模式时：
```javascript
// 准备历史消息（只保留对话内容）
const historyForXiaozhi = messages.value.map(msg => ({
  role: msg.role,
  content: msg.content
}))

// 开始录音会话时附带历史上下文
ws.startAudioSession(historyForXiaozhi)
```

xiaozhi WebSocket 消息格式：
```json
{
  "type": "listen",
  "mode": "manual",
  "state": "start",
  "context": "用户: 我想制定运动计划\nAI: 好的，我来帮您...\n用户: 我有高血压\nAI: 了解了..."
}
```

#### Dify（文字）接收历史
Dify 使用自己的 `conversation_id` 系统自动管理历史：
- 每次请求时传递 `conversation_id`
- Dify 服务器自动加载该会话的所有历史消息
- 无需手动传递历史消息数组

### 3. 消息同步流程

#### 场景 A：文字 → 语音
1. 用户在文字界面发送消息
2. Dify 回复，消息保存到数据库
3. 用户点击语音按钮
4. 前端将所有历史消息（包括文字对话）传递给 xiaozhi
5. xiaozhi 能看到之前的文字对话上下文

#### 场景 B：语音 → 文字
1. 用户在语音界面说话
2. STT 识别后，消息保存到数据库
3. xiaozhi 回复，消息保存到数据库
4. 用户挂断，返回文字界面
5. 用户发送文字消息时，使用同一个 `conversationId`
6. Dify 自动加载该会话的所有历史（包括语音对话）

#### 场景 C：混合对话
1. 用户可以随时在语音和文字之间切换
2. 每次切换时，新的 AI 系统都能看到完整历史
3. 对话上下文完全连贯

## 技术细节

### 前端实现

#### 消息数组（AIAssistant.vue）
```javascript
const messages = ref([])           // 统一消息列表
const conversationId = ref('')     // 统一会话ID
```

#### 语音会话开始（AIAssistant.vue:1310）
```javascript
// 准备历史消息
const historyForXiaozhi = messages.value.map(msg => ({
  role: msg.role,
  content: msg.content
}))

// 开始录音会话，附带历史
ws.startAudioSession(historyForXiaozhi)
```

#### WebSocket 方法（xiaozhi-websocket.js）
```javascript
// 开始录音会话（支持历史消息）
startAudioSession(historyMessages = []) {
  // 构建历史消息上下文
  let context = ''
  if (historyMessages && historyMessages.length > 0) {
    const recentMessages = historyMessages.slice(-10) // 最近10条
    context = recentMessages.map(msg => {
      const role = msg.role === 'user' ? '用户' : 'AI'
      return `${role}: ${msg.content}`
    }).join('\n')
  }
  
  // 发送消息
  const message = {
    type: 'listen',
    mode: 'manual',
    state: 'start',
    context: context || undefined
  }
  this.websocket.send(JSON.stringify(message))
}

// 发送文本消息（支持历史消息）
sendTextMessage(text, historyMessages = []) {
  // 构建历史消息上下文
  let contextText = ''
  if (historyMessages && historyMessages.length > 0) {
    const recentMessages = historyMessages.slice(-10)
    contextText = recentMessages.map(msg => {
      const role = msg.role === 'user' ? '用户' : 'AI'
      return `${role}: ${msg.content}`
    }).join('\n')
  }
  
  // 发送消息
  const listenMessage = {
    type: 'listen',
    mode: 'manual',
    state: 'detect',
    text: text,
    context: contextText || undefined
  }
  this.websocket.send(JSON.stringify(listenMessage))
}
```

### 后端实现

#### Dify API 调用（ai.js:1143）
```javascript
// 构建请求体
const requestBody = {
  files: [],
  inputs: {
    systemprompt: skillContent || ''
  },
  query: message,
  response_mode: 'streaming',
  user: `user_${userId}`
}

// 传递 conversation_id（Dify 自动加载历史）
if (conversationId && conversationId.trim()) {
  requestBody.conversation_id = conversationId
}
```

#### 消息保存（ai.js:867）
```javascript
// 所有消息（语音和文字）都保存到同一张表
INSERT INTO ai_chat_messages 
(user_id, target_client_id, conversation_id, role, content, context, timestamp)
VALUES (...)
```

## 上下文限制

为了性能和 token 限制，我们只传递最近的 10 条消息作为上下文：
```javascript
const recentMessages = historyMessages.slice(-10)
```

如果需要更多上下文，可以调整这个数字，但要注意：
- xiaozhi 的 token 限制
- WebSocket 消息大小限制
- 响应速度影响

## 数据流图

```
用户输入（文字/语音）
    ↓
前端消息数组 (messages.value)
    ↓
保存到数据库 (ai_chat_messages)
    ↓
    ├─→ 发送给 Dify（带 conversation_id）
    │   └─→ Dify 自动加载历史
    │
    └─→ 发送给 xiaozhi（带 context）
        └─→ xiaozhi 接收历史上下文
```

## 测试场景

### 1. 基础互通测试
- [ ] 文字聊天 3 条消息
- [ ] 切换到语音，说"继续刚才的话题"
- [ ] 验证 xiaozhi 能理解之前的文字对话

### 2. 反向互通测试
- [ ] 语音聊天 3 条消息
- [ ] 切换到文字，输入"继续刚才的话题"
- [ ] 验证 Dify 能理解之前的语音对话

### 3. 多次切换测试
- [ ] 文字 → 语音 → 文字 → 语音
- [ ] 验证每次切换后上下文都正确

### 4. 长对话测试
- [ ] 进行 20+ 条消息的对话
- [ ] 验证只传递最近 10 条
- [ ] 验证上下文仍然连贯

### 5. 技能卡片测试
- [ ] 文字触发技能（如"制定运动计划"）
- [ ] 切换到语音继续对话
- [ ] 验证技能上下文保持

### 6. 会话恢复测试
- [ ] 进行混合对话
- [ ] 刷新页面
- [ ] 验证历史记录完整
- [ ] 继续对话，验证上下文正确

## 注意事项

### 1. 会话ID管理
- 确保语音和文字使用同一个 `conversationId`
- 新对话时，等待 Dify 返回新的 `conversation_id`
- 保存到 localStorage 以便恢复

### 2. 消息格式
- xiaozhi 接收简化格式：`{ role, content }`
- 数据库保存完整格式：`{ role, content, skillSteps, timestamp }`
- Dify 通过 `conversation_id` 自动管理

### 3. 性能优化
- 只传递最近 10 条消息
- 历史消息格式化为纯文本
- 避免传递大量元数据

### 4. 错误处理
- WebSocket 断开时，保留本地消息
- Dify API 失败时，不影响消息保存
- 确保消息不会丢失或重复

## 未来优化

1. **智能上下文选择**：根据对话主题智能选择相关历史消息
2. **上下文压缩**：使用摘要技术压缩长对话历史
3. **多模态支持**：支持图片、文件等多模态历史
4. **实时同步**：多设备间实时同步对话历史
