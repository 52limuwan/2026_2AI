# 技能卡片持久化实现

## 问题描述

之前的技能卡片实现存在以下问题：
1. 技能卡片是全局共享的，每次发送消息都会清空
2. 第二次发送消息后，第一次的技能卡片消失
3. 刷新页面后技能卡片丢失
4. 新旧消息的技能卡片互相干扰

## 解决方案

### 核心思路
将技能卡片信息与每条消息绑定，而不是全局共享：
- 每条用户消息都有自己的 `skillSteps` 数组
- 技能卡片信息保存到数据库的 `context` 字段
- 加载历史消息时恢复技能卡片信息

### 数据结构

```javascript
// 消息对象结构
{
  id: 1,
  role: 'user',
  content: '我有高血压，饮食上需要注意什么？',
  timestamp: 1234567890,
  skillSteps: [
    { type: 'thinking', title: '思考已完成', skillName: '' },
    { type: 'read', title: '读取技能', skillName: '慢病管理师.md' },
    { type: 'use', title: '使用技能', skillName: '慢病管理师 - 慢性病管理' }
  ]
}
```

## 实现细节

### 1. 前端 - 消息发送

```javascript
// 为每条用户消息创建独立的技能卡片
const userMessage = {
  role: 'user',
  content: content,
  timestamp: Date.now(),
  skillSteps: null // 初始为空
}

// 如果检测到技能，创建技能卡片数组
if (detectedSkill) {
  const messageSkillSteps = [
    { type: 'thinking', title: '思考中', skillName: '' },
    { type: 'read', title: '阅读 SKILL', skillName: '' },
    { type: 'use', title: '使用技能', skillName: detectedSkill }
  ]
  
  // 将技能卡片附加到这条消息
  messages.value[userMessageIndex].skillSteps = messageSkillSteps
  
  // 启动动画
  startSkillAnimationForMessage(userMessageIndex)
}
```

### 2. 前端 - 消息保存

```javascript
// 保存消息时包含技能卡片信息
const messageData = {
  conversationId: currentConvId,
  role: message.role,
  content: message.content,
  timestamp: message.timestamp
}

// 如果有技能卡片，序列化后保存到 context
if (message.skillSteps) {
  messageData.context = JSON.stringify({ skillSteps: message.skillSteps })
}

await saveWebSocketMessage(messageData)
```

### 3. 后端 - 保存消息

```javascript
// 接收 context 参数
const { conversationId, role, content, timestamp, context } = req.body;

// 保存到数据库
await db.run(
  `INSERT INTO ai_chat_messages 
   (user_id, target_client_id, conversation_id, role, content, context, timestamp)
   VALUES (:user_id, :target_client_id, :conversation_id, :role, :content, :context, :timestamp)`,
  {
    user_id: userId,
    target_client_id: targetClientId || null,
    conversation_id: conversationId,
    role,
    content,
    context: context || null, // 保存技能卡片信息
    timestamp
  }
);
```

### 4. 后端 - 获取消息

```javascript
// 查询时包含 context 字段
const messages = await db.all(
  `SELECT id, role, content, context, timestamp
   FROM ai_chat_messages
   WHERE user_id = :user_id AND conversation_id = :conversation_id
   ORDER BY timestamp ASC`,
  { user_id: userId, conversation_id: conversationId }
);

// 解析 context 中的技能卡片信息
const parsedMessages = messages.map(msg => {
  const message = { ...msg };
  if (msg.context) {
    try {
      const contextData = JSON.parse(msg.context);
      message.skillSteps = contextData.skillSteps || null;
    } catch (e) {
      message.skillSteps = null;
    }
  }
  delete message.context; // 不返回原始 context
  return message;
});
```

### 5. 前端 - 加载历史消息

```javascript
// 加载历史消息时包含技能卡片信息
messages.value = historyMessages.map(msg => ({
  id: msg.id,
  role: msg.role,
  content: msg.content,
  timestamp: msg.timestamp,
  skillSteps: msg.skillSteps || null // 恢复技能卡片
}))
```

