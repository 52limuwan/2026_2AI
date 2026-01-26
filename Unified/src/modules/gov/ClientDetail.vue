<template>
  <div v-if="client">
    <!-- 返回按钮 -->
    <div class="back-header">
      <button class="ghost-btn" @click="goBack">← 返回列表</button>
    </div>

    <div class="card-list">
      <!-- 基本信息 -->
      <div class="card">
        <div class="card-header">
          <h3>{{ client.user.name }}</h3>
          <span class="chip" :class="getRiskClass(client.user.risk_flags)">
            {{ getRiskLabel(client.user.risk_flags) }}
          </span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="muted">性别</span>
            <strong>{{ client.user.gender || '未填写' }}</strong>
          </div>
          <div class="info-item">
            <span class="muted">年龄</span>
            <strong>{{ client.user.age || '未知' }}岁</strong>
          </div>
          <div class="info-item">
            <span class="muted">手机号</span>
            <strong>{{ client.user.phone }}</strong>
          </div>
          <div class="info-item">
            <span class="muted">身份证</span>
            <strong>{{ maskIdCard(client.user.id_card) }}</strong>
          </div>
          <div class="info-item full-width">
            <span class="muted">居住地址</span>
            <strong>{{ maskAddress(client.user.address) }}</strong>
          </div>
          <div class="info-item">
            <span class="muted">长者模式</span>
            <strong>{{ client.user.elder_mode ? '已开启' : '未开启' }}</strong>
          </div>
          <div class="info-item">
            <span class="muted">饮食多样性</span>
            <strong>近7天尝试 {{ client.dishDiversity }} 种菜品</strong>
          </div>
        </div>
      </div>

      <!-- 健康状况 -->
      <div class="card">
        <div class="muted">健康状况</div>
        <div class="info-grid" style="margin-top: 10px;">
          <div class="info-item full-width">
            <span class="muted">身体情况</span>
            <strong>{{ client.user.health_conditions || '无' }}</strong>
          </div>
          <div class="info-item full-width">
            <span class="muted">饮食偏好</span>
            <strong>{{ formatDietPreferences(client.user.diet_preferences) || '未记录' }}</strong>
          </div>
          <div class="info-item full-width">
            <span class="muted">风险标记</span>
            <strong>{{ client.user.risk_flags || '无' }}</strong>
          </div>
        </div>
      </div>

      <!-- 监护人信息 -->
      <div class="card" v-if="client.guardians && client.guardians.length > 0">
        <div class="muted">监护人信息</div>
        <div class="guardian-list">
          <div class="guardian-item" v-for="g in client.guardians" :key="g.id">
            <div class="info-grid compact">
              <div class="info-item">
                <span class="muted">姓名</span>
                <strong>{{ g.name }}</strong>
              </div>
              <div class="info-item">
                <span class="muted">关系</span>
                <strong>{{ g.relation }}</strong>
              </div>
              <div class="info-item">
                <span class="muted">手机号</span>
                <strong>{{ g.phone }}</strong>
              </div>
              <div class="info-item">
                <span class="muted">身份证</span>
                <strong>{{ maskIdCard(g.bind_id_card) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 营养摄入统计 -->
      <div class="card">
        <div class="muted">近7天营养摄入统计</div>
        <div class="nutri-grid">
          <div class="nutri-item">
            <span class="muted">热量</span>
            <strong>{{ client.avgNutrition.calories.toFixed(0) }} kcal</strong>
          </div>
          <div class="nutri-item">
            <span class="muted">蛋白质</span>
            <strong>{{ client.avgNutrition.protein.toFixed(1) }} g</strong>
          </div>
          <div class="nutri-item">
            <span class="muted">脂肪</span>
            <strong>{{ client.avgNutrition.fat.toFixed(1) }} g</strong>
          </div>
          <div class="nutri-item">
            <span class="muted">碳水</span>
            <strong>{{ client.avgNutrition.carbs.toFixed(1) }} g</strong>
          </div>
          <div class="nutri-item">
            <span class="muted">膳食纤维</span>
            <strong>{{ client.avgNutrition.fiber.toFixed(1) }} g</strong>
          </div>
        </div>
      </div>

      <!-- 最近订单 -->
      <div class="card">
        <div class="muted">最近订单</div>
        <div class="order-list" v-if="client.recentOrders && client.recentOrders.length > 0">
          <div class="order-item" v-for="order in client.recentOrders" :key="order.id">
            <div class="order-header">
              <span class="order-status">{{ getOrderStatusText(order.status) }}</span>
              <span class="order-date">{{ formatDateTime(order.created_at) }}</span>
            </div>
            <p class="order-number">订单号 {{ order.id }}</p>
            <p class="order-amount">¥{{ order.total_amount }}</p>
            <div class="order-items" v-if="order.items && order.items.length > 0">
              <span class="item-tag" v-for="item in order.items" :key="item.id">
                {{ item.dish_name }} × {{ item.quantity }}
              </span>
            </div>
          </div>
        </div>
        <p v-else class="muted" style="text-align: center; padding: 20px 0;">暂无订单记录</p>
      </div>

      <!-- 风险事件 -->
      <div class="card" v-if="client.riskEvents && client.riskEvents.length > 0">
        <div class="muted">风险事件记录</div>
        <div class="risk-list">
          <div class="risk-item" v-for="event in client.riskEvents" :key="event.id">
            <div class="risk-header">
              <span class="risk-name">{{ event.rule_name || '人工干预' }}</span>
              <span class="chip" :class="'severity-' + event.severity">
                {{ getSeverityText(event.severity) }}
              </span>
            </div>
            <p class="muted" style="margin: 6px 0 0;">{{ formatDateTime(event.triggered_at) }} · {{ getEventStatusText(event.status) }}</p>
            <p v-if="event.data_snapshot" class="risk-detail">{{ getRiskDescription(event) }}</p>
            <div v-if="event.status === 'open'" style="margin-top: 10px;">
              <button 
                class="primary-btn" 
                style="padding: 6px 16px; font-size: 13px;"
                @click="handleRiskEvent(event.id)"
                :disabled="processingRisk[event.id]"
              >
                {{ processingRisk[event.id] ? '处理中...' : '已处理' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="card-list">
    <p class="muted" style="text-align: center; padding: 40px 0;">加载中...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '../../api/http'

const route = useRoute()
const router = useRouter()
const client = ref(null)
const processingRisk = ref({})

const loadClientDetail = async () => {
  try {
    const clientId = route.params.id
    const resp = await http.get(`/gov/clients/${clientId}`)
    client.value = resp.data.data.client
  } catch (err) {
    console.error('加载客户详情失败:', err)
    alert('加载失败')
  }
}

const handleRiskEvent = async (eventId) => {
  if (processingRisk.value[eventId]) return
  
  try {
    processingRisk.value[eventId] = true
    await http.patch(`/gov/risk-events/${eventId}/resolve`)
    alert('风险事件已标记为已处理')
    // 重新加载数据
    await loadClientDetail()
  } catch (err) {
    console.error('处理风险事件失败:', err)
    alert('处理失败：' + (err.response?.data?.message || '未知错误'))
  } finally {
    processingRisk.value[eventId] = false
  }
}

const getRiskDescription = (event) => {
  if (!event.data_snapshot) return ''
  
  const data = event.data_snapshot
  
  // 营养摄入不足
  if (event.rule_name?.includes('营养摄入不足') || data.reason === '摄入不足') {
    return `今日摄入热量仅 ${Math.round(data.calories || 0)} 卡路里，低于正常范围（1500-2500卡路里）`
  }
  
  // 营养摄入过量
  if (event.rule_name?.includes('营养摄入过量') || data.reason === '摄入过量') {
    return `今日摄入热量达 ${Math.round(data.calories || 0)} 卡路里，超过正常范围（1500-2500卡路里）`
  }
  
  // 饮食多样性不足
  if (event.rule_name?.includes('饮食多样性不足') || data.reason === '多样性不足') {
    return `近7天仅尝试 ${data.dish_count || 0} 种菜品，建议增加饮食多样性`
  }
  
  // 蛋白质摄入不足
  if (event.rule_name?.includes('蛋白质摄入不足') || data.reason === '蛋白质不足') {
    return `近7天平均蛋白质摄入 ${Math.round(data.avg_protein || 0)}g/天，低于推荐值（60g/天）`
  }
  
  // 膳食纤维摄入不足
  if (event.rule_name?.includes('膳食纤维摄入不足') || data.reason === '纤维不足') {
    return `近7天平均膳食纤维摄入 ${Math.round(data.avg_fiber || 0)}g/天，低于推荐值（25g/天）`
  }
  
  // 人工干预
  if (data.manual_intervention) {
    return data.content || '人工标记的风险事件'
  }
  
  return '检测到异常情况，请关注'
}

const formatDietPreferences = (prefs) => {
  if (!prefs) return ''
  try {
    const prefsArray = typeof prefs === 'string' ? JSON.parse(prefs) : prefs
    if (!Array.isArray(prefsArray) || prefsArray.length === 0) return '未记录'
    
    const labels = {
      'vegetarian': '素食',
      'low_salt': '低盐',
      'low_sugar': '低糖',
      'low_fat': '低脂',
      'high_protein': '高蛋白',
      'high_fiber': '高纤维',
      'soft_food': '软食',
      'liquid': '流质',
      'no_spicy': '不辣',
      'no_seafood': '无海鲜',
      'no_nuts': '无坚果',
      'no_dairy': '无乳制品'
    }
    
    const displayLabels = prefsArray.map(id => labels[id] || id).filter(Boolean)
    return displayLabels.length > 2 ? `${displayLabels.slice(0, 2).join('、')}等${displayLabels.length}项` : displayLabels.join('、')
  } catch (err) {
    return prefs
  }
}

onMounted(loadClientDetail)

const goBack = () => {
  router.back()
}

const maskIdCard = (idCard) => {
  if (!idCard) return '未填写'
  if (idCard.length < 8) return idCard
  return idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 4)
}

const maskAddress = (address) => {
  if (!address) return '未填写'
  // 隐藏真实地址，改用"某某区某某路"格式
  const districtMatch = address.match(/(.{2,4}区)/)
  const roadMatch = address.match(/(.{2,6}路|.{2,6}街|.{2,6}道)/)
  
  if (districtMatch && roadMatch) {
    return `${districtMatch[1]}${roadMatch[1]}`
  } else if (districtMatch) {
    return `${districtMatch[1]}某某路`
  } else {
    return '某某区某某路'
  }
}

const getRiskClass = (riskFlags) => {
  if (!riskFlags) return 'risk-normal'
  const flags = riskFlags.toLowerCase()
  if (flags.includes('高风险') || flags.includes('独居') || flags.includes('重病')) {
    return 'risk-high'
  }
  if (flags.includes('中风险') || flags.includes('慢病')) {
    return 'risk-medium'
  }
  return 'risk-low'
}

const getRiskLabel = (riskFlags) => {
  if (!riskFlags) return '正常'
  const flags = riskFlags.toLowerCase()
  if (flags.includes('高风险') || flags.includes('独居') || flags.includes('重病')) {
    return '高风险'
  }
  if (flags.includes('中风险') || flags.includes('慢病')) {
    return '中风险'
  }
  return '低风险'
}

const getOrderStatusClass = (status) => {
  const map = {
    'placed': 'status-placed',
    'preparing': 'status-preparing',
    'delivering': 'status-delivering',
    'delivered': 'status-delivered',
    'cancelled': 'status-cancelled'
  }
  return map[status] || ''
}

const getOrderStatusText = (status) => {
  const map = {
    'placed': '已下单',
    'preparing': '准备中',
    'delivering': '配送中',
    'delivered': '已送达',
    'cancelled': '已取消'
  }
  return map[status] || status
}

const getSeverityText = (severity) => {
  const map = {
    'high': '高',
    'medium': '中',
    'low': '低'
  }
  return map[severity] || severity
}

const getEventStatusText = (status) => {
  const map = {
    'open': '待处理',
    'resolved': '已解决',
    'closed': '已关闭'
  }
  return map[status] || status
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.back-header {
  margin-bottom: 16px;
}

.back-header .ghost-btn {
  min-width: auto;
  padding: 10px 16px;
  font-size: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: var(--fw-semibold);
}

.chip {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: var(--fw-medium);
  white-space: nowrap;
}

.chip.risk-high {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffccc7;
}

.chip.risk-medium {
  background: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
}

.chip.risk-low {
  background: #e6f7ff;
  color: #0958d9;
  border: 1px solid #91d5ff;
}

.chip.risk-normal {
  background: var(--surface-soft);
  color: var(--accent-strong);
  border: 1px solid var(--accent);
}

.chip.severity-high {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffccc7;
}

.chip.severity-medium {
  background: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
}

.chip.severity-low {
  background: #e6f7ff;
  color: #0958d9;
  border: 1px solid #91d5ff;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-grid.compact {
  gap: 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item .muted {
  font-size: 13px;
}

.info-item strong {
  font-size: 15px;
  font-weight: var(--fw-medium);
  color: var(--text);
}

.guardian-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.guardian-item {
  padding: 14px;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.nutri-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin: 10px 0;
}

.nutri-item .muted {
  font-size: 13px;
}

.nutri-item strong {
  display: block;
  margin-top: 6px;
  font-size: 16px;
  font-weight: var(--fw-semibold);
  color: var(--text);
}

.order-list {
  margin: 10px 0 0;
}

.order-item {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 10px;
  background: var(--bg);
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
  font-weight: var(--fw-semibold);
  font-size: 16px;
  color: var(--text);
}

.order-date {
  font-size: 13px;
  color: var(--muted);
}

.order-number {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 4px;
}

.order-amount {
  font-size: 17px;
  font-weight: var(--fw-semibold);
  color: var(--accent-strong);
  margin: 0 0 10px;
}

.order-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.item-tag {
  padding: 4px 10px;
  background: var(--card);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text);
  border: 1px solid var(--border);
}

.risk-list {
  margin-top: 10px;
}

.risk-item {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 10px;
  background: var(--bg);
}

.risk-item:last-child {
  margin-bottom: 0;
}

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.risk-name {
  font-weight: var(--fw-semibold);
  font-size: 15px;
  color: var(--text);
}

.risk-detail {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .nutri-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
