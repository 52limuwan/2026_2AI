<template>
  <div class="voice-call-wrapper">
    <!-- 语音通话按钮 -->
    <button 
      v-if="!isCallActive"
      class="phone-capsule" 
      :title="buttonTitle"
      :disabled="isConnecting"
      @click="startCall"
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M21 15.46l-5.27-.61-2.52 2.52a15.045 15.045 0 01-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z" 
          fill="currentColor"
        />
      </svg>
    </button>

    <!-- 通话界面 -->
    <div v-if="isCallActive" class="phone-call-content">
      <div class="phone-call-header">
        <button class="phone-close-btn" @click="minimizeCall">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      
      <div class="phone-call-body">
        <div class="caller-avatar">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />
            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" />
          </svg>
        </div>
        
        <div class="caller-info">
          <h2 class="caller-name">膳食伙伴</h2>
          <p class="call-status" :class="callStatusClass">{{ callStatusText }}</p>
        </div>

        <!-- 录音按钮 -->
        <button 
          v-if="isConnected && microphoneAvailable"
          class="record-btn"
          :class="{ recording: isRecording }"
          @click="toggleRecording"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
          </svg>
          <span>{{ isRecording ? '录音中' : '按住说话' }}</span>
        </button>
        
        <div class="call-controls">
          <button class="call-control-btn hangup-btn" @click="endCall">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M21 15.46l-5.27-.61-2.52 2.52a15.045 15.045 0 01-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z" 
                fill="currentColor" 
                transform="rotate(135 12 12)"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getXiaozhiWebSocket } from '@/utils/xiaozhi-websocket';

const props = defineProps({
  role: {
    type: String,
    default: 'client',
    validator: (value) => ['client', 'guardian', 'gov'].includes(value)
  }
});

const isCallActive = ref(false);
const isConnecting = ref(false);
const isConnected = ref(false);
const isRecording = ref(false);
const microphoneAvailable = ref(true);
const callStatus = ref('idle'); // idle, connecting, connected, speaking

let wsHandler = null;
let audioRecorder = null;
let audioPlayer = null;

const buttonTitle = computed(() => {
  if (isConnecting.value) return '连接中...';
  return '语音通话';
});

const callStatusClass = computed(() => {
  return {
    'connecting': callStatus.value === 'connecting',
    'connected': callStatus.value === 'connected',
    'speaking': callStatus.value === 'speaking'
  };
});

const callStatusText = computed(() => {
  switch (callStatus.value) {
    case 'connecting': return '连接中...';
    case 'connected': return '通话中';
    case 'speaking': return '对方正在说话';
    default: return '准备中';
  }
});

// 启动通话
const startCall = async () => {
  isCallActive.value = true;
  isConnecting.value = true;
  callStatus.value = 'connecting';

  try {
    // 获取 xiaozhi WebSocket 处理器（使用角色参数）
    wsHandler = await getXiaozhiWebSocket(props.role);
    
    // 设置回调
    wsHandler.onConnectionStateChange = (connected) => {
      isConnected.value = connected;
      if (connected) {
        callStatus.value = 'connected';
        ElMessage.success('语音通话已连接');
      } else {
        callStatus.value = 'idle';
        if (isCallActive.value) {
          ElMessage.error('连接已断开');
          endCall();
        }
      }
    };

    wsHandler.onSessionStateChange = (speaking) => {
      if (speaking) {
        callStatus.value = 'speaking';
        // 对方说话时停止录音
        if (isRecording.value) {
          stopRecording();
        }
      } else {
        callStatus.value = 'connected';
      }
    };

    wsHandler.onRecordButtonStateChange = (recording) => {
      isRecording.value = recording;
    };

    // 连接
    const connected = await wsHandler.connect();
    
    if (!connected) {
      throw new Error('连接失败');
    }

    // 检查麦克风
    await checkMicrophone();

  } catch (error) {
    console.error('启动通话失败:', error);
    ElMessage.error(error.message || '启动通话失败');
    endCall();
  } finally {
    isConnecting.value = false;
  }
};

