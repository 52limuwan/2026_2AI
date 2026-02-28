# 语音聊天记录调试指南

## 问题描述

用户反馈：语音通话后，聊天记录没有显示在主界面上。

## 可能的原因

1. **消息没有添加到 messages 数组**
   - 检查 `isVoiceMode` 是否为 true
   - 检查 WebSocket 消息是否正确接收

2. **消息添加了但没有显示**
   - 检查主聊天界面是否被遮挡
   - 检查滚动位置是否正确

3. **消息没有保存到数据库**
   - 检查保存 API 是否成功
   - 检查 conversationId 是否正确

## 调试步骤

### 1. 检查语音模式状态

启动语音通话时，应该看到：
```
✅ 语音模式已启用，isVoiceMode: true
```

### 2. 检查消息接收

收到 STT 消息时，应该看到：
```
收到消息: {type: 'stt', text: '你好'}
当前 isVoiceMode: true
当前 messages 数组长度: 0
STT 识别结果: 你好
✅ 用户消息已添加到 messages 数组，当前长度: 1
当前 messages 数组: [{role: 'user', content: '你好'}]
📝 保存用户消息: 你好
✅ 用户消息已保存
```

收到 TTS 消息时，应该看到：
```
收到消息: {type: 'tts', state: 'sentence_start', text: '您好'}
当前 isVoiceMode: true
当前 messages 数组长度: 1
TTS 文本片段: 您好
✅ AI消息已创建，索引: 1 当前 messages 长度: 2
AI消息累积长度: 2 内容: 您好...

收到消息: {type: 'tts', state: 'stop'}
TTS 结束，准备保存AI消息
📝 保存AI消息，长度: 9
✅ AI消息已保存
```

### 3. 检查挂断后的状态

挂断通话时，应该看到：
```
handleClosePhoneCall 被调用
检查未保存的消息...
所有消息已保存
断开 WebSocket 连接
挂断电话后的messages数组: [{role: 'user', content: '你好'}, {role: 'ai', content: '您好，很高兴见到您'}]
messages数组长度: 2
已滚动到底部，显示聊天记录
```

### 4. 检查主界面显示

挂断后，主聊天界面应该：
- 显示所有 messages 数组中的消息
- 自动滚动到底部
- 消息气泡正确显示

## 常见问题排查

### 问题1：isVoiceMode 为 false

**症状**：收到消息时看到 "不在语音模式，忽略消息"

**原因**：
- 语音模式没有正确启用
- 或者在消息到达前就被禁用了

**解决**：
- 检查 `handlePhoneCall` 中是否设置了 `isVoiceMode.value = true`
- 检查是否有其他地方意外设置了 `isVoiceMode.value = false`

### 问题2：消息没有添加到 messages 数组

**症状**：没有看到 "✅ 用户消息已添加到 messages 数组"

**原因**：
- `isVoiceMode` 为 false
- 消息文本为空
- WebSocket 消息格式不正确

**解决**：
- 检查 `isVoiceMode` 状态
- 检查 `message.text` 是否有值
- 检查 WebSocket 消息格式

### 问题3：消息添加了但主界面没有显示

**症状**：messages 数组有数据，但界面上看不到

**原因**：
- 通话界面遮挡了主界面
- 滚动位置不对
- Vue 响应式更新问题

**解决**：
- 确认通话界面已关闭（`showPhoneCall.value = false`）
- 确认调用了 `scrollToBottom()`
- 检查 Vue DevTools 中的 messages 数组

### 问题4：消息没有保存到数据库

**症状**：看到 "❌ 保存用户消息失败" 或 "❌ 保存AI消息失败"

**原因**：
- API 请求失败
- conversationId 不正确
- 后端错误

**解决**：
- 检查网络请求（Network 面板）
- 检查 conversationId 是否有效
- 检查后端日志

## 测试流程

1. **启动语音通话**
   - 点击电话按钮
   - 确认看到 "✅ 语音模式已启用"

2. **说话测试**
   - 说一句话
   - 确认看到 STT 识别结果
   - 确认看到 "✅ 用户消息已添加到 messages 数组"
   - 确认看到 "✅ 用户消息已保存"

3. **等待 AI 回复**
   - 等待 AI 语音回复
   - 确认看到 TTS 文本片段
   - 确认看到 "✅ AI消息已创建"
   - 确认看到 AI 消息累积长度增加
   - 确认看到 "✅ AI消息已保存"

4. **挂断通话**
   - 点击挂断按钮
   - 确认看到 "handleClosePhoneCall 被调用"
   - 确认看到 messages 数组内容
   - 确认看到 "已滚动到底部"

5. **检查主界面**
   - 通话界面关闭后
   - 主聊天界面应该显示所有消息
   - 滚动位置应该在底部

## 预期的完整日志流程

```
// 启动通话
✅ 语音模式已启用，isVoiceMode: true
WebSocket 已连接

// 用户说话
收到消息: {type: 'stt', text: '你好'}
当前 isVoiceMode: true
当前 messages 数组长度: 0
STT 识别结果: 你好
✅ 用户消息已添加到 messages 数组，当前长度: 1
当前 messages 数组: [{role: 'user', content: '你好'}]
📝 保存用户消息: 你好
✅ 用户消息已保存

// AI 回复
收到消息: {type: 'tts', state: 'start'}
AI 开始回复 (TTS)

收到消息: {type: 'tts', state: 'sentence_start', text: '您好'}
TTS 文本片段: 您好
✅ AI消息已创建，索引: 1 当前 messages 长度: 2
AI消息累积长度: 2 内容: 您好...

收到消息: {type: 'tts', state: 'sentence_start', text: '，很高兴见到您'}
TTS 文本片段: ，很高兴见到您
AI消息累积长度: 9 内容: 您好，很高兴见到您...

收到消息: {type: 'tts', state: 'stop'}
TTS 结束，准备保存AI消息
📝 保存AI消息，长度: 9
✅ AI消息已保存

// 挂断通话
handleClosePhoneCall 被调用
检查未保存的消息...
所有消息已保存
断开 WebSocket 连接
WebSocket 连接已关闭
挂断电话后的messages数组: [{role: 'user', content: '你好'}, {role: 'ai', content: '您好，很高兴见到您'}]
messages数组长度: 2
已滚动到底部，显示聊天记录
```

## 如果问题仍然存在

1. **清除浏览器缓存**
   - 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
   - 清除 localStorage

2. **检查 Vue DevTools**
   - 查看 messages 数组的实际内容
   - 查看 isVoiceMode 的状态
   - 查看 showPhoneCall 的状态

3. **检查网络请求**
   - 打开 Network 面板
   - 查看 WebSocket 连接状态
   - 查看 API 请求是否成功

4. **检查后端日志**
   - 查看消息保存的日志
   - 检查是否有错误

5. **提供完整日志**
   - 复制控制台的完整日志
   - 包括从启动通话到挂断的所有日志
