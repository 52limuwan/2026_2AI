<template>
  <div class="layout">
    <AppHeader
      :title="headerTitle"
      :subtitle="headerSubtitle"
      :showBack="showBack"
      :hasUnread="hasUnread"
      :showAIButtons="isAIPage"
      @back="goBack"
      @avatar="toggleAvatarMenu"
      @location="openClientPicker"
      @history="openHistoryDialog"
      @newChat="handleNewChat"
      @skills="openSkillsManager"
    />

    <div v-if="showAvatarMenu" class="avatar-menu" @click.self="showAvatarMenu = false">
      <div class="avatar-menu-panel drop-in">
        <button class="ghost-btn" @click="goProfile">个人中心</button>
        <button class="ghost-btn notify-btn" @click="goNotifications">
          系统通知
          <span v-if="hasUnread" class="badge"></span>
        </button>
        <button class="ghost-btn" @click="logout">退出登录</button>
      </div>
    </div>

    <main class="page">
      <router-view />
    </main>

    <BottomTabBar v-if="showTabBar" :tabs="tabs" />
  </div>
</template>

<script setup>
import AppHeader from '../../components/AppHeader.vue'
import BottomTabBar from '../../components/BottomTabBar.vue'
import { computed, onMounted, onUnmounted, ref, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useNotificationStore } from '../../stores/notifications'
import { getClients } from '../../api/guardian'

const userStore = useUserStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const route = useRoute()

const tabs = [
  { label: '首页', to: '/guardian', mode: 'exact' },
  { label: '订单', to: '/guardian/orders', mode: 'prefix' },
  { label: '报告', to: '/guardian/reports', mode: 'prefix' },
  { label: 'AI助手', to: '/guardian/ai', mode: 'prefix' }
]

const clients = ref([])
const selectedClient = ref(null)

// 提供给子组件使用的被监护人信息
provide('selectedClient', selectedClient)

const isTabPage = computed(() => !route.meta?.hideTabBar)
const showTabBar = computed(() => isTabPage.value)
const showBack = computed(() => !isTabPage.value)
const isAIPage = computed(() => route.path === '/guardian/ai')
const headerTitle = computed(() => (isTabPage.value ? '智善伙伴' : route.meta?.title || '返回'))
const headerSubtitle = computed(() => {
  if (!isTabPage.value) return ''
  // 统一显示"切换守护对象"，可以点击切换
  return '切换守护对象'
})
const hasUnread = computed(() => notificationStore.hasUnread)

const showAvatarMenu = ref(false)

const logout = () => {
  showAvatarMenu.value = false
  userStore.logout()
  router.push('/login')
}

const goBack = () => router.back()

const goNotifications = () => {
  showAvatarMenu.value = false
  if (route.path !== '/guardian/notifications') router.push('/guardian/notifications')
}

const openHistoryDialog = () => {
  // 通过事件总线传递给AI助手页面
  window.dispatchEvent(new CustomEvent('ai-open-history'))
}

const handleNewChat = () => {
  // 通过事件总线传递给AI助手页面
  window.dispatchEvent(new CustomEvent('ai-new-chat'))
}

const openSkillsManager = () => {
  // 通过事件总线传递给AI助手页面
  window.dispatchEvent(new CustomEvent('ai-open-skills'))
}

const goProfile = () => {
  showAvatarMenu.value = false
  router.push('/guardian/profile')
}

const toggleAvatarMenu = () => {
  showAvatarMenu.value = !showAvatarMenu.value
}

// 根据身份证计算年龄的辅助函数
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

// 获取显示的年龄（始终从身份证号计算，确保与个人中心显示一致）
const getDisplayAge = (client) => {
  // 始终从身份证号计算年龄，忽略数据库中的age字段
  if (client.id_card && typeof client.id_card === 'string' && client.id_card.length === 18) {
    return calculateAgeFromIdCard(client.id_card)
  }
  return null
}

