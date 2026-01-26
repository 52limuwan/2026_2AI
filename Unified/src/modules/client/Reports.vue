<template>
  <div class="card-list">
    <!-- 周报/月报切换器 -->
    <div class="report-header">
      <div class="tab-switcher">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'weekly' }"
          @click="activeTab = 'weekly'"
        >
          本周报告
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'monthly' }"
          @click="activeTab = 'monthly'"
        >
          本月报告
        </button>
      </div>
    </div>

    <!-- 本月健康报告 -->
    <div class="report-content" v-if="monthly && activeTab === 'monthly'">

      <!-- 营养均衡度 -->
      <div class="nutrition-balance">
        <h3 class="section-title">本月营养摄入</h3>
        <div class="balance-grid">
          <div class="balance-item" v-for="item in monthlyNutritionItems" :key="item.name">
            <div class="balance-header">
              <span class="balance-name">{{ item.name }}</span>
              <span class="balance-value">{{ item.value }} {{ item.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 综合营养评分 -->
      <div class="score-section">
        <h3 class="section-title">综合营养评分</h3>
        <div class="score-display">
          <div class="score-circle">
            <svg viewBox="0 0 200 200" class="score-svg">
              <circle cx="100" cy="100" r="85" class="score-bg-circle" />
              <circle 
                cx="100" 
                cy="100" 
                r="85" 
                class="score-progress-circle"
                :style="{ strokeDashoffset: monthlyScoreOffset }"
              />
            </svg>
            <div class="score-content">
              <div class="score-number">{{ monthlyScore.total }}</div>
              <div class="score-label">{{ monthlyScore.level }}</div>
            </div>
          </div>
          <div class="score-breakdown">
            <div class="breakdown-item" v-for="item in monthlyScore.breakdown" :key="item.name">
              <div class="breakdown-header">
                <span class="breakdown-name">{{ item.name }}</span>
                <span class="breakdown-score">{{ item.score }}/{{ item.max }}</span>
              </div>
              <div class="breakdown-bar">
                <div 
                  class="breakdown-fill" 
                  :style="{ width: (item.score / item.max * 100) + '%', background: item.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 营养雷达图 -->
      <div class="chart-section">
        <h3 class="section-title">营养均衡分析</h3>
        <div ref="monthlyRadarChart" class="echarts-container"></div>
      </div>

      <!-- 热量趋势 -->
      <div class="chart-section">
        <h3 class="section-title">热量趋势</h3>
        <div ref="monthlyLineChart" class="echarts-container"></div>
      </div>

      <!-- AI 分析 -->
      <div class="ai-card">
        <h3 class="section-title">AI 饮食分析与优化建议</h3>
        <button 
          v-if="!monthlyAiAnalysis && !monthlyAiLoading" 
          class="ai-btn" 
          @click="generateMonthlyAiAnalysisHandler"
        >
          获取健康建议
        </button>
        
        <div v-if="monthlyAiLoading" class="ai-loading">
          <div class="thinking-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
          <p>思考中...</p>
        </div>
        
        <div v-if="monthlyAiAnalysis" class="ai-result markdown-content" :class="{ 'fade-in': monthlyAiAnalysis }" v-html="renderMarkdown(monthlyAiAnalysis)">
        </div>
      </div>
    </div>

    <!-- 本周健康报告 -->
    <div class="report-content" v-if="weekly && activeTab === 'weekly'">

      <!-- 营养均衡度 -->
      <div class="nutrition-balance">
        <h3 class="section-title">本周营养摄入</h3>
        <div class="balance-grid">
          <div class="balance-item" v-for="item in weeklyNutritionItems" :key="item.name">
            <div class="balance-header">
              <span class="balance-name">{{ item.name }}</span>
              <span class="balance-value">{{ item.value }} {{ item.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 综合营养评分 -->
      <div class="score-section">
        <h3 class="section-title">综合营养评分</h3>
        <div class="score-display">
          <div class="score-circle">
            <svg viewBox="0 0 200 200" class="score-svg">
              <circle cx="100" cy="100" r="85" class="score-bg-circle" />
              <circle 
                cx="100" 
                cy="100" 
                r="85" 
                class="score-progress-circle"
                :style="{ strokeDashoffset: weeklyScoreOffset }"
              />
            </svg>
            <div class="score-content">
              <div class="score-number">{{ weeklyScore.total }}</div>
              <div class="score-label">{{ weeklyScore.level }}</div>
            </div>
          </div>
          <div class="score-breakdown">
            <div class="breakdown-item" v-for="item in weeklyScore.breakdown" :key="item.name">
              <div class="breakdown-header">
                <span class="breakdown-name">{{ item.name }}</span>
                <span class="breakdown-score">{{ item.score }}/{{ item.max }}</span>
              </div>
              <div class="breakdown-bar">
                <div 
                  class="breakdown-fill" 
                  :style="{ width: (item.score / item.max * 100) + '%', background: item.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 营养雷达图 -->
      <div class="chart-section">
        <h3 class="section-title">营养均衡分析</h3>
        <div ref="weeklyRadarChart" class="echarts-container"></div>
      </div>

      <!-- 热量趋势 -->
      <div class="chart-section">
        <h3 class="section-title">热量趋势</h3>
        <div ref="weeklyLineChart" class="echarts-container"></div>
      </div>

      <!-- AI 分析 -->
      <div class="ai-card">
        <h3 class="section-title">AI 饮食分析与优化建议</h3>
        <button 
          v-if="!weeklyAiAnalysis && !weeklyAiLoading" 
          class="ai-btn" 
          @click="generateWeeklyAiAnalysisHandler"
        >
          获取健康建议
        </button>
        
        <div v-if="weeklyAiLoading" class="ai-loading">
          <div class="thinking-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
          <p>思考中...</p>
        </div>
        
        <div v-if="weeklyAiAnalysis" class="ai-result markdown-content" :class="{ 'fade-in': weeklyAiAnalysis }" v-html="renderMarkdown(weeklyAiAnalysis)">
        </div>
      </div>
    </div>

    <div class="card empty-state" v-if="(activeTab === 'weekly' && !weekly) || (activeTab === 'monthly' && !monthly)">
      <p>暂无报告数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { marked } from 'marked'
import * as echarts from 'echarts'
import { getWeeklyReport, getMonthlyReport, generateWeeklyAiAnalysis, generateMonthlyAiAnalysis, getAiDietReports } from '../../api/client'
import { useRouter } from 'vue-router'

const router = useRouter()
const weekly = ref(null)
const monthly = ref(null)
const activeTab = ref('weekly')

// 图表 refs
const weeklyRadarChart = ref(null)
const weeklyLineChart = ref(null)
const monthlyRadarChart = ref(null)
const monthlyLineChart = ref(null)

// 图表实例
let weeklyRadarInstance = null
let weeklyLineInstance = null
let monthlyRadarInstance = null
let monthlyLineInstance = null

// AI分析相关状态
const weeklyAiAnalysis = ref('')
const weeklyAiLoading = ref(false)
const monthlyAiAnalysis = ref('')
const monthlyAiLoading = ref(false)

const loadReports = async () => {
  try {
    weekly.value = (await getWeeklyReport()).data.data.report
  } catch (err) {
    console.error('加载周报失败', err)
    weekly.value = null
  }
  
  try {
    monthly.value = (await getMonthlyReport()).data.data.report
  } catch (err) {
    console.error('加载月报失败', err)
    monthly.value = null
  }
}

onMounted(async () => {
  await loadReports()
  await nextTick()
  initCharts()
})

// 监听 activeTab 变化，重新渲染图表
watch(activeTab, async () => {
  await nextTick()
  initCharts()
})

// 监听数据变化，重新渲染图表
watch([weekly, monthly], async () => {
  await nextTick()
  initCharts()
})

// 初始化图表
const initCharts = () => {
  if (activeTab.value === 'weekly' && weekly.value) {
    initWeeklyCharts()
  } else if (activeTab.value === 'monthly' && monthly.value) {
    initMonthlyCharts()
  }
}

// 初始化周报图表
const initWeeklyCharts = () => {
  if (weeklyRadarChart.value) {
    if (!weeklyRadarInstance) {
      weeklyRadarInstance = echarts.init(weeklyRadarChart.value)
    }
    weeklyRadarInstance.setOption(getWeeklyRadarOption())
  }
  
  if (weeklyLineChart.value) {
    if (!weeklyLineInstance) {
      weeklyLineInstance = echarts.init(weeklyLineChart.value)
    }
    weeklyLineInstance.setOption(getWeeklyLineOption())
  }
}

// 初始化月报图表
const initMonthlyCharts = () => {
  if (monthlyRadarChart.value) {
    if (!monthlyRadarInstance) {
      monthlyRadarInstance = echarts.init(monthlyRadarChart.value)
    }
    monthlyRadarInstance.setOption(getMonthlyRadarOption())
  }
  
  if (monthlyLineChart.value) {
    if (!monthlyLineInstance) {
      monthlyLineInstance = echarts.init(monthlyLineChart.value)
    }
    monthlyLineInstance.setOption(getMonthlyLineOption())
  }
}

// 周报雷达图配置
const getWeeklyRadarOption = () => {
  const data = weeklyData.value
  return {
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator: [
        { name: '热量', min: 0, max: 16000, scale: false },
        { name: '蛋白质', min: 0, max: 600, scale: false },
        { name: '脂肪', min: 0, max: 600, scale: false },
        { name: '碳水', min: 0, max: 2400, scale: false },
        { name: '膳食纤维', min: 0, max: 240, scale: false },
        { name: '钙', min: 0, max: 8000, scale: false }
      ],
      radius: '60%',
      splitNumber: 5,
      scale: false,
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          data.totalCalories,
          data.totalProtein,
          data.totalFat,
          data.totalCarbs,
          data.totalFiber,
          data.totalCalcium
        ],
        name: '本周营养摄入',
        areaStyle: {
          color: 'rgba(31, 156, 122, 0.3)'
        },
        lineStyle: {
          color: '#1f9c7a'
        },
        itemStyle: {
          color: '#1f9c7a'
        }
      }]
    }]
  }
}

