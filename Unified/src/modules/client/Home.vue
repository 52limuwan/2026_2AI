<template>
  <div class="card-list">
    <!-- 简化的健康提示 -->
    <div class="card health-summary" :class="healthStatusClass">
      <div class="health-icon" :class="healthIconClass">{{ healthIcon }}</div>
      <h2>{{ healthSummary }}</h2>
      <p class="muted">{{ healthTipDisplay }}</p>
    </div>

    <!-- 营养对比图表 -->
    <div class="card nutrition-card">
      <h3 class="card-title">今日营养摄入</h3>
      
      <!-- 雷达图 -->
      <div class="radar-container">
        <svg class="radar-chart" viewBox="0 0 500 500">
          <!-- 背景网格 -->
          <g class="radar-grid">
            <!-- 5层同心八边形 -->
            <polygon v-for="level in 5" :key="level"
              :points="getPolygonPoints(250, 250, 200 * (level / 5))"
              fill="none"
              stroke="#e5e7eb"
              stroke-width="1.5"
              opacity="0.5"
            />
            <!-- 从中心到各顶点的线 -->
            <line v-for="(item, index) in nutritionItems" :key="'line-' + index"
              x1="250" y1="250"
              :x2="getRadarPoint(250, 250, 200, index, nutritionItems.length).x"
              :y2="getRadarPoint(250, 250, 200, index, nutritionItems.length).y"
              stroke="#e5e7eb"
              stroke-width="1"
              opacity="0.5"
            />
          </g>
          
          <!-- 推荐范围区域（最大值） -->
          <polygon
            :points="getRadarPolygon(250, 250, 200, nutritionItems, 'max')"
            fill="#1f9c7a"
            fill-opacity="0.08"
            stroke="#1f9c7a"
            stroke-width="2"
            stroke-dasharray="6,4"
          />
          
          <!-- 实际摄入区域 -->
          <polygon
            :points="getRadarPolygon(250, 250, 200, nutritionItems, 'actual')"
            :fill="getOverallColor()"
            fill-opacity="0.25"
            :stroke="getOverallColor()"
            stroke-width="3"
          />
          
          <!-- 实际摄入的点 -->
          <circle v-for="(item, index) in nutritionItems" :key="'point-' + index"
            :cx="getRadarPoint(250, 250, 200, index, nutritionItems.length, parseFloat(item.actual) / item.max).x"
            :cy="getRadarPoint(250, 250, 200, index, nutritionItems.length, parseFloat(item.actual) / item.max).y"
            r="5"
            :fill="getProgressColor(item)"
            stroke="white"
            stroke-width="2"
          />
          
          <!-- 标签 -->
          <g v-for="(item, index) in nutritionItems" :key="'label-' + index" class="radar-label">
            <text
              :x="getRadarPoint(250, 250, 230, index, nutritionItems.length).x"
              :y="getRadarPoint(250, 250, 230, index, nutritionItems.length).y"
              text-anchor="middle"
              dominant-baseline="middle"
              class="label-name"
            >{{ item.name }}</text>
            <text
              :x="getRadarPoint(250, 250, 250, index, nutritionItems.length).x"
              :y="getRadarPoint(250, 250, 250, index, nutritionItems.length).y"
              text-anchor="middle"
              dominant-baseline="middle"
              class="label-value"
              :fill="getProgressColor(item)"
            >{{ formatActualValue(item.actual) }}</text>
          </g>
        </svg>
      </div>
      
      <!-- 图例说明 -->
      <div class="nutrition-legend">
        <div class="legend-item">
          <div class="legend-line legend-recommended"></div>
          <span>推荐范围</span>
        </div>
        <div class="legend-item">
          <div class="legend-line legend-actual" :style="{ background: getOverallColor() }"></div>
          <span>实际摄入</span>
        </div>
      </div>
      
      <!-- 详细数据列表 -->
      <div class="nutrition-details">
        <div v-for="item in nutritionItems" :key="item.name" class="detail-row">
          <span class="detail-name">{{ item.name }}</span>
          <span class="detail-value">
            <strong :style="{ color: getProgressColor(item) }">{{ item.actual }}</strong>
            <span class="detail-unit">{{ item.unit }}</span>
            <span class="detail-range">/ {{ item.recommended }}</span>
          </span>
          <span class="detail-status" :style="{ color: getProgressColor(item) }">
            {{ getStatusText(item) }}
          </span>
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
  fiber: { min: 25, max: 35, unit: 'g' },
  calcium: { min: 800, max: 1200, unit: 'mg' },
  vitaminC: { min: 80, max: 120, unit: 'mg' },
  iron: { min: 12, max: 20, unit: 'mg' }
}

