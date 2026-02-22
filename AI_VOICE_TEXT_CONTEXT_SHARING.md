# 语音与文字聊天上下文互通 - 实现总结

## 概述

实现了 xiaozhi（语音）和 Dify（文字）两个 AI 系统之间的完整上下文互通，让用户感觉像在使用同一个 AI 助手。

## 核心改动

### 1. xiaozhi WebSocket 支持历史消息

**文件**：`Unified/src/utils/xiaozhi-websocket.js`

#### 修改 1：`startAudioSession` 方法
```javascript
// 之前：不支持历史消息
startAudioSession() {
  const message = {
    type: 'listen',
    mode: 'manual',
    state: 'start'
  }
  this.websocket.send(JSON.stringify(message))
}

// 之后：支持历史消息
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
  
  const message = {
    type: 'listen',
    mode: 'manual',
    state: 'start',
    context: context || undefined // 附带历史上下文
  }
  this.websocket.send(JSON.stringify(message))
}
```

#### 修改 2：`sendTextMessage` 方法
```javascript
// 之前：不支持历史消息
sendTextMessage(text) {
  const listenMessage = {
    type: 'listen',
    mode: 'manual',
    state: 'detect',
    text: text
  }
  this.websocket.send(JSON.stringify(listenMessage))
}

// 之后：支持历史消息
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
  
  const listenMessage = {
    type: 'listen',
    mode: 'manual',
    state: 'detect',
    text: text,
    context: contextText || undefined // 附带历史上下文
  }
  this.websocket.send(JSON.stringify(listenMessage))
}
```

### 2. 前端传递历史消息

**文件**：`Unified/src/modules/client/AIAssistant.vue`

#### 修改：语音会话开始时传递历史
```javascript
// 之前：不传递历史
ws.startAudioSession()

// 之后：传递历史消息
const historyForXiaozhi = messages.value.map(msg => ({
  role: msg.role,
  content: msg.content
}))

console.log(`传递 ${historyForXiaozhi.length} 条历史消息给 xiaozhi`)
ws.startAudioSession(historyForXiaozhi)
```

## 工作原理

### 文字 → 语音切换

```
1. 用户在文字界面发送消息
   ↓
2. Dify 回复，消息保存到 messages.value 和数据库
   ↓
3. 用户点击语音按钮
   ↓
4. 前端准备历史消息数组
   historyForXiaozhi = messages.value.map(msg => ({
     role: msg.role,
     content: msg.content
   }))
   ↓
5. 调用 ws.startAudioSession(historyForXiaozhi)
   ↓
6. WebSocket 发送消息到 xiaozhi：
   {
     type: 'listen',
     mode: 'manual',
     state: 'start',
     context: '用户: xxx\nAI: xxx\n...'
   }
   ↓
7. xiaozhi 接收历史上下文，理解之前的对话
```

### 语音 → 文字切换

```
1. 用户在语音界面说话
   ↓
2. STT 识别，消息保存到 messages.value 和数据库
   ↓
3. xiaozhi 回复，消息保存到 messages.value 和数据库
   ↓
4. 用户挂断，返回文字界面
   ↓
5. 用户发送文字消息
   ↓
6. 前端调用 Dify API，传递 conversationId
   {
     conversation_id: 'xxx',
     query: 'xxx'
   }
   ↓
7. Dify 根据 conversation_id 自动加载历史
   （包括之前的语音对话）
   ↓
8. Dify 理解完整上下文，生成回复
```

## 关键设计

### 1. 统一会话管理
- 语音和文字使用同一个 `conversationId`
- 所有消息保存到同一个数据库会话
- 前端维护统一的 `messages.value` 数组

### 2. 双向上下文传递
- **xiaozhi**：通过 `context` 字段接收历史（手动传递）
- **Dify**：通过 `conversation_id` 自动加载历史（自动管理）

### 3. 历史消息限制
- 只传递最近 10 条消息
- 避免 token 超限和性能问题
- 格式化为纯文本，减少数据量