// 周报折线图配置
const getWeeklyLineOption = () => {
  return {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: (weekly.value.days || []).map(d => d.slice(5)),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '热量 (kcal)'
    },
    series: [{
      name: '热量',
      type: 'line',
      data: weekly.value.calories || [],
      smooth: true,
      lineStyle: {
        color: '#1f9c7a',
        width: 3
      },
      itemStyle: {
        color: '#1f9c7a'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(31, 156, 122, 0.3)' },
          { offset: 1, color: 'rgba(31, 156, 122, 0.05)' }
        ])
      }
    }]
  }
}

// 月报雷达图配置
const getMonthlyRadarOption = () => {
  const data = monthlyData.value
  return {
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator: [
        { name: '热量', min: 0, max: 64000, scale: false },
        { name: '蛋白质', min: 0, max: 2400, scale: false },
        { name: '脂肪', min: 0, max: 2400, scale: false },
        { name: '碳水', min: 0, max: 9600, scale: false },
        { name: '膳食纤维', min: 0, max: 960, scale: false },
        { name: '钙', min: 0, max: 32000, scale: false }
      ],
      radius: '60%',
      splitNumber: 5,
      scale: false,
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          data.totalCalories,
          data.totalProtein,
          data.totalFat,
          data.totalCarbs,
          data.totalFiber,
          data.totalCalcium
        ],
        name: '本月营养摄入',
        areaStyle: {
          color: 'rgba(31, 156, 122, 0.3)'
        },
        lineStyle: {
          color: '#1f9c7a'
        },
        itemStyle: {
          color: '#1f9c7a'
        }
      }]
    }]
  }
}

