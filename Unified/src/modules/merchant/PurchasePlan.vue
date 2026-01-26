<template>
  <div class="purchase-plan-page">
    <!-- 统计卡片 -->
    <div class="stats-card card">
      <h3>采购统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalPlans || 0 }}</div>
          <div class="stat-label">总计划数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ pendingCount }}</div>
          <div class="stat-label">待采购</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ completedCount }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
      <div v-if="stats.topItems?.length" class="top-items">
        <div class="muted" style="margin-bottom: 8px;">常用食材</div>
        <div class="item-tags">
          <span v-for="item in stats.topItems.slice(0, 5)" :key="item.name" class="tag" @click="addQuickItem(item.name)">
            {{ item.name }} ({{ item.count }}次)
          </span>
        </div>
      </div>
    </div>

    <!-- 创建新计划 -->
    <div class="card new-plan-card">
      <h3>{{ editingPlan ? '编辑计划' : '创建新计划' }}</h3>
      <input type="date" v-model="form.planDate" class="input" />
      <textarea 
        v-model="form.itemsText" 
        placeholder="逐行输入：食材 数量 单位（可选），例如：&#10;鸡胸肉 5 斤&#10;胡萝卜 10 根&#10;或点击上方常用食材快速添加" 
        class="input textarea"
      ></textarea>
      <textarea 
        v-model="form.notes" 
        placeholder="备注信息（如：供应商联系方式、特殊要求等）" 
        class="input textarea-small"
      ></textarea>
      <div class="form-actions">
        <button class="primary-btn" @click="savePlan">{{ editingPlan ? '更新' : '创建' }}</button>
        <button v-if="editingPlan" class="ghost-btn" @click="cancelEdit">取消</button>
      </div>
      <p class="muted" v-if="message">{{ message }}</p>
    </div>

    <!-- 计划列表 -->
    <div class="card">
      <div class="section-header">
        <h3>计划列表</h3>
        <div class="filter-tabs">
          <button 
            :class="['tab-btn', { active: filter === 'all' }]" 
            @click="filter = 'all'"
          >全部</button>
          <button 
            :class="['tab-btn', { active: filter === 'pending' }]" 
            @click="filter = 'pending'"
          >待采购</button>
          <button 
            :class="['tab-btn', { active: filter === 'completed' }]" 
            @click="filter = 'completed'"
          >已完成</button>
        </div>
      </div>

      <div v-if="!filteredPlans.length" class="empty-state">
        <p class="muted">暂无采购计划</p>
      </div>

      <div v-else class="plans-list">
        <div v-for="plan in filteredPlans" :key="plan.id" class="plan-item">
          <div class="plan-header">
            <div class="plan-date">
              <span class="date-text">{{ formatDate(plan.plan_date) }}</span>
              <span :class="['status-badge', plan.status]">
                {{ statusText(plan.status) }}
              </span>
            </div>
            <div class="plan-actions">
              <button 
                v-if="plan.status === 'pending'" 
                class="action-btn complete" 
                @click="markComplete(plan.id)"
                title="标记为已完成"
              >✓</button>
              <button 
                v-if="plan.status === 'completed'" 
                class="action-btn pending" 
                @click="markPending(plan.id)"
                title="标记为待采购"
              >↻</button>
              <button class="action-btn edit" @click="editPlan(plan)" title="编辑">✎</button>
              <button class="action-btn copy" @click="copyPlan(plan)" title="复制">⎘</button>
              <button class="action-btn delete" @click="deletePlan(plan.id)" title="删除">✕</button>
            </div>
          </div>
          
          <div class="plan-items">
            <div v-for="item in parseItems(plan.items)" :key="item.name" class="item-chip">
              {{ item.name }} × {{ item.quantity }}{{ item.unit ? ' ' + item.unit : '' }}
            </div>
          </div>
          
          <div v-if="plan.notes" class="plan-notes">
            <span class="notes-label">备注：</span>{{ plan.notes }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  getPurchasePlans, 
  createPurchasePlan, 
  updatePurchasePlan, 
  deletePurchasePlan as deletePlanApi,
  getPurchaseStats 
} from '../../api/merchant'

const plans = ref([])
const stats = ref({ topItems: [], totalPlans: 0 })
const filter = ref('all')
const message = ref('')
const editingPlan = ref(null)

const form = ref({
  planDate: '',
  itemsText: '',
  notes: ''
})

const filteredPlans = computed(() => {
  if (filter.value === 'all') return plans.value
  return plans.value.filter(p => p.status === filter.value)
})

const pendingCount = computed(() => plans.value.filter(p => p.status === 'pending').length)
const completedCount = computed(() => plans.value.filter(p => p.status === 'completed').length)

const loadPlans = async () => {
  const res = await getPurchasePlans()
  plans.value = res.data.data.plans || []
}

const loadStats = async () => {
  const res = await getPurchaseStats()
  stats.value = res.data.data
}

onMounted(() => {
  loadPlans()
  loadStats()
  // 设置默认日期为今天
  form.value.planDate = new Date().toISOString().split('T')[0]
})

