<template>
  <div class="home-container">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-header">
        <div>
          <h1 class="welcome-title">欢迎回来，{{ userName }}</h1>
          <p class="welcome-subtitle">您正在守护 <strong>{{ clients.length }}</strong> 位对象的身体健康</p>
        </div>
      </div>
    </div>

    <!-- 当前守护对象的卡片 -->
    <div class="card-list" v-if="currentClientWithData">
      <div class="guardian-card">
        <div class="guardian-card-header">
          <div class="guardian-avatar"></div>
          <div class="guardian-info">
            <h3 class="guardian-name">{{ currentClientWithData.name }}</h3>
            <p class="guardian-relation">{{ currentClientWithData.relation || '家人' }}</p>
          </div>
          <button class="view-profile-btn" @click="viewProfile(currentClientWithData.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>查看档案</span>
          </button>
        </div>
        
        <div class="guardian-nutrition">
          <div class="nutrition-label">守护对象的今日营养摄入</div>
          <div class="nutri-grid">
            <div class="nutri-item">
              <span class="muted">热量</span>
              <strong>{{ todayNutrition.calories }} kcal</strong>
            </div>
            <div class="nutri-item">
              <span class="muted">蛋白质</span>
              <strong>{{ todayNutrition.protein }} g</strong>
            </div>
            <div class="nutri-item">
              <span class="muted">脂肪</span>
              <strong>{{ todayNutrition.fat }} g</strong>
            </div>
            <div class="nutri-item">
              <span class="muted">碳水</span>
              <strong>{{ todayNutrition.carbs }} g</strong>
            </div>
            <div class="nutri-item">
              <span class="muted">膳食纤维</span>
              <strong>{{ todayNutrition.fiber }} g</strong>
            </div>
            <div class="nutri-item">
              <span class="muted">钙</span>
              <strong>{{ todayNutrition.calcium }} mg</strong>
            </div>
            <div class="nutri-item">
              <span class="muted">维生素C</span>
              <strong>{{ todayNutrition.vitaminC }} mg</strong>
            </div>
            <div class="nutri-item">
              <span class="muted">铁</span>
              <strong>{{ todayNutrition.iron }} mg</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" v-else-if="clients.length === 0" style="padding: 16px;">
      <p class="muted" style="text-align: center; padding: 16px 0 12px; font-size: 13px;">暂未绑定守护对象</p>
      <button class="primary-btn" @click="goProfile">去绑定</button>
    </div>

    <div class="card" v-else style="padding: 16px;">
      <p class="muted" style="text-align: center; padding: 16px 0 12px; font-size: 13px;">请从顶部选择守护对象</p>
    </div>

    <!-- 快捷功能 -->
    <div class="section-header">
      <h2 class="section-title">快捷功能</h2>
    </div>

    <div class="quick-actions">
      <div class="quick-action-card" @click="goPayment">
        <div class="action-icon payment-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
        </div>
        <div class="action-content">
          <div class="action-title">代缴费</div>
          <div class="action-desc">待付 <strong class="amount">￥{{ pendingAmount.toFixed(2) }}</strong></div>
        </div>
        <div class="action-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>

      <div class="quick-action-card" @click="goAiReports">
        <div class="action-icon report-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <div class="action-content">
          <div class="action-title">历史报告</div>
          <div class="action-desc">查看 AI 饮食分析报告</div>
        </div>
        <div class="action-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>

      <div class="quick-action-card" @click="goHealthMonitor">
        <div class="action-icon health-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <div class="action-content">
          <div class="action-title">健康监测</div>
          <div class="action-desc">实时生命体征监测</div>
        </div>
        <div class="action-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch, onUnmounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { getClients, getOrders, getClientNutrition } from '../../api/guardian'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const clients = ref([])
const clientOrdersMap = ref({})
const pendingAmount = ref(32.00)
const todayNutrition = ref({ 
  calories: 0, 
  protein: 0, 
  fat: 0, 
  carbs: 0, 
  fiber: 0,
  calcium: 0,
  vitaminC: 0,
  iron: 0
})

// 从 Layout 获取已选中的被监护人
const selectedClient = inject('selectedClient', ref(null))

const userName = computed(() => {
  return userStore.profile?.name || '测试用户'
})

// 当前选中的被监护人及其数据
const currentClientWithData = computed(() => {
  if (!selectedClient.value) return null
  
  return {
    ...selectedClient.value
  }
})

const getInitial = (name) => {
  if (!name) return '?'
  return name.charAt(name.length - 1) || name.charAt(0)
}