// 月报折线图配置
const getMonthlyLineOption = () => {
  const days = monthly.value.days || []
  const displayIndices = [0, 5, 10, 15, 20, 25, 29].filter(i => i < days.length)
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: displayIndices.map(i => days[i]?.slice(5) || ''),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '热量 (kcal)'
    },
    series: [{
      name: '热量',
      type: 'line',
      data: displayIndices.map(i => monthly.value.calories[i]),
      smooth: true,
      lineStyle: {
        color: '#1f9c7a',
        width: 3
      },
      itemStyle: {
        color: '#1f9c7a'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(31, 156, 122, 0.3)' },
          { offset: 1, color: 'rgba(31, 156, 122, 0.05)' }
        ])
      }
    }]
  }
}

const barHeight = (v, arr) => {
  const max = Math.max(...arr, 1)
  return `${Math.max((v / max) * 100, 5)}%`
}

// 周报营养项目
const weeklyNutritionItems = computed(() => {
  if (!weekly.value) return []
  return [
    { name: '热量', value: weeklyData.value.totalCalories, unit: 'kcal' },
    { name: '蛋白质', value: weeklyData.value.totalProtein, unit: 'g' },
    { name: '脂肪', value: weeklyData.value.totalFat, unit: 'g' },
    { name: '碳水', value: weeklyData.value.totalCarbs, unit: 'g' },
    { name: '膳食纤维', value: weeklyData.value.totalFiber, unit: 'g' },
    { name: '钙', value: weeklyData.value.totalCalcium, unit: 'mg' },
    { name: '维生素C', value: weeklyData.value.totalVitaminC, unit: 'mg' },
    { name: '铁', value: weeklyData.value.totalIron, unit: 'mg' }
  ]
})

