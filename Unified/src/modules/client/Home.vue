<template>
  <div class="card-list">
    <!-- 简化的健康提示 -->
    <div v-if="healthScore === null" class="card health-summary-empty">
      <h3 class="empty-title">今日还未订餐</h3>
      <p class="empty-desc">开始订餐后，我们将为您分析饮食健康</p>
    </div>
    <div v-else class="card health-summary" :style="healthCardStyle">
      <div class="health-left">
        <div class="health-score" :style="{ color: getHealthColor(healthScore) }">
          {{ healthScore }}
        </div>
      </div>
      <div class="health-right">
        <h3>{{ healthSummary }}</h3>
        <p class="health-tip">{{ healthTipDisplay }}</p>
      </div>
    </div>

    <!-- 营养对比图表 -->
    <div class="card nutrition-card">
      <div class="nutrition-header">
        <h3 class="card-title">今日营养摄入</h3>
      </div>
      
      <!-- 折线图 -->
      <div class="line-chart-wrapper">
        <svg class="line-chart-svg" viewBox="0 0 100 60" preserveAspectRatio="none">
          <defs>
            <!-- 渐变填充 -->
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" :style="{ stopColor: getOverallColor(), stopOpacity: 0.3 }" />
              <stop offset="100%" :style="{ stopColor: getOverallColor(), stopOpacity: 0.05 }" />
            </linearGradient>
          </defs>
          
          <!-- 网格线 -->
          <g class="grid-lines">
            <line x1="0" y1="15" x2="100" y2="15" stroke="#e5e7eb" stroke-width="0.2" opacity="0.5" />
            <line x1="0" y1="27.5" x2="100" y2="27.5" stroke="#e5e7eb" stroke-width="0.2" opacity="0.5" />
            <line x1="0" y1="40" x2="100" y2="40" stroke="#e5e7eb" stroke-width="0.2" opacity="0.5" />
            <line x1="0" y1="52.5" x2="100" y2="52.5" stroke="#e5e7eb" stroke-width="0.2" opacity="0.5" />
          </g>
          
          <!-- 推荐范围区域（从底部0到推荐上限max） -->
          <g v-for="(item, index) in nutritionItems" :key="'range-' + index">
            <rect 
              v-if="index < nutritionItems.length - 1"
              :x="getXPosition(index)" 
              :y="getYPositionForValue(item, item.max)" 
              :width="getXPosition(index + 1) - getXPosition(index)" 
              :height="60 - getYPositionForValue(item, item.max)" 
              fill="#10b981" 
              opacity="0.12" 
            />
          </g>
          
          <!-- 推荐上限线（虚线） -->
          <path
            :d="getRecommendedMaxPath()"
            fill="none"
            stroke="#10b981"
            stroke-width="0.6"
            stroke-dasharray="3,2"
            opacity="0.8"
          />
          
          <!-- 折线填充区域 -->
          <path
            :d="getAreaPath()"
            fill="url(#areaGradient)"
          />
          
          <!-- 折线 -->
          <path
            :d="getLinePath()"
            fill="none"
            :stroke="getOverallColor()"
            stroke-width="0.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          
          <!-- 数据点 -->
          <g v-for="(item, index) in nutritionItems" :key="'point-' + index">
            <circle
              :cx="getXPosition(index)"
              :cy="getYPosition(item)"
              r="1.5"
              :fill="getProgressColor(item)"
              stroke="white"
              stroke-width="0.5"
            />
            <!-- 超出标记 -->
            <g v-if="isOverLimit(item)">
              <circle
                :cx="getXPosition(index)"
                :cy="getYPosition(item)"
                r="2.5"
                fill="none"
                :stroke="getProgressColor(item)"
                stroke-width="0.4"
                opacity="0.6"
              />
              <text
                :x="getXPosition(index)"
                :y="getYPosition(item) - 3"
                text-anchor="middle"
                class="overflow-marker"
                :fill="getProgressColor(item)"
              >↑</text>
            </g>
          </g>
        </svg>
        
        <!-- X轴标签 -->
        <div class="chart-x-labels">
          <div v-for="(item, index) in nutritionItems" :key="'label-' + index" 
            class="x-label"
            :style="{ left: getXPosition(index) + '%' }">
            <span class="x-label-name">{{ item.name }}</span>
            <span class="x-label-value" :style="{ color: getProgressColor(item) }">
              {{ formatActualValue(item.actual) }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 图例 -->
      <div class="chart-legend">
        <div class="legend-item-simple">
          <div class="legend-box legend-recommended"></div>
          <span>推荐范围</span>
        </div>
        <div class="legend-item-simple">
          <svg width="24" height="12">
            <line x1="0" y1="6" x2="24" y2="6" :stroke="getOverallColor()" stroke-width="2" />
          </svg>
          <span>实际摄入</span>
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

// 健康评分算法（100分制）
const healthScore = computed(() => {
  // 检查今日是否有营养数据（即今日是否有订单）
  const hasData = todayNutrition.value.calories > 0 || 
                  todayNutrition.value.protein > 0 || 
                  todayNutrition.value.fat > 0 || 
                  todayNutrition.value.carbs > 0
  
  // 如果今日没有营养数据，返回 null 表示无评分
  if (!hasData) {
    return null
  }
  
  const items = nutritionItems.value
  let totalScore = 100
  
  items.forEach(item => {
    const actual = parseFloat(item.actual)
    const min = item.min
    const max = item.max
    const mid = (min + max) / 2
    
    // 如果在推荐范围内，不扣分
    if (actual >= min && actual <= max) {
      return
    }
    
    // 如果低于最小值
    if (actual < min) {
      const deficit = min - actual
      const deficitRatio = deficit / min
      
      // 根据不足程度扣分：不足越多扣分越多
      // 不足50%以上：扣15分
      // 不足30-50%：扣10分
      // 不足10-30%：扣5分
      // 不足10%以下：扣2分
      if (deficitRatio > 0.5) {
        totalScore -= 15
      } else if (deficitRatio > 0.3) {
        totalScore -= 10
      } else if (deficitRatio > 0.1) {
        totalScore -= 5
      } else {
        totalScore -= 2
      }
    }
    
    // 如果高于最大值
    if (actual > max) {
      const excess = actual - max
      const excessRatio = excess / max
      
      // 根据超标程度扣分：超标越多扣分越多
      // 超标100%以上：扣20分
      // 超标50-100%：扣15分
      // 超标20-50%：扣8分
      // 超标20%以下：扣3分
      if (excessRatio > 1.0) {
        totalScore -= 20
      } else if (excessRatio > 0.5) {
        totalScore -= 15
      } else if (excessRatio > 0.2) {
        totalScore -= 8
      } else {
        totalScore -= 3
      }
    }
  })
  
  // 确保分数在0-100之间
  return Math.max(0, Math.min(100, Math.round(totalScore)))
})

const healthSummary = computed(() => {
  const score = healthScore.value
  
  // 根据分数返回评价
  if (score >= 90) return '饮食状况优秀'
  if (score >= 80) return '饮食状况良好'
  if (score >= 70) return '饮食状况一般'
  if (score >= 60) return '饮食需要注意'
  return '饮食需要改善'
})

// 根据分数计算渐变色（绿到红）
const getHealthColor = (score) => {
  if (score === null) return '#9ca3af' // 灰色表示无数据
  
  // 使用HSL色彩空间实现平滑渐变
  // 绿色(120) -> 黄色(60) -> 红色(0)
  // 分数越高越绿，分数越低越红
  const hue = (score / 100) * 120 // 0-120度
  return `hsl(${hue}, 70%, 50%)`
}

const healthCardStyle = computed(() => {
  const score = healthScore.value
  
  if (score === null) {
    return {
      background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
      border: '2px solid #e5e7eb',
      color: '#9ca3af'
    }
  }
  
  // 根据分数生成渐变背景
  const hue = (score / 100) * 120
  const lightBg = `hsl(${hue}, 50%, 98%)`
  const darkBg = `hsl(${hue}, 45%, 96%)`
  const borderColor = `hsl(${hue}, 50%, 80%)`
  const accentColor = getHealthColor(score)
  
  return {
    background: `linear-gradient(135deg, ${lightBg} 0%, ${darkBg} 100%)`,
    border: `2px solid ${borderColor}`,
    color: accentColor
  }
})

const healthBadgeStyle = computed(() => {
  const score = healthScore.value
  if (score === null) return {}
  
  const hue = (score / 100) * 120
  const bgColor = `hsl(${hue}, 60%, 95%)`
  const textColor = `hsl(${hue}, 70%, 40%)`
  
  return {
    backgroundColor: bgColor,
    color: textColor
  }
})

const getScoreLevel = () => {
  const score = healthScore.value
  if (score === null) return ''
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

const recentOrders = computed(() => orders.value.slice(0, 3))

const healthTipDisplay = computed(() => {
  const score = healthScore.value
  
  // 如果有后端返回的建议，优先使用
  if (healthTip.value) {
    return healthTip.value
  }
  
  // 根据分数生成建议
  if (score >= 90) {
    return '营养摄入非常均衡，各项指标都在理想范围内，继续保持'
  }
  
  if (score >= 80) {
    return '营养摄入良好，大部分指标达标，稍作调整会更完美'
  }
  
  // 找出最需要改善的2-3项
  const items = nutritionItems.value
  const lowItems = items.filter(item => parseFloat(item.actual) < item.min)
    .sort((a, b) => {
      const aDeficit = (a.min - parseFloat(a.actual)) / a.min
      const bDeficit = (b.min - parseFloat(b.actual)) / b.min
      return bDeficit - aDeficit
    })
  
  const highItems = items.filter(item => parseFloat(item.actual) > item.max)
    .sort((a, b) => {
      const aExcess = (parseFloat(a.actual) - a.max) / a.max
      const bExcess = (parseFloat(b.actual) - b.max) / b.max
      return bExcess - aExcess
    })
  
  const tips = []
  
  // 优先提示超标问题
  if (highItems.length > 0) {
    const item = highItems[0]
    if (item.name === '脂肪') tips.push('减少油炸食品和高脂肪食物')
    else if (item.name === '碳水') tips.push('控制主食和甜食摄入')
    else if (item.name === '热量') tips.push('注意控制总热量摄入')
  }
  
  // 再提示不足问题
  if (lowItems.length > 0 && tips.length < 2) {
    const item = lowItems[0]
    if (item.name === '蛋白质') tips.push('增加鱼肉、鸡蛋、豆制品等优质蛋白')
    else if (item.name === '膳食纤维') tips.push('多吃蔬菜水果和全谷物')
    else if (item.name === '钙') tips.push('增加奶制品和豆制品摄入')
    else if (item.name === '维生素C') tips.push('多吃新鲜蔬菜和水果')
    else if (item.name === '铁') tips.push('适量食用红肉或深色蔬菜')
    else if (item.name === '热量') tips.push('适当增加主食摄入')
  }
  
  // 如果还有空间，再加一个
  if (lowItems.length > 1 && tips.length < 2) {
    const item = lowItems[1]
    if (item.name === '蛋白质') tips.push('增加优质蛋白')
    else if (item.name === '膳食纤维') tips.push('增加膳食纤维')
    else if (item.name === '钙') tips.push('补充钙质')
    else if (item.name === '维生素C') tips.push('补充维生素C')
  }
  
  if (tips.length > 0) {
    return '建议：' + tips.join('，')
  }
  
  return '保持均衡饮食，注意营养搭配'
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

// 折线图相关函数
const getXPosition = (index) => {
  const count = nutritionItems.value.length
  // 不留边距，直接从0到100
  return (index / (count - 1)) * 100
}

const getYPosition = (item) => {
  const actual = parseFloat(item.actual)
  const percentage = (actual / item.max) * 100
  // 限制在150%以内
  const cappedPercentage = Math.min(percentage, 150)
  
  // Y轴映射：0%在底部(60)，100%在中间(30)，150%在顶部(15)
  // 0-100%: 60 -> 30
  // 100-150%: 30 -> 15
  if (cappedPercentage <= 100) {
    return 60 - (cappedPercentage / 100) * 30
  } else {
    const overPercentage = cappedPercentage - 100
    return 30 - (overPercentage / 50) * 15
  }
}

const getYPositionForValue = (item, value) => {
  // 根据具体数值计算Y位置
  const percentage = (value / item.max) * 100
  const cappedPercentage = Math.min(percentage, 150)
  
  if (cappedPercentage <= 100) {
    return 60 - (cappedPercentage / 100) * 30
  } else {
    const overPercentage = cappedPercentage - 100
    return 30 - (overPercentage / 50) * 15
  }
}

const getRecommendedMaxPath = () => {
  const items = nutritionItems.value
  if (items.length === 0) return ''
  
  let path = `M ${getXPosition(0)} ${getYPositionForValue(items[0], items[0].max)}`
  
  for (let i = 1; i < items.length; i++) {
    const x = getXPosition(i)
    const y = getYPositionForValue(items[i], items[i].max)
    path += ` L ${x} ${y}`
  }
  
  return path
}

const getLinePath = () => {
  const items = nutritionItems.value
  if (items.length === 0) return ''
  
  let path = `M ${getXPosition(0)} ${getYPosition(items[0])}`
  
  for (let i = 1; i < items.length; i++) {
    const x = getXPosition(i)
    const y = getYPosition(items[i])
    path += ` L ${x} ${y}`
  }
  
  return path
}

const getAreaPath = () => {
  const items = nutritionItems.value
  if (items.length === 0) return ''
  
  let path = `M ${getXPosition(0)} ${getYPosition(items[0])}`
  
  for (let i = 1; i < items.length; i++) {
    const x = getXPosition(i)
    const y = getYPosition(items[i])
    path += ` L ${x} ${y}`
  }
  
  // 闭合路径到底部（图表底部边框）
  path += ` L ${getXPosition(items.length - 1)} 60 L ${getXPosition(0)} 60 Z`
  
  return path
}

const isOverLimit = (item) => {
  const actual = parseFloat(item.actual)
  const percentage = (actual / item.max) * 100
  // 判断是否超过150%阈值
  return percentage > 150
}

const getOverallStatusClass = () => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 6) return 'status-excellent'
  if (goodCount >= 4) return 'status-good'
  if (goodCount >= 2) return 'status-warning'
  return 'status-poor'
}

const getOverallStatusIcon = () => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 6) return '★'
  if (goodCount >= 4) return '✓'
  if (goodCount >= 2) return '!'
  return '✕'
}