const loadClientOrders = async () => {
  try {
    const ordersRes = await getOrders()
    const allOrders = ordersRes.data.data.orders || []
    
    // 按被监护人分组订单，并获取最新的订单
    const ordersByClient = {}
    allOrders.forEach(order => {
      if (!ordersByClient[order.client_id]) {
        ordersByClient[order.client_id] = []
      }
      ordersByClient[order.client_id].push(order)
    })
    
    // 对每个被监护人的订单按时间排序（最新的在前）
    Object.keys(ordersByClient).forEach(clientId => {
      ordersByClient[clientId].sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        return timeB - timeA
      })
    })
    
    clientOrdersMap.value = ordersByClient
    
    // 计算待付金额（未支付订单的总金额）
    let total = 0
    allOrders.forEach(order => {
      if (order.payment_status !== 'paid' && order.status !== 'cancelled' && order.total_amount) {
        total += parseFloat(order.total_amount) || 0
      }
    })
    pendingAmount.value = total
  } catch (err) {
    console.error('加载订单失败', err)
  }
}

const loadTodayNutrition = async (clientId) => {
  if (!clientId) {
    todayNutrition.value = { 
      calories: 0, 
      protein: 0, 
      fat: 0, 
      carbs: 0, 
      fiber: 0,
      calcium: 0,
      vitaminC: 0,
      iron: 0
    }
    return
  }

  try {
    const res = await getClientNutrition(clientId)
    if (res?.data?.data?.nutrition) {
      const nutrition = res.data.data.nutrition
      todayNutrition.value = {
        calories: Math.round(nutrition.calories || 0),
        protein: Math.round((nutrition.protein || 0) * 10) / 10,
        fat: Math.round((nutrition.fat || 0) * 10) / 10,
        carbs: Math.round((nutrition.carbs || 0) * 10) / 10,
        fiber: Math.round((nutrition.fiber || 0) * 10) / 10,
        calcium: Math.round((nutrition.calcium || 0) * 10) / 10,
        vitaminC: Math.round((nutrition.vitaminC || nutrition.vitamin_c || 0) * 10) / 10,
        iron: Math.round((nutrition.iron || 0) * 10) / 10
      }
    } else if (res?.data?.data) {
      // 兼容旧格式
      const data = res.data.data
      todayNutrition.value = {
        calories: Math.round(data.calories || 0),
        protein: Math.round((data.protein || 0) * 10) / 10,
        fat: Math.round((data.fat || 0) * 10) / 10,
        carbs: Math.round((data.carbs || 0) * 10) / 10,
        fiber: Math.round((data.fiber || 0) * 10) / 10,
        calcium: Math.round((data.calcium || 0) * 10) / 10,
        vitaminC: Math.round((data.vitaminC || data.vitamin_c || 0) * 10) / 10,
        iron: Math.round((data.iron || 0) * 10) / 10
      }
    }
  } catch (err) {
    console.error('获取今日营养失败', err)
    todayNutrition.value = { 
      calories: 0, 
      protein: 0, 
      fat: 0, 
      carbs: 0, 
      fiber: 0,
      calcium: 0,
      vitaminC: 0,
      iron: 0
    }
  }
}

const viewProfile = (clientId) => {
  // 跳转到被监护人档案页面
  router.push(`/guardian/client/${clientId}`)
}

const goPayment = () => {
  router.push('/guardian/orders?status=unpaid')
}

const goWeeklyReport = () => {
  router.push('/guardian/reports')
}

const goAiReports = () => {
  if (!selectedClient?.value?.id) {
    alert('请先选择守护对象')
    return
  }
  router.push(`/guardian/ai-reports/${selectedClient.value.id}`)
}

const goHealthMonitor = () => {
  if (!selectedClient?.value?.id) {
    alert('请先选择守护对象')
    return
  }
  router.push('/guardian/health-monitor')
}

const goProfile = () => {
  router.push('/guardian/profile')
}

// 监听被监护人变化事件（从 Layout.vue 发出）
const handleClientChanged = (event) => {
  if (event.detail?.client) {
    // 重新加载订单数据和营养数据，确保当前被监护人的数据是最新的
    loadClientOrders()
    loadTodayNutrition(event.detail.client.id)
  }
}

// 监听订单支付成功事件（从 Orders.vue 发出）
const handleOrderPaid = () => {
  // 当订单支付成功后，重新加载订单数据以更新待付金额
  loadClientOrders()
}

onMounted(async () => {
  try {
    const res = await getClients()
    clients.value = res.data.data.clients || []
    
    // 为每个被监护人设置默认数据（如果API未返回）
    clients.value = clients.value.map(client => ({
      ...client,
      relation: client.relation || getDefaultRelation(client.name),
      health_condition: client.health_condition || getDefaultHealthCondition(client.name)
    }))
    
    // 加载订单数据
    await loadClientOrders()
    
    // 如果已有选中的被监护人，加载营养数据
    if (selectedClient?.value?.id) {
      await loadTodayNutrition(selectedClient.value.id)
    }
    
    // 监听被监护人变化事件
    window.addEventListener('guardian-client-changed', handleClientChanged)
    // 监听订单支付成功事件
    window.addEventListener('guardian-order-paid', handleOrderPaid)
  } catch (err) {
    console.error('加载被监护人列表失败', err)
  }
})