// 月报营养项目
const monthlyNutritionItems = computed(() => {
  if (!monthly.value) return []
  return [
    { name: '热量', value: monthlyData.value.totalCalories, unit: 'kcal' },
    { name: '蛋白质', value: monthlyData.value.totalProtein, unit: 'g' },
    { name: '脂肪', value: monthlyData.value.totalFat, unit: 'g' },
    { name: '碳水', value: monthlyData.value.totalCarbs, unit: 'g' },
    { name: '膳食纤维', value: monthlyData.value.totalFiber, unit: 'g' },
    { name: '钙', value: monthlyData.value.totalCalcium, unit: 'mg' },
    { name: '维生素C', value: monthlyData.value.totalVitaminC, unit: 'mg' },
    { name: '铁', value: monthlyData.value.totalIron, unit: 'mg' }
  ]
})

// 月度数据计算
const monthlyData = computed(() => {
  if (!monthly.value) {
    return {
      diversity: 0,
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      totalFiber: 0,
      totalCalcium: 0,
      totalVitaminC: 0,
      totalIron: 0,
      insight: '',
      achievements: [],
      aiAnalysis: ''
    }
  }
  const summary = monthly.value.summary || {}
  
  return {
    diversity: monthly.value.diversity ?? 0,
    totalCalories: Math.round(summary.calories || 0),
    totalProtein: Math.round((summary.protein || 0) * 10) / 10,
    totalFat: Math.round((summary.fat || 0) * 10) / 10,
    totalCarbs: Math.round((summary.carbs || 0) * 10) / 10,
    totalFiber: Math.round((summary.fiber || 0) * 10) / 10,
    totalCalcium: Math.round((summary.calcium || 0) * 10) / 10,
    totalVitaminC: Math.round((summary.vitaminC || 0) * 10) / 10,
    totalIron: Math.round((summary.iron || 0) * 10) / 10,
    insight: monthly.value.insight || '',
    achievements: monthly.value.achievements || [],
    aiAnalysis: monthly.value.ai_analysis || ''
  }
})

