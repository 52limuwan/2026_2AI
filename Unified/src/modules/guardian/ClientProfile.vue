<template>
  <div class="card-list client-profile">
    <div class="card hero" v-if="clientInfo">
      <div class="hero-main">
        <div class="avatar"></div>
        <div class="meta">
          <h2>{{ clientInfo.name || '未知' }}</h2>
          <p class="muted">身份证：{{ formatIdCard(clientInfo.id_card) || '未填写' }}</p>
          <p class="muted">认证状态：<span :class="idVerifiedClass">{{ idVerifiedText }}</span></p>
        </div>
      </div>
    </div>

    <div class="card" v-if="clientInfo">
      <div class="section-title">基本信息</div>
      <div class="info-grid">
        <div>
          <div class="muted">关系</div>
          <strong>{{ clientInfo.relation || '未填写' }}</strong>
        </div>
        <div v-if="clientInfo.phone">
          <div class="muted">手机</div>
          <strong>{{ clientInfo.phone }}</strong>
        </div>
        <div v-if="getDisplayAge !== null">
          <div class="muted">年龄</div>
          <strong>{{ getDisplayAge }}岁</strong>
        </div>
        <div v-if="clientInfo.health_condition">
          <div class="muted">健康状况</div>
          <strong>{{ clientInfo.health_condition }}</strong>
        </div>
      </div>
    </div>

    <div class="card" v-if="clientInfo && clientInfo.health_status">
      <div class="section-title">健康状态</div>
      <div class="health-status">
        <span class="status-badge" :class="getHealthStatusClass(clientInfo.health_status)">
          {{ clientInfo.health_status || '良好' }}
        </span>
      </div>
    </div>

    <div class="card" v-if="!clientInfo">
      <p class="muted" style="text-align: center; padding: 20px;">加载中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getClients } from '../../api/guardian'

const route = useRoute()
const router = useRouter()
const selectedClient = inject('selectedClient', ref(null))
const clients = ref([])
const clientInfo = ref(null)
const routeClientId = computed(() => route.params.clientId || route.query.clientId)

const getInitial = (name) => {
  if (!name) return '?'
  return name.charAt(name.length - 1) || name.charAt(0)
}

const formatIdCard = (idCard) => {
  if (!idCard) return null
  // 显示前6位和后4位，中间用*代替
  if (idCard.length === 18) {
    return `${idCard.substring(0, 6)}******${idCard.substring(14)}`
  }
  return idCard
}

// 根据身份证计算年龄
const calculateAgeFromIdCard = (idCard) => {
  if (!idCard || typeof idCard !== 'string') {
    return null
  }
  // 去除空格，确保身份证号为18位
  const cleanIdCard = idCard.trim()
  if (cleanIdCard.length !== 18) {
    return null
  }
  try {
    const birthYear = parseInt(cleanIdCard.substring(6, 10))
    const birthMonth = parseInt(cleanIdCard.substring(10, 12))
    const birthDay = parseInt(cleanIdCard.substring(12, 14))
    
    // 验证提取的日期是否有效
    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) {
      return null
    }
    if (birthYear < 1900 || birthYear > new Date().getFullYear()) {
      return null
    }
    if (birthMonth < 1 || birthMonth > 12) {
      return null
    }
    if (birthDay < 1 || birthDay > 31) {
      return null
    }
    
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()
    
    let age = currentYear - birthYear
    
    // 如果还没过生日，年龄减1
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      age--
    }
    
    return age >= 0 && age <= 150 ? age : null // 年龄应该在0-150之间
  } catch (error) {
    console.error('计算年龄失败:', error)
    return null
  }
}

// 获取显示的年龄（始终从身份证号计算，确保与其他页面显示一致）
const getDisplayAge = computed(() => {
  if (!clientInfo.value) return null
  // 始终从身份证号计算年龄，忽略数据库中的age字段
  if (clientInfo.value.id_card && typeof clientInfo.value.id_card === 'string' && clientInfo.value.id_card.length === 18) {
    return calculateAgeFromIdCard(clientInfo.value.id_card)
  }
  return null
})

const idVerifiedText = computed(() => {
  return clientInfo.value?.id_verified ? '已认证' : '未认证'
})

const idVerifiedClass = computed(() => {
  return clientInfo.value?.id_verified ? 'verified' : 'unverified'
})

