<template>
  <!-- 统计卡片 -->
  <div class="stats-grid">
    <div class="stat-card" v-for="item in cards" :key="item.title">
      <div class="stat-label">{{ item.title }}</div>
      <div class="stat-value">{{ item.value }}</div>
      <div class="stat-desc">{{ item.desc }}</div>
    </div>
  </div>

  <!-- 数据可视化区域 -->
  <div class="charts-container">
    <!-- 风险分布饼图 -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>风险等级分布</h3>
        <span class="chart-subtitle">实时监控</span>
      </div>
      <div class="chart-body">
        <div class="pie-chart">
          <svg viewBox="0 0 200 200" class="pie-svg">
            <g transform="rotate(-90 100 100)">
              <circle 
                v-for="(segment, index) in riskPieSegments" 
                :key="index"
                :cx="100" 
                :cy="100" 
                :r="70"
                fill="none"
                :stroke="segment.color"
                :stroke-width="40"
                :stroke-dasharray="`${segment.length} ${440 - segment.length}`"
                :stroke-dashoffset="segment.offset"
                :style="{ transition: 'all 0.6s ease' }"
              />
            </g>
            <text x="100" y="90" text-anchor="middle" class="pie-center-text">总计</text>
            <text x="100" y="118" text-anchor="middle" class="pie-center-value">{{ riskData.total }}</text>
          </svg>
        </div>
        <div class="pie-legend">
          <div v-for="item in riskData.items" :key="item.label" class="legend-item">
            <span class="legend-dot" :style="{ background: item.color }"></span>
            <span class="legend-label">{{ item.label }}</span>
            <span class="legend-value">{{ item.value }}</span>
            <span class="legend-percent">{{ item.percent }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 年龄分布柱状图 -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>年龄段分布</h3>
        <span class="chart-subtitle">按年龄统计</span>
      </div>
      <div class="chart-body">
        <div class="bar-chart">
          <div v-for="item in ageData" :key="item.label" class="bar-item">
            <div class="bar-label">{{ item.label }}</div>
            <div class="bar-track">
              <div 
                class="bar-fill" 
                :style="{ 
                  width: `${item.percent}%`, 
                  background: item.color,
                  transition: 'width 0.8s ease'
                }"
              >
                <span class="bar-value">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 订单趋势折线图 -->
    <div class="chart-card chart-wide">
      <div class="chart-header">
        <h3>近7日订单趋势</h3>
        <span class="chart-subtitle">每日订单量</span>
      </div>
      <div class="chart-body">
        <div class="line-chart">
          <svg viewBox="0 0 700 200" class="line-svg">
            <!-- 网格线 -->
            <line v-for="i in 5" :key="'grid-' + i" 
              :x1="0" :y1="i * 40" :x2="700" :y2="i * 40" 
              stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"
            />
            
            <!-- 折线 -->
            <polyline 
              :points="orderTrendPoints" 
              fill="none" 
              stroke="#3b82f6" 
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            
            <!-- 数据点 -->
            <g v-for="(point, index) in orderTrendData" :key="'point-' + index">
              <circle 
                :cx="point.x" 
                :cy="point.y" 
                r="5" 
                fill="#3b82f6"
                class="chart-point"
              />
              <text 
                :x="point.x" 
                :y="point.y - 15" 
                text-anchor="middle" 
                class="point-label"
              >{{ point.value }}</text>
            </g>
            
            <!-- X轴标签 -->
            <g v-for="(point, index) in orderTrendData" :key="'label-' + index">
              <text 
                :x="point.x" 
                y="195" 
                text-anchor="middle" 
                class="axis-label"
              >{{ point.label }}</text>
            </g>
          </svg>
        </div>
      </div>
    </div>

    <!-- 健康状况统计 -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>健康状况统计</h3>
        <span class="chart-subtitle">常见疾病</span>
      </div>
      <div class="chart-body">
        <div class="health-stats">
          <div v-for="item in healthData" :key="item.label" class="health-item">
            <div class="health-info">
              <span class="health-label">{{ item.label }}</span>
              <span class="health-value">{{ item.value }}人</span>
            </div>
            <div class="health-bar">
              <div 
                class="health-bar-fill" 
                :style="{ 
                  width: `${item.percent}%`,
                  background: item.color,
                  transition: 'width 0.8s ease'
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 饮食偏好统计 -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>饮食偏好统计</h3>
        <span class="chart-subtitle">TOP 6</span>
      </div>
      <div class="chart-body">
        <div class="diet-stats">
          <div v-for="item in dietData" :key="item.label" class="diet-item">
            <div class="diet-label">{{ item.label }}</div>
            <div class="diet-info">
              <div class="diet-bar">
                <div 
                  class="diet-bar-fill" 
                  :style="{ 
                    width: `${item.percent}%`,
                    background: item.color,
                    transition: 'width 0.8s ease'
                  }"
                ></div>
              </div>
            </div>
            <div class="diet-value">{{ item.value }}人</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 活跃度热力图 -->
    <div class="chart-card chart-wide">
      <div class="chart-header">
        <h3>订单活跃度热力图</h3>
        <span class="chart-subtitle">最近4周</span>
      </div>
      <div class="chart-body">
        <div class="heatmap">
          <div class="heatmap-row" v-for="(week, weekIndex) in heatmapData" :key="'week-' + weekIndex">
            <div class="heatmap-label">第{{ weekIndex + 1 }}周</div>
            <div class="heatmap-cells">
              <div 
                v-for="(day, dayIndex) in week" 
                :key="'day-' + dayIndex"
                class="heatmap-cell"
                :style="{ background: getHeatmapColor(day.value) }"
                :title="`${day.label}: ${day.value}单`"
              >
                <span class="heatmap-value">{{ day.value }}</span>
              </div>
            </div>
          </div>
          <div class="heatmap-legend">
            <span class="heatmap-legend-label">订单量：</span>
            <div class="heatmap-legend-scale">
              <div v-for="i in 5" :key="i" 
                class="heatmap-legend-item" 
                :style="{ background: getHeatmapColor(i * 5) }"
              ></div>
            </div>
            <span class="heatmap-legend-text">少 → 多</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSummary, getClients } from '../../api/gov'