// 周度数据计算
const weeklyData = computed(() => {
  if (!weekly.value) {
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      totalFiber: 0,
      totalCalcium: 0,
      totalVitaminC: 0,
      totalIron: 0,
      insight: '',
      diversity: 0,
      recommendations: [],
      achievements: []
    }
  }
  const summary = weekly.value.summary || {}
  
  return {
    totalCalories: Math.round(summary.calories || 0),
    totalProtein: Math.round((summary.protein || 0) * 10) / 10,
    totalFat: Math.round((summary.fat || 0) * 10) / 10,
    totalCarbs: Math.round((summary.carbs || 0) * 10) / 10,
    totalFiber: Math.round((summary.fiber || 0) * 10) / 10,
    totalCalcium: Math.round((summary.calcium || 0) * 10) / 10,
    totalVitaminC: Math.round((summary.vitaminC || 0) * 10) / 10,
    totalIron: Math.round((summary.iron || 0) * 10) / 10,
    insight: weekly.value.insight || '',
    diversity: weekly.value.diversity ?? 0,
    recommendations: weekly.value.recommendations || [],
    achievements: weekly.value.achievements || []
  }
})

const monthlyDaysDisplay = computed(() => {
  if (!monthly.value || !monthly.value.days) return []
  const days = monthly.value.days || []
  const displayIndices = [0, 5, 10, 15, 20, 25, 29].filter(i => i < days.length)
  return displayIndices.map(i => {
    const dateStr = days[i]
    if (!dateStr) return ''
    return dateStr.slice(5)
  })
})

// ==================== 综合营养评分算法 ====================

/**
 * 计算营养评分
 * 评分维度：
 * 1. 热量适宜度 (25分) - 每日热量是否在推荐范围内
 * 2. 营养均衡度 (25分) - 蛋白质、脂肪、碳水比例是否合理
 * 3. 微量元素 (20分) - 钙、铁、维生素C等是否充足
 * 4. 膳食纤维 (15分) - 膳食纤维摄入是否达标
 * 5. 饮食规律性 (15分) - 每日热量波动是否稳定
 */
const calculateNutritionScore = (data, days = 7) => {
  const summary = data.summary || {}
  const calories = data.calories || []
  
  // 推荐标准（每日）
  const dailyRecommended = {
    calories: { min: 1800, max: 2400, optimal: 2100 },
    protein: { min: 50, max: 80, optimal: 65 },
    fat: { min: 40, max: 70, optimal: 55 },
    carbs: { min: 200, max: 350, optimal: 275 },
    fiber: { min: 20, max: 35, optimal: 25 },
    calcium: { min: 800, max: 1200, optimal: 1000 },
    vitaminC: { min: 80, max: 120, optimal: 100 },
    iron: { min: 12, max: 20, optimal: 15 }
  }
  
  // 计算每日平均值
  const avgCalories = (summary.calories || 0) / days
  const avgProtein = (summary.protein || 0) / days
  const avgFat = (summary.fat || 0) / days
  const avgCarbs = (summary.carbs || 0) / days
  const avgFiber = (summary.fiber || 0) / days
  const avgCalcium = (summary.calcium || 0) / days
  const avgVitaminC = (summary.vitaminC || 0) / days
  const avgIron = (summary.iron || 0) / days
  
  // 1. 热量适宜度评分 (25分)
  const calorieScore = calculateRangeScore(avgCalories, dailyRecommended.calories, 25)
  
  // 2. 营养均衡度评分 (25分)
  const proteinScore = calculateRangeScore(avgProtein, dailyRecommended.protein, 8)
  const fatScore = calculateRangeScore(avgFat, dailyRecommended.fat, 8)
  const carbsScore = calculateRangeScore(avgCarbs, dailyRecommended.carbs, 9)
  const balanceScore = proteinScore + fatScore + carbsScore
  
  // 3. 微量元素评分 (20分)
  const calciumScore = calculateRangeScore(avgCalcium, dailyRecommended.calcium, 7)
  const vitaminCScore = calculateRangeScore(avgVitaminC, dailyRecommended.vitaminC, 7)
  const ironScore = calculateRangeScore(avgIron, dailyRecommended.iron, 6)
  const micronutrientScore = calciumScore + vitaminCScore + ironScore
  
  // 4. 膳食纤维评分 (15分)
  const fiberScore = calculateRangeScore(avgFiber, dailyRecommended.fiber, 15)
  
  // 5. 饮食规律性评分 (15分)
  const regularityScore = calculateRegularityScore(calories, 15)
  
  // 总分
  const totalScore = Math.round(calorieScore + balanceScore + micronutrientScore + fiberScore + regularityScore)
  
  // 评级
  let level = '优秀'
  let levelColor = '#22c55e'
  if (totalScore < 60) {
    level = '需改善'
    levelColor = '#ef4444'
  } else if (totalScore < 75) {
    level = '良好'
    levelColor = '#f59e0b'
  } else if (totalScore < 90) {
    level = '优良'
    levelColor = '#10b981'
  }
  
  return {
    total: totalScore,
    level,
    levelColor,
    breakdown: [
      { name: '热量适宜度', score: Math.round(calorieScore), max: 25, color: '#3b82f6' },
      { name: '营养均衡度', score: Math.round(balanceScore), max: 25, color: '#8b5cf6' },
      { name: '微量元素', score: Math.round(micronutrientScore), max: 20, color: '#ec4899' },
      { name: '膳食纤维', score: Math.round(fiberScore), max: 15, color: '#f59e0b' },
      { name: '饮食规律性', score: Math.round(regularityScore), max: 15, color: '#10b981' }
    ]
  }
}

