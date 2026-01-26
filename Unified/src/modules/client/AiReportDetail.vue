<template>
  <div class="card-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">报告详情</h2>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 报告内容 -->
    <div v-else-if="report" class="report-detail">
      <!-- 报告信息卡片 -->
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">报告类型</span>
          <span class="report-type-badge" :class="report.report_type">
            {{ report.report_type === 'weekly' ? '周报' : '月报' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">时间范围</span>
          <span class="info-value">{{ formatPeriod(report.period_start, report.period_end) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">生成时间</span>
          <span class="info-value">{{ formatDate(report.created_at) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">AI 模型</span>
          <span class="info-value">{{ report.model_used || 'AI' }}</span>
        </div>
      </div>

      <!-- 营养数据卡片 -->
      <div class="nutrition-card">
        <h3 class="section-title">营养摄入数据</h3>
        <div class="nutrition-grid">
          <div class="nutrition-item">
            <span class="nutrition-label">热量</span>
            <span class="nutrition-value">{{ nutritionData.calories }} kcal</span>
          </div>
          <div class="nutrition-item">
            <span class="nutrition-label">蛋白质</span>
            <span class="nutrition-value">{{ nutritionData.protein }} g</span>
          </div>
          <div class="nutrition-item">
            <span class="nutrition-label">脂肪</span>
            <span class="nutrition-value">{{ nutritionData.fat }} g</span>
          </div>
          <div class="nutrition-item">
            <span class="nutrition-label">碳水</span>
            <span class="nutrition-value">{{ nutritionData.carbs }} g</span>
          </div>
          <div class="nutrition-item">
            <span class="nutrition-label">膳食纤维</span>
            <span class="nutrition-value">{{ nutritionData.fiber }} g</span>
          </div>
          <div class="nutrition-item">
            <span class="nutrition-label">钙</span>
            <span class="nutrition-value">{{ nutritionData.calcium }} mg</span>
          </div>
          <div class="nutrition-item">
            <span class="nutrition-label">维生素C</span>
            <span class="nutrition-value">{{ nutritionData.vitaminC }} mg</span>
          </div>
          <div class="nutrition-item">
            <span class="nutrition-label">铁</span>
            <span class="nutrition-value">{{ nutritionData.iron }} mg</span>
          </div>
        </div>
      </div>

      <!-- AI 分析卡片 -->
      <div class="analysis-card">
        <h3 class="section-title">AI 分析与建议</h3>
        <div class="analysis-content markdown-content" v-html="renderMarkdown(report.ai_analysis)">
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else class="empty-state">
      <p>报告不存在或已被删除</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { marked } from 'marked'
import { useRouter, useRoute } from 'vue-router'
import { getAiDietReportById } from '../../api/client'

const router = useRouter()
const route = useRoute()
const report = ref(null)
const loading = ref(false)

const loadReport = async () => {
  loading.value = true
  try {
    const reportId = route.params.id
    const response = await getAiDietReportById(reportId)
    report.value = response.data.data.report
  } catch (error) {
    console.error('加载报告详情失败:', error)
    report.value = null
  } finally {
    loading.value = false
  }
}

// 渲染 Markdown
const renderMarkdown = (text) => {
  if (!text) return ''
  return marked(text, { breaks: true })
}

onMounted(() => {
  loadReport()
})

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPeriod = (start, end) => {
  return `${start} 至 ${end}`
}

const nutritionData = computed(() => {
  if (!report.value || !report.value.nutrition_data) {
    return {
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
  const data = report.value.nutrition_data
  return {
    calories: Math.round(data.calories || 0),
    protein: Math.round((data.protein || 0) * 10) / 10,
    fat: Math.round((data.fat || 0) * 10) / 10,
    carbs: Math.round((data.carbs || 0) * 10) / 10,
    fiber: Math.round((data.fiber || 0) * 10) / 10,
    calcium: Math.round((data.calcium || 0) * 10) / 10,
    vitaminC: Math.round((data.vitaminC || 0) * 10) / 10,
    iron: Math.round((data.iron || 0) * 10) / 10
  }
})
</script>

<style scoped>
.page-header {
  padding: 20px 0 16px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: var(--fw-semibold);
  color: var(--text);
  margin: 0;
}

.report-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  box-shadow: var(--shadow);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--fs-body);
  color: var(--muted);
  font-weight: var(--fw-medium);
}

.info-value {
  font-size: var(--fs-body);
  color: var(--text);
  font-weight: var(--fw-medium);
}

.report-type-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: var(--fs-secondary);
  font-weight: var(--fw-semibold);
}

.report-type-badge.weekly {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.report-type-badge.monthly {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.nutrition-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  box-shadow: var(--shadow);
}

.section-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-semibold);
  color: var(--text);
  margin: 0 0 16px 0;
}

.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.nutrition-item {
  display: flex;
  flex-direction: column;
  padding: 14px;
  background: var(--ghost-bg);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.nutrition-label {
  font-size: var(--fs-body);
  color: var(--muted);
  font-weight: var(--fw-medium);
  margin-bottom: 6px;
}

.nutrition-value {
  font-size: var(--fs-title);
  color: var(--text);
  font-weight: var(--fw-semibold);
}

.analysis-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  box-shadow: var(--shadow);
}

.analysis-content {
  background: var(--ghost-bg);
  border-radius: 10px;
  padding: 18px;
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
  background: var(--card);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background: var(--card);
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

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--ghost-bg);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: var(--fs-body);
  color: var(--muted);
}

.empty-state {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 60px 20px;
  text-align: center;
  box-shadow: var(--shadow);
}

.empty-state p {
  font-size: var(--fs-body);
  color: var(--muted);
  margin: 0;
}
</style>