// 重新加载被监护人列表的函数
const reloadClients = async () => {
  try {
    const res = await getClients()
    clients.value = res.data.data.clients || []
    console.log('重新加载被监护人列表:', clients.value)
    
    // 如果当前选中的被监护人仍然存在，更新它的信息；否则选择第一个
    if (selectedClient.value?.id) {
      const updated = clients.value.find(c => c.id === selectedClient.value.id || c.id == selectedClient.value.id)
      if (updated) {
        selectedClient.value = { ...updated }
        console.log('更新选中的被监护人:', selectedClient.value)
        // 触发事件通知子组件被监护人信息已更新
        window.dispatchEvent(new CustomEvent('guardian-client-changed', { 
          detail: { client: { ...updated } } 
        }))
      } else if (clients.value.length > 0) {
        selectedClient.value = { ...clients.value[0] }
        console.log('切换到第一个被监护人:', selectedClient.value)
        window.dispatchEvent(new CustomEvent('guardian-client-changed', { 
          detail: { client: { ...clients.value[0] } } 
        }))
      }
    } else if (clients.value.length > 0) {
      selectedClient.value = { ...clients.value[0] }
      console.log('设置第一个被监护人:', selectedClient.value)
      window.dispatchEvent(new CustomEvent('guardian-client-changed', { 
        detail: { client: { ...clients.value[0] } } 
      }))
    }
  } catch (err) {
    console.error('加载被监护人列表失败', err)
  }
}

const openClientPicker = async () => {
  // 在打开对话框前先刷新被监护人列表，确保显示最新数据
  await reloadClients()
  
  // 生成列表项的HTML
  const listItemsHtml = clients.value.length > 0 ? clients.value
    .map((c, i) => {
      // 始终从身份证号计算年龄，确保显示的年龄和个人中心一致
      let age = null
      if (c.id_card && typeof c.id_card === 'string' && c.id_card.length === 18) {
        age = calculateAgeFromIdCard(c.id_card)
      }
      
      const phoneDisplay = c.phone || ''
      const ageDisplay = age !== null && age !== undefined ? `· ${age}岁` : ''
      const descText = phoneDisplay && ageDisplay ? `${phoneDisplay} ${ageDisplay}` : (phoneDisplay || ageDisplay || '')
      
      return `<li data-idx="${i}">
        <div class="store-name">${c.name || '未知'}</div>
        <div class="store-desc">${descText}</div>
      </li>`
    })
    .join('') : '<li style="padding: 20px; text-align: center; color: var(--muted);">暂无被监护人</li>'
  
  const modal = document.createElement('div')
  modal.className = 'store-modal'
  modal.innerHTML = `
    <div class="store-dialog">
      <h3>选择被监护人</h3>
      <ul class="store-list">
        ${listItemsHtml}
      </ul>
      <div style="padding: 12px 0; border-top: 1px solid var(--border); margin-top: 8px;">
        <button class="store-add-btn" data-action="add" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--accent-strong); background: transparent; color: var(--accent-strong); font-weight: var(--fw-semibold); cursor: pointer;">+ 添加被监护人</button>
      </div>
      <button class="store-close">关闭</button>
    </div>
  `
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('store-close') || e.target === modal) {
      modal.remove()
    }
    const li = e.target.closest('li[data-idx]')
    if (li && li.dataset.idx !== undefined && !isNaN(Number(li.dataset.idx))) {
      const idx = Number(li.dataset.idx)
      if (clients.value[idx]) {
        selectedClient.value = clients.value[idx]
        // 通知子组件被监护人已更改
        window.dispatchEvent(new CustomEvent('guardian-client-changed', { 
          detail: { client: clients.value[idx] } 
        }))
      }
      modal.remove()
      return
    }
    if (e.target.classList.contains('store-add-btn') || e.target.closest('.store-add-btn')) {
      modal.remove()
      openAddClientDialog()
      return
    }
  })
  document.body.appendChild(modal)
}