const savePlan = async () => {
  const items = form.value.itemsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/)
      const name = parts[0]
      const quantity = parts[1] || '1'
      const unit = parts[2] || ''
      return { name, quantity, unit }
    })

  if (!form.value.planDate) {
    message.value = '请选择日期'
    return
  }

  if (items.length === 0) {
    message.value = '请至少添加一项食材'
    return
  }

  try {
    if (editingPlan.value) {
      await updatePurchasePlan(editingPlan.value.id, {
        planDate: form.value.planDate,
        items,
        notes: form.value.notes
      })
      message.value = '计划已更新'
      editingPlan.value = null
    } else {
      await createPurchasePlan({
        planDate: form.value.planDate,
        items,
        notes: form.value.notes,
        status: 'pending'
      })
      message.value = '计划已创建'
    }
    
    form.value.itemsText = ''
    form.value.notes = ''
    form.value.planDate = new Date().toISOString().split('T')[0]
    
    await loadPlans()
    await loadStats()
    
    setTimeout(() => { message.value = '' }, 3000)
  } catch (err) {
    message.value = '操作失败：' + (err.response?.data?.message || err.message)
  }
}

const editPlan = (plan) => {
  editingPlan.value = plan
  form.value.planDate = plan.plan_date
  form.value.notes = plan.notes || ''
  
  const items = parseItems(plan.items)
  form.value.itemsText = items
    .map(item => `${item.name} ${item.quantity}${item.unit ? ' ' + item.unit : ''}`)
    .join('\n')
  
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  editingPlan.value = null
  form.value.itemsText = ''
  form.value.notes = ''
  form.value.planDate = new Date().toISOString().split('T')[0]
  message.value = ''
}

const copyPlan = (plan) => {
  form.value.planDate = new Date().toISOString().split('T')[0]
  form.value.notes = plan.notes || ''
  
  const items = parseItems(plan.items)
  form.value.itemsText = items
    .map(item => `${item.name} ${item.quantity}${item.unit ? ' ' + item.unit : ''}`)
    .join('\n')
  
  message.value = '已复制计划内容，请修改日期后创建'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deletePlan = async (id) => {
  if (!confirm('确定要删除这个采购计划吗？')) return
  
  try {
    await deletePlanApi(id)
    await loadPlans()
    await loadStats()
    message.value = '计划已删除'
    setTimeout(() => { message.value = '' }, 3000)
  } catch (err) {
    message.value = '删除失败'
  }
}

const markComplete = async (id) => {
  try {
    await updatePurchasePlan(id, { status: 'completed' })
    await loadPlans()
  } catch (err) {
    console.error('Failed to update status', err)
  }
}

const markPending = async (id) => {
  try {
    await updatePurchasePlan(id, { status: 'pending' })
    await loadPlans()
  } catch (err) {
    console.error('Failed to update status', err)
  }
}

const addQuickItem = (itemName) => {
  const currentText = form.value.itemsText.trim()
  form.value.itemsText = currentText ? `${currentText}\n${itemName} 1` : `${itemName} 1`
}

const parseItems = (raw) => {
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch (err) {
    console.warn('failed to parse plan items', err)
    return []
  }
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === tomorrow.toDateString()) return '明天'
  
  return dateStr
}

const statusText = (status) => {
  return status === 'completed' ? '已完成' : '待采购'
}
</script>

<style scoped>
.purchase-plan-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 20px;
}

.stats-card {
  background: var(--card);
  border: 1px solid var(--border);
}

.stats-card h3 {
  margin-bottom: 16px;
  color: var(--text);
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: var(--surface-soft);
  border-radius: 12px;
  transition: all 0.2s;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(31, 156, 122, 0.15);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--accent);
}

.stat-label {
  font-size: 13px;
  color: var(--muted);
}

.top-items {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.top-items .muted {
  margin-bottom: 8px;
  font-weight: 500;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background: var(--surface-soft);
  color: var(--accent-strong);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.tag:hover {
  background: var(--accent);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(31, 156, 122, 0.3);
}

.new-plan-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.new-plan-card h3 {
  font-size: 16px;
}

.textarea {
  min-height: 120px;
  resize: vertical;
}

.textarea-small {
  min-height: 60px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  min-width: 60px;
}

.tab-btn:hover {
  background: var(--ghost-bg-hover);
  border-color: var(--accent);
}

.tab-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(31, 156, 122, 0.3);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  transition: all 0.2s;
  background: var(--card);
}

.plan-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plan-date {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-text {
  font-weight: 600;
  font-size: 14px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.completed {
  background: var(--surface-soft);
  color: var(--accent-strong);
}

.plan-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.action-btn.complete {
  background: var(--surface-soft);
  color: var(--accent-strong);
}

.action-btn.complete:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.05);
}

.action-btn.pending {
  background: #fef3c7;
  color: #92400e;
}

.action-btn.pending:hover {
  background: #fde68a;
  transform: scale(1.05);
}

.action-btn.edit {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn.edit:hover {
  background: #bfdbfe;
  transform: scale(1.05);
}

.action-btn.copy {
  background: var(--ghost-bg);
  color: var(--text);
}

.action-btn.copy:hover {
  background: var(--ghost-bg-hover);
  transform: scale(1.05);
}

.action-btn.delete {
  background: #fee2e2;
  color: #991b1b;
}

.action-btn.delete:hover {
  background: #fecaca;
  transform: scale(1.05);
}

.plan-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.item-chip {
  background: var(--surface-soft);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  color: var(--text);
  border: 1px solid var(--border);
  font-weight: 500;
}

.plan-notes {
  font-size: 13px;
  color: var(--muted);
  padding-top: 12px;
  border-top: 1px solid var(--border);
  line-height: 1.5;
}

.notes-label {
  font-weight: 600;
  margin-right: 4px;
  color: var(--text);
}

</style>
