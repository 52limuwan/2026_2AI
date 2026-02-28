# 语音通话功能快速更新指南

## 当前状态

你的系统已经具备以下功能：

1. ✅ **设置功能完整**
   - 三个端都可以保存和读取 WebSocket 地址
   - SettingsDialog 组件已完善
   - 后端 API 已实现

2. ✅ **UI 界面完整**
   - 电话按钮已存在
   - 通话界面已实现（带动画）
   - 样式已完善

3. ✅ **工具类已创建**
   - `xiaozhi-websocket.js` 已实现
   - 支持从用户设置自动获取 WebSocket URL

## 需要做的事情

只需要在 AIAssistant 组件中更新 WebSocket 连接逻辑即可。

### 方案一：最小改动（推荐）

在现有的 `handlePhoneCall` 函数中添加设置检查：

```javascript
// 在 handlePhoneCall 函数开头添加
const handlePhoneCall = async (event) => {
  // 1. 检查是否配置了 WebSocket 地址
  try {
    const settings = await getUserSettings(); // 使用对应端的 API
    if (!settings?.ws_url) {
      showToast('请先在设置中配置 WebSocket 地址');
      showSettingsDialog.value = true;
      return;
    }
  } catch (error) {
    console.error('获取设置失败:', error);
    showToast('请先在设置中配置 WebSocket 地址');
    showSettingsDialog.value = true;
    return;
  }

  // 2. 继续现有的通话逻辑
  // ... 保留现有代码 ...
}
```

### 方案二：完整重构（可选）

如果你想使用新的 `xiaozhi-websocket.js`，需要：

1. 移除现有的 WebSocket 相关代码
2. 使用新的 `getXiaozhiWebSocket` 函数
3. 更新所有 WebSocket 相关的调用

## 快速测试步骤

### 1. 测试设置保存

```javascript
// 在浏览器控制台执行
// 1. 打开设置对话框
// 2. 输入 WebSocket 地址：ws://localhost:8080
// 3. 点击保存
// 4. 检查网络请求，确认 PUT /client/settings 成功
```

### 2. 测试设置读取

```javascript
// 在浏览器控制台执行
import { getUserSettings } from '@/api/client';
const settings = await getUserSettings();
console.log('WebSocket URL:', settings.data.settings.ws_url);
```

### 3. 测试语音通话

```javascript
// 1. 确保 xiaozhi 服务器运行在 ws://localhost:8080
// 2. 点击电话按钮
// 3. 检查控制台输出
// 4. 允许麦克风权限
// 5. 开始说话测试
```

## 当前 AIAssistant 组件的 WebSocket 实现

你的 AIAssistant 组件已经有以下实现：

```javascript
// 已有的代码
const ws = getXiaozhiWebSocket('client')
const wsConnected = ref(false)
const wsConnecting = ref(false)

const connectWebSocket = async () => {
  // 现有的连接逻辑
  // 使用 OTA URL 或直接 WebSocket URL
}

const handlePhoneCall = async (event) => {
  // 检查 WebSocket 连接
  if (!wsConnected.value) {
    await connectWebSocket()
  }
  
  // 启用语音模式
  ws.setVoiceMode(true)
  
  // 显示通话界面
  // ... 动画逻辑 ...
  
  // 开始录音
  ws.startAudioSession(historyForXiaozhi)
  const success = await ws.startRecording()
}
```

## 建议的修改

### 修改 1：在 `connectWebSocket` 中添加设置检查