// 检查麦克风
const checkMicrophone = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true, 
        noiseSuppression: true, 
        sampleRate: 16000, 
        channelCount: 1 
      } 
    });
    stream.getTracks().forEach(track => track.stop());
    microphoneAvailable.value = true;
  } catch (error) {
    console.error('麦克风不可用:', error);
    microphoneAvailable.value = false;
    ElMessage.warning('麦克风不可用，仅支持收听');
  }
};

// 切换录音
const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    startRecording();
  }
};

// 开始录音
const startRecording = async () => {
  if (!wsHandler || !wsHandler.audioRecorder) return;
  
  try {
    const success = await wsHandler.audioRecorder.start();
    if (success) {
      isRecording.value = true;
    }
  } catch (error) {
    console.error('开始录音失败:', error);
    ElMessage.error('开始录音失败');
  }
};

// 停止录音
const stopRecording = () => {
  if (!wsHandler || !wsHandler.audioRecorder) return;
  
  try {
    wsHandler.audioRecorder.stop();
    isRecording.value = false;
  } catch (error) {
    console.error('停止录音失败:', error);
  }
};

// 最小化通话（关闭界面但保持连接）
const minimizeCall = () => {
  console.log('最小化通话界面，关闭连接');
  
  // 停止录音
  if (isRecording.value && wsHandler) {
    stopRecording();
  }
  
  // 断开连接
  if (wsHandler) {
    wsHandler.disconnect();
    wsHandler = null;
  }
  
  // 重置状态
  isCallActive.value = false;
  isConnected.value = false;
  isRecording.value = false;
  callStatus.value = 'idle';
};

// 结束通话
const endCall = () => {
  console.log('结束通话，关闭所有连接');
  
  // 停止录音
  if (isRecording.value && wsHandler) {
    stopRecording();
  }
  
  // 断开 WebSocket 连接
  if (wsHandler) {
    wsHandler.disconnect();
    wsHandler = null;
  }
  
  // 重置所有状态
  isCallActive.value = false;
  isConnected.value = false;
  isRecording.value = false;
  callStatus.value = 'idle';
  
  console.log('通话已结束，WebSocket 已关闭');
};

onMounted(() => {
  // 组件挂载时不自动连接，只在用户点击按钮时连接
  console.log('VoiceCall 组件已挂载，等待用户启动通话');
});

onUnmounted(() => {
  // 组件卸载时确保断开连接
  if (isCallActive.value) {
    endCall();
  }
});
</script>

<style scoped>
.voice-call-wrapper {
  position: relative;
}

.phone-capsule {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  color: white;
}

.phone-capsule:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.phone-capsule:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.phone-capsule svg {
  width: 24px;
  height: 24px;
}

.phone-call-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 400px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -40%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

.phone-call-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.phone-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s;
}

.phone-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.phone-close-btn svg {
  width: 18px;
  height: 18px;
}

.phone-call-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.caller-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.caller-avatar svg {
  width: 50px;
  height: 50px;
}

.caller-info {
  text-align: center;
  color: white;
}

.caller-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.call-status {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
}

.call-status.connecting {
  animation: pulse 1.5s ease-in-out infinite;
}

.call-status.speaking {
  color: #ffd700;
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.record-btn {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  transition: all 0.2s;
}

.record-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.record-btn.recording {
  background: rgba(255, 77, 77, 0.3);
  border-color: rgba(255, 77, 77, 0.5);
  animation: recordingPulse 1s ease-in-out infinite;
}

@keyframes recordingPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.record-btn svg {
  width: 20px;
  height: 20px;
}

.call-controls {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.call-control-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.hangup-btn {
  background: #ff4d4d;
  color: white;
}

.hangup-btn:hover {
  background: #ff3333;
  transform: scale(1.1);
}

.hangup-btn svg {
  width: 28px;
  height: 28px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .phone-call-content {
    width: 95%;
    max-width: none;
  }
}
</style>