/**
 * 计算范围评分
 * 在最优值附近得满分，偏离越多扣分越多
 */
const calculateRangeScore = (value, range, maxScore) => {
  const { min, max, optimal } = range
  
  if (value >= optimal * 0.95 && value <= optimal * 1.05) {
    // 在最优值±5%范围内，满分
    return maxScore
  } else if (value >= min && value <= max) {
    // 在推荐范围内，根据偏离程度打分
    const deviation = Math.abs(value - optimal) / optimal
    return maxScore * (1 - deviation * 0.5)
  } else if (value < min) {
    // 低于最小值
    const ratio = value / min
    return maxScore * ratio * 0.6
  } else {
    // 高于最大值
    const ratio = max / value
    return maxScore * ratio * 0.6
  }
}

/**
 * 计算饮食规律性评分
 * 基于每日热量的标准差，波动越小分数越高
 */
const calculateRegularityScore = (calories, maxScore) => {
  if (!calories || calories.length === 0) return 0
  
  const avg = calories.reduce((sum, val) => sum + val, 0) / calories.length
  const variance = calories.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / calories.length
  const stdDev = Math.sqrt(variance)
  
  // 标准差越小，规律性越好
  // 标准差在200以内为满分，每增加100扣20%
  const deviationRatio = stdDev / 200
  const score = maxScore * Math.max(0, 1 - deviationRatio * 0.2)
  
  return score
}

// 周报评分
const weeklyScore = computed(() => {
  if (!weekly.value) {
    return {
      total: 0,
      level: '暂无数据',
      levelColor: '#9ca3af',
      breakdown: []
    }
  }
  return calculateNutritionScore(weekly.value, 7)
})

// 月报评分
const monthlyScore = computed(() => {
  if (!monthly.value) {
    return {
      total: 0,
      level: '暂无数据',
      levelColor: '#9ca3af',
      breakdown: []
    }
  }
  return calculateNutritionScore(monthly.value, 30)
})

// 周报评分圆环偏移量
const weeklyScoreOffset = computed(() => {
  const circumference = 2 * Math.PI * 85
  const progress = weeklyScore.value.total / 100
  return circumference * (1 - progress)
})

// 月报评分圆环偏移量
const monthlyScoreOffset = computed(() => {
  const circumference = 2 * Math.PI * 85
  const progress = monthlyScore.value.total / 100
  return circumference * (1 - progress)
})

