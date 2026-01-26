<template>
  <div class="dashboard-container">
    <!-- 统计卡片 -->
    <div class="card-list">
      <div class="card" v-for="tile in tiles" :key="tile.title">
        <div class="muted">{{ tile.title }}</div>
        <h2>{{ tile.value }}</h2>
        <p class="muted">{{ tile.desc }}</p>
      </div>
    </div>

    <!-- 时间范围选择 -->
    <div class="time-selector">
      <button 
        v-for="range in timeRanges" 
        :key="range.value"
        :class="['time-btn', { active: selectedRange === range.value }]"
        @click="selectedRange = range.value"
      >
        {{ range.label }}
      </button>
    </div>

    <!-- 订单趋势柱状图 -->
    <div class="card chart-card">
      <h3>订单趋势</h3>
      <div class="chart-container">
        <div class="bar-chart">
          <div v-for="(item, index) in chartData" :key="index" class="bar-item">
            <div class="bar-wrapper">
              <div class="bar" :style="{ height: getBarHeight(item.value) + '%' }">
                <span class="bar-value">{{ item.value }}</span>
              </div>
            </div>
            <div class="bar-label">{{ item.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 采购计划雷达图 -->
    <div class="card chart-card">
      <h3>采购计划分析</h3>
      <div class="chart-container">
        <div class="radar-chart">
          <svg viewBox="0 0 300 300" class="radar-svg">
            <!-- 背景网格 -->
            <g class="radar-grid">
              <polygon v-for="level in 5" :key="level" 
                :points="getPolygonPoints(level * 20)" 
                class="grid-line"
              />
            </g>
            <!-- 轴线 -->
            <g class="radar-axes">
              <line v-for="(category, index) in radarCategories" :key="index"
                x1="150" y1="150"
                :x2="getAxisPoint(index).x"
                :y2="getAxisPoint(index).y"
                class="axis-line"
              />
            </g>
            <!-- 数据区域 -->
            <polygon 
              :points="getDataPolygonPoints()" 
              class="data-area"
            />
            <!-- 数据点 -->
            <circle v-for="(category, index) in radarCategories" :key="'point-' + index"
              :cx="getDataPoint(index).x"
              :cy="getDataPoint(index).y"
              r="4"
              class="data-point"
            />
            <!-- 标签 -->
            <text v-for="(category, index) in radarCategories" :key="'label-' + index"
              :x="getLabelPoint(index).x"
              :y="getLabelPoint(index).y"
              class="radar-label"
              text-anchor="middle"
            >
              {{ category.name }}
            </text>
          </svg>
        </div>
        <div class="radar-legend">
          <div v-for="category in radarCategories" :key="category.name" class="legend-item">
            <span class="legend-dot"></span>
            <span>{{ category.name }}: {{ category.value }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getDashboard } from '../../api/merchant'

const tiles = ref([
  { title: '今日订单', value: 0, desc: '实时更新' },
  { title: '配送中', value: 0, desc: '关注准时送达' },
  { title: '已送达', value: 0, desc: '按时完成' },
  { title: '菜品数', value: 0, desc: '在售菜品' }
])

const selectedRange = ref('today')
const timeRanges = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' }
]

// 模拟图表数据（实际应从API获取）
const chartData = computed(() => {
  if (selectedRange.value === 'today') {
    return [
      { label: '8:00', value: 5 },
      { label: '10:00', value: 12 },
      { label: '12:00', value: 28 },
      { label: '14:00', value: 15 },
      { label: '16:00', value: 8 },
      { label: '18:00', value: 22 },
      { label: '20:00', value: 10 }
    ]
  } else if (selectedRange.value === 'week') {
    return [
      { label: '周一', value: 45 },
      { label: '周二', value: 52 },
      { label: '周三', value: 48 },
      { label: '周四', value: 55 },
      { label: '周五', value: 62 },
      { label: '周六', value: 70 },
      { label: '周日', value: 65 }
    ]
  } else {
    return [
      { label: '第1周', value: 280 },
      { label: '第2周', value: 320 },
      { label: '第3周', value: 295 },
      { label: '第4周', value: 340 }
    ]
  }
})

const radarCategories = ref([
  { name: '蔬菜', value: 85 },
  { name: '肉类', value: 70 },
  { name: '主食', value: 90 },
  { name: '水果', value: 65 },
  { name: '调料', value: 75 }
])

const getBarHeight = (value) => {
  const maxValue = Math.max(...chartData.value.map(item => item.value))
  return (value / maxValue) * 100
}

const getPolygonPoints = (radius) => {
  const points = []
  const angleStep = (Math.PI * 2) / radarCategories.value.length
  for (let i = 0; i < radarCategories.value.length; i++) {
    const angle = angleStep * i - Math.PI / 2
    const x = 150 + radius * Math.cos(angle)
    const y = 150 + radius * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

const getAxisPoint = (index) => {
  const angleStep = (Math.PI * 2) / radarCategories.value.length
  const angle = angleStep * index - Math.PI / 2
  return {
    x: 150 + 100 * Math.cos(angle),
    y: 150 + 100 * Math.sin(angle)
  }
}

const getDataPoint = (index) => {
  const angleStep = (Math.PI * 2) / radarCategories.value.length
  const angle = angleStep * index - Math.PI / 2
  const value = radarCategories.value[index].value
  const radius = (value / 100) * 100
  return {
    x: 150 + radius * Math.cos(angle),
    y: 150 + radius * Math.sin(angle)
  }
}

const getLabelPoint = (index) => {
  const angleStep = (Math.PI * 2) / radarCategories.value.length
  const angle = angleStep * index - Math.PI / 2
  const radius = 115
  return {
    x: 150 + radius * Math.cos(angle),
    y: 150 + radius * Math.sin(angle) + 5
  }
}

const getDataPolygonPoints = () => {
  const points = []
  for (let i = 0; i < radarCategories.value.length; i++) {
    const point = getDataPoint(i)
    points.push(`${point.x},${point.y}`)
  }
  return points.join(' ')
}

const loadData = async () => {
  try {
    const response = await getDashboard()
    const stats = response?.data?.data?.stats || {}
    tiles.value = [
      { title: '今日订单', value: stats.totalOrders ?? 0, desc: '订单总量' },
      { title: '配送中', value: stats.delivering ?? 0, desc: '实时配送' },
      { title: '已送达', value: stats.delivered ?? 0, desc: '准时送达' },
      { title: '菜品数', value: stats.dishes ?? 0, desc: '在售菜品' }
    ]
  } catch (error) {
    console.error('加载Dashboard数据失败:', error)
  }
}

const handleStoreChanged = () => {
  loadData()
}

onMounted(() => {
  loadData()
  window.addEventListener('merchant-store-changed', handleStoreChanged)
})

onUnmounted(() => {
  window.removeEventListener('merchant-store-changed', handleStoreChanged)
})
</script>

<style scoped>
.dashboard-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.time-selector {
  display: flex;
  gap: 10px;
  padding: 4px;
  background: var(--card);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.time-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: var(--fw-medium);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
}

.time-btn.active {
  background: var(--accent);
  color: white;
}

.chart-card {
  padding: 20px;
}

.chart-card h3 {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: var(--fw-semibold);
}

.chart-container {
  margin-top: 16px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200px;
  gap: 8px;
  padding: 10px 0;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-wrapper {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  max-width: 40px;
  background: linear-gradient(180deg, var(--accent), var(--accent-strong));
  border-radius: 6px 6px 0 0;
  position: relative;
  transition: all 0.3s ease;
  min-height: 20px;
}

.bar:hover {
  opacity: 0.8;
}

.bar-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: var(--fw-semibold);
  color: var(--text);
}

.bar-label {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

.radar-chart {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.radar-svg {
  width: 100%;
  max-width: 300px;
  height: auto;
}

.grid-line {
  fill: none;
  stroke: var(--border);
  stroke-width: 1;
}

.axis-line {
  stroke: var(--border);
  stroke-width: 1;
}

.data-area {
  fill: var(--accent);
  fill-opacity: 0.3;
  stroke: var(--accent);
  stroke-width: 2;
}

.data-point {
  fill: var(--accent-strong);
}

.radar-label {
  font-size: 12px;
  fill: var(--text);
  font-weight: var(--fw-medium);
}

.radar-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
}

.legend-dot {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
}

@media (max-width: 640px) {
  .bar-chart {
    height: 160px;
  }
  
  .bar-wrapper {
    height: 140px;
  }
}
</style>
