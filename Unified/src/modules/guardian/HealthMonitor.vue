<template>
  <div class="card-list">
    <!-- 未连接设备提示 -->
    <div class="card empty-state" v-if="!isConnected">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      </div>
      <p class="empty-title">未绑定检测设备</p>
      <p class="empty-desc muted">请先启动健康监测服务并连接设备</p>
      <button class="retry-btn" @click="connectWebSocket">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        重新连接
      </button>
    </div>

    <!-- 已连接时显示监测数据 -->
    <template v-else>
      <!-- 生命体征卡片 -->
      <div class="card">
        <div class="section-title">生命体征</div>
        <div class="vital-grid">
          <div class="vital-item">
            <div class="vital-label muted">心率</div>
            <div class="vital-value">{{ heartRate }} <span class="vital-unit">BPM</span></div>
          </div>
          <div class="vital-item">
            <div class="vital-label muted">呼吸率</div>
            <div class="vital-value">{{ breathingRate }} <span class="vital-unit">BPM</span></div>
          </div>
          <div class="vital-item">
            <div class="vital-label muted">距离</div>
            <div class="vital-value">{{ distance }} <span class="vital-unit">m</span></div>
          </div>
        </div>
      </div>

      <!-- 波形图卡片 -->
      <div class="card">
        <div class="waveform-header">
          <div class="section-title">实时波形</div>
          <div class="wave-toggles">
            <button 
              class="wave-btn" 
              :class="{ active: showBWave }"
              @click="showBWave = !showBWave"
            >
              呼吸
            </button>
            <button 
              class="wave-btn" 
              :class="{ active: showHWave }"
              @click="showHWave = !showHWave"
            >
              心跳
            </button>
          </div>
        </div>

        <!-- 呼吸波形 -->
        <div class="wave-container" v-if="showBWave">
          <div class="wave-label">
            <span class="muted">呼吸波形</span>
            <span class="wave-value">{{ bWave.toFixed(4) }}</span>
          </div>
          <canvas ref="bWaveCanvas" class="wave-canvas"></canvas>
        </div>

        <!-- 心跳波形 -->
        <div class="wave-container" v-if="showHWave">
          <div class="wave-label">
            <span class="muted">心跳波形</span>
            <span class="wave-value">{{ hWave.toFixed(4) }}</span>
          </div>
          <canvas ref="hWaveCanvas" class="wave-canvas"></canvas>
        </div>
      </div>

      <!-- 警报记录 -->
      <div class="card" v-if="alerts.length > 0">
        <div class="alert-header">
          <div class="section-title">警报记录</div>
          <button class="clear-all-btn" @click="clearAllAlerts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            清空
          </button>
        </div>
        <div class="alert-list">
          <div 
            v-for="alert in alerts" 
            :key="alert.id" 
            class="alert-item"
            :class="alert.type"
          >
            <div class="alert-content">
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-time muted">{{ alert.time }}</div>
            </div>
            <button class="delete-btn" @click="deleteAlert(alert.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// 连接状态
const isConnected = ref(false)

// 生命体征数据
const heartRate = ref(0)
const breathingRate = ref(0)
const distance = ref(0)
const bWave = ref(0)
const hWave = ref(0)

// 状态
const statusText = ref('未检测到生命体征')
const statusClass = ref('no-sign')
const connectionText = ref('正在连接...')

// 波形显示控制
const showBWave = ref(true)
const showHWave = ref(true)

// 警报列表
const alerts = ref([])

// 本地存储的key
const ALERTS_STORAGE_KEY = 'health_monitor_alerts'

// 从localStorage加载警报记录
const loadAlerts = () => {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY)
    if (stored) {
      alerts.value = JSON.parse(stored)
    }
  } catch (err) {
    console.error('加载警报记录失败:', err)
  }
}

// 保存警报记录到localStorage
const saveAlerts = () => {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts.value))
  } catch (err) {
    console.error('保存警报记录失败:', err)
  }
}

