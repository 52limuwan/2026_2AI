# 语音通话功能集成指南

## 概述

语音通话功能已经在三个端（client、guardian、gov）的 AIAssistant 组件中实现了基础框架。现在需要完善 WebSocket 连接逻辑，使其能够从用户设置中读取 WebSocket 地址和设备配置并连接到 xiaozhi 服务器。

## 已完成的工作

### 1. 后端 API
- ✅ 所有三个端都已实现设置 API：
  - `GET /client/settings` - 获取客户端设置
  - `PUT /client/settings` - 更新客户端设置
  - `GET /guardian/settings` - 获取监护人设置
  - `PUT /guardian/settings` - 更新监护人设置
  - `GET /gov/settings` - 获取政府端设置
  - `PUT /gov/settings` - 更新政府端设置
- ✅ 设置存储在 users 表的 preferences 字段（JSON 格式）

### 2. 前端组件
- ✅ `SettingsDialog.vue` - 设置对话框组件
  - 支持配置设备 MAC 地址
  - 支持配置设备 ID
  - 支持配置设备名称
  - 支持配置 OTA 服务器地址
  - 支持配置 WebSocket 地址
  - 根据用户角色自动选择对应 API
  - 保存成功后触发 `settings-updated` 事件

- ✅ `VoiceCall.vue` - 独立的语音通话组件（可选）
  - 完整的语音通话 UI
  - 麦克风权限检查
  - 录音控制

- ✅ `xiaozhi-websocket.js` - WebSocket 工具类
  - 音频录制器（AudioRecorder）
  - 音频播放器（AudioPlayer）
  - WebSocket 处理器（XiaozhiWebSocketHandler）
  - 自动从用户设置获取 WebSocket URL

### 3. AIAssistant 组件
- ✅ 电话按钮 UI
- ✅ 通话界面 UI（带动画效果）
- ✅ 基础的 WebSocket 连接逻辑
- ⚠️ 需要更新以使用新的 `xiaozhi-websocket.js`

## 需要完善的部分

### 1. 更新 AIAssistant 组件的 WebSocket 连接逻辑

在 `Unified/src/modules/client/AIAssistant.vue`（以及 guardian 和 gov 的对应文件）中：

```javascript
// 当前的实现
const ws = getXiaozhiWebSocket('client')

// 需要更新 connectWebSocket 函数
const connectWebSocket = async () => {
  if (wsConnected.value || wsConnecting.value) return
  
  wsConnecting.value = true
  try {
    // 从 xiaozhi-websocket.js 获取 WebSocket 实例
    // 它会自动从用户设置中读取 ws_url
    const wsHandler = await getXiaozhiWebSocket('client')
    
    // 设置回调
    wsHandler.onConnectionStateChange = (connected) => {
      wsConnected.value = connected
      if (!connected) {
        showToast('连接已断开')
      }
    }
    
    wsHandler.onChatMessage = (text, isUser) => {
      // 处理聊天消息
      const message = {
        role: isUser ? 'user' : 'ai',
        content: text,
        timestamp: Date.now()
      }
      messages.value.push(message)
      scrollToBottom()
    }
    
    // 连接
    await wsHandler.connect()
    wsConnected.value = true
    
    console.log('WebSocket 连接成功')
  } catch (error) {
    console.error('连接失败:', error)
    if (error.message.includes('配置 WebSocket 地址')) {
      showToast('请先在设置中配置 WebSocket 地址')
      // 打开设置对话框
      showSettingsDialog.value = true
    } else {
      showToast('连接失败，请重试')
    }
  } finally {
    wsConnecting.value = false
  }
}
```

### 2. 更新电话通话处理函数

```javascript
const handlePhoneCall = async (event) => {
  // 检查是否已配置 WebSocket
  try {
    const wsHandler = await getXiaozhiWebSocket('client')
    
    // 如果未连接，先连接
    if (!wsHandler.isConnected()) {
      await connectWebSocket()
    }
    
    // 显示通话界面（保留现有的动画逻辑）
    // ... 现有代码 ...
    
    // 开始录音
    const success = await wsHandler.audioRecorder.start()
    if (success) {
      callStatus.value = 'connected'
    }
  } catch (error) {
    if (error.message.includes('配置 WebSocket 地址')) {
      showToast('请先在设置中配置 WebSocket 地址')
      showSettingsDialog.value = true
    } else {
      showToast('启动语音通话失败')
    }
  }
}
```

### 3. 添加设置更新监听

```javascript
onMounted(() => {
  // 监听设置更新事件
  window.addEventListener('settings-updated', handleSettingsUpdate)
})

onUnmounted(() => {
  window.removeEventListener('settings-updated', handleSettingsUpdate)
})

const handleSettingsUpdate = (event) => {
  if (event.detail?.ws_url) {
    // WebSocket 地址已更新
    if (wsConnected.value) {
      showToast('WebSocket 地址已更新，请重新连接')
      // 断开当前连接
      // ws.disconnect()
      wsConnected.value = false
    }
  }
}
```

