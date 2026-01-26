<template>
  <div class="card-list">
    <!-- 简化的健康提示 -->
    <div class="card health-summary">
      <div class="health-icon">✓</div>
      <h2>{{ healthSummary }}</h2>
      <p class="muted">{{ healthTipDisplay }}</p>
    </div>

    <!-- 营养对比图表 -->
    <div class="card">
      <div class="muted">今日营养摄入</div>
      <div class="nutrition-comparison">
        <div v-for="item in nutritionItems" :key="item.name" class="nutrition-item">
          <div class="nutrition-header">
            <span class="nutrition-name">{{ item.name }}</span>
            <span class="nutrition-value">{{ item.actual }} / {{ item.recommended }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: getProgressWidth(item) + '%', background: getProgressColor(item) }"></div>
          </div>
          <div class="nutrition-status" :style="{ color: getProgressColor(item) }">
            {{ getStatusText(item) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 最近订单 -->
    <div class="card">
      <div class="muted">最近订单</div>
      <div v-if="recentOrders.length > 0" class="order-list">
        <div v-for="order in recentOrders" :key="order.id" class="order-item">
          <div class="order-header">
            <span class="order-status">{{ statusText(order.status) }}</span>
            <span class="order-date">{{ formatDate(order.created_at) }}</span>
          </div>
          <p class="order-number">订单号 {{ order.order_number }}</p>
        </div>
      </div>
      <p v-else class="muted">暂无订单</p>
      <button class="ghost-btn" @click="goOrders">查看全部订单</button>
    </div>

    <!-- 历史报告 -->
    <div class="card">
      <div class="muted">历史报告</div>
      <p>查看您的历史 AI 饮食分析报告</p>
      <button class="ghost-btn" @click="goAiReports">查看历史报告</button>
    </div>

    <!-- 求助与联系 -->
    <div class="card">
      <div class="muted">求助与联系</div>
      <p>客服电话：{{ contactPhone }}</p>
      <div class="cta-row">
        <button class="primary-btn" @click="copyPhone">复制号码</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRecommendations, getOrders, getWeeklyReport, getTodayNutrition } from '../../api/client'

const router = useRouter()
const recommendations = ref([])
const latestOrder = ref(null)
const orders = ref([])
const weeklyReport = ref(null)
const healthTip = ref('')
const contactPhone = '400-000-0000'
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

// 营养推荐值
const nutritionRecommendations = {
  calories: { min: 1500, max: 2500, unit: 'kcal' },
  protein: { min: 60, max: 100, unit: 'g' },
  fat: { min: 40, max: 70, unit: 'g' },
  carbs: { min: 200, max: 350, unit: 'g' },
  fiber: { min: 25, max: 35, unit: 'g' }
}

const nutritionItems = computed(() => [
  {
    name: '热量',
    actual: todayNutrition.value.calories,
    recommended: '1500-2500 kcal',
    min: 1500,
    max: 2500
  },
  {
    name: '蛋白质',
    actual: todayNutrition.value.protein.toFixed(1),
    recommended: '60-100 g',
    min: 60,
    max: 100
  },
  {
    name: '脂肪',
    actual: todayNutrition.value.fat.toFixed(1),
    recommended: '40-70 g',
    min: 40,
    max: 70
  },
  {
    name: '碳水',
    actual: todayNutrition.value.carbs.toFixed(1),
    recommended: '200-350 g',
    min: 200,
    max: 350
  },
  {
    name: '膳食纤维',
    actual: todayNutrition.value.fiber.toFixed(1),
    recommended: '25-35 g',
    min: 25,
    max: 35
  }
])

const healthSummary = computed(() => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 4) return '本周饮食良好'
  if (goodCount >= 2) return '饮食基本均衡'
  return '需要改善饮食'
})

const recentOrders = computed(() => orders.value.slice(0, 3))
const healthTipDisplay = computed(() => {
  if (orders.value.length === 0) {
    return '暂无订单数据'
  }
  return healthTip.value || '保持低盐饮食，多吃蔬菜水果'
})

const getProgressWidth = (item) => {
  const actual = parseFloat(item.actual)
  const percentage = (actual / item.max) * 100
  return Math.min(percentage, 100)
}

