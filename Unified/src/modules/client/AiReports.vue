<template>
  <div class="card-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">历史 AI 报告</h2>
    </div>

    <!-- 筛选器 -->
    <div class="filter-card">
      <div class="filter-tabs">
        <button 
          class="filter-tab" 
          :class="{ active: filterType === 'all' }"
          @click="filterType = 'all'; loadReports()"
        >
          全部
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: filterType === 'weekly' }"
          @click="filterType = 'weekly'; loadReports()"
        >
          周报
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: filterType === 'monthly' }"
          @click="filterType = 'monthly'; loadReports()"
        >
          月报
        </button>
      </div>
    </div>

    <!-- 报告列表 -->
    <div v-if="reports.length > 0" class="reports-list">
      <div 
        v-for="report in reports" 
        :key="report.id" 
        class="report-card"
        @click="viewReportDetail(report.id)"
      >
        <div class="report-header">
          <span class="report-type-badge" :class="report.report_type">
            {{ report.report_type === 'weekly' ? '周报' : '月报' }}
          </span>
          <span class="report-date">{{ formatDate(report.created_at) }}</span>
        </div>
        <div class="report-period">
          {{ formatPeriod(report.period_start, report.period_end) }}
        </div>
        <div class="report-preview">
          {{ truncateText(report.ai_analysis, 100) }}
        </div>
        <div class="report-footer">
          <span class="report-model">{{ report.model_used || 'AI' }}</span>
          <span class="view-detail">查看详情 →</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <p>暂无历史报告</p>
      <p class="empty-hint">生成周报或月报后，报告将保存在这里</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAiDietReports } from '../../api/client'

const router = useRouter()
const reports = ref([])
const loading = ref(false)
const filterType = ref('all')

const loadReports = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterType.value !== 'all') {
      params.report_type = filterType.value
    }
    const response = await getAiDietReports(params)
    reports.value = response.data.data.reports || []
  } catch (error) {
    console.error('加载历史报告失败:', error)
    reports.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReports()
})

const viewReportDetail = (id) => {
  router.push(`/client/ai-reports/${id}`)
}

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

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
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

.filter-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow);
  margin-bottom: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-size: var(--fs-body);
  font-weight: var(--fw-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  background: var(--ghost-bg);
  color: var(--text);
}

.filter-tab.active {
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: white;
  border-color: transparent;
  font-weight: var(--fw-semibold);
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: all 0.2s ease;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  border-color: var(--accent);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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

.report-date {
  font-size: var(--fs-secondary);
  color: var(--muted);
}

.report-period {
  font-size: var(--fs-body);
  color: var(--text);
  margin-bottom: 10px;
  font-weight: var(--fw-medium);
}

.report-preview {
  font-size: var(--fs-body);
  color: var(--muted);
  line-height: var(--lh-base);
  margin-bottom: 12px;
}

.report-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.report-model {
  font-size: var(--fs-secondary);
  color: var(--muted);
  font-weight: var(--fw-medium);
}

.view-detail {
  font-size: var(--fs-body);
  color: var(--accent);
  font-weight: var(--fw-medium);
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
  margin: 8px 0;
}

.empty-hint {
  font-size: var(--fs-secondary);
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
</style>