## 使用流程

### 用户端操作流程

1. 用户打开 AI 助手页面
2. 点击设置按钮（齿轮图标）
3. 在设置对话框中配置：
   - **设备配置**
     - 设备 MAC：设备的唯一标识符（例如：AA:BB:CC:DD:EE:FF）
     - 设备 ID：客户端 ID（例如：web_client_001）
     - 设备名称：设备的显示名称（例如：Web测试设备）
   - **连接配置**
     - OTA 服务器：OTA 服务器地址（例如：http://127.0.0.1:8002/xiaozhi/ota/）
     - WebSocket 地址：语音通话服务器地址（例如：ws://localhost:8080）
4. 点击保存
5. 点击电话按钮开始语音通话
6. 系统自动连接到 xiaozhi 服务器
7. 开始语音对话

### 技术流程

1. 用户保存设置 → 调用 `updateUserSettings` API → 保存到数据库（preferences 字段）
2. 用户点击电话按钮 → 调用 `getXiaozhiWebSocket('client')`
3. `getXiaozhiWebSocket` → 调用 `getUserSettings` API → 获取所有配置
4. 创建 `XiaozhiWebSocketHandler` 实例（传入设备配置）→ 连接到 WebSocket 服务器
5. 发送 hello 握手消息（包含设备信息）→ 开始语音会话
6. 录音 → 发送音频数据 → 接收 AI 回复 → 播放音频

## 测试步骤

### 1. 测试设置功能
```bash
# 启动后端服务器
cd Backed
node server.js

# 启动前端
cd Unified
npm run dev
```

1. 登录系统
2. 进入 AI 助手页面
3. 点击设置按钮
4. 配置设备信息：
   - 设备 MAC：AA:BB:CC:DD:EE:FF
   - 设备 ID：web_client_001
   - 设备名称：我的测试设备
5. 配置连接信息：
   - OTA 服务器：http://127.0.0.1:8002/xiaozhi/ota/
   - WebSocket 地址：ws://localhost:8080
6. 点击保存
7. 检查浏览器控制台，确认设置已保存
8. 刷新页面，重新打开设置，确认配置已保存

### 2. 测试语音通话
1. 确保 xiaozhi 服务器正在运行
2. 点击电话按钮
3. 检查浏览器控制台，确认 WebSocket 连接成功
4. 允许麦克风权限
5. 开始说话，测试语音识别和 AI 回复

## 注意事项

### 1. 麦克风权限
- HTTPS 或 localhost 才能访问麦克风
- HTTP 非 localhost 访问会提示麦克风不可用

### 2. WebSocket URL 格式
- 支持 `ws://` 和 `wss://` 协议
- 示例：`ws://localhost:8080` 或 `wss://example.com/ws`

### 3. 音频编码
- 当前实现使用简化的 PCM 数据传输
- 生产环境建议使用 Opus 编码以减少带宽

### 4. 错误处理
- 未配置 WebSocket 地址 → 提示用户配置
- 连接失败 → 显示错误提示
- 麦克风不可用 → 提示仅支持收听

## 下一步优化

1. **Opus 编码集成**
   - 集成 libopus.js 进行音频编码/解码
   - 减少网络带宽占用

2. **音频可视化**
   - 添加音频波形显示
   - 显示说话状态指示器

3. **断线重连**
   - 自动重连机制
   - 重连时恢复会话状态

4. **多端同步**
   - 支持多设备同时在线
   - 会话状态同步

5. **性能优化**
   - 音频缓冲优化
   - 减少延迟

## 相关文件

### 前端
- `Unified/src/components/SettingsDialog.vue` - 设置对话框
- `Unified/src/components/VoiceCall.vue` - 语音通话组件（可选）
- `Unified/src/utils/xiaozhi-websocket.js` - WebSocket 工具类
- `Unified/src/modules/client/AIAssistant.vue` - 客户端 AI 助手
- `Unified/src/modules/guardian/AIAssistant.vue` - 监护人 AI 助手
- `Unified/src/modules/gov/AIAssistant.vue` - 政府端 AI 助手

### 后端
- `Backed/src/routes/client.js` - 客户端路由（设置 API）
- `Backed/src/routes/guardian.js` - 监护人路由（设置 API）
- `Backed/src/routes/gov.js` - 政府端路由（设置 API）

### API
- `Unified/src/api/client.js` - 客户端 API
- `Unified/src/api/guardian.js` - 监护人 API
- `Unified/src/api/gov.js` - 政府端 API

### 参考实现
- `Unified/src/test/` - xiaozhi 测试页面（完整实现参考）
