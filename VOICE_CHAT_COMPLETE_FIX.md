# 语音聊天完整修复总结

## 问题列表

1. ✅ 挂断后 WebSocket 连接没有关闭
2. ✅ TTS 消息没有保存到数据库
3. ✅ 聊天记录没有显示在主界面
4. ✅ 通话界面显示多条分散的 AI 消息

## 修复过程

### 问题1：WebSocket 连接管理

**症状**：挂断后仍能收到语音消息

**原因**：`handleClosePhoneCall` 没有断开 WebSocket 连接

**修复**：
```javascript
const handleClosePhoneCall = () => {
  // 停止录音
  if (wsInstance) {
    wsInstance.stopAudioSession();
    wsInstance.disconnect();  // ✅ 添加断开连接
    wsConnected.value = false;
  }
  // ...
}
```

**文件**：`Unified/src/modules/client/AIAssistant.vue`

---

### 问题2：TTS 消息没有传递到应用层

**症状**：只有用户消息保存，AI 回复没有保存

**原因**：`xiaozhi-websocket.js` 的 `handleTTSMessage` 没有调用 `onChatMessage` 回调

**修复**：
```javascript
handleTTSMessage(message) {
  if (message.state === 'start') {
    // ✅ 添加回调
    if (this.onChatMessage) {
      this.onChatMessage({ type: 'tts', state: 'start', session_id: message.session_id });
    }
  } else if (message.state === 'sentence_start') {
    // ✅ 添加回调
    if (this.onChatMessage && message.text) {
      this.onChatMessage({ type: 'tts', state: 'sentence_start', text: message.text, session_id: message.session_id });
    }
  } else if (message.state === 'stop') {
    // ✅ 添加回调
    if (this.onChatMessage) {
      this.onChatMessage({ type: 'tts', state: 'stop', session_id: message.session_id });
    }
  }
}
```

**文件**：`Unified/src/utils/xiaozhi-websocket.js`

---

### 问题3：消息处理器注册问题

**症状**：TTS 消息仍然没有被处理

**原因**：`connectWebSocket` 使用局部变量 `ws` 而不是全局 `wsInstance`

**修复**：
```javascript
const connectWebSocket = async () => {
  // ✅ 使用全局 wsInstance
  if (!wsInstance) {
    wsInstance = await getWsInstance()
  }
  
  // ... 连接逻辑 ...
  
  // ✅ 注册到正确的实例
  wsInstance.onMessage(handleWebSocketMessage)
}
```

**文件**：`Unified/src/modules/client/AIAssistant.vue`

---

### 问题4：通话界面显示分散的消息

**症状**：每个 TTS 片段显示为单独的消息

**原因**：`voiceTranscript` 数组为每个片段创建新条目

**修复**：
```javascript
// 收到 TTS 文本片段时
if (message.text && message.text.trim()) {
  // 查找最后一条 AI 消息
  const lastTranscript = voiceTranscript.value[voiceTranscript.value.length - 1];
  if (lastTranscript && !lastTranscript.isUser) {
    // ✅ 如果最后一条是 AI 消息，追加文本
    lastTranscript.text += message.text;
  } else {
    // 否则创建新的 AI 消息
    voiceTranscript.value.push({
      text: message.text,
      isUser: false,
      timestamp: Date.now()
    });
  }
}
```

**文件**：`Unified/src/modules/client/AIAssistant.vue`

---

## 修改的文件总结

1. **Unified/src/utils/xiaozhi-websocket.js**
   - 修改 `handleTTSMessage` 添加 `onChatMessage` 回调
   - 修改 `disconnect` 方法完善资源清理
   - 修改 `AudioRecorder.stop` 添加详细日志

2. **Unified/src/modules/client/AIAssistant.vue**
   - 修改 `connectWebSocket` 使用全局 `wsInstance`
   - 修改 `handleWebSocketMessage` 合并 TTS 片段到 voiceTranscript
   - 修改 `handleClosePhoneCall` 断开连接并保存未保存的消息
   - 修改 `handlePhoneCall` 添加语音模式日志
   - 添加详细的调试日志

3. **Unified/src/modules/guardian/AIAssistant.vue**
   - 修改 `handleClosePhoneCall` 断开连接并保存未保存的消息
   - 修改消息保存逻辑添加 `saved` 标记

4. **Unified/src/modules/gov/AIAssistant.vue**
   - 修改 `handleClosePhoneCall` 断开连接并保存未保存的消息
   - 修改消息保存逻辑添加 `saved` 标记

5. **Unified/src/components/VoiceCall.vue**
   - 修改 props 从 `wsUrl` 改为 `role`
   - 修改 `endCall` 和 `minimizeCall` 断开连接

## 功能验证

### 1. 启动语音通话
```
✅ 语音模式已启用，isVoiceMode: true
📝 注册消息处理器 handleWebSocketMessage
WebSocket 连接成功，消息处理器已注册
```

### 2. 用户说话
```
收到消息: {type: 'stt', text: '吃了吗'}
✅ 用户消息已添加到 messages 数组，当前长度: 1
📝 保存用户消息: 吃了吗
✅ 用户消息已保存
```

### 3. AI 回复
```
收到消息: {type: 'tts', state: 'sentence_start', text: '您好'}
TTS 文本片段: 您好
✅ AI消息已创建，索引: 1 当前 messages 长度: 2
AI消息累积长度: 2

收到消息: {type: 'tts', state: 'sentence_start', text: '，很高兴见到您'}
AI消息累积长度: 9

收到消息: {type: 'tts', state: 'stop'}
TTS 结束，准备保存AI消息
📝 保存AI消息，长度: 9
✅ AI消息已保存
```

### 4. 挂断通话
```
handleClosePhoneCall 被调用
断开 WebSocket 连接
WebSocket 连接已关闭
检查未保存的消息...
所有消息已保存
挂断电话后的messages数组: [
  {role: 'user', content: '吃了吗'},
  {role: 'ai', content: '您好，很高兴见到您'}
]
messages数组长度: 2
已滚动到底部，显示聊天记录
```

### 5. 通话界面显示
- 用户消息：单独一条
- AI 回复：所有片段合并成一条完整消息

### 6. 主聊天界面
- 挂断后自动滚动到底部
- 显示所有保存的消息
- 消息格式正确

## 关键改进

1. **连接管理**：挂断后立即断开，不再接收消息
2. **消息传递**：TTS 消息正确传递到应用层
3. **消息保存**：用户消息和 AI 回复都正确保存
4. **界面显示**：通话界面合并显示，主界面完整显示
5. **调试友好**：详细的日志输出，便于追踪问题

## 测试建议

1. **正常流程**：启动 → 说话 → AI 回复 → 挂断 → 检查记录
2. **多轮对话**：进行多轮对话，检查所有消息都保存
3. **中断测试**：在 AI 回复过程中挂断，检查部分消息是否保存
4. **重连测试**：挂断后重新启动通话，检查新会话正常
5. **界面测试**：检查通话界面和主界面的消息显示

## 已知限制

1. **历史上下文**：每次通话会传递历史消息，但可能需要优化数量
2. **消息去重**：如果快速重连，可能有重复消息（需要后续优化）
3. **错误处理**：网络异常时的处理可以更完善

## 后续优化建议

1. **统一实例管理**：将 guardian 和 gov 也改为使用 `wsInstance` 模式
2. **消息去重**：添加消息 ID 或时间戳去重
3. **重连机制**：优化断线重连逻辑
4. **性能优化**：大量消息时的渲染优化
5. **用户体验**：添加加载状态、错误提示等