```javascript
const connectWebSocket = async () => {
  if (wsConnected.value || wsConnecting.value) return
  
  wsConnecting.value = true
  try {
    // 1. 先获取用户设置
    const settings = await getUserSettings(); // 导入对应的 API
    const wsUrl = settings?.data?.settings?.ws_url;
    
    if (!wsUrl) {
      throw new Error('请先在设置中配置 WebSocket 地址');
    }
    
    // 2. 使用设置中的 URL 连接
    const deviceConfig = getDeviceConfig()
    await ws.connect(null, deviceConfig, wsUrl)
    
    wsConnected.value = true
    
    // 3. 注册消息处理器
    ws.onMessage(handleWebSocketMessage)
    ws.onConnectionStateChange((isConnected) => {
      wsConnected.value = isConnected
      if (!isConnected) {
        showToast('连接已断开')
      }
    })
    
    console.log('WebSocket 连接成功')
  } catch (error) {
    console.error('连接失败:', error)
    if (error.message.includes('配置 WebSocket 地址')) {
      showToast('请先在设置中配置 WebSocket 地址')
      showSettingsDialog.value = true
    } else {
      showToast('连接失败，请重试')
    }
  } finally {
    wsConnecting.value = false
  }
}
```

### 修改 2：添加导入

在文件顶部添加：

```javascript
// 对于 client/AIAssistant.vue
import { getUserSettings } from '../../api/client'

// 对于 guardian/AIAssistant.vue
import { getUserSettings } from '../../api/guardian'

// 对于 gov/AIAssistant.vue
import { getUserSettings } from '../../api/gov'
```

### 修改 3：添加设置更新监听

```javascript
onMounted(() => {
  // ... 现有代码 ...
  
  // 监听设置更新
  window.addEventListener('settings-updated', (event) => {
    if (event.detail?.ws_url && wsConnected.value) {
      showToast('WebSocket 地址已更新，请重新连接')
      ws.disconnect()
      wsConnected.value = false
    }
  })
})
```

## 完整的修改清单

### Client 端
- [ ] 更新 `Unified/src/modules/client/AIAssistant.vue`
  - [ ] 导入 `getUserSettings`
  - [ ] 修改 `connectWebSocket` 函数
  - [ ] 添加设置更新监听

### Guardian 端
- [ ] 更新 `Unified/src/modules/guardian/AIAssistant.vue`
  - [ ] 导入 `getUserSettings`
  - [ ] 修改 `connectWebSocket` 函数
  - [ ] 添加设置更新监听

### Gov 端
- [ ] 更新 `Unified/src/modules/gov/AIAssistant.vue`
  - [ ] 导入 `getUserSettings`
  - [ ] 修改 `connectWebSocket` 函数
  - [ ] 添加设置更新监听

## 测试清单

- [ ] 设置保存功能
  - [ ] 打开设置对话框
  - [ ] 输入 WebSocket 地址
  - [ ] 保存成功
  - [ ] 刷新页面后设置仍然存在

- [ ] 语音通话功能
  - [ ] 未配置时提示用户配置
  - [ ] 配置后可以连接
  - [ ] 麦克风权限正常
  - [ ] 可以录音和接收回复

- [ ] 错误处理
  - [ ] WebSocket 连接失败时有提示
  - [ ] 麦克风不可用时有提示
  - [ ] 断线后有重连提示

## 注意事项

1. **三个端的代码基本相同**，只需要修改导入的 API 路径
2. **保留现有的动画和 UI 逻辑**，只修改 WebSocket 连接部分
3. **测试时确保 xiaozhi 服务器正在运行**
4. **使用 HTTPS 或 localhost 以确保麦克风权限**

## 如果遇到问题

### 问题 1：设置保存失败
- 检查后端服务器是否运行
- 检查网络请求是否成功
- 检查用户是否已登录

### 问题 2：WebSocket 连接失败
- 检查 xiaozhi 服务器是否运行
- 检查 WebSocket URL 格式是否正确
- 检查浏览器控制台的错误信息

### 问题 3：麦克风不可用
- 确保使用 HTTPS 或 localhost
- 检查浏览器麦克风权限
- 尝试在浏览器设置中重置权限

## 总结

你的系统已经 90% 完成了！只需要：

1. 在 `connectWebSocket` 函数中添加从设置读取 WebSocket URL 的逻辑
2. 添加错误处理，提示用户配置 WebSocket 地址
3. 测试三个端的语音通话功能

所有的 UI、动画、后端 API 都已经完成，只差这最后一步连接！