const openAddClientDialog = async () => {
  const { bindClient } = await import('../../api/guardian')
  // 直接使用axios，避免http拦截器显示toast
  const axios = (await import('axios')).default
  
  const modal = document.createElement('div')
  modal.className = 'store-modal'
  modal.innerHTML = `
    <div class="store-dialog" style="max-width: 500px;">
      <h3>添加被监护人</h3>
      <p class="muted" style="margin: 0 0 16px; font-size: 14px;">请输入被监护人的身份证号或手机号进行绑定</p>
      <div style="margin-bottom: 16px;">
        <input 
          type="text" 
          id="client-search-input"
          placeholder="请输入身份证号或手机号" 
          class="input"
          style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 12px; font-size: 16px;"
        />
      </div>
      <div id="search-result" style="margin-bottom: 16px; min-height: 60px;"></div>
      <div style="display: flex; gap: 10px;">
        <button class="store-close" style="flex: 1;">取消</button>
        <button id="bind-btn" class="primary-btn" style="flex: 1; opacity: 0.5; cursor: not-allowed;" disabled>绑定</button>
      </div>
    </div>
  `
  
  const input = modal.querySelector('#client-search-input')
  const resultDiv = modal.querySelector('#search-result')
  const bindBtn = modal.querySelector('#bind-btn')
  let foundClient = null
  let searchTimeout = null
  
  // 搜索功能
  const performSearch = async () => {
    const keyword = input.value.trim()
    if (!keyword) {
      resultDiv.innerHTML = ''
      bindBtn.disabled = true
      bindBtn.style.opacity = '0.5'
      foundClient = null
      return
    }
    
    resultDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--muted);">搜索中...</div>'
    
    try {
      // 直接使用axios调用，避免http拦截器显示toast
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/guardian/search-client', {
        params: { keyword },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      console.log('搜索响应:', res)
      
      // axios响应格式: res.data 包含后端返回的数据
      // 后端成功返回: { code: 0, message: 'ok', data: {...} }
      const responseData = res.data
      console.log('响应数据:', responseData)
      
      // 后端成功时 code === 0
      if (responseData && responseData.code === 0) {
        const data = responseData.data
        
        if (data && data.client) {
          // 单个结果 - 使用真实数据
          foundClient = { ...data.client }
          // 始终从身份证号计算年龄，确保显示的年龄和个人中心一致
          let age = null
          if (foundClient.id_card && typeof foundClient.id_card === 'string' && foundClient.id_card.length === 18) {
            age = calculateAgeFromIdCard(foundClient.id_card)
          }
          
          const phoneDisplay = foundClient.phone || ''
          const ageDisplay = age !== null && age !== undefined ? `· ${age}岁` : ''
          const descText = phoneDisplay && ageDisplay ? `${phoneDisplay} ${ageDisplay}` : (phoneDisplay || ageDisplay || '')
          
          resultDiv.innerHTML = `
            <div style="padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--ghost-bg);">
              <div style="font-weight: var(--fw-semibold); margin-bottom: 4px;">${foundClient.name || '未知'}</div>
              <div style="font-size: 14px; color: var(--muted);">${descText}</div>
            </div>
          `
          bindBtn.disabled = false
          bindBtn.style.opacity = '1'
        } else if (data && data.clients && data.clients.length > 0) {
          // 多个结果，显示第一个 - 使用真实数据
          foundClient = { ...data.clients[0] }
          // 始终从身份证号计算年龄，确保显示的年龄和个人中心一致
          let age = null
          if (foundClient.id_card && typeof foundClient.id_card === 'string' && foundClient.id_card.length === 18) {
            age = calculateAgeFromIdCard(foundClient.id_card)
          }
          
          const phoneDisplay = foundClient.phone || ''
          const ageDisplay = age !== null && age !== undefined ? `· ${age}岁` : ''
          const descText = phoneDisplay && ageDisplay ? `${phoneDisplay} ${ageDisplay}` : (phoneDisplay || ageDisplay || '')
          
          resultDiv.innerHTML = `
            <div style="padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--ghost-bg);">
              <div style="font-weight: var(--fw-semibold); margin-bottom: 4px;">${foundClient.name || '未知'}</div>
              <div style="font-size: 14px; color: var(--muted);">${descText}</div>
            </div>
          `
          bindBtn.disabled = false
          bindBtn.style.opacity = '1'
        } else {
          resultDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: #ef4444;">未找到该用户</div>'
          bindBtn.disabled = true
          bindBtn.style.opacity = '0.5'
          foundClient = null
        }
      } else {
        const errorMsg = responseData?.message || '未找到该用户'
        resultDiv.innerHTML = `<div style="padding: 12px; text-align: center; color: #ef4444;">${errorMsg}</div>`
        bindBtn.disabled = true
        bindBtn.style.opacity = '0.5'
        foundClient = null
      }
    } catch (err) {
      console.error('搜索失败:', err)
      console.error('错误详情:', err.response)
      // 404等错误会被http拦截器reject，错误信息在err.response.data.message中
      const errorMsg = err.response?.data?.message || err.message || '搜索失败，请重试'
      resultDiv.innerHTML = `<div style="padding: 12px; text-align: center; color: #ef4444;">${errorMsg}</div>`
      bindBtn.disabled = true
      bindBtn.style.opacity = '0.5'
      foundClient = null
    }
  }
  
  // 防抖搜索
  const handleSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    searchTimeout = setTimeout(performSearch, 500)
  }
  
  input.addEventListener('input', handleSearch)
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
      performSearch()
    }
  })
  
  bindBtn.addEventListener('click', async () => {
    if (!foundClient) return
    
    try {
      const res = await bindClient(foundClient.id, '家庭监护')
      if (res.data.code === 200 || res.data.success) {
        alert('绑定成功')
        modal.remove()
        // 重新加载被监护人列表
        await reloadClients()
      } else {
        alert(res.data.message || '绑定失败')
      }
    } catch (err) {
      console.error('绑定失败:', err)
      alert(err.response?.data?.message || '绑定失败，请重试')
    }
  })
  
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('store-close') || e.target === modal) {
      modal.remove()
    }
  })
  
  document.body.appendChild(modal)
  input.focus()
}