const nutritionItems = computed(() => [
  {
    name: '热量',
    actual: todayNutrition.value.calories,
    recommended: '1500-2500 kcal',
    min: 1500,
    max: 2500,
    unit: 'kcal'
  },
  {
    name: '蛋白质',
    actual: todayNutrition.value.protein.toFixed(1),
    recommended: '60-100 g',
    min: 60,
    max: 100,
    unit: 'g'
  },
  {
    name: '脂肪',
    actual: todayNutrition.value.fat.toFixed(1),
    recommended: '40-70 g',
    min: 40,
    max: 70,
    unit: 'g'
  },
  {
    name: '碳水',
    actual: todayNutrition.value.carbs.toFixed(1),
    recommended: '200-350 g',
    min: 200,
    max: 350,
    unit: 'g'
  },
  {
    name: '膳食纤维',
    actual: todayNutrition.value.fiber.toFixed(1),
    recommended: '25-35 g',
    min: 25,
    max: 35,
    unit: 'g'
  },
  {
    name: '钙',
    actual: todayNutrition.value.calcium.toFixed(1),
    recommended: '800-1200 mg',
    min: 800,
    max: 1200,
    unit: 'mg'
  },
  {
    name: '维生素C',
    actual: todayNutrition.value.vitaminC.toFixed(1),
    recommended: '80-120 mg',
    min: 80,
    max: 120,
    unit: 'mg'
  },
  {
    name: '铁',
    actual: todayNutrition.value.iron.toFixed(1),
    recommended: '12-20 mg',
    min: 12,
    max: 20,
    unit: 'mg'
  }
])

const healthSummary = computed(() => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 4) return '饮食状况良好'
  if (goodCount >= 2) return '饮食需要注意'
  return '饮食需要改善'
})

const healthIcon = computed(() => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 4) return '✓'
  if (goodCount >= 2) return '!'
  return '✕'
})

const healthIconClass = computed(() => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 4) return 'icon-good'
  if (goodCount >= 2) return 'icon-warning'
  return 'icon-bad'
})

const healthStatusClass = computed(() => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 4) return 'status-good'
  if (goodCount >= 2) return 'status-warning'
  return 'status-bad'
})

const recentOrders = computed(() => orders.value.slice(0, 3))

const healthTipDisplay = computed(() => {
  if (orders.value.length === 0) {
    return '暂无订单数据'
  }
  
  // 如果有后端返回的建议，优先使用
  if (healthTip.value) {
    return healthTip.value
  }
  
  // 根据营养摄入情况生成建议
  const items = nutritionItems.value
  const lowItems = items.filter(item => parseFloat(item.actual) < item.min)
  const highItems = items.filter(item => parseFloat(item.actual) > item.max)
  
  if (lowItems.length === 0 && highItems.length === 0) {
    return '营养摄入均衡，继续保持良好的饮食习惯'
  }
  
  const tips = []
  
  if (lowItems.length > 0) {
    const lowNames = lowItems.map(item => item.name).join('、')
    if (lowItems.some(item => item.name === '蛋白质')) {
      tips.push('建议增加鱼肉、鸡蛋、豆制品等优质蛋白')
    }
    if (lowItems.some(item => item.name === '膳食纤维')) {
      tips.push('多吃蔬菜水果和全谷物')
    }
    if (lowItems.some(item => item.name === '热量')) {
      tips.push('适当增加主食和优质蛋白摄入')
    }
  }
  
  if (highItems.length > 0) {
    if (highItems.some(item => item.name === '脂肪')) {
      tips.push('减少油炸食品和高脂肪食物')
    }
    if (highItems.some(item => item.name === '碳水')) {
      tips.push('控制主食和甜食摄入')
    }
    if (highItems.some(item => item.name === '热量')) {
      tips.push('注意控制总热量摄入')
    }
  }
  
  if (tips.length > 0) {
    return tips.join('，')
  }
  
  return '保持低盐饮食，多吃蔬菜水果'
})

