<template>
  <div class="page">
    <div class="card-list">
      <div class="card">
        <div class="row">
          <div>
            <div class="muted">订单号</div>
            <strong>{{ orderData.order_number || orderData.id }}</strong>
          </div>
          <span class="status">{{ statusText(orderData.status) }}</span>
        </div>
        
        <p class="muted" v-if="orderData.address">配送地址：{{ maskAddress(orderData.address) }}</p>
        <p class="muted" v-if="orderData.window_name">取餐窗口：{{ orderData.window_name }}</p>
        
        <div class="items" v-if="orderData.items && orderData.items.length">
          <div v-for="item in orderData.items" :key="item.id" class="item-line">
            <span>{{ item.dish_name }}</span>
            <span class="muted">× {{ item.quantity }}</span>
            <span>￥{{ (item.price * item.quantity).toFixed(2) }}</span>
          </div>
        </div>
        
        <div class="row total-row">
          <div class="muted">应付</div>
          <strong>￥{{ orderData.total_amount || '0.00' }}</strong>
        </div>
      </div>

      <div class="card">
      <div class="status-timeline">
        <div class="timeline-line"></div>
        
        <div class="timeline-step" :class="{ completed: isStepCompleted('placed'), active: currentStep === 'placed' }">
          <div class="step-icon" :class="{ completed: isStepCompleted('placed'), active: currentStep === 'placed' }">
            <i class="fas fa-check" v-if="isStepCompleted('placed')"></i>
            <span v-else>1</span>
          </div>
          <div class="step-content">
            <div class="step-title">订单已提交</div>
            <div class="step-desc muted">您的订单已成功提交</div>
            <div class="step-time muted" v-if="orderData.created_at">{{ formatTime(orderData.created_at) }}</div>
          </div>
        </div>

        <div class="timeline-step" :class="{ completed: isStepCompleted('preparing'), active: currentStep === 'preparing' }">
          <div class="step-icon" :class="{ completed: isStepCompleted('preparing'), active: currentStep === 'preparing' }">
            <i class="fas fa-check" v-if="isStepCompleted('preparing')"></i>
            <span v-else-if="currentStep === 'preparing'">2</span>
            <span v-else>2</span>
          </div>
          <div class="step-content">
            <div class="step-title">机械臂准备中</div>
            <div class="step-desc muted">智能机械臂正在准备您的餐品</div>
            <div class="step-time muted" v-if="currentStep === 'preparing'">预计完成时间: 5分钟</div>
          </div>
        </div>

        <div class="timeline-step" :class="{ completed: isStepCompleted('delivering'), active: currentStep === 'delivering' }">
          <div class="step-icon" :class="{ completed: isStepCompleted('delivering'), active: currentStep === 'delivering' }">
            <i class="fas fa-check" v-if="isStepCompleted('delivering')"></i>
            <span v-else>3</span>
          </div>
          <div class="step-content">
            <div class="step-title">待取餐</div>
            <div class="step-desc muted">请前往取餐窗口取餐</div>
          </div>
        </div>

        <div class="timeline-step" :class="{ completed: isStepCompleted('delivered'), active: currentStep === 'delivered' }">
          <div class="step-icon" :class="{ completed: isStepCompleted('delivered'), active: currentStep === 'delivered' }">
            <i class="fas fa-check" v-if="isStepCompleted('delivered') || currentStep === 'delivered'"></i>
            <span v-else>4</span>
          </div>
          <div class="step-content">
            <div class="step-title">已完成</div>
            <div class="step-desc muted">订单已完成</div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- 机器人视频流已隐藏 -->
    <!--
    <div class="card robot-view" v-if="orderData.status === 'preparing' || orderData.status === 'delivering'">
      <div class="view-title">
        <i class="fas fa-video"></i> 机械臂实时画面
        <span class="detection-status">{{ detectionStatus }}</span>
      </div>
      <div class="view-content">
        <div class="video-container">
          <img 
            :src="videoStreamUrl" 
            class="video-stream"
            alt="YOLOv5 Detection Stream"
            @error="onVideoError"
            @load="onVideoLoad"
          />
          <div class="video-controls" v-if="!videoError">
            <button class="video-btn" @click="toggleFullscreen" title="全屏">
              <i class="fas fa-expand"></i>
            </button>
            <button class="video-btn" @click="refreshStream" title="刷新">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
          <div class="backup-view" v-if="videoError">
            <div class="view-icon">
              <i class="fas fa-robot"></i>
            </div>
            <div class="backup-text">智能机械臂正在准备您的餐品</div>
            <div class="backup-desc">预计等待时间: 5分钟</div>
            <button class="retry-btn" @click="refreshStream">
              <i class="fas fa-redo"></i> 重新连接
            </button>
          </div>
          <div class="loading-overlay" v-if="videoLoading">
            <div class="loading-content">
              <i class="fas fa-spinner fa-spin"></i>
              <div>正在加载视频流...</div>
            </div>
          </div>
        </div>
      </div>
      <div class="robot-actions" v-if="orderData.status === 'preparing' || orderData.status === 'delivering'">
        <button class="primary-btn" @click="handleQucan">取餐</button>
      </div>
    </div>
    -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderById } from '../../api/client'

