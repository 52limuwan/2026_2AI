# 技能卡片状态保存问题修复

## 🐛 问题描述

刷新页面后，技能卡片显示"思考中"而不是"思考已完成"：

```html
<!-- 刷新前（正确） -->
<div class="skill-call-item">
  <span class="skill-call-title">思考已完成</span>
</div>

<!-- 刷新后（错误） -->
<div class="skill-call-item thinking-block">
  <span class="skill-call-title thinking-shimmer">思考中</span>
</div>
```

---

## 🔍 问题原因

### 原因1：技能卡片状态更新时机
1. 用户消息创建时，技能卡片状态是"思考中"
2. 第一次保存到数据库时，状态是"思考中"
3. TTS 结束时，状态更新为"思考已完成"
4. 重新保存用户消息，但**后端可能创建了新记录而不是更新旧记录**

### 原因2：消息没有 ID
- 语音通话时，消息是在前端创建的
- 创建时没有数据库 ID
- 第一次保存后，没有将返回的 ID 赋值给消息对象
- 第二次保存时，后端不知道要更新哪条记录，可能创建了新记录

### 原因3：后端 API 行为
- `/ai/messages/save` API 可能总是创建新记录
- 需要传递消息 ID 才能更新已存在的记录
- 如果没有 ID，后端会创建新记录

---

## ✅ 修复方案

### 修复1：传递消息 ID 给后端

**位置**：`saveMessageToDatabase` 函数

**修复内容**：
- 如果消息已经有 ID，传递 ID 给后端
- 后端根据 ID 更新已存在的记录
- 如果没有 ID，后端创建新记录

```javascript
const messageData = {
  conversationId: conversationId.value,
  role: message.role,
  content: message.content,
  timestamp: message.timestamp
}

// 如果消息已经有 ID，传递 ID 以便后端更新而不是创建新记录
if (message.id) {
  messageData.id = message.id
  console.log('🔄 更新已存在的消息，ID:', message.id);
}

// 如果有技能卡片信息，保存到 context 字段
if (message.skillSteps) {
  messageData.context = JSON.stringify({ skillSteps: message.skillSteps })
  console.log('📦 保存技能卡片信息:', messageData.context);
}

await saveWebSocketMessage(messageData)
```

---

### 修复2：添加详细日志

**位置**：TTS stop 消息处理

**修复内容**：
- 添加更多日志，方便调试
- 记录技能卡片状态更新前后的值
- 记录消息 ID 和会话 ID

```javascript
for (let i = messages.value.length - 1; i >= 0; i--) {
  const msg = messages.value[i]
  if (msg.role === 'user' && msg.skillSteps) {
    const thinkingStep = msg.skillSteps.find(s => s.type === 'thinking')
    if (thinkingStep) {
      console.log('🔄 更新技能卡片状态，从:', thinkingStep.title, '到: 思考已完成');
      console.log('更新前的 skillSteps:', JSON.stringify(msg.skillSteps));
      
      thinkingStep.title = '思考已完成'
      thinkingStep.type = 'thinking-done'
      messages.value = [...messages.value]
      
      console.log('更新后的 skillSteps:', JSON.stringify(msg.skillSteps));
      console.log('📝 重新保存用户消息，更新技能卡片状态');
      console.log('消息ID:', msg.id, '会话ID:', conversationId.value);
      
      saveMessageToDatabase(msg).then(() => {
        console.log('✅ 用户消息技能卡片状态已更新到数据库');
      })
      break
    }
  }
}
```

---

## 🧪 测试步骤

### 步骤1：进行语音通话
1. 点击电话按钮
2. 说出："我想了解营养搭配"
3. 等待 AI 回复完成
4. 观察技能卡片状态（应该是"思考已完成"）

### 步骤2：查看控制台日志
```
📝 保存用户消息: 我想了解营养搭配
✅ 用户消息已保存
准备保存消息到数据库: { conversationId: 'xxx', role: 'user', hasId: false }
✅ 新消息已保存到数据库

TTS 结束，准备保存完整的 AI 消息
📝 保存完整的 AI 消息，长度: 500
✅ AI 消息已保存

🔄 更新技能卡片状态，从: 思考中 到: 思考已完成
更新前的 skillSteps: [{"type":"thinking","title":"思考中","skillName":""}]
更新后的 skillSteps: [{"type":"thinking-done","title":"思考已完成","skillName":""}]
📝 重新保存用户消息，更新技能卡片状态
消息ID: undefined 会话ID: xxx
准备保存消息到数据库: { conversationId: 'xxx', role: 'user', hasId: false }
✅ 新消息已保存到数据库  ⚠️ 注意：这里应该是更新，而不是新建
```

### 步骤3：刷新页面
1. 刷新浏览器
2. 观察技能卡片状态

**预期结果**：
- ✅ 技能卡片显示"思考已完成"
- ✅ 不是"思考中"

---

## 🔧 后端 API 需要的修改

### 当前行为（推测）
```javascript
// POST /ai/messages/save
// 总是创建新记录
INSERT INTO messages (conversation_id, role, content, timestamp, context)
VALUES (?, ?, ?, ?, ?)
```

### 需要的行为
```javascript
// POST /ai/messages/save
// 如果有 ID，更新记录；否则创建新记录
if (payload.id) {
  // 更新已存在的记录
  UPDATE messages 
  SET content = ?, context = ?, timestamp = ?
  WHERE id = ? AND conversation_id = ?
} else {
  // 创建新记录
  INSERT INTO messages (conversation_id, role, content, timestamp, context)
  VALUES (?, ?, ?, ?, ?)
  RETURNING id  // 返回新创建的记录ID
}
```

---

## 💡 临时解决方案

如果后端 API 暂时无法修改，可以使用以下临时方案：

### 方案1：延迟保存
不在创建时立即保存，而是等 TTS 结束后一次性保存完整的消息（包括正确的技能卡片状态）

### 方案2：前端缓存 ID
第一次保存后，从响应中获取 ID 并缓存到消息对象中

### 方案3：使用唯一标识
使用 `timestamp + role` 作为唯一标识，后端根据这个标识更新记录

---

## 📊 数据库检查

### 检查是否有重复记录
```sql
SELECT id, role, content, context, timestamp,
       datetime(timestamp/1000, 'unixepoch', 'localtime') as time
FROM messages 
WHERE conversation_id = 'xxx' 
  AND content LIKE '%我想了解营养搭配%'
ORDER BY timestamp DESC;
```

**预期结果**：
- 应该只有 1 条用户消息记录
- `context` 字段应该包含 `"type":"thinking-done"`

**如果有问题**：
- 有 2 条或更多相同的用户消息记录 → 后端创建了重复记录
- `context` 字段是 `"type":"thinking"` → 技能卡片状态没有更新

---

## 🎯 最终目标

1. ✅ 用户消息只保存一次（不创建重复记录）
2. ✅ 技能卡片状态正确更新到数据库
3. ✅ 刷新页面后，技能卡片显示"思考已完成"
4. ✅ 控制台日志显示"更新已存在的消息"而不是"新消息已保存"

---

## 🔍 调试清单

- [ ] 查看控制台日志，确认技能卡片状态是否更新
- [ ] 查看控制台日志，确认是否传递了消息 ID
- [ ] 查看数据库，确认是否有重复的用户消息记录
- [ ] 查看数据库，确认 `context` 字段是否包含正确的技能卡片状态
- [ ] 刷新页面，确认技能卡片显示是否正确

---

现在代码已经修改完成，添加了详细的日志。请测试并查看控制台日志，确认问题是否解决！
