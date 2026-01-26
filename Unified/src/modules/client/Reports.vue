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

      <!-- 热量趋势 -->
      <div class="trend-section">
        <h3 class="section-title">热量趋势</h3>
        <div class="simple-chart">
          <div class="chart-bars">
            <div
              v-for="(v, idx) in monthly.calories || []"
              :key="idx"
              class="chart-bar"
              :style="{ height: barHeight(v, monthly.calories) }"
            >
              <div class="bar-value" v-if="idx % 5 === 0">{{ Math.round(v) }}</div>
            </div>
          </div>
          <div class="chart-axis">
            <span v-for="(d, idx) in monthlyDaysDisplay" :key="idx" class="axis-label">{{ d }}</span>
          </div>
        </div>
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

      <!-- 热量趋势 -->
      <div class="trend-section">
        <h3 class="section-title">热量趋势</h3>
        <div class="simple-chart">
          <div class="chart-bars">
            <div
              v-for="(v, idx) in weekly.calories || []"
              :key="idx"
              class="chart-bar"
              :style="{ height: barHeight(v, weekly.calories) }"
            >
              <div class="bar-value">{{ Math.round(v) }}</div>
            </div>
          </div>
          <div class="chart-axis">
            <span v-for="(d, idx) in weekly.days || []" :key="idx" class="axis-label">{{ d.slice(5) }}</span>
          </div>
        </div>
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
import { ref, onMounted, computed } from 'vue'
import { marked } from 'marked'
import { getWeeklyReport, getMonthlyReport, generateWeeklyAiAnalysis, generateMonthlyAiAnalysis, getAiDietReports } from '../../api/client'
import { useRouter } from 'vue-router'

const router = useRouter()
const weekly = ref(null)
const monthly = ref(null)
const activeTab = ref('weekly')

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
})

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
