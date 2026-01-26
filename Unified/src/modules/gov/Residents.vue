<template>
  <!-- 搜索栏 -->
  <div class="search-bar">
    <input 
      v-model="searchKeyword" 
      placeholder="搜索姓名、手机号、身份证..." 
      class="input" 
      @input="debounceLoad" 
    />
  </div>

  <!-- 档案列表 -->
  <div class="user-list" v-if="!loading">
    <div class="user-item" v-for="(c, index) in residents" :key="c.id">
      <!-- 简要信息行 -->
      <div class="user-row" @click="toggleExpand(c.id)">
        <div class="user-left">
          <div class="user-info">
            <div class="user-name-line">
              <span class="user-name">{{ c.name || '未填写' }}</span>
              <span class="risk-tag" :class="getRiskClass(c.risk_flags)">
                {{ getRiskLabel(c.risk_flags) }}
              </span>
            </div>
            <div class="user-meta">
              {{ c.phone || '未填写' }} · {{ c.age || calculateAge(c.id_card) || '未知' }}岁 · {{ c.order_count || 0 }}单
              <template v-if="c.health_conditions"> · {{ c.health_conditions }}</template>
            </div>
          </div>
        </div>
        
        <div class="user-right">
          <div class="expand-btn" :class="{ active: expandedIds.includes(c.id) }">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 8L10 12L14 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      
      <!-- 详细信息（可展开） -->
      <transition name="expand">
        <div class="user-expand" v-if="expandedIds.includes(c.id)">
          <div class="expand-content">
            <!-- 基本信息 -->
            <div class="info-section">
              <div class="section-header">基本信息</div>
              <div class="info-rows">
                <div class="info-row">
                  <span class="info-key">性别</span>
                  <span class="info-val">{{ c.gender || '未填写' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">年龄</span>
                  <span class="info-val">{{ c.age || calculateAge(c.id_card) || '未知' }}岁</span>
                </div>
                <div class="info-row">
                  <span class="info-key">手机号</span>
                  <span class="info-val">{{ c.phone || '未填写' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">身份证</span>
                  <span class="info-val">{{ maskIdCard(c.id_card) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">居住地址</span>
                  <span class="info-val">{{ maskAddress(c.address) }}</span>
                </div>
              </div>
            </div>

            <!-- 健康状况 -->
            <div class="info-section">
              <div class="section-header">健康状况</div>
              <div class="info-rows">
                <div class="info-row">
                  <span class="info-key">身体情况</span>
                  <span class="info-val">{{ c.health_conditions || '无' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">饮食偏好</span>
                  <span class="info-val">{{ formatDietPreferences(c.diet_preferences) || '未记录' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">订单数量</span>
                  <span class="info-val">{{ c.order_count || 0 }}单</span>
                </div>
                <div class="info-row" v-if="c.last_order_time">
                  <span class="info-key">最近订单</span>
                  <span class="info-val">{{ formatDate(c.last_order_time) }}</span>
                </div>
              </div>
            </div>

            <!-- 监护人信息 -->
            <template v-if="clientGuardians[c.id] && clientGuardians[c.id].length > 0">
              <div class="info-section">
                <div class="section-header">监护人信息</div>
                <div class="guardian-cards">
                  <div class="guardian-card" v-for="g in clientGuardians[c.id]" :key="g.id">
                    <div class="info-rows">
                      <div class="info-row">
                        <span class="info-key">姓名</span>
                        <span class="info-val">{{ g.name || '未填写' }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-key">关系</span>
                        <span class="info-val">{{ g.relation || '监护' }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-key">手机号</span>
                        <span class="info-val">{{ g.phone || '未填写' }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-key">身份证</span>
                        <span class="info-val">{{ maskIdCard(g.bind_id_card) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 风险标记 -->
            <div class="info-section">
              <div class="section-header">风险标记与备注</div>
              <textarea 
                v-model="riskFlags[c.id]" 
                placeholder="记录风险因素：如独居、行动不便、用药情况等..." 
                class="input"
                rows="3"
              ></textarea>
            </div>
            
            <!-- 操作按钮 -->
            <div class="expand-actions">
              <button class="action-btn secondary" @click="viewDetail(c.id)">查看完整档案</button>
              <button class="action-btn primary" @click="save(c.id)">保存标记</button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <p v-if="!residents.length" class="muted" style="text-align: center; padding: 40px 0;">
      暂无住户信息
    </p>
  </div>
  
  <!-- 骨架屏 -->
  <div class="user-list" v-else>
    <div class="user-item skeleton-item" v-for="i in 8" :key="'skeleton-' + i">
      <div class="user-row">
        <div class="user-left">
          <div class="user-info">
            <div class="skeleton skeleton-name"></div>
            <div class="skeleton skeleton-meta"></div>
          </div>
        </div>
        <div class="user-right">
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 消息提示 -->
  <div v-if="message" class="global-toast" :class="{ visible: !!message }">
    {{ message }}
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getClients, updateClient } from '../../api/gov'
import http from '../../api/http'

const router = useRouter()
const residents = ref([])
const clientGuardians = ref({})
const riskFlags = ref({})
const message = ref('')
const loading = ref(false)
const searchKeyword = ref('')
const expandedIds = ref([])

let debounceTimer = null

const maskAddress = (address) => {
  if (!address) return '未填写'
  // 隐藏真实地址，改用"某某区某某路"格式
  // 提取区和路的信息
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

const toggleExpand = (id) => {
  const index = expandedIds.value.indexOf(id)
  if (index > -1) {
    expandedIds.value.splice(index, 1)
  } else {
    expandedIds.value.push(id)
    // 懒加载：只在展开时加载监护人信息
    if (!clientGuardians.value[id]) {
      loadGuardians(id)
    }
  }
}

const load = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    
    const resp = await getClients(params)
    residents.value = resp.data.data.clients || []
    
    // 初始化风险标记
    residents.value.forEach((c) => {
      riskFlags.value[c.id] = c.risk_flags || ''
    })
    
    message.value = ''
  } catch (err) {
    showMessage(err?.response?.data?.message || '获取居民列表失败')
  } finally {
    loading.value = false
  }
  
  // 在后台异步加载监护人信息（不阻塞页面显示）
  loadAllGuardians()
}

const loadAllGuardians = async () => {
  // 并行加载所有监护人信息
  await Promise.all(
    residents.value.map(client => loadGuardians(client.id))
  )
}

const debounceLoad = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 500)
}

const loadGuardians = async (clientId) => {
  try {
    const resp = await http.get(`/gov/clients/${clientId}/guardians`)
    clientGuardians.value[clientId] = resp.data.data.guardians || []
  } catch (err) {
    console.error('加载监护人信息失败:', err)
    clientGuardians.value[clientId] = []
  }
}

onMounted(() => {
  // 立即显示页面，数据在后台加载
  load().catch(err => console.error('加载居民列表失败:', err))
})

const save = async (id) => {
  try {
    await updateClient(id, { risk_flags: riskFlags.value[id] })
    showMessage('风险标记已保存')
  } catch (err) {
    showMessage(err?.response?.data?.message || '保存失败')
  }
}

const showMessage = (msg) => {
  message.value = msg
  setTimeout(() => { message.value = '' }, 2000)
}

const viewDetail = (id) => {
  router.push(`/gov/clients/${id}`)
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

const maskIdCard = (idCard) => {
  if (!idCard) return '未填写'
  if (idCard.length < 8) return idCard
  return idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 4)
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

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return date.toLocaleDateString('zh-CN')
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
</script>

<style scoped>
.user-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.user-item {
  background: var(--card);
  transition: all 0.2s ease;
}

.user-item:nth-child(even) {
  background: rgba(0, 0, 0, 0.02);
}

.user-item:hover {
  background: rgba(59, 130, 246, 0.06);
}

/* 统一间距系统：基于 8px 网格 */
.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  user-select: none;
}

.user-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user-name {
  font-size: 16px;
  font-weight: var(--fw-semibold);
  color: var(--text);
  line-height: 1.5;
}

.risk-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: var(--fw-medium);
  line-height: 1.4;
}

.risk-tag.risk-high {
  background: #fff1f0;
  color: #cf1322;
}

.risk-tag.risk-medium {
  background: #fff7e6;
  color: #d46b08;
}

.risk-tag.risk-low {
  background: #e6f7ff;
  color: #0958d9;
}

.risk-tag.risk-normal {
  background: #f0f9ff;
  color: #0369a1;
}

.user-meta {
  font-size: 14px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.user-right {
  display: flex;
  align-items: center;
  padding-left: 16px;
}

.expand-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
}

.expand-btn:hover {
  background: var(--ghost-bg);
  color: var(--text);
}

.expand-btn.active {
  color: var(--accent);
  transform: rotate(180deg);
}

.user-expand {
  border-top: 1px solid var(--border);
  background: rgba(249, 250, 251, 0.5);
}

.expand-content {
  padding: 16px;
}

.info-section {
  margin-bottom: 16px;
}

.info-section:last-of-type {
  margin-bottom: 0;
}

.section-header {
  font-size: 12px;
  font-weight: var(--fw-semibold);
  color: var(--muted);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.info-key {
  font-size: 14px;
  color: var(--muted);
  min-width: 72px;
  flex-shrink: 0;
}

.info-val {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--fw-medium);
  flex: 1;
}

.guardian-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guardian-card {
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.expand-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: var(--accent);
  color: white;
}

.action-btn.primary:hover {
  background: var(--accent-strong);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn.secondary {
  background: var(--ghost-bg);
  color: var(--text);
}

.action-btn.secondary:hover {
  background: var(--ghost-bg-hover);
}

/* 展开/收起动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1200px;
}

.search-bar {
  margin-bottom: 16px;
}

@media (max-width: 640px) {
  .user-row {
    padding: 12px;
  }
  
  .user-left {
    gap: 12px;
  }
  
  .user-name {
    font-size: 15px;
  }
  
  .user-meta {
    font-size: 13px;
  }
  
  .expand-content {
    padding: 12px;
  }
  
  .info-key {
    min-width: 64px;
    font-size: 13px;
  }
  
  .info-val {
    font-size: 13px;
  }
  
  .expand-actions {
    flex-direction: column;
  }
  
  .action-btn {
    padding: 10px 16px;
  }
}

/* 骨架屏样式 */
.skeleton-item {
  pointer-events: none;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-name {
  width: 120px;
  height: 20px;
  margin-bottom: 8px;
}

.skeleton-meta {
  width: 200px;
  height: 16px;
}

.skeleton-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