// 监听被监护人信息更新事件（当被监护人的档案信息被更新时触发）
const handleClientInfoUpdated = (event) => {
  if (event.detail?.clientId) {
    // 重新加载被监护人列表以获取最新信息
    reloadClients()
  }
}

onMounted(() => {
  // 异步加载，不阻塞页面
  notificationStore.fetchNotifications().catch(err => console.error('加载通知失败:', err))
  
  // 异步加载被监护人列表
  reloadClients().catch(err => console.error('加载被监护人列表失败:', err))
  
  // 监听被监护人信息更新事件
  window.addEventListener('guardian-client-info-updated', handleClientInfoUpdated)
})

onUnmounted(() => {
  window.removeEventListener('guardian-client-info-updated', handleClientInfoUpdated)
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
}
.small {
  width: auto;
  padding: 10px 14px;
}

.avatar-menu {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 68px 16px 16px;
  z-index: 150;
  background: transparent;
}
.avatar-menu-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
  pointer-events: auto;
  transform-origin: top right;
  position: relative;
}
.avatar-menu-panel::before {
  content: '';
  position: absolute;
  top: -7px;
  right: 18px;
  width: 12px;
  height: 12px;
  background: var(--card);
  border-left: 1px solid var(--border);
  border-top: 1px solid var(--border);
  transform: rotate(45deg);
}

.drop-in {
  animation: dropIn 0.2s cubic-bezier(0.22, 0.68, 0.16, 1);
}

.notify-btn {
  position: relative;
}

.badge {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid var(--card);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.03);
}

@keyframes dropIn {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