const route = useRoute()
const router = useRouter()
const orderData = ref({ items: [] })

const statusSteps = ['placed', 'preparing', 'delivering', 'delivered']
const currentStep = computed(() => orderData.value.status || 'placed')

// 视频流相关
const videoStreamUrl = ref('http://192.168.101.242:5000/video_feed')
const videoError = ref(false)
const videoLoading = ref(true)
const detectionStatus = ref('连接中...')
const isFullscreen = ref(false)

let statusTimer1 = null
let statusTimer2 = null

const loadOrder = async () => {
  const orderId = route.params.id || route.query.order_id
  if (!orderId) {
    router.push('/client/orders')
    return
  }
  
  try {
    const res = await getOrderById(orderId)
    const order = res.data.data.order || {}
    
    // 保存原始订单数据
    orderData.value = order
    
    // 进入页面时，无论订单状态是什么，都强制设置为 preparing（机械臂准备中）
    // 然后开始自动更新流程
    if (order.status !== 'delivered' && order.status !== 'cancelled') {
      orderData.value.status = 'preparing'
      startAutoStatusUpdate()
    }
  } catch (error) {
    console.error('加载订单失败:', error)
    alert('加载订单失败，请重试')
    router.push('/client/orders')
  }
}

const startAutoStatusUpdate = () => {
  // 清除之前的定时器，避免重复执行
  if (statusTimer1) clearTimeout(statusTimer1)
  if (statusTimer2) clearTimeout(statusTimer2)
  
  // 确保当前状态是 preparing
  if (orderData.value.status !== 'preparing') {
    orderData.value = { ...orderData.value, status: 'preparing' }
  }
  
  // 15秒后变成待取餐
  statusTimer1 = setTimeout(() => {
    if (orderData.value.status === 'preparing') {
      orderData.value = { ...orderData.value, status: 'delivering' }
      
      // 5秒后变成完成
      statusTimer2 = setTimeout(() => {
        if (orderData.value.status === 'delivering') {
          orderData.value = { ...orderData.value, status: 'delivered' }
        }
      }, 5000)
    }
  }, 15000)
}

const onVideoError = () => {
  videoError.value = true
  videoLoading.value = false
  detectionStatus.value = '连接失败'
}

const onVideoLoad = () => {
  videoError.value = false
  videoLoading.value = false
  detectionStatus.value = '实时检测中'
}

const refreshStream = () => {
  videoError.value = false
  videoLoading.value = true
  detectionStatus.value = '连接中...'
  videoStreamUrl.value = `http://192.168.101.242:5000/video_feed?t=${Date.now()}`
}

const toggleFullscreen = () => {
  const videoContainer = document.querySelector('.video-container')
  if (!isFullscreen.value) {
    videoContainer.classList.add('fullscreen-video')
    isFullscreen.value = true
    document.body.style.overflow = 'hidden'
  } else {
    videoContainer.classList.remove('fullscreen-video')
    isFullscreen.value = false
    document.body.style.overflow = 'auto'
  }
}

const handleEsc = (e) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

onMounted(() => {
  loadOrder()
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  if (statusTimer1) clearTimeout(statusTimer1)
  if (statusTimer2) clearTimeout(statusTimer2)
  document.removeEventListener('keydown', handleEsc)
})

const statusText = (s) => {
  switch (s) {
    case 'placed':
      return '已下单'
    case 'preparing':
      return '准备中'
    case 'delivering':
      return '待取餐'
    case 'delivered':
      return '已送达'
    case 'cancelled':
      return '已取消'
    default:
      return s || '已下单'
  }
}

