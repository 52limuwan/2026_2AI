# 语音消息保存优化

## 问题描述

用户反馈：语音通话中的用户语音转文字（STT）和 AI 回复文本（TTS）没有正确保存到聊天记录中。

## 问题根源

1. **流式输出导致保存时机不确定**
   - TTS 消息使用流式输出 + 防抖保存
   - 可能在挂断时还有未保存的内容
   - 防抖定时器可能被清除导致消息丢失

2. **保存逻辑复杂**
   - 多个定时器管理（streamingTimer, saveDebounceTimer, llmCompleteTimer）
   - 保存时机分散在多个地方
   - 难以追踪消息是否已保存

## 解决方案

### 1. 简化消息处理流程

**STT 消息（用户语音）**
- 收到后立即添加到 messages 数组
- 立即保存到数据库
- 标记 `saved: true`

**TTS 消息（AI 回复）**
- 收到 `sentence_start` 时直接累积文本到当前 AI 消息
- 移除流式输出，直接显示完整文本
- 收到 `stop` 时保存完整消息到数据库
- 标记 `saved: true`

**挂断时检查**
- 遍历所有消息，检查 `saved` 标记
- 保存所有未保存的消息（`saved: false`）

### 2. 代码修改

#### handleWebSocketMessage 函数

```javascript
// STT 消息处理
if (message.type === 'stt') {
  const userMessage = {
    role: 'user',
    content: message.text,
    timestamp: Date.now(),
    saved: false  // 添加保存标记
  }
  messages.value.push(userMessage)
  
  // 立即保存
  saveMessageToDatabase(userMessage).then(() => {
    userMessage.saved = true
  })
}

// TTS 消息处理
else if (message.type === 'tts') {
  if (message.state === 'sentence_start' && message.text) {
    // 创建或更新 AI 消息
    if (currentAiMessageIndex.value === null) {
      const aiMessage = {
        role: 'ai',
        content: '',
        timestamp: Date.now(),
        saved: false  // 添加保存标记
      }
      messages.value.push(aiMessage)
      currentAiMessageIndex.value = messages.value.length - 1
    }
    
    // 直接累积文本（不使用流式输出）
    const aiMessage = messages.value[currentAiMessageIndex.value]
    aiMessage.content += message.text
    scrollToBottom()
    
  } else if (message.state === 'stop') {
    // TTS 结束，保存完整消息
    if (currentAiMessageIndex.value !== null) {
      const aiMessage = messages.value[currentAiMessageIndex.value]
      if (aiMessage && !aiMessage.saved) {
        saveMessageToDatabase(aiMessage).then(() => {
          aiMessage.saved = true
        })
      }
      currentAiMessageIndex.value = null
    }
  }
}
```

#### handleClosePhoneCall 函数

```javascript
const handleClosePhoneCall = () => {
  // ... 其他清理逻辑 ...
  
  // 保存所有未保存的消息
  console.log('检查未保存的消息...');
  let unsavedCount = 0;
  messages.value.forEach(msg => {
    if (!msg.saved && msg.content && msg.content.trim()) {
      unsavedCount++;
      console.log(`📝 保存未保存的${msg.role}消息:`, msg.content.substring(0, 50) + '...');
      saveMessageToDatabase(msg).then(() => {
        msg.saved = true;
        console.log(`✅ ${msg.role}消息已保存`);
      }).catch(err => {
        console.error(`❌ 保存${msg.role}消息失败:`, err);
      });
    }
  });
  
  if (unsavedCount > 0) {
    console.log(`发现 ${unsavedCount} 条未保存的消息，正在保存...`);
  } else {
    console.log('所有消息已保存');
  }
  
  // ... 其他清理逻辑 ...
}
```

### 3. 修改的文件

- `Unified/src/modules/client/AIAssistant.vue`
- `Unified/src/modules/guardian/AIAssistant.vue`
- `Unified/src/modules/gov/AIAssistant.vue`

所有三个角色的 AIAssistant 组件都进行了相同的修改。

## 优势

1. **逻辑简单清晰**
   - 移除了流式输出和防抖保存
   - 保存时机明确（STT 立即保存，TTS 在 stop 时保存）
   - 代码更易维护

2. **保存可靠**
   - 每条消息都有 `saved` 标记
   - 挂断时检查并保存所有未保存的消息
   - 不会丢失任何消息

3. **性能更好**
   - 减少了定时器的使用
   - 减少了数据库写入次数（不再频繁防抖保存）
   - 直接显示文本，无需流式输出

4. **调试友好**
   - 详细的日志输出
   - 清晰的保存状态标记
   - 易于追踪消息保存情况

## 测试建议

1. **正常通话流程**
   - 启动语音通话
   - 说话并等待 AI 回复
   - 正常挂断
   - 检查聊天记录是否完整保存

2. **中断场景**
   - 在 AI 回复过程中挂断
   - 检查是否保存了部分回复

3. **多轮对话**
   - 进行多轮语音对话
   - 检查所有消息是否都保存

4. **日志检查**
   - 查看控制台日志
   - 确认看到 "📝 保存用户消息" 和 "📝 保存AI消息"
   - 确认看到 "✅ 消息已保存"

## 预期日志输出

```
STT 识别结果: 你好
📝 保存用户消息: 你好
✅ 用户消息已保存

TTS 文本片段: 您好
AI消息累积长度: 2
TTS 文本片段: ，很高兴见到您
AI消息累积长度: 9
TTS 结束，准备保存AI消息
📝 保存AI消息，长度: 9
✅ AI消息已保存

handleClosePhoneCall 被调用
检查未保存的消息...
所有消息已保存
断开 WebSocket 连接
```
