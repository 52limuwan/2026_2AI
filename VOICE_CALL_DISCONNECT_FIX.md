# 语音通话断开连接修复

## 问题描述

语音通话过程中会随机断开连接，导致：
1. 用户无法继续对话
2. 之前的AI回复无法收到
3. 通话界面卡住或无响应
4. 需要重新发起通话

## 问题原因

### 1. 缺少心跳检测机制
- WebSocket连接没有心跳保活
- 长时间无消息时，连接可能被中间网络设备（如路由器、防火墙）静默断开
- 客户端无法及时发现连接已断开

### 2. 断线重连不完善
- 断开后重连延迟太长（3秒）
- 语音通话模式下没有特殊的重连处理
- 重连后没有恢复会话状态

### 3. 连接状态监控不足
- 没有主动检测连接健康状态
- 依赖被动的 `onclose` 事件
- 无法提前发现连接异常

## 修复方案

### 1. 添加心跳检测机制

#### 心跳发送
每30秒检查一次，如果超过25秒没有任何消息活动，发送心跳ping：

```javascript
heartbeatTimer = setInterval(() => {
  const now = Date.now()
  const timeSinceLastMessage = now - lastHeartbeatTime
  
  // 如果超过25秒没有任何消息，发送心跳
  if (timeSinceLastMessage > 25000 && wsInstance && wsInstance.websocket && wsInstance.websocket.readyState === WebSocket.OPEN) {
    console.log('🫀 发送心跳 ping');
    wsInstance.websocket.send(JSON.stringify({ type: 'ping' }))
    lastHeartbeatTime = now
  }
}, 30000)
```

#### 心跳检查
每60秒检查一次，如果超过60秒没有任何消息，认为连接可能已断开：

```javascript
heartbeatCheckTimer = setInterval(() => {
  const now = Date.now()
  const timeSinceLastMessage = now - lastHeartbeatTime
  
  // 如果超过60秒没有任何消息，认为连接可能已断开
  if (timeSinceLastMessage > 60000) {
    console.error('⚠️ 心跳超时，连接可能已断开');
    
    // 检查WebSocket状态并触发重连
    if (wsInstance.websocket.readyState !== WebSocket.OPEN) {
      wsConnected.value = false
      wsInstance.onConnectionStateChange(false)
    }
  }
}, 60000)
```

#### 心跳更新
在收到任何消息时更新心跳时间：

```javascript
const handleWebSocketMessage = (message) => {
  // 🔥 更新心跳时间
  updateHeartbeat()
  
  // ... 处理消息
}
```

### 2. 增强断线重连机制

#### 语音模式快速重连
在语音通话模式下，连接断开后立即重连（1秒），而不是等待3秒：

```javascript
wsInstance.onConnectionStateChange = (isConnected) => {
  if (!isConnected) {
    if (isVoiceMode.value) {
      // 语音模式：立即重连
      showToast('连接断开，正在重连...')
      
      setTimeout(() => {
        if (!wsConnected.value && isVoiceMode.value) {
          connectWebSocket().then(() => {
            if (wsConnected.value && isVoiceMode.value) {
              showToast('连接已恢复')
              
              // 重新启动音频会话，传递历史消息
              const historyForReconnect = messages.value
                .filter(m => m.content && m.content.trim())
                .map(m => ({ role: m.role, content: m.content }))
              
              wsInstance.startAudioSession(historyForReconnect)
            }
          }).catch(err => {
            showToast('重连失败，请重新发起通话')
            handleClosePhoneCall()
          })
        }
      }, 1000) // 1秒后重连
    } else {
      // 非语音模式：正常重连
      showToast('连接已断开')
      setTimeout(() => {
        if (!wsConnected.value) {
          connectWebSocket()
        }
      }, 3000)
    }
  }
}
```

#### 恢复会话状态
重连成功后，传递历史消息给服务器，恢复会话上下文：

```javascript
// 重新启动音频会话
const historyForReconnect = messages.value
  .filter(m => m.content && m.content.trim())
  .map(m => ({
    role: m.role,
    content: m.content
  }))

wsInstance.startAudioSession(historyForReconnect)
```

### 3. 连接状态监控