onUnmounted(() => {
  window.removeEventListener('guardian-client-changed', handleClientChanged)
  window.removeEventListener('guardian-order-paid', handleOrderPaid)
})

// 监听 Layout 中的 selectedClient 变化
watch(() => selectedClient?.value?.id, async (newId) => {
  if (newId) {
    // 当被监护人切换时，重新加载订单数据和营养数据
    await loadClientOrders()
    await loadTodayNutrition(newId)
  } else {
    // 如果没有选中的被监护人，清空营养数据
    todayNutrition.value = { 
      calories: 0, 
      protein: 0, 
      fat: 0, 
      carbs: 0, 
      fiber: 0,
      calcium: 0,
      vitaminC: 0,
      iron: 0
    }
  }
}, { immediate: true })

// 监听路由变化，当从订单页面返回时刷新数据
let lastRoute = route.path
watch(() => route.path, (newPath, oldPath) => {
  // 如果从订单页面（/guardian/orders）返回到首页（/guardian），刷新数据
  if (oldPath === '/guardian/orders' && newPath === '/guardian') {
    loadClientOrders()
    if (selectedClient?.value?.id) {
      loadTodayNutrition(selectedClient.value.id)
    }
  }
  lastRoute = newPath
})

// 当组件被激活时（用于 keep-alive 场景）
onActivated(() => {
  // 刷新待付金额，确保数据是最新的
  loadClientOrders()
})

// 辅助函数：根据姓名推断关系
const getDefaultRelation = (name) => {
  if (name.includes('奶奶') || name.includes('妈')) return '母亲'
  if (name.includes('爷爷') || name.includes('爸')) return '父亲'
  return '家人'
}

// 辅助函数：根据姓名推断健康状况
const getDefaultHealthCondition = (name) => {
  if (name.includes('奶奶')) return '高血压'
  if (name.includes('爷爷')) return '糖尿病'
  return null
}
</script>

<style scoped>
.home-container {
  padding-bottom: 20px;
}

.welcome-section {
  margin-bottom: 20px;
}

.welcome-header {
  padding: 20px 0 16px;
}

.welcome-title {
  font-size: 24px;
  font-weight: var(--fw-semibold);
  margin: 0 0 8px;
  color: var(--text);
}

.welcome-subtitle {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

.welcome-subtitle strong {
  color: var(--accent-strong);
  font-weight: var(--fw-semibold);
}

.section-header {
  padding: 0 0 14px;
  margin-top: 0;
}

.section-header:not(:first-of-type) {
  margin-top: 28px;
}

.section-title {
  font-size: 18px;
  font-weight: var(--fw-semibold);
  margin: 0;
  color: var(--text);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
}

.guardian-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow);
}

.guardian-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.guardian-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background:
    url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23cbd5e1' stroke-width='6'%3E%3Ccircle cx='40' cy='28' r='14' fill='%23e5e7eb'/%3E%3Cpath d='M20 66c4-10 12-16 20-16s16 6 20 16' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E")
      center/64% no-repeat,
    linear-gradient(135deg, #eef2f7, #e5e7eb);
  flex-shrink: 0;
}

.guardian-info {
  flex: 1;
  min-width: 0;
}

.guardian-name {
  font-size: 18px;
  font-weight: var(--fw-semibold);
  margin: 0 0 4px;
  color: var(--text);
}

.guardian-relation {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

.view-profile-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ghost-bg);
  color: var(--text);
  font-size: 14px;
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.view-profile-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.view-profile-btn:hover {
  background: var(--ghost-bg-hover);
  border-color: var(--accent);
  color: var(--accent-strong);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.view-profile-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.guardian-nutrition {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.nutrition-label {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 14px;
}

.nutri-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin: 10px 0;
}

.nutri-item .muted {
  font-size: 13px;
  color: var(--muted);
}

.nutri-item strong {
  display: block;
  margin-top: 6px;
  font-size: 16px;
  font-weight: var(--fw-semibold);
  color: var(--text);
}


.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
  margin-bottom: 20px;
}

.quick-action-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow);
}

.quick-action-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.1);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon svg {
  width: 24px;
  height: 24px;
}

.payment-icon {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.report-icon {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
}

.health-icon {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #15803d;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: 16px;
  font-weight: var(--fw-semibold);
  margin: 0 0 4px;
  color: var(--text);
}

.action-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

.action-desc .amount {
  color: #ef4444;
  font-weight: var(--fw-semibold);
  font-size: 16px;
}

.action-desc.status-text {
  color: #16a34a;
  font-weight: var(--fw-medium);
}

.action-arrow {
  color: var(--muted);
  flex-shrink: 0;
}

.action-arrow svg {
  width: 20px;
  height: 20px;
}

@media (min-width: 768px) {
  .card-list {
    padding: 0;
  }
  
  .welcome-header {
    padding: 24px 0 18px;
  }
  
  .section-header {
    padding: 0 0 14px;
  }
  
  .quick-actions {
    padding: 0;
  }
}
</style>