### 6. 前端 - 模板渲染

```vue
<template v-for="(msg, index) in messages" :key="msg.id || index">
  <!-- 用户消息 -->
  <div class="message-item message-user">
    <div class="message-bubble">
      <div class="message-content">{{ msg.content }}</div>
    </div>
  </div>

  <!-- 如果用户消息有技能卡片，在消息后显示 -->
  <div 
    v-if="msg.role === 'user' && msg.skillSteps && msg.skillSteps.length > 0" 
    class="message-item message-ai"
  >
    <div class="skill-cards-wrapper">
      <div
        v-for="(step, stepIndex) in msg.skillSteps"
        :key="`skill-${index}-${stepIndex}-${step.type}`"
        class="skill-call-item"
      >
        <div class="skill-call-header">
          <span class="skill-call-title">{{ step.title }}</span>
          <span v-if="step.skillName" class="skill-call-name">{{ step.skillName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

## 效果展示

### 对话流程
```
用户问题 1: "我有高血压，饮食上需要注意什么？"
    ↓
┌─ 技能卡片 1 ─────────┐
│ 思考已完成           │
└──────────────────────┘
┌─ 技能卡片 2 ─────────┐
│ 读取技能: 慢病管理师.md │
└──────────────────────┘
┌─ 技能卡片 3 ─────────┐
│ 使用技能: 慢病管理师  │
└──────────────────────┘
AI 回复 1: "高血压患者应该..."
    ↓
用户问题 2: "你是谁"
    ↓
┌─ 技能卡片 1 ─────────┐
│ 思考已完成           │
└──────────────────────┘
┌─ 技能卡片 2 ─────────┐
│ 读取技能: 营养师.md   │
└──────────────────────┘
┌─ 技能卡片 3 ─────────┐
│ 使用技能: 营养师      │
└──────────────────────┘
AI 回复 2: "我是您的 AI 营养顾问..."
```

### 持久化效果
- ✅ 每条消息都有自己的技能卡片
- ✅ 新旧消息的技能卡片互不干扰
- ✅ 刷新页面后技能卡片仍然存在
- ✅ 历史对话中也能看到技能卡片

## 数据库结构

### ai_chat_messages 表
```sql
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  conversation_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  context TEXT,  -- 存储技能卡片等上下文信息（JSON格式）
  timestamp INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### context 字段格式
```json
{
  "skillSteps": [
    {
      "type": "thinking",
      "title": "思考已完成",
      "skillName": ""
    },
    {
      "type": "read",
      "title": "读取技能",
      "skillName": "慢病管理师.md"
    },
    {
      "type": "use",
      "title": "使用技能",
      "skillName": "慢病管理师 - 慢性病管理"
    }
  ]
}
```

## 优势

### 1. 数据完整性
- 技能卡片与消息绑定，不会丢失
- 数据库持久化，刷新页面不影响

### 2. 独立性
- 每条消息有独立的技能卡片
- 新旧消息互不干扰

### 3. 可扩展性
- context 字段可以存储更多上下文信息
- 未来可以添加更多元数据

### 4. 用户体验
- 历史对话中也能看到技能使用情况
- 更好的对话追溯能力

## 注意事项

### 1. 性能考虑
- context 字段存储 JSON，查询时需要解析
- 建议只在需要时解析，避免不必要的开销

### 2. 数据迁移
- 旧数据的 context 字段为 NULL
- 需要兼容处理，不影响旧数据显示

### 3. 动画效果
- 只有新发送的消息才有动画效果
- 历史消息直接显示最终状态

### 4. 存储空间
- 技能卡片信息会增加存储空间
- 建议定期清理过期对话

## 未来优化

### 1. 压缩存储
- 对 context 字段进行压缩
- 减少存储空间占用

### 2. 索引优化
- 为 conversation_id 添加索引
- 提高查询性能

### 3. 缓存机制
- 缓存常用对话的技能卡片
- 减少数据库查询

### 4. 更多上下文
- 存储更多对话上下文信息
- 如：用户情绪、对话主题等
