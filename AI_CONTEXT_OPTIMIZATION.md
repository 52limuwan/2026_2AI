# AI 上下文共享优化说明

## 优化目标

优化 AI 助手的上下文管理，实现技能提示词的智能缓存和复用，提升对话连贯性和效率。

## 优化前的问题

### 1. 重复传递技能内容
- 每次对话都重新检测技能并读取文件
- 相同会话中重复发送相同的技能提示词
- 浪费 I/O 资源和网络带宽

### 2. 上下文不连贯
- 每次都重新设置系统提示词
- 可能导致 AI 对话上下文丢失
- 技能切换时缺乏平滑过渡

### 3. Token 浪费
- 重复传递相同的长文本技能内容
- 增加 API 调用成本
- 降低响应速度

## 优化方案

### 1. 会话级技能缓存

使用 Map 数据结构缓存每个会话的技能信息：

```javascript
const conversationSkillCache = new Map();

// 缓存结构
{
  conversationId: {
    name: '技能名称',
    file: '技能文件名',
    content: '技能内容',
    timestamp: 时间戳
  }
}
```

### 2. 智能技能检测与复用

#### 场景 1: 新对话 + 检测到技能
- 读取技能文件
- 缓存技能内容
- 传递给 Dify

#### 场景 2: 继续对话 + 相同技能
- 使用缓存的技能内容
- 不重新读取文件
- 更新时间戳

#### 场景 3: 继续对话 + 切换技能
- 检测到新技能
- 读取新技能文件
- 更新缓存

#### 场景 4: 继续对话 + 无技能关键词
- 继续使用缓存的技能（保持上下文）
- 更新时间戳

### 3. 自动缓存清理

定期清理过期缓存（30分钟未使用）：

```javascript
setInterval(() => {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30分钟
  for (const [key, value] of conversationSkillCache.entries()) {
    if (now - value.timestamp > expireTime) {
      conversationSkillCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // 每10分钟检查一次
```

## 实现细节

### 1. 技能检测逻辑

```javascript
// 识别技能
const detectedSkill = detectSkill(message);
let skillContent = '';
let shouldUpdateSkill = false;
let cachedSkill = null;

// 检查缓存
if (conversationId && conversationId.trim()) {
  cachedSkill = conversationSkillCache.get(conversationId);
}

// 决定是否更新技能
if (detectedSkill) {
  if (!cachedSkill || cachedSkill.name !== detectedSkill.name) {
    // 新技能或技能切换
    shouldUpdateSkill = true;
    skillContent = await readSkillFile(detectedSkill.file);
    // 更新缓存
    conversationSkillCache.set(conversationId, {...});
  } else {
    // 使用缓存
    skillContent = cachedSkill.content;
    cachedSkill.timestamp = Date.now();
  }
} else if (cachedSkill) {
  // 继续使用缓存的技能
  skillContent = cachedSkill.content;
  cachedSkill.timestamp = Date.now();
}
```

### 2. Dify API 调用

```javascript
const requestBody = {
  files: [],
  inputs: {
    systemprompt: skillContent || '' // 技能内容
  },
  query: message, // 用户问题
  response_mode: 'blocking',
  user: `user_${userId}`,
  conversation_id: conversationId // 会话ID
};
```

### 3. 响应增强

返回技能使用状态，便于前端展示：

```javascript
return success(res, {
  reply,
  conversationId: newConversationId,
  timestamp: Date.now(),
  skillUsed: detectedSkill ? detectedSkill.name : (cachedSkill ? cachedSkill.name : null),
  skillStatus: shouldUpdateSkill ? 'new' : (cachedSkill ? 'cached' : 'none')
}, '消息发送成功');
```

## 优化效果

### 1. 性能提升
- ✅ 减少文件 I/O 操作（缓存命中时）
- ✅ 降低网络传输量（复用技能内容）
- ✅ 提升响应速度

### 2. 上下文连贯性
- ✅ 保持会话级技能上下文
- ✅ 平滑的技能切换
- ✅ 更好的对话连贯性

### 3. 成本优化
- ✅ 减少重复的 token 消耗
- ✅ 降低 API 调用成本
- ✅ 提高资源利用率

### 4. 用户体验
- ✅ 更快的响应时间
- ✅ 更连贯的对话体验
- ✅ 智能的技能切换

## 日志示例

### 新技能检测
```
[AI顾问聊天-客户端-dify] 用户 123 发送消息
  对话ID: abc-123
  消息: 我想了解营养搭配
  检测到技能: 营养师 - 基础营养咨询 (新技能/切换)
  技能文件: client-nutritionist.md
  技能内容长度: 2345 字符
  技能状态: 新技能/切换
```

### 使用缓存
```
[AI顾问聊天-客户端-dify] 用户 123 发送消息
  对话ID: abc-123
  消息: 那我应该吃什么呢
  缓存的技能: 营养师 - 基础营养咨询
  使用缓存的技能: 营养师 - 基础营养咨询
  技能状态: 使用缓存
```

### 技能切换
```
[AI顾问聊天-客户端-dify] 用户 123 发送消息
  对话ID: abc-123
  消息: 我膝盖疼，怎么锻炼
  缓存的技能: 营养师 - 基础营养咨询
  检测到技能: 运动康复师 - 适老运动指导 (新技能/切换)
  技能文件: client-exercise-rehab.md
  技能内容长度: 3456 字符
  技能状态: 新技能/切换
```

## 注意事项

### 1. 内存管理
- 缓存会占用服务器内存
- 通过定期清理机制控制内存使用
- 30分钟过期时间平衡性能和内存

### 2. 技能切换
- 用户可以在同一会话中切换不同技能
- 系统会自动检测并更新技能上下文
- 保持对话的灵活性

### 3. 缓存一致性
- 如果技能文件更新，需要重启服务或清理缓存
- 可以考虑添加文件监听机制自动更新

### 4. 分布式部署
- 当前缓存是进程级的
- 如果需要多实例部署，考虑使用 Redis 等共享缓存

## 未来优化方向

### 1. 持久化缓存
- 使用 Redis 存储技能缓存
- 支持多实例共享
- 提高缓存命中率

### 2. 预加载机制
- 服务启动时预加载常用技能
- 减少首次访问延迟

### 3. 智能预测
- 根据用户历史预测可能使用的技能
- 提前加载相关技能内容

### 4. 技能版本管理
- 监听技能文件变化
- 自动更新缓存
- 支持热更新

## 总结

通过实现会话级技能缓存和智能复用机制，我们显著提升了 AI 助手的性能和用户体验。这个优化在保持对话连贯性的同时，降低了系统资源消耗和 API 调用成本。