const cards = ref([
  { title: '管辖人数', value: 0, desc: '老年人/独居病人' },
  { title: '高风险', value: 0, desc: '高血压/慢病关注' },
  { title: '今日订单', value: 0, desc: '社区今日订单总数' },
  { title: '本月消费', value: '¥0', desc: '社区总消费金额' }
])

// 风险分布数据
const riskData = ref({
  total: 0,
  items: [
    { label: '高风险', value: 0, percent: 0, color: '#ef4444' },
    { label: '中风险', value: 0, percent: 0, color: '#f59e0b' },
    { label: '低风险', value: 0, percent: 0, color: '#3b82f6' },
    { label: '正常', value: 0, percent: 0, color: '#10b981' }
  ]
})

// 计算饼图分段
const riskPieSegments = computed(() => {
  const circumference = 2 * Math.PI * 70 // 2πr
  let currentOffset = 0
  
  return riskData.value.items.map(item => {
    const length = (item.percent / 100) * circumference
    const segment = {
      length,
      offset: currentOffset,
      color: item.color
    }
    currentOffset -= length
    return segment
  })
})

// 年龄分布数据
const ageData = ref([
  { label: '60-65岁', value: 0, percent: 0, color: '#3b82f6' },
  { label: '66-70岁', value: 0, percent: 0, color: '#8b5cf6' },
  { label: '71-75岁', value: 0, percent: 0, color: '#ec4899' },
  { label: '76-80岁', value: 0, percent: 0, color: '#f59e0b' },
  { label: '80岁以上', value: 0, percent: 0, color: '#ef4444' }
])

// 订单趋势数据
const orderTrendData = ref([])
const orderTrendPoints = computed(() => {
  return orderTrendData.value.map(p => `${p.x},${p.y}`).join(' ')
})

// 健康状况数据
const healthData = ref([
  { label: '高血压', value: 0, percent: 0, color: '#ef4444' },
  { label: '糖尿病', value: 0, percent: 0, color: '#f59e0b' },
  { label: '心脏病', value: 0, percent: 0, color: '#ec4899' },
  { label: '关节炎', value: 0, percent: 0, color: '#8b5cf6' },
  { label: '其他慢病', value: 0, percent: 0, color: '#6366f1' }
])

// 饮食偏好数据
const dietData = ref([
  { label: '低盐', value: 0, percent: 0, color: '#3b82f6' },
  { label: '低糖', value: 0, percent: 0, color: '#8b5cf6' },
  { label: '软食', value: 0, percent: 0, color: '#ec4899' },
  { label: '高蛋白', value: 0, percent: 0, color: '#f59e0b' },
  { label: '高纤维', value: 0, percent: 0, color: '#10b981' },
  { label: '素食', value: 0, percent: 0, color: '#06b6d4' }
])

// 热力图数据（4周 x 7天）
const heatmapData = ref([])

