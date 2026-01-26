<template>
  <div class="card-list profile">
    <!-- 今日经营数据 -->
    <div class="card stats-card">
      <h3>今日经营概况</h3>
      <p class="muted">{{ currentStore?.name || '全部店铺' }} 的实时数据</p>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">今日订单</span>
          <strong class="stat-value">{{ todayStats.orders }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">菜品总数</span>
          <strong class="stat-value">{{ todayStats.dishes }}</strong>
        </div>
      </div>
    </div>

    <!-- 商户信息 -->
    <div class="card">
      <div class="card-header">
        <h3>商户信息</h3>
        <button class="text-btn" @click="openProfileEdit">编辑</button>
      </div>
      <div class="info">
        <div class="info-row">
          <span class="muted small">负责人</span>
          <strong>{{ profile?.name || '未填写' }}</strong>
        </div>
        <div class="info-row">
          <span class="muted small">联系电话</span>
          <strong>{{ profile?.phone || '未填写' }}</strong>
        </div>
        <div class="info-row">
          <span class="muted small">身份证</span>
          <div class="id-card-row">
            <strong>{{ formatIdCard(profile?.id_card) || '未填写' }}</strong>
            <span :class="['verify-badge', idVerifiedClass]">{{ idVerifiedText }}</span>
          </div>
        </div>
        <div class="info-row">
          <span class="muted small">商户 ID</span>
          <strong class="merchant-id">{{ profile?.id || '-' }}</strong>
        </div>
      </div>
    </div>

    <!-- 店铺设置 -->
    <div class="card">
      <h3>店铺设置</h3>
      <div class="settings-list">
        <div class="setting-item" @click="openBusinessHours">
          <span class="setting-label">营业时间</span>
          <div class="setting-right">
            <span class="muted">{{ businessHoursText }}</span>
            <span class="arrow">›</span>
          </div>
        </div>
        <div class="setting-item" @click="openDeliverySettings">
          <span class="setting-label">配送设置</span>
          <div class="setting-right">
            <span class="arrow">›</span>
          </div>
        </div>
        <div class="setting-item" @click="openNotificationSettings">
          <span class="setting-label">通知设置</span>
          <div class="setting-right">
            <span class="arrow">›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="card">
      <h3>快捷入口</h3>
      <div class="quick-actions">
        <router-link to="/merchant/orders" class="action-btn">订单管理</router-link>
        <router-link to="/merchant/dishes" class="action-btn">菜品管理</router-link>
        <router-link to="/merchant/plans" class="action-btn">采购计划</router-link>
        <router-link to="/merchant" class="action-btn">数据看板</router-link>
      </div>
    </div>

    <!-- 身份证编辑弹窗 -->
    <BottomSheet :open="showIdCardEdit" @close="showIdCardEdit = false">
      <div class="sheet-content">
        <h3>编辑身份证</h3>
        <p class="muted">请输入您的身份证号码</p>
        <div class="form-group">
          <label class="form-label">身份证号码</label>
          <input
            v-model="idCardInput"
            type="text"
            class="input"
            placeholder="请输入18位身份证号码"
            maxlength="18"
            @input="onIdCardInput"
          />
          <p v-if="idCardError" class="error-text">{{ idCardError }}</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelIdCardEdit">取消</button>
          <button class="primary-btn" @click="saveIdCard" :disabled="!canSaveIdCard">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 商户信息编辑弹窗 -->
    <BottomSheet :open="showProfileEdit" @close="showProfileEdit = false">
      <div class="sheet-content">
        <h3>编辑商户信息</h3>
        <div class="form-group">
          <label class="form-label">负责人姓名</label>
          <input v-model="profileForm.name" type="text" class="input" placeholder="请输入姓名" />
        </div>
        <div class="form-group">
          <label class="form-label">联系电话</label>
          <input v-model="profileForm.phone" type="tel" class="input" placeholder="请输入电话" />
        </div>
        <div class="form-group">
          <label class="form-label">身份证号码</label>
          <input
            v-model="profileForm.id_card"
            type="text"
            class="input"
            placeholder="请输入18位身份证号码"
            maxlength="18"
          />
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="showProfileEdit = false">取消</button>
          <button class="primary-btn" @click="saveProfile">保存</button>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { storeToRefs } from 'pinia'
import BottomSheet from '../../components/BottomSheet.vue'
import { updateProfile, getCurrentStore, getDashboard } from '../../api/merchant'

const userStore = useUserStore()
const { profile } = storeToRefs(userStore)

const currentStore = ref(null)
const todayStats = ref({
  orders: 0,
  revenue: 0,
  dishes: 0,
  rating: '5.0'
})

const showIdCardEdit = ref(false)
const showProfileEdit = ref(false)
const idCardInput = ref('')
const idCardError = ref('')
const saving = ref(false)

const profileForm = ref({
  name: '',
  phone: '',
  id_card: ''
})

const formatIdCard = (idCard) => {
  if (!idCard) return null
  if (idCard.length === 18) {
    return `${idCard.substring(0, 6)}******${idCard.substring(14)}`
  }
  return idCard
}

const idVerifiedText = computed(() => {
  return profile.value?.id_verified ? '已认证' : '未认证'
})

const idVerifiedClass = computed(() => {
  return profile.value?.id_verified ? 'verified' : 'unverified'
})

const storeStatusText = computed(() => {
  return currentStore.value?.is_open ? '营业中' : '已打烊'
})

const storeStatusClass = computed(() => {
  return currentStore.value?.is_open ? 'open' : 'closed'
})

const businessHoursText = computed(() => {
  if (!currentStore.value?.business_hours) return '未设置'
  return currentStore.value.business_hours
})

// 身份证验证
const validateIdCard = (idCard) => {
  if (!idCard) {
    return '请输入身份证号码'
  }
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  if (!idCardRegex.test(idCard)) {
    return '请输入有效的18位身份证号码'
  }
  return ''
}

const onIdCardInput = () => {
  idCardError.value = ''
  idCardInput.value = idCardInput.value.replace(/[^\dXx]/g, '').toUpperCase()
}

const canSaveIdCard = computed(() => {
  return idCardInput.value.length === 18 && !idCardError.value && !saving.value
})

const saveIdCard = async () => {
  const error = validateIdCard(idCardInput.value)
  if (error) {
    idCardError.value = error
    return
  }

  saving.value = true
  try {
    await updateProfile({ id_card: idCardInput.value })
    userStore.profile = { ...userStore.profile, id_card: idCardInput.value }
    showIdCardEdit.value = false
    toast('身份证已保存')
  } catch (err) {
    console.error('保存身份证失败:', err)
    idCardError.value = err.response?.data?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

const cancelIdCardEdit = () => {
  showIdCardEdit.value = false
  idCardInput.value = profile.value?.id_card || ''
  idCardError.value = ''
}

const openIdCardEdit = () => {
  idCardInput.value = profile.value?.id_card || ''
  idCardError.value = ''
  showIdCardEdit.value = true
}

const openProfileEdit = () => {
  profileForm.value = {
    name: profile.value?.name || '',
    phone: profile.value?.phone || '',
    id_card: profile.value?.id_card || ''
  }
  showProfileEdit.value = true
}

const saveProfile = async () => {
  try {
    await updateProfile(profileForm.value)
    userStore.profile = { ...userStore.profile, ...profileForm.value }
    showProfileEdit.value = false
    toast('商户信息已更新')
  } catch (err) {
    console.error('保存失败:', err)
    toast('保存失败，请稍后重试')
  }
}

const openStoreEdit = () => {
  toast('店铺编辑功能开发中')
}

const openBusinessHours = () => {
  toast('营业时间设置功能开发中')
}

const openDeliverySettings = () => {
  toast('配送设置功能开发中')
}

const openNotificationSettings = () => {
  toast('通知设置功能开发中')
}

const toast = (msg) => {
  alert(msg)
}

const loadCurrentStore = async () => {
  try {
    const res = await getCurrentStore()
    currentStore.value = res.data.data.store || null
  } catch (err) {
    console.error('加载店铺信息失败:', err)
  }
}

const loadTodayStats = async () => {
  try {
    const res = await getDashboard()
    const stats = res.data.data.stats
    todayStats.value = {
      orders: stats.totalOrders || 0,
      revenue: 0, // 后端暂未提供营业额数据
      dishes: stats.dishes || 0,
      rating: '5.0' // 后端暂未提供评分数据
    }
  } catch (err) {
    console.error('加载今日数据失败:', err)
    todayStats.value = {
      orders: 0,
      revenue: 0,
      dishes: 0,
      rating: '5.0'
    }
  }
}

onMounted(async () => {
  await loadCurrentStore()
  await loadTodayStats()
  
  // 监听店铺切换事件
  window.addEventListener('merchant-store-changed', async () => {
    await loadCurrentStore()
    await loadTodayStats()
  })
})
</script>

<style scoped>
.profile {
  gap: 12px;
}

/* 今日数据 */
.stats-card {
  background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%);
}

.store-name-badge {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: var(--fw-medium);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-label {
  font-size: 14px;
  color: var(--muted);
}

.stat-value {
  font-size: 24px;
  font-weight: var(--fw-semibold);
  color: var(--text);
}

/* 商户信息 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.text-btn {
  background: none;
  border: none;
  color: var(--accent-strong);
  font-weight: var(--fw-medium);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.text-btn:hover {
  background: var(--ghost-bg);
}

.info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.id-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.verify-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: var(--fw-medium);
}

.verify-badge.verified {
  background: #dcfce7;
  color: #16a34a;
}

.verify-badge.unverified {
  background: #f3f4f6;
  color: var(--muted);
}

.merchant-id {
  font-family: 'Courier New', monospace;
  color: var(--muted);
}

/* 店铺设置 */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 12px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  background: var(--ghost-bg);
  margin: 0 -16px;
  padding: 16px;
  border-radius: 8px;
}

.setting-label {
  font-weight: var(--fw-medium);
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow {
  font-size: 20px;
  color: var(--muted);
}

/* 快捷入口 */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  min-width: calc(50% - 4px);
  padding: 14px 20px;
  background: var(--ghost-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  font-weight: var(--fw-medium);
  text-align: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--ghost-bg-hover);
  border-color: var(--accent);
  color: var(--accent-strong);
}

.small {
  font-size: 14px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--fw-medium);
  font-size: calc(var(--fs-body) * var(--font-scale));
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 6px;
}

.sheet-content {
  padding: 0 16px 16px;
}

.sheet-content h3 {
  margin: 0 0 8px;
  font-size: calc(var(--fs-title) * var(--font-scale));
}

.sheet-content > .muted {
  margin: 0 0 20px;
}

.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.sheet-actions .ghost-btn,
.sheet-actions .primary-btn {
  flex: 1;
}

.sheet-actions .primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