const getHealthStatusClass = (status) => {
  if (status === '良好') return 'status-good'
  if (status === '注意控盐' || status === '注意') return 'status-warning'
  return 'status-normal'
}

// 监听被监护人变化事件，同步更新档案信息
const normalizeId = (value) => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const isSameId = (a, b) => {
  const left = normalizeId(a)
  const right = normalizeId(b)
  if (!left || !right) return false
  return left === right
}

const syncSelectedClient = (client) => {
  if (!client) return
  if (!selectedClient?.value?.id || !isSameId(selectedClient.value.id, client.id)) {
    selectedClient.value = { ...client }
  }
}

const handleClientChanged = async (event) => {
  if (event.detail?.client) {
    const changedClientId = event.detail.client.id
    // 如果当前显示的是该被监护人的档案，或者当前没有显示任何档案，则重新加载数据
    if (routeClientId.value && !isSameId(routeClientId.value, changedClientId)) {
      router.replace(`/guardian/client/${changedClientId}`)
      return
    }
    await loadClientInfo(changedClientId)
  }
}

// 加载被监护人详细信息
const loadClientInfo = async (clientId, { syncSelected = true } = {}) => {
  try {
    const res = await getClients()
    clients.value = res.data.data.clients || []
    const found = clients.value.find(c => c.id == clientId || c.id === clientId)
    if (found) {
      // 确保使用真实数据
      clientInfo.value = { ...found }
      if (syncSelected) {
        syncSelectedClient(found)
      }
      console.log('加载被监护人信息:', clientInfo.value)
    } else {
      clientInfo.value = null
    }
  } catch (err) {
    console.error('加载被监护人信息失败', err)
    clientInfo.value = null
  }
}

onMounted(async () => {
  try {
    // 从路由参数获取clientId
    const clientId = routeClientId.value
    
    // 如果URL中有clientId，使用它；否则使用当前选中的被监护人
    if (clientId) {
      await loadClientInfo(clientId)
    } else if (selectedClient?.value?.id) {
      await loadClientInfo(selectedClient.value.id)
    } else {
      // 如果没有clientId也没有selectedClient，加载所有被监护人并显示第一个
      const res = await getClients()
      clients.value = res.data.data.clients || []
      if (clients.value.length > 0) {
        clientInfo.value = { ...clients.value[0] }
        syncSelectedClient(clients.value[0])
        console.log('使用第一个被监护人:', clientInfo.value)
      }
    }
    
    // 监听被监护人变化事件
    window.addEventListener('guardian-client-changed', handleClientChanged)
  } catch (err) {
    console.error('加载被监护人信息失败', err)
  }
})

watch(routeClientId, async (newId, oldId) => {
  if (!newId || isSameId(newId, oldId)) return
  await loadClientInfo(newId)
})

watch(() => selectedClient?.value?.id, async (newId) => {
  if (!newId) return
  if (routeClientId.value && !isSameId(routeClientId.value, newId)) {
    router.replace(`/guardian/client/${newId}`)
    return
  }
  if (!isSameId(clientInfo.value?.id, newId)) {
    await loadClientInfo(newId, { syncSelected: false })
  }
})

onUnmounted(() => {
  window.removeEventListener('guardian-client-changed', handleClientChanged)
})
</script>

<style scoped>
.client-profile {
  gap: 12px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background:
    url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23cbd5e1' stroke-width='6'%3E%3Ccircle cx='40' cy='28' r='14' fill='%23e5e7eb'/%3E%3Cpath d='M20 66c4-10 12-16 20-16s16 6 20 16' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E")
      center/64% no-repeat,
    linear-gradient(135deg, #eef2f7, #e5e7eb);
  flex-shrink: 0;
}

.meta h2 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: var(--fw-semibold);
}

.meta p {
  margin: 2px 0;
  font-size: 13px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.info-grid .muted {
  font-size: 12px;
  margin-bottom: 4px;
}

.info-grid strong {
  font-size: 14px;
  font-weight: var(--fw-semibold);
  display: block;
}

.health-status {
  margin-top: 12px;
}

.status-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: var(--fw-medium);
}

.status-badge.status-good {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-warning {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-normal {
  background: var(--ghost-bg);
  color: var(--text);
}

.verified {
  color: #16a34a;
}

.unverified {
  color: var(--muted);
}
</style>