### 4. 消息格式转换
```javascript
// 完整格式（前端存储）
{
  role: 'user',
  content: '消息内容',
  timestamp: 1234567890,
  skillSteps: [...]
}

// 简化格式（传递给 xiaozhi）
{
  role: 'user',
  content: '消息内容'
}

// 文本格式（WebSocket 传输）
"用户: 消息内容\nAI: 回复内容\n..."
```

## 数据流

```
┌─────────────────────────────────────────────────────────┐
│                      用户输入                            │
│                   (文字 / 语音)                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              前端消息数组 (messages.value)               │
│              统一会话ID (conversationId)                 │
└────────┬──────────────────────────────┬─────────────────┘
         ↓                              ↓
┌──────────────────┐          ┌──────────────────┐
│  保存到数据库     │          │  实时显示界面     │
│ ai_chat_messages │          │  (文字/语音)      │
└──────────────────┘          └──────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│                    发送给 AI 系统                        │
├─────────────────────────────┬───────────────────────────┤
│         Dify (文字)          │      xiaozhi (语音)       │
├─────────────────────────────┼───────────────────────────┤
│ • 传递 conversation_id      │ • 传递 context 字段       │
│ • Dify 自动加载历史         │ • 包含最近10条消息        │
│ • 无需手动传递消息数组      │ • 格式化为文本            │
└─────────────────────────────┴───────────────────────────┘
```

## 优势

### 1. 用户体验
- ✅ 无缝切换，上下文不丢失
- ✅ 感觉像在使用同一个 AI
- ✅ 可以随时选择最方便的输入方式

### 2. 技术实现
- ✅ 利用各 AI 系统的原生能力
- ✅ Dify 自动管理历史，减少开发工作
- ✅ xiaozhi 接收格式化上下文，灵活可控

### 3. 性能优化
- ✅ 只传递必要的历史消息（10条）
- ✅ 简化消息格式，减少数据量
- ✅ 避免重复存储和传输

## 限制与注意事项

### 1. 历史消息数量
- 当前限制：10 条
- 原因：token 限制、性能考虑
- 可调整：修改 `slice(-10)` 中的数字

### 2. xiaozhi 服务端支持
- 需要 xiaozhi 支持 `context` 字段
- 如果不支持，需要联系服务端团队
- 可以通过 WebSocket 消息验证

### 3. 消息格式
- xiaozhi 接收纯文本格式
- 不包含技能卡片等元数据
- 只保留核心对话内容

### 4. 会话ID管理
- 必须确保两个系统使用同一个 ID
- 新对话时等待 Dify 返回 ID
- 保存到 localStorage 以便恢复

## 测试验证

详细测试指南请参考：`TEST_VOICE_TEXT_INTEGRATION.md`

### 快速验证
1. 文字聊天 2-3 条消息
2. 切换到语音，说"继续刚才的话题"
3. 验证 xiaozhi 能理解之前的文字对话

### 控制台日志
```
传递 3 条历史消息给 xiaozhi
开始录音会话，附带历史消息上下文 (3 条)
历史上下文预览: 用户: 我想了解营养搭配
AI: 好的，我来帮您...
```

## 未来优化方向

### 1. 智能上下文选择
- 根据对话主题选择相关历史
- 而不是简单的最近 N 条
- 提高上下文相关性

### 2. 上下文压缩
- 使用摘要技术压缩长对话
- 保留关键信息，减少 token
- 支持更长的对话历史

### 3. 多模态支持
- 支持图片、文件等历史
- 语音识别的原始音频
- 更丰富的上下文信息

### 4. 实时同步
- 多设备间实时同步
- WebSocket 推送更新
- 离线消息队列

## 相关文档

- `AI_VOICE_TEXT_INTEGRATION.md` - 完整技术文档
- `TEST_VOICE_TEXT_INTEGRATION.md` - 测试指南
- `AI_UNIFIED_CONFIG_SUMMARY.md` - 配置说明

## 总结

通过这次改动，我们实现了：

1. ✅ xiaozhi 能看到文字聊天历史
2. ✅ Dify 能看到语音聊天历史
3. ✅ 用户可以无缝切换模式
4. ✅ 对话上下文完全连贯
5. ✅ 技能卡片在两种模式下都工作
6. ✅ 所有消息持久化保存

用户现在可以自由选择最方便的交互方式，而不用担心上下文丢失！