// 生成周报AI分析
const generateWeeklyAiAnalysisHandler = async () => {
  weeklyAiLoading.value = true
  weeklyAiAnalysis.value = ''
  
  try {
    const response = await generateWeeklyAiAnalysis()
    const analysis = response.data.data.analysis
    
    // 思考完成，等待一小段时间后开始显示结果
    await new Promise(resolve => setTimeout(resolve, 300))
    weeklyAiLoading.value = false
    
    // 等待 DOM 更新后开始流式输出
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 流式输出效果
    for (let i = 0; i < analysis.length; i++) {
      weeklyAiAnalysis.value += analysis[i]
      await new Promise(resolve => setTimeout(resolve, 15))
    }
  } catch (error) {
    console.error('生成周报AI分析失败:', error)
    weeklyAiLoading.value = false
    await new Promise(resolve => setTimeout(resolve, 50))
    weeklyAiAnalysis.value = '生成分析失败，请稍后重试。'
  }
}

// 生成月报AI分析
const generateMonthlyAiAnalysisHandler = async () => {
  monthlyAiLoading.value = true
  monthlyAiAnalysis.value = ''
  
  try {
    const response = await generateMonthlyAiAnalysis()
    const analysis = response.data.data.analysis
    
    // 思考完成，等待一小段时间后开始显示结果
    await new Promise(resolve => setTimeout(resolve, 300))
    monthlyAiLoading.value = false
    
    // 等待 DOM 更新后开始流式输出
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 流式输出效果
    for (let i = 0; i < analysis.length; i++) {
      monthlyAiAnalysis.value += analysis[i]
      await new Promise(resolve => setTimeout(resolve, 15))
    }
  } catch (error) {
    console.error('生成月报AI分析失败:', error)
    monthlyAiLoading.value = false
    await new Promise(resolve => setTimeout(resolve, 50))
    monthlyAiAnalysis.value = '生成分析失败，请稍后重试。'
  }
}

// 渲染 Markdown
const renderMarkdown = (text) => {
  if (!text) return ''
  return marked(text, { breaks: true })
}

// 查看历史报告
const viewHistoryReports = () => {
  router.push('/client/ai-reports')
}
</script>


<style scoped>
/* 头部 - 统一间距 */
.report-header {
  margin-bottom: 8px;
}

.tab-switcher {
  display: flex;
  gap: 12px;
  background: var(--card);
  padding: 6px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: var(--fs-body);
  font-weight: var(--fw-medium);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--ghost-bg);
  color: var(--text);
}

.tab-btn.active {
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: white;
  font-weight: var(--fw-semibold);
  box-shadow: 0 4px 12px rgba(31, 156, 122, 0.3);
}

/* 报告内容 - 使用 card-list */
.report-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 营养均衡度 - 统一卡片样式 */
.nutrition-balance {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow);
}

.section-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-semibold);
  color: var(--text);
  margin: 0 0 8px 0;
}

.balance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.balance-item {
  padding: 10px;
  background: var(--ghost-bg);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.balance-name {
  font-size: 13px;
  font-weight: var(--fw-medium);
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.balance-value {
  font-size: 15px;
  font-weight: var(--fw-semibold);
  color: var(--text);
  white-space: nowrap;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 图表区域 - 统一卡片样式 */
.chart-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow);
}

.echarts-container {
  width: 100%;
  height: 300px;
  margin-top: 8px;
}

/* 评分区域 */
.score-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow);
}

.score-display {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  align-items: center;
}

.score-circle {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}

.score-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-bg-circle {
  fill: none;
  stroke: var(--ghost-bg);
  stroke-width: 12;
}