const getProgressWidth = (item) => {
  const actual = parseFloat(item.actual)
  const percentage = (actual / item.max) * 100
  return Math.min(percentage, 100)
}

const formatActualValue = (value) => {
  const num = parseFloat(value)
  if (num >= 1000) {
    return Math.round(num)
  }
  return num.toFixed(1)
}

const getUnit = (item) => {
  if (item.name === '热量') return 'kcal'
  return 'g'
}

// 雷达图相关函数
const getRadarPoint = (cx, cy, radius, index, total, ratio = 1) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return {
    x: cx + radius * ratio * Math.cos(angle),
    y: cy + radius * ratio * Math.sin(angle)
  }
}

const getPolygonPoints = (cx, cy, radius) => {
  const points = []
  const count = nutritionItems.value.length
  for (let i = 0; i < count; i++) {
    const point = getRadarPoint(cx, cy, radius, i, count)
    points.push(`${point.x},${point.y}`)
  }
  return points.join(' ')
}

const getRadarPolygon = (cx, cy, radius, items, type) => {
  const points = []
  items.forEach((item, index) => {
    let ratio = 0
    if (type === 'max') {
      ratio = 1 // 推荐最大值就是100%
    } else if (type === 'actual') {
      const actual = parseFloat(item.actual)
      ratio = Math.min(actual / item.max, 1.5) // 最多显示到150%
    }
    const point = getRadarPoint(cx, cy, radius, index, items.length, ratio)
    points.push(`${point.x},${point.y}`)
  })
  return points.join(' ')
}

const getOverallColor = () => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 4) return '#1f9c7a' // 绿色 - 良好
  if (goodCount >= 2) return '#f59e0b' // 橙色 - 一般
  return '#ef4444' // 红色 - 需改善
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
  transition: all 0.3s ease;
}

.health-summary.status-good {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #86efac;
}

.health-summary.status-warning {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 2px solid #fcd34d;
}

.health-summary.status-bad {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #fca5a5;
}

.health-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  font-weight: bold;
  transition: all 0.3s ease;
}

.health-icon.icon-good {
  background: linear-gradient(135deg, #1f9c7a, #16a34a);
  box-shadow: 0 4px 12px rgba(31, 156, 122, 0.3);
}

.health-icon.icon-warning {
  background: linear-gradient(135deg, #f59e0b, #eab308);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.health-icon.icon-bad {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
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

.nutrition-card {
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border);
}

.radar-container {
  margin: 20px auto;
  max-width: 500px;
  width: 100%;
  padding: 20px 0;
}

.radar-chart {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.05));
}

.radar-label .label-name {
  font-size: 13px;
  font-weight: 600;
  fill: var(--text);
}

.radar-label .label-value {
  font-size: 15px;
  font-weight: 700;
}

.nutrition-legend {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 20px 0;
  padding: 14px;
  background: var(--surface-soft);
  border-radius: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.legend-line {
  width: 32px;
  height: 4px;
  border-radius: 2px;
}

.legend-recommended {
  background: #1f9c7a;
  opacity: 0.5;
  border: 1px dashed #1f9c7a;
}

.legend-actual {
  border-radius: 2px;
}

.nutrition-details {
  margin-top: 24px;
  border-top: 2px solid var(--border);
  padding-top: 20px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
  border-bottom: 1px solid var(--surface-soft);
  transition: background 0.2s;
}

.detail-row:hover {
  background: var(--surface-soft);
  border-radius: 6px;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  flex: 0 0 90px;
}

.detail-value {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  text-align: center;
}

.detail-value strong {
  font-size: 17px;
  font-weight: 700;
}

.detail-unit {
  font-size: 12px;
  color: var(--muted);
  margin-left: 2px;
}

.detail-range {
  color: var(--muted);
  margin-left: 6px;
  font-size: 13px;
}

.detail-status {
  font-size: 14px;
  font-weight: 600;
  flex: 0 0 60px;
  text-align: right;
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
