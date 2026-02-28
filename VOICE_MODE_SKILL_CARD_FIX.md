# 语音模式技能卡片修复

## 问题描述

在语音通话模式下，保存的聊天记录包含了技能卡片信息（skillSteps），导致：
1. 数据库中保存了不必要的技能卡片数据
2. 语音通话界面显示了技能卡片（应该只在文字聊天中显示）
3. 用户体验不一致
4. AI消息片段被累积后才保存，而不是实时保存

## 修复方案

### 1. 语音模式下不创建技能卡片

在 `handleWebSocketMessage` 函数中，当处理 STT（语音识别）消息时：

```javascript
// 只在语音模式下处理 STT 消息（避免文本消息重复）
if (isVoiceMode.value && message.text && message.text.trim()) {
  const userMessage = {
    role: 'user',
    content: message.text,
    timestamp: Date.now(),
    skillSteps: null, // 语音模式下不显示技能卡片
    saved: false
  }
  messages.value.push(userMessage)
  
  // 不创建技能卡片，不调用 detectSkill()
  // 不调用 startSkillAnimationForMessage()
  
  // 立即保存用户消息到数据库（不包含技能卡片）
  saveMessageToDatabase(userMessage)
}
```

### 2. AI消息片段实时保存

每个TTS文本片段作为独立的AI消息立即保存，而不是累积后保存：

```javascript
} else if (message.state === 'sentence_start' && message.text) {
  // 收到文本片段 - 这是真正的AI回复内容
  
  // 🔥 语音模式：每个片段作为独立的AI消息立即保存
  if (message.text && message.text.trim()) {
    const aiMessage = {
      role: 'ai',
      content: message.text,
      timestamp: Date.now(),
      skillSteps: null,
      saved: false
    }
    messages.value.push(aiMessage)
    
    // 立即保存这个片段到数据库
    saveMessageToDatabase(aiMessage).then(() => {
      aiMessage.saved = true
    })
  }
}
```

### 3. 移除AI消息预创建和累积逻辑

在 TTS start 时，不再预创建空的AI消息：

```javascript
if (message.state === 'start') {
  console.log('AI 开始回复 (TTS)')
  // 语音模式下不需要预创建AI消息，每个片段都是独立的消息
  currentAiMessageIndex.value = null
}
```

在 TTS stop 时，不再保存累积的消息：

```javascript
} else if (message.state === 'stop') {
  // TTS 结束
  console.log('TTS 结束');
  
  // 语音模式下，每个片段已经单独保存，这里不需要再保存
  // 只需要重置状态
  currentAiMessageIndex.value = null
}
```

## 修复效果

### 修复前
- 语音通话保存的消息包含 `skillSteps` 字段
- 数据库中存储了 `{"skillSteps":[{"type":"thinking","title":"思考中","skillName":""}]}`
- 语音通话界面可能显示技能卡片
- AI消息被累积后才保存到数据库
- 如果通话中断，未保存的AI消息会丢失

### 修复后
- 语音通话保存的消息 `skillSteps` 为 `null`
- 数据库中不存储技能卡片信息
- 语音通话界面只显示纯文本对话
- "思考中"状态只在语音通话界面的状态栏显示（通过 `isThinking` 和 `callStatus` 控制）
- 每个AI消息片段立即保存到数据库
- 即使通话中断，已接收的消息片段也已保存

## 消息保存策略

### 文字聊天模式
1. 用户发送消息 → 立即保存
2. AI开始回复 → 创建空消息
3. AI流式输出 → 累积文本
4. AI回复完成 → 保存完整消息

### 语音通话模式
1. 用户说话（STT识别） → 立即保存用户消息
2. AI开始回复（TTS start） → 不预创建消息
3. AI发送文本片段（sentence_start） → 立即保存该片段
4. AI继续发送片段 → 每个片段都立即保存
5. AI回复结束（TTS stop） → 不需要额外保存

## 技能卡片显示规则

1. **文字聊天模式**：显示完整的技能卡片流程
   - 思考中 → 读取技能 → 使用技能 → 思考已完成

2. **语音通话模式**：不显示技能卡片
   - 只在通话界面状态栏显示"思考中"/"已连接"
   - 聊天记录中不保存技能卡片信息
   - 每个对话片段独立保存

## 数据库存储结构

### 文字聊天消息
```json
{
  "role": "user",
  "content": "适合老年人的菜品有哪些？",
  "timestamp": 1772256944381,
  "context": "{\"skillSteps\":[{\"type\":\"thinking\",\"title\":\"思考已完成\"}]}"
}
```

### 语音通话消息
```json
// 用户消息
{
  "role": "user",
  "content": "吃饭了吗？",
  "timestamp": 1772256944381,
  "context": null
}

// AI消息片段1
{
  "role": "ai",
  "content": "吃饭了吗？",
  "timestamp": 1772256944500,
  "context": null
}

// AI消息片段2
{
  "role": "ai",
  "content": "您可以先选择一个时间段，",
  "timestamp": 1772256945200,
  "context": null
}

// AI消息片段3
{
  "role": "ai",
  "content": "我来帮您确认一下当天的饮食情况",
  "timestamp": 1772256945800,
  "context": null
}
```

## 相关文件

- `Unified/src/modules/client/AIAssistant.vue` - 客户端 AI 助手
- `Unified/src/modules/guardian/AIAssistant.vue` - 监护人 AI 助手（需要同样修复）
- `Unified/src/modules/gov/AIAssistant.vue` - 政府端 AI 助手（需要同样修复）

## 测试建议

1. 测试语音通话模式
   - 发起语音通话
   - 说话并等待 AI 回复
   - 检查数据库中保存的消息是否不包含 skillSteps
   - 检查每个AI消息片段是否立即保存
   - 检查语音通话界面是否不显示技能卡片

2. 测试文字聊天模式
   - 发送文字消息
   - 检查是否正常显示技能卡片
   - 检查数据库中是否正确保存技能卡片信息
   - 检查AI消息是否作为完整消息保存

3. 测试模式切换
   - 从文字聊天切换到语音通话
   - 从语音通话切换回文字聊天
   - 检查两种模式的消息是否正确保存和显示

4. 测试通话中断
   - 发起语音通话
   - 在AI回复过程中关闭通话
   - 检查已接收的消息片段是否已保存到数据库