const getProgressColor = (item) => {
  const actual = parseFloat(item.actual)
  if (actual < item.min) return '#f59e0b' // 橙色 - 不足
  if (actual > item.max) return '#ef4444' // 红色 - 过量
  return '#1f9c7a' // 绿色 - 正常
}

const getStatusText = (item) => {
  const actual = parseFloat(item.actual)
  if (actual < item.min) return '偏低'
  if (actual > item.max) return '偏高'
  return '正常'
}

const goMenu = () => router.push('/client/menu')
const goOrders = () => router.push('/client/orders')
const goReports = () => router.push('/client/reports')
const goAiReports = () => router.push('/client/ai-reports')

const statusText = (s) => {
  switch (s) {
    case 'placed':
      return '已下单'
    case 'preparing':
      return '备餐中'
    case 'delivering':
      return '配送中'
    case 'delivered':
      return '已送达'
    case 'cancelled':
      return '已取消'
    default:
      return s
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `今天 ${hours}:${minutes}`
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}-${day}`
  }
}

const copyPhone = async () => {
  try {
    await navigator.clipboard.writeText(contactPhone)
    alert('已复制电话号码')
  } catch (err) {
    alert('复制失败，请手动拨打')
  }
}

const loadRecommendations = async () => {
  const selectedStoreId = localStorage.getItem('selectedStoreId')
  const params = selectedStoreId ? { store_id: selectedStoreId } : {}
  const rec = (await getRecommendations(params)).data.data.recommendations || []
  recommendations.value = rec
}

onMounted(async () => {
  try {
    await loadRecommendations()
    const ordersData = (await getOrders()).data.data.orders || []
    orders.value = ordersData
    latestOrder.value = ordersData[0]
    weeklyReport.value = (await getWeeklyReport()).data.data.report
    healthTip.value = weeklyReport.value?.recommendations || ''
    
    try {
      const res = await getTodayNutrition()
      if (res?.data?.data?.nutrition) {
        const nutrition = res.data.data.nutrition
        todayNutrition.value = {
          calories: nutrition.calories || 0,
          protein: nutrition.protein || 0,
          fat: nutrition.fat || 0,
          carbs: nutrition.carbs || 0,
          fiber: nutrition.fiber || 0,
          calcium: nutrition.calcium || 0,
          vitaminC: nutrition.vitaminC || nutrition.vitamin_c || 0,
          iron: nutrition.iron || 0
        }
      } else if (res?.data?.data) {
        const data = res.data.data
        todayNutrition.value = {
          calories: data.calories || 0,
          protein: data.protein || 0,
          fat: data.fat || 0,
          carbs: data.carbs || 0,
          fiber: data.fiber || 0,
          calcium: data.calcium || 0,
          vitaminC: data.vitaminC || data.vitamin_c || 0,
          iron: data.iron || 0
        }
      }
    } catch (err) {
      console.error('获取今日营养失败', err)
    }
  } catch (err) {
    console.error(err)
  }
  
  window.addEventListener('client-store-changed', loadRecommendations)
})

onUnmounted(() => {
  window.removeEventListener('client-store-changed', loadRecommendations)
})
</script>

<style scoped>
.health-summary {
  text-align: center;
  padding: 24px;
}

.health-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
}

.health-summary h2 {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--text);
}

.nutrition-comparison {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nutrition-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nutrition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nutrition-name {
  font-weight: var(--fw-semibold);
  font-size: 15px;
  color: var(--text);
}

.nutrition-value {
  font-size: 14px;
  color: var(--muted);
}

.progress-bar {
  height: 12px;
  background: var(--surface-soft);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.nutrition-status {
  font-size: 13px;
  font-weight: var(--fw-medium);
  text-align: right;
}

.cta-row {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.order-list {
  margin: 10px 0 14px;
}

.order-item {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 10px;
  background: var(--bg);
  transition: background-color 0.2s;
}

.order-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.order-item:last-child {
  margin-bottom: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-status {
  font-weight: 600;
  font-size: 17px;
  color: var(--text);
}

.order-date {
  font-size: 13px;
  color: var(--muted);
}

.order-number {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}
</style>
