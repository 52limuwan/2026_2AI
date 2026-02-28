# 语音通话连接管理修复

## 修复内容

修复了语音通话界面的 WebSocket 连接管理问题，确保连接只在语音通话界面激活时建立，挂断后立即关闭。

## 主要改动

### 1. VoiceCall.vue 组件

- **修改 props**: 从 `wsUrl` 改为 `role`，使用角色参数获取配置
- **优化 startCall**: 使用 `getXiaozhiWebSocket(role)` 获取连接
- **增强 endCall**: 添加详细的清理日志，确保完全断开连接
- **改进 minimizeCall**: 关闭界面时同时断开连接
- **简化生命周期**: 移除不必要的设置监听器

### 2. AIAssistant.vue 组件（client/guardian/gov）

#### handleClosePhoneCall() 方法增强
- 停止录音会话
- 清理音频播放器
- **断开 WebSocket 连接**（关键修复）
- 重置连接状态 `wsConnected.value = false`
- 禁用语音模式

#### handlePhoneCall() 方法优化
- 每次启动通话前先断开旧连接
- 获取新的 WebSocket 实例
- 重新建立连接

#### onMounted() 优化
- 移除 WebSocket 预加载
- 改为按需连接（点击通话按钮时）

### 3. xiaozhi-websocket.js 工具

#### AudioRecorder.stop() 方法增强
- 添加详细的资源清理日志
- 确保所有音频轨道被停止
- 暂停 AudioContext 而不是关闭（便于重用）
- 清理 Opus 编码器内存

#### XiaozhiWebSocketHandler.disconnect() 方法增强
- 停止录音
- 清理音频播放器
- 移除所有事件监听器
- 正确关闭 WebSocket 连接
- 重置所有状态

#### getXiaozhiWebSocket() 函数优化
- 每次调用时先断开旧连接
- 创建新的 WebSocket 实例
- 确保不会有连接泄漏

## 问题根源

之前的实现中，AIAssistant 组件在挂断通话时只是：
1. 停止了录音
2. 设置了 `isVoiceMode = false`

但是 **没有断开 WebSocket 连接**，导致：
- 服务器继续发送语音数据
- 客户端继续接收并播放音频
- 连接一直保持到页面刷新

## 修复后的行为

现在的完整流程：

1. **启动通话**
   - 断开旧连接（如果存在）
   - 创建新的 WebSocket 实例
   - 建立连接
   - 启动录音会话

2. **通话进行中**
   - 保持连接
   - 支持录音和播放

3. **挂断通话**
   - 停止录音
   - 清理音频播放器
   - **断开 WebSocket 连接**
   - 重置所有状态
   - 不再接收任何消息

## 使用方式

### VoiceCall 组件
```vue
<template>
  <VoiceCall :role="userRole" />
</template>

<script setup>
import VoiceCall from '@/components/VoiceCall.vue'

const userRole = 'client' // 或 'guardian', 'gov'
</script>
```

### AIAssistant 组件
无需修改使用方式，内部已自动处理连接管理。

## 连接生命周期

1. **用户点击通话按钮** → 建立 WebSocket 连接
2. **通话进行中** → 保持连接，支持录音和播放
3. **用户挂断** → 立即断开连接，清理所有资源
4. **组件卸载** → 确保连接已断开

## 关键特性

- ✅ 只在语音界面才建立连接
- ✅ 挂断后立即关闭 WebSocket
- ✅ 完整的资源清理（音频轨道、编码器、播放器）
- ✅ 详细的日志输出，便于调试
- ✅ 防止连接泄漏
- ✅ 不再接收挂断后的消息

## 测试建议

1. 打开语音通话界面，检查控制台是否显示 "创建新的 WebSocket 实例"
2. 挂断通话，检查控制台是否显示 "断开 WebSocket 连接" 和 "WebSocket 连接已关闭"
3. 挂断后确认不再接收任何语音消息
4. 多次打开/关闭通话，确认没有连接泄漏
5. 检查浏览器开发者工具的网络面板，确认 WebSocket 连接状态正确

## 调试日志

挂断通话时应该看到以下日志：
```
handleClosePhoneCall 被调用
断开 WebSocket 连接
停止录音，清理资源
音频轨道已停止: [麦克风名称]
✅ Opus 编码器已清理
📤 已发送录音停止信号
AudioContext 已暂停
🎤 录音已停止，所有资源已清理
WebSocket 连接已关闭
```