// 删除单条警报
const deleteAlert = (id) => {
  const index = alerts.value.findIndex(alert => alert.id === id)
  if (index !== -1) {
    alerts.value.splice(index, 1)
    saveAlerts()
  }
}

// 清空所有警报
const clearAllAlerts = () => {
  if (confirm('确定要清空所有警报记录吗？')) {
    alerts.value = []
    saveAlerts()
  }
}

// Canvas引用
const bWaveCanvas = ref(null)
const hWaveCanvas = ref(null)

// 波形数据缓存
const bWaveData = []
const hWaveData = []
const maxDataPoints = 150

// WebSocket连接
let ws = null
let reconnectTimer = null
let connectionTimeout = null

// 初始化WebSocket连接
const connectWebSocket = () => {
  try {
    // 清除之前的超时定时器
    if (connectionTimeout) {
      clearTimeout(connectionTimeout)
    }
    
    connectionText.value = '正在连接...'
    ws = new WebSocket('ws://localhost:8765')
    
    // 设置连接超时（5秒）
    connectionTimeout = setTimeout(() => {
      if (!isConnected.value) {
        console.log('连接超时')
        if (ws) {
          ws.close()
        }
        isConnected.value = false
        connectionText.value = '连接超时'
      }
    }, 5000)
    
    ws.onopen = () => {
      console.log('健康监测WebSocket已连接')
      clearTimeout(connectionTimeout)
      isConnected.value = true
      connectionText.value = '已连接'
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        updateVitalSigns(data)
      } catch (err) {
        console.error('解析数据失败:', err)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error)
      clearTimeout(connectionTimeout)
      isConnected.value = false
      connectionText.value = '连接错误'
    }
    
    ws.onclose = () => {
      console.log('WebSocket连接已关闭')
      clearTimeout(connectionTimeout)
      isConnected.value = false
      connectionText.value = '连接已断开'
      // 5秒后尝试重连
      reconnectTimer = setTimeout(connectWebSocket, 5000)
    }
  } catch (err) {
    console.error('连接失败:', err)
    clearTimeout(connectionTimeout)
    isConnected.value = false
    connectionText.value = '连接失败'
    reconnectTimer = setTimeout(connectWebSocket, 5000)
  }
}

// 更新生命体征数据
const updateVitalSigns = (data) => {
  heartRate.value = Math.round(data.heartRate || 0)
  breathingRate.value = Math.round(data.breathingRate || 0)
  distance.value = (data.distance || 0).toFixed(2)
  bWave.value = data.bWave || 0
  hWave.value = data.hWave || 0
  
  // 更新状态
  if (data.status === 'detected') {
    statusText.value = '检测到生命体征'
    statusClass.value = 'detected'
  } else {
    statusText.value = '未检测到生命体征'
    statusClass.value = 'no-sign'
  }
  
  // 检查警报
  if (data.alert) {
    addAlert(data.alert)
  }
  
  // 更新波形数据
  bWaveData.push(data.bWave || 0)
  hWaveData.push(data.hWave || 0)
  
  if (bWaveData.length > maxDataPoints) bWaveData.shift()
  if (hWaveData.length > maxDataPoints) hWaveData.shift()
  
  drawWaveforms()
}

// 添加警报
const addAlert = (message) => {
  const alert = {
    id: Date.now(),
    message,
    time: new Date().toLocaleTimeString(),
    type: message.includes('异常') ? 'critical' : 'warning'
  }
  alerts.value.unshift(alert)
  if (alerts.value.length > 50) alerts.value.pop() // 最多保留50条
  saveAlerts() // 保存到localStorage
}

// 绘制波形图
const drawWaveforms = () => {
  if (showBWave.value && bWaveCanvas.value) {
    drawWaveform(bWaveCanvas.value, bWaveData, '#3b82f6')
  }
  if (showHWave.value && hWaveCanvas.value) {
    drawWaveform(hWaveCanvas.value, hWaveData, '#ef4444')
  }
}