.score-progress-circle {
  fill: none;
  stroke: url(#scoreGradient);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-dasharray: 534.07;
  transition: stroke-dashoffset 1s ease;
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-number {
  font-size: 42px;
  font-weight: var(--fw-bold);
  color: var(--text);
  line-height: 1;
  background: linear-gradient(135deg, #1f9c7a, #22c55e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.score-label {
  font-size: 14px;
  font-weight: var(--fw-medium);
  color: var(--muted);
  margin-top: 4px;
}

.score-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breakdown-name {
  font-size: 13px;
  font-weight: var(--fw-medium);
  color: var(--text);
}

.breakdown-score {
  font-size: 13px;
  font-weight: var(--fw-semibold);
  color: var(--muted);
}

.breakdown-bar {
  height: 8px;
  background: var(--ghost-bg);
  border-radius: 4px;
  overflow: hidden;
}

.breakdown-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
}

/* 趋势图 - 统一卡片样式 */
.trend-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow);
}

.simple-chart {
  margin-top: 8px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 160px;
  padding: 14px 0;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #22c55e, var(--accent-strong));
  border-radius: 6px 6px 0 0;
  min-height: 6px;
  position: relative;
  transition: all 0.3s ease;
}

.chart-bar:hover {
  opacity: 0.8;
  transform: scaleY(1.02);
}

.bar-value {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: var(--fw-semibold);
  color: var(--text);
  white-space: nowrap;
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 2px;
}

.axis-label {
  font-size: var(--fs-secondary);
  color: var(--muted);
}

/* 建议卡片 - 统一样式 */
.suggestions-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  box-shadow: var(--shadow);
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  padding: 14px;
  background: var(--ghost-bg);
  border-radius: 10px;
  border-left: 3px solid var(--accent-strong);
}

.suggestion-text {
  flex: 1;
  font-size: var(--fs-body);
  line-height: var(--lh-base);
  color: var(--text);
}

/* AI 卡片 - 统一样式 */
.ai-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow);
}

.ai-btn {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--fs-button);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  margin-top: 8px;
}

.ai-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 156, 122, 0.3);
}

.ai-loading {
  text-align: center;
  padding: 28px;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinking-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 0 auto 14px;
}

.thinking-dots .dot {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  animation: thinking 1.4s ease-in-out infinite;
}

.thinking-dots .dot:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  30% {
    transform: scale(1.3);
    opacity: 1;
  }
}

.ai-loading p {
  font-size: var(--fs-body);
  color: var(--muted);
}

.ai-result {
  background: var(--ghost-bg);
  border-radius: 10px;
  padding: 12px;
  margin-top: 8px;
  opacity: 0;
  transform: translateY(10px) scale(0.98);
  transition: none;
}

.ai-result.fade-in {
  animation: resultFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes resultFadeIn {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Markdown 内容样式 */
.markdown-content {
  font-size: var(--fs-body);
  line-height: var(--lh-base);
  color: var(--text);
}

.markdown-content p {
  margin: 0 0 12px 0;
}

.markdown-content p:last-child {
  margin-bottom: 0;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4 {
  margin: 16px 0 10px 0;
  font-weight: var(--fw-semibold);
  color: var(--text);
}

.markdown-content h1 {
  font-size: 20px;
}

.markdown-content h2 {
  font-size: 18px;
}

.markdown-content h3 {
  font-size: 16px;
}

.markdown-content h4 {
  font-size: 15px;
}

.markdown-content ul,
.markdown-content ol {
  margin: 8px 0;
  padding-left: 24px;
}

.markdown-content li {
  margin: 6px 0;
}

.markdown-content strong {
  font-weight: var(--fw-semibold);
  color: var(--text);
}

.markdown-content em {
  font-style: italic;
}

.markdown-content code {
  background: var(--ghost-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background: var(--ghost-bg);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-content pre code {
  background: none;
  padding: 0;
}

.markdown-content blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 14px;
  margin: 12px 0;
  color: var(--muted);
}

/* 空状态 - 统一样式 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-state p {
  font-size: var(--fs-body);
  color: var(--muted);
  margin: 0;
}

/* 暗黑模式 */
[data-theme='dark'] .suggestion-item {
  background: var(--ghost-bg);
}

[data-theme='dark'] .ai-result {
  background: var(--ghost-bg);
}

[data-theme='dark'] .loading-spinner {
  border-color: var(--ghost-bg);
  border-top-color: var(--accent);
}
</style>