const isStepCompleted = (step) => {
  const stepIndex = statusSteps.indexOf(step)
  const currentIndex = statusSteps.indexOf(currentStep.value)
  // 如果当前步骤索引大于目标步骤索引，或者当前状态就是目标状态且是最后一个状态
  const completed = currentIndex > stepIndex || (currentIndex === stepIndex && currentStep.value === 'delivered')
  return completed
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

const maskAddress = (address) => {
  if (!address || address === '未填写') return '未填写'
  // 隐藏真实地址，改用"某某区某某路"格式
  const districtMatch = address.match(/(.{2,4}区)/)
  const roadMatch = address.match(/(.{2,6}路|.{2,6}街|.{2,6}道)/)
  
  if (districtMatch && roadMatch) {
    return `${districtMatch[1]}${roadMatch[1]}`
  } else if (districtMatch) {
    return `${districtMatch[1]}某某路`
  } else {
    return '某某区某某路'
  }
}

const handleQucan = async () => {
  const orderId = route.params.id || route.query.order_id || orderData.value.id
  if (!orderId) {
    alert('订单ID无效')
    return
  }
  
  try {
    // 这里调用取餐API，类似 order_status.html 中的 qucan 函数
    const response = await fetch(`/execute_order_tasks?order_id=${orderId}`)
    const data = await response.json()
    
    if (data.status === 'success') {
      // 更新订单状态为"准备中"
      orderData.value.status = 'preparing'
      alert('配餐任务已启动')
    } else {
      alert('配餐失败: ' + (data.message || '未知错误'))
    }
  } catch (error) {
    console.error('取餐失败:', error)
    alert('配餐过程中出现错误')
  }
}
</script>

<style scoped>
.card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.total-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0;
}

.item-line {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
}

.status {
  padding: 6px 12px;
  background: var(--surface-soft);
  border-radius: 10px;
  color: var(--accent-strong);
  font-weight: var(--fw-semibold);
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.actions button {
  flex: 1;
}

.status-timeline {
  position: relative;
  padding-left: 30px;
  margin-top: 8px;
}

.timeline-line {
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.timeline-step {
  position: relative;
  margin-bottom: 20px;
}

.timeline-step:last-child {
  margin-bottom: 0;
}

.step-icon {
  position: absolute;
  left: -30px;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  font-size: 11px;
  font-weight: var(--fw-medium);
  border: 2px solid var(--card);
}

.step-icon.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.step-icon.completed {
  background: var(--accent-strong);
  color: #fff;
  border-color: var(--accent-strong);
}

.step-content {
  padding-bottom: 4px;
}

.step-title {
  font-weight: var(--fw-semibold);
  margin-bottom: 2px;
  color: var(--text);
  font-size: calc(var(--fs-body) * var(--font-scale));
}

.step-desc {
  font-size: calc(var(--fs-secondary) * var(--font-scale));
  line-height: var(--lh-secondary);
}

.step-time {
  font-size: 12px;
  margin-top: 2px;
}

.robot-view {
  margin-top: 16px;
}

.view-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
  font-weight: var(--fw-semibold);
  color: var(--text);
}

.view-title i {
  margin-right: 8px;
  color: var(--accent);
}

.detection-status {
  font-size: calc(var(--fs-secondary) * var(--font-scale));
  color: var(--muted);
  font-weight: var(--fw-regular);
}

.view-content {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.video-container {
  position: relative;
  width: 100%;
  height: 300px;
  background: #000;
}

.video-stream {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
}

.video-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  color: white;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.video-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.backup-view {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #fff;
  z-index: 10;
}

.view-icon {
  font-size: 3rem;
  margin-bottom: 12px;
  color: var(--accent);
}

.backup-text {
  font-size: 1rem;
  margin-bottom: 8px;
  font-weight: var(--fw-medium);
}

.backup-desc {
  color: #aaa;
  margin-bottom: 16px;
  font-size: calc(var(--fs-secondary) * var(--font-scale));
}

.retry-btn {
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: calc(var(--fs-secondary) * var(--font-scale));
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(31, 156, 122, 0.3);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 20;
}

.loading-content {
  text-align: center;
}

.loading-content i {
  font-size: 2rem;
  margin-bottom: 10px;
  display: block;
}

.fullscreen-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: black;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
}

.fullscreen-video .video-stream {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.robot-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.robot-actions .primary-btn {
  width: 100%;
}
</style>