# AI 助手问题修复总结

## 修复的问题

### 1. ✅ 超时问题
**问题描述**：60秒超时太短，大模型思考时间不够，导致请求超时失败

**解决方案**：
- 后端：移除 axios 的 timeout 限制（设置为 0）
- 前端：移除 http 请求的 timeout 限制

```javascript
// 后端 (Backed/src/routes/ai.js)
const difyResponse = await axios.post(
  `${difyApiUrl}/chat-messages`,
  requestBody,
  {
    headers: {
      'Authorization': `Bearer ${difyApiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 0 // 移除超时限制
  }
);

// 前端 (Unified/src/api/ai.js)
return http.post(endpoint, payload, { timeout: 0 }).then((res) => unwrap(res))
```

### 2. ✅ 会话ID丢失问题
**问题描述**：每次发送消息都创建新对话，无法保持会话连续性

**解决方案**：
1. 保存会话ID到 localStorage
2. 页面加载时恢复会话ID
3. 创建新对话时清除 localStorage

```javascript
// 保存会话ID
if (response.conversationId) {
  conversationId.value = response.conversationId
  localStorage.setItem('current_conversation_id', response.conversationId)
}

// 恢复会话ID
const savedConversationId = localStorage.getItem('current_conversation_id')
if (savedConversationId && !conversationId.value) {
  conversationId.value = savedConversationId
}

// 清除会话ID
localStorage.removeItem('current_conversation_id')
```

### 3. ✅ 技能卡片显示问题
**问题描述**：第二次发送消息时，技能卡片没有重新生成，而是延续上一次的

**解决方案**：每次发送消息前清空技能卡片数组，开始新的周期

```javascript
// 清空之前的技能卡片，开始新的周期
skillCallSteps.value = []

if (detectedSkill) {
  activeSkill.value = detectedSkill
  startSkillAnimation()
}
```

## 修改的文件

### 后端
1. `Backed/src/routes/ai.js`
   - 移除 axios timeout 限制
   - 添加会话技能缓存机制

### 前端
1. `Unified/src/api/ai.js`
   - 移除 http 请求 timeout 限制

2. `Unified/src/modules/client/AIAssistant.vue`
   - 添加会话ID的 localStorage 持久化
   - 修复技能卡片显示逻辑
   - 优化新对话创建流程

## 预期效果

### 对话流程
```
用户第一个问题
    ↓
┌─ 技能卡片 1 ─────────┐
│ 思考已完成           │
└──────────────────────┘
┌─ 技能卡片 2 ─────────┐
│ 读取技能: xxx.md     │
└──────────────────────┘
┌─ 技能卡片 3 ─────────┐
│ 使用技能             │
└──────────────────────┘
大模型的回复文本...
    ↓
用户第二个问题
    ↓
┌─ 技能卡片 1 ─────────┐
│ 思考已完成           │
└──────────────────────┘
┌─ 技能卡片 2 ─────────┐
│ 读取技能: xxx.md     │
└──────────────────────┘
┌─ 技能卡片 3 ─────────┐
│ 使用技能             │
└──────────────────────┘
大模型的回复文本...
```

### 会话连续性
- ✅ 第一次发送：创建新会话，获得 conversation_id
- ✅ 第二次发送：使用相同的 conversation_id，保持上下文
- ✅ 刷新页面：从 localStorage 恢复 conversation_id
- ✅ 新对话：清除 conversation_id，开始新会话

### 技能卡片
- ✅ 每次发送消息都会生成新的技能卡片周期
- ✅ 技能卡片显示在对应的用户消息之后
- ✅ 动画效果正常（思考中 → 读取技能 → 使用技能）

## 测试建议

### 1. 测试超时问题
```
1. 发送一个复杂问题（需要大模型长时间思考）
2. 观察是否能正常返回结果
3. 不应该出现 "timeout of 60000ms exceeded" 错误
```

### 2. 测试会话连续性
```
1. 发送第一个问题："我有高血压"
2. 发送第二个问题："那我应该吃什么"
3. 检查后端日志，确认使用相同的 conversation_id
4. 刷新页面
5. 发送第三个问题："还有其他建议吗"
6. 确认仍然使用相同的 conversation_id
```

### 3. 测试技能卡片
```
1. 发送第一个问题："我想了解营养搭配"
2. 观察技能卡片显示（思考中 → 读取技能 → 使用技能）
3. 发送第二个问题："我膝盖疼怎么办"
4. 观察是否生成新的技能卡片周期
5. 确认两组技能卡片都正确显示
```

### 4. 测试新对话
```
1. 在当前对话中发送几条消息
2. 点击"新对话"按钮
3. 确认消息列表清空
4. 确认技能卡片清空
5. 发送新消息
6. 确认创建了新的 conversation_id
```

## 日志示例

### 正常流程
```
[AI顾问聊天-客户端-dify] 用户 123 发送消息
  对话ID: (空)
  消息: 我有高血压，饮食上需要注意什么？
  检测到技能: 慢病管理师 - 慢性病管理 (新技能/切换)
  技能内容长度: 3456 字符
  技能状态: 新技能/切换
  Dify 响应时间: 8.5 秒
  回复长度: 1234
  新对话ID: abc-123-def-456
  已缓存技能到新会话: abc-123-def-456

[AI顾问聊天-客户端-dify] 用户 123 发送消息
  对话ID: abc-123-def-456
  消息: 那我应该吃什么呢
  缓存的技能: 慢病管理师 - 慢性病管理
  继续使用缓存的技能: 慢病管理师 - 慢性病管理
  技能状态: 使用缓存
  Dify 响应时间: 5.2 秒
  回复长度: 987
  新对话ID: abc-123-def-456
```

## 注意事项

### 1. 超时设置
- 移除超时限制后，请求可能会等待很长时间
- 建议在前端添加用户友好的加载提示
- 可以考虑添加"取消请求"功能

### 2. localStorage
- localStorage 是浏览器级别的存储
- 清除浏览器数据会丢失会话ID
- 可以考虑添加服务端会话管理

### 3. 技能卡片
- 技能卡片是纯前端展示
- 不会保存到数据库
- 刷新页面后不会显示历史的技能卡片

### 4. 性能优化
- 技能缓存机制已实现
- 相同会话中重复使用技能不会重新读取文件
- 30分钟未使用的缓存会自动清理

## 未来优化方向

### 1. 请求取消
- 添加 AbortController 支持
- 允许用户取消长时间运行的请求

### 2. 进度提示
- 显示大模型思考进度
- 提供更友好的等待体验

### 3. 会话管理
- 服务端会话持久化
- 跨设备会话同步

### 4. 技能卡片持久化
- 保存技能卡片到数据库
- 历史对话中也能看到技能使用情况