const getHeatmapColor = (value) => {
  if (value === 0) return '#f3f4f6'
  if (value <= 5) return '#dbeafe'
  if (value <= 10) return '#93c5fd'
  if (value <= 15) return '#3b82f6'
  return '#1e40af'
}

const loadSummary = async () => {
  try {
    const summary = (await getSummary()).data.data.summary || {}
    
    // 更新卡片数据
    cards.value[0].value = summary.totalClients ?? 0
    cards.value[1].value = summary.highRisk ?? 0
    cards.value[2].value = summary.todayOrders ?? 0
    cards.value[3].value = `¥${(summary.monthlyRevenue ?? 0).toLocaleString()}`
    
    // 更新风险分布
    const total = summary.totalClients || 1
    riskData.value.total = total
    riskData.value.items[0].value = summary.highRisk || 0
    riskData.value.items[1].value = summary.mediumRisk || 0
    riskData.value.items[2].value = summary.lowRisk || 0
    riskData.value.items[3].value = total - (summary.highRisk || 0) - (summary.mediumRisk || 0) - (summary.lowRisk || 0)
    
    riskData.value.items.forEach(item => {
      item.percent = Math.round((item.value / total) * 100)
    })
  } catch (err) {
    console.error('加载统计失败:', err)
  }
}

const loadChartData = async () => {
  try {
    const resp = await getClients({})
    const clients = resp.data.data.clients || []
    
    // 计算年龄分布
    const ageGroups = { '60-65': 0, '66-70': 0, '71-75': 0, '76-80': 0, '80+': 0 }
    const healthConditions = { '高血压': 0, '糖尿病': 0, '心脏病': 0, '关节炎': 0, '其他': 0 }
    const dietPrefs = { '低盐': 0, '低糖': 0, '软食': 0, '高蛋白': 0, '高纤维': 0, '素食': 0 }
    
    clients.forEach(client => {
      // 年龄统计
      const age = client.age || calculateAge(client.id_card)
      if (age >= 60 && age <= 65) ageGroups['60-65']++
      else if (age >= 66 && age <= 70) ageGroups['66-70']++
      else if (age >= 71 && age <= 75) ageGroups['71-75']++
      else if (age >= 76 && age <= 80) ageGroups['76-80']++
      else if (age > 80) ageGroups['80+']++
      
      // 健康状况统计
      const conditions = client.health_conditions || ''
      if (conditions.includes('高血压')) healthConditions['高血压']++
      if (conditions.includes('糖尿病')) healthConditions['糖尿病']++
      if (conditions.includes('心脏病')) healthConditions['心脏病']++
      if (conditions.includes('关节炎')) healthConditions['关节炎']++
      if (conditions && !conditions.includes('高血压') && !conditions.includes('糖尿病') && 
          !conditions.includes('心脏病') && !conditions.includes('关节炎')) {
        healthConditions['其他']++
      }
      
      // 饮食偏好统计
      try {
        const prefs = typeof client.diet_preferences === 'string' ? 
          JSON.parse(client.diet_preferences) : client.diet_preferences
        if (Array.isArray(prefs)) {
          if (prefs.includes('low_salt')) dietPrefs['低盐']++
          if (prefs.includes('low_sugar')) dietPrefs['低糖']++
          if (prefs.includes('soft_food')) dietPrefs['软食']++
          if (prefs.includes('high_protein')) dietPrefs['高蛋白']++
          if (prefs.includes('high_fiber')) dietPrefs['高纤维']++
          if (prefs.includes('vegetarian')) dietPrefs['素食']++
        }
      } catch (e) {}
    })
    
    // 更新年龄分布
    const maxAge = Math.max(...Object.values(ageGroups))
    ageData.value[0].value = ageGroups['60-65']
    ageData.value[1].value = ageGroups['66-70']
    ageData.value[2].value = ageGroups['71-75']
    ageData.value[3].value = ageGroups['76-80']
    ageData.value[4].value = ageGroups['80+']
    ageData.value.forEach(item => {
      item.percent = maxAge > 0 ? Math.round((item.value / maxAge) * 100) : 0
    })
    
    // 更新健康状况
    const maxHealth = Math.max(...Object.values(healthConditions))
    healthData.value[0].value = healthConditions['高血压']
    healthData.value[1].value = healthConditions['糖尿病']
    healthData.value[2].value = healthConditions['心脏病']
    healthData.value[3].value = healthConditions['关节炎']
    healthData.value[4].value = healthConditions['其他']
    healthData.value.forEach(item => {
      item.percent = maxHealth > 0 ? Math.round((item.value / maxHealth) * 100) : 0
    })
    
    // 更新饮食偏好
    const maxDiet = Math.max(...Object.values(dietPrefs))
    dietData.value[0].value = dietPrefs['低盐']
    dietData.value[1].value = dietPrefs['低糖']
    dietData.value[2].value = dietPrefs['软食']
    dietData.value[3].value = dietPrefs['高蛋白']
    dietData.value[4].value = dietPrefs['高纤维']
    dietData.value[5].value = dietPrefs['素食']
    dietData.value.forEach(item => {
      item.percent = maxDiet > 0 ? Math.round((item.value / maxDiet) * 100) : 0
    })
    
    // 生成订单趋势数据（模拟近7天）
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const values = [12, 19, 15, 22, 18, 25, 20] // 模拟数据
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const range = maxValue - minValue || 1
    
    orderTrendData.value = values.map((value, index) => ({
      label: days[index],
      value: value,
      x: 50 + index * 100,
      y: 160 - ((value - minValue) / range) * 120
    }))
    
    // 生成热力图数据（4周 x 7天）
    heatmapData.value = Array.from({ length: 4 }, (_, weekIndex) => {
      return Array.from({ length: 7 }, (_, dayIndex) => ({
        label: days[dayIndex],
        value: Math.floor(Math.random() * 20)
      }))
    })
    
  } catch (err) {
    console.error('加载图表数据失败:', err)
  }
}