const getOverallStatusText = () => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  if (goodCount >= 6) return '营养摄入优秀'
  if (goodCount >= 4) return '营养摄入良好'
  if (goodCount >= 2) return '营养需要调整'
  return '营养严重失衡'
}

const getBalancePercentage = () => {
  const items = nutritionItems.value
  const goodCount = items.filter(item => {
    const actual = parseFloat(item.actual)
    return actual >= item.min && actual <= item.max
  }).length
  
  return Math.round((goodCount / items.length) * 100)
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
/* 空状态 - Apple/Google 风格 */
.health-summary-empty {
  text-align: center;
  padding: 40px 24px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 8px 0;
  letter-spacing: -0.01em;
}

.empty-desc {
  font-size: 15px;
  color: #86868b;
  margin: 0;
  line-height: 1.5;
  font-weight: 400;
}

/* 有数据状态 */
.health-summary {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  transition: all 0.3s ease;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.health-summary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.05;
  background: radial-gradient(circle at top right, currentColor 0%, transparent 70%);
  pointer-events: none;
}

.health-left {
  flex-shrink: 0;
}

.health-score {
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
  transition: color 0.3s ease;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.health-right {
  flex: 1;
  min-width: 0;
}

.health-right h3 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px 0;
}

.health-tip {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}

.nutrition-comparison {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nutrition-card {
  background: white;
  border: 1px solid #e5e7eb;
}

.nutrition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.line-chart-wrapper {
  position: relative;
  margin: 20px 0;
}

.line-chart-svg {
  width: 100%;
  height: 200px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%);
}

.overflow-marker {
  font-size: 4px;
  font-weight: bold;
}

.chart-x-labels {
  position: relative;
  margin-top: 12px;
  height: 50px;
}

.x-label {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.x-label-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.x-label-value {
  font-size: 13px;
  font-weight: 700;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin: 16px 0;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.legend-item-simple {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
}

.legend-box {
  width: 20px;
  height: 12px;
  border-radius: 2px;
}

.legend-recommended {
  background: #10b981;
  opacity: 0.15;
  border: 1px solid #10b981;
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