// 绘制单个波形
const drawWaveform = (canvas, data, color) => {
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // 清空画布
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, width, height)
  
  // 绘制网格
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  for (let i = 0; i <= 10; i++) {
    const x = (width / 10) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  if (data.length < 2) return
  
  const max = Math.max(...data, 0.01)
  const min = Math.min(...data, -0.01)
  const range = max - min
  
  // 绘制波形
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  
  data.forEach((value, index) => {
    const x = (index / maxDataPoints) * width
    const y = height - ((value - min) / range) * height * 0.8 - height * 0.1
    
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  
  ctx.stroke()
}

// 初始化Canvas尺寸
const initCanvas = () => {
  nextTick(() => {
    if (bWaveCanvas.value) {
      bWaveCanvas.value.width = bWaveCanvas.value.offsetWidth * 2
      bWaveCanvas.value.height = bWaveCanvas.value.offsetHeight * 2
    }
    if (hWaveCanvas.value) {
      hWaveCanvas.value.width = hWaveCanvas.value.offsetWidth * 2
      hWaveCanvas.value.height = hWaveCanvas.value.offsetHeight * 2
    }
  })
}

onMounted(() => {
  loadAlerts() // 加载历史警报记录
  initCanvas()
  connectWebSocket()
  window.addEventListener('resize', initCanvas)
})

onUnmounted(() => {
  if (ws) ws.close()
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (connectionTimeout) clearTimeout(connectionTimeout)
  window.removeEventListener('resize', initCanvas)
})
</script>

<style scoped>
/* 使用全局 card-list 容器 */
.card {
  padding: 16px;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--ghost-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

.empty-title {
  font-size: 16px;
  font-weight: var(--fw-semibold);
  color: var(--text);
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 14px;
  margin: 0 0 24px;
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ghost-bg);
  color: var(--text);
  font-size: 14px;
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn svg {
  width: 16px;
  height: 16px;
}

.retry-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 156, 122, 0.3);
}

.retry-btn:active {
  transform: translateY(0);
}

.section-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-semibold);
  color: var(--text);
  margin: 0 0 14px 0;
}

.vital-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.vital-item {
  text-align: center;
}

.vital-label {
  font-size: 12px;
  margin-bottom: 6px;
}

.vital-value {
  font-size: 24px;
  font-weight: var(--fw-semibold);
  color: var(--text);
}

.vital-unit {
  font-size: 12px;
  font-weight: var(--fw-normal);
  color: var(--muted);
  margin-left: 2px;
}

.waveform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.wave-toggles {
  display: flex;
  gap: 8px;
}

.wave-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--ghost-bg);
  color: var(--muted);
  font-size: 12px;
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: all 0.2s;
}

.wave-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.wave-container {
  margin-bottom: 16px;
}

.wave-container:last-child {
  margin-bottom: 0;
}

.wave-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
}

.wave-value {
  font-family: 'Courier New', monospace;
  color: var(--accent);
  font-weight: var(--fw-semibold);
}

.wave-canvas {
  width: 100%;
  height: 100px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

/* 警报记录头部 */
.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.clear-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--ghost-bg);
  color: var(--muted);
  font-size: 12px;
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-all-btn svg {
  width: 14px;
  height: 14px;
}

.clear-all-btn:hover {
  background: #fef2f2;
  border-color: #ef4444;
  color: #ef4444;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--ghost-bg);
  border-radius: 8px;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.alert-item:hover {
  background: var(--card);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.alert-item.critical {
  background: #fef2f2;
}

.alert-item.critical:hover {
  background: #fee2e2;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-message {
  font-size: 14px;
  color: var(--text);
  margin-bottom: 4px;
  font-weight: var(--fw-medium);
}

.alert-time {
  font-size: 12px;
}

.delete-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn svg {
  width: 16px;
  height: 16px;
}

.delete-btn:hover {
  background: #fef2f2;
  color: #ef4444;
}
</style>