const calculateAge = (idCard) => {
  if (!idCard || idCard.length < 14) return null
  const year = parseInt(idCard.substring(6, 10))
  const month = parseInt(idCard.substring(10, 12))
  const day = parseInt(idCard.substring(12, 14))
  const birthDate = new Date(year, month - 1, day)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age > 0 && age < 150 ? age : null
}

onMounted(() => {
  loadSummary()
  loadChartData()
})
</script>

<style scoped>
/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stat-desc {
  font-size: 12px;
  color: #9ca3af;
}

/* 图表容器 */
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.chart-subtitle {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.chart-body {
  min-height: 200px;
}

/* 饼图 */
.pie-chart {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.pie-svg {
  width: 200px;
  height: 200px;
}

.pie-center-text {
  font-size: 14px;
  fill: #6b7280;
  font-weight: 500;
}

.pie-center-value {
  font-size: 24px;
  fill: #111827;
  font-weight: 700;
}

.pie-legend {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: #f9fafb;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 14px;
  color: #374151;
  flex: 1;
}

.legend-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.legend-percent {
  font-size: 12px;
  color: #6b7280;
}

/* 柱状图 */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  min-width: 80px;
}

.bar-track {
  flex: 1;
  height: 32px;
  background: #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  border-radius: 8px;
  position: relative;
}

.bar-value {
  font-size: 13px;
  font-weight: 600;
  color: white;
}

/* 折线图 */
.line-chart {
  padding: 20px 0;
}

.line-svg {
  width: 100%;
  height: auto;
}

.chart-point {
  cursor: pointer;
  transition: r 0.2s;
}

.chart-point:hover {
  r: 7;
}

.point-label {
  font-size: 13px;
  fill: #111827;
  font-weight: 600;
}

.axis-label {
  font-size: 12px;
  fill: #6b7280;
}

/* 健康状况统计 */
.health-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.health-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.health-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.health-bar {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.health-bar-fill {
  height: 100%;
  border-radius: 4px;
}

/* 饮食偏好统计 */
.diet-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.diet-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.diet-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  min-width: 70px;
  flex-shrink: 0;
}

.diet-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.diet-bar {
  flex: 1;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.diet-bar-fill {
  height: 100%;
  border-radius: 4px;
}

.diet-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  min-width: 35px;
  text-align: right;
  flex-shrink: 0;
}

/* 热力图 */
.heatmap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.heatmap-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.heatmap-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  min-width: 60px;
}

.heatmap-cells {
  display: flex;
  gap: 8px;
  flex: 1;
}

.heatmap-cell {
  flex: 1;
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.heatmap-cell:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.heatmap-value {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.heatmap-legend-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.heatmap-legend-scale {
  display: flex;
  gap: 4px;
}

.heatmap-legend-item {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.heatmap-legend-text {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 4px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .chart-wide {
    grid-column: 1;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 20px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .chart-card {
    padding: 16px;
  }
  
  .pie-legend {
    grid-template-columns: 1fr;
  }
  
  .heatmap-label {
    min-width: 50px;
    font-size: 12px;
  }
  
  .heatmap-cells {
    gap: 4px;
  }
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card,
.chart-card {
  animation: fadeIn 0.5s ease-out;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }
</style>