#### 状态变化检测
区分首次断开和重连恢复：

```javascript
const wasConnected = wsConnected.value
wsConnected.value = isConnected

if (!isConnected) {
  // 连接断开处理
} else if (wasConnected === false && isConnected === true) {
  // 从断开恢复到连接
  console.log('✅ WebSocket 连接已恢复');
  if (!isVoiceMode.value) {
    showToast('连接已恢复')
  }
}
```

## 心跳机制详解

### 时间参数
- **心跳间隔**: 30秒检查一次
- **发送阈值**: 25秒无消息则发送心跳
- **超时阈值**: 60秒无消息则认为连接异常

### 工作流程
1. 连接建立后启动心跳定时器
2. 每收到一条消息，更新 `lastHeartbeatTime`
3. 每30秒检查距离上次消息的时间
4. 如果超过25秒，发送 ping 消息
5. 每60秒检查连接健康状态
6. 如果超过60秒无消息，检查 WebSocket 状态
7. 如果连接已断开，触发重连流程

### 心跳消息格式
```json
{
  "type": "ping"
}
```

## 修复效果

### 修复前
- 语音通话中连接断开，用户无感知
- 断开后无法收到AI回复
- 需要手动关闭并重新发起通话
- 重连延迟长（3秒）

### 修复后
- 主动发送心跳保持连接活跃
- 及时发现连接断开
- 语音模式下快速重连（1秒）
- 重连后自动恢复会话状态
- 用户体验更流畅

## 日志输出

### 心跳日志
```
🫀 启动心跳检测
🫀 发送心跳 ping
⚠️ 心跳超时，连接可能已断开
🫀 停止心跳检测
```

### 重连日志
```
❌ WebSocket 连接断开
⚠️ 语音通话中连接断开，尝试重连...
🔄 尝试重新连接...
✅ 重连成功，恢复语音会话
✅ WebSocket 连接已恢复
```

## 相关文件

- `Unified/src/modules/client/AIAssistant.vue` - 客户端 AI 助手
- `Unified/src/modules/guardian/AIAssistant.vue` - 监护人 AI 助手（需要同样修复）
- `Unified/src/modules/gov/AIAssistant.vue` - 政府端 AI 助手（需要同样修复）
- `Unified/src/utils/xiaozhi-websocket.js` - WebSocket 工具类

## 测试建议

1. 测试心跳机制
   - 发起语音通话
   - 保持静默30秒以上
   - 检查控制台是否发送心跳 ping
   - 检查连接是否保持活跃

2. 测试断线重连
   - 发起语音通话
   - 在通话过程中断开网络（如关闭WiFi）
   - 检查是否显示"连接断开，正在重连..."
   - 恢复网络连接
   - 检查是否自动重连并恢复会话

3. 测试长时间通话
   - 发起语音通话
   - 保持通话5分钟以上
   - 检查连接是否稳定
   - 检查是否能正常收发消息

4. 测试重连后会话恢复
   - 发起语音通话并进行对话
   - 断开并重连
   - 检查AI是否能记住之前的对话内容
   - 检查历史消息是否正确传递

## 后端配置建议

### 服务器端心跳响应
建议后端支持 ping/pong 机制：

```javascript
// 收到 ping 消息时返回 pong
if (message.type === 'ping') {
  ws.send(JSON.stringify({ type: 'pong' }))
}
```

### 会话恢复
建议后端支持会话恢复机制：
- 保存会话状态（session_id）
- 重连时传递 session_id
- 恢复之前的对话上下文

## 注意事项

1. **心跳频率**
   - 不要设置太频繁（避免浪费带宽）
   - 不要设置太稀疏（可能无法及时发现断开）
   - 建议30秒是一个合理的平衡点

2. **超时阈值**
   - 60秒超时适合大多数场景
   - 如果网络环境较差，可以适当延长
   - 如果需要更快发现断开，可以缩短

3. **重连策略**
   - 语音模式下快速重连（1秒）
   - 非语音模式下延迟重连（3秒）
   - 避免频繁重连导致服务器压力

4. **会话恢复**
   - 只传递必要的历史消息
   - 避免传递过多数据
   - 确保服务器支持会话恢复
