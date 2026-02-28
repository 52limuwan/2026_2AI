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
      @location="openLocationPicker"
      @history="openHistoryDialog"
      @newChat="handleNewChat"
      @skills="openSkillsManager"
      @settings="openSettings"
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
import { computed, onMounted, ref, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useNotificationStore } from '../../stores/notifications'
import { getStores } from '../../api/client'

const userStore = useUserStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const route = useRoute()

const tabs = [
  { label: '首页', to: '/client', mode: 'exact' },
  { label: '点餐', to: '/client/menu', mode: 'prefix' },
  { label: '报告', to: '/client/reports', mode: 'prefix' },
  { label: 'AI助手', to: '/client/ai', mode: 'prefix' }
]

const stores = ref([])
const selectedStore = ref(null)

// 提供给子组件使用的店面信息
provide('selectedStore', selectedStore)

const isTabPage = computed(() => !route.meta?.hideTabBar)
const showTabBar = computed(() => isTabPage.value)
const showBack = computed(() => !isTabPage.value)
const isAIPage = computed(() => route.path === '/client/ai')
const headerTitle = computed(() => (isTabPage.value ? '康小伴' : route.meta?.title || '返回'))
const headerSubtitle = computed(() => {
  if (!isTabPage.value) return ''
  return '你的全能陪伴伙伴'
})
const hasUnread = computed(() => notificationStore.hasUnread)

const showAvatarMenu = ref(false)

const openLocationPicker = async () => {
  // 加载店面列表
  try {
    const res = await getStores()
    stores.value = res.data.data.stores || []
    console.log('加载到的店面:', stores.value)
  } catch (err) {
    console.error('加载店面列表失败', err)
    stores.value = []
  }
  
  const modal = document.createElement('div')
  modal.className = 'store-modal'
  modal.innerHTML = `
    <div class="store-dialog">
      <h3>选择店面</h3>
      <ul class="store-list">
        ${stores.value.length > 0 ? stores.value
          .map(
            (s, i) =>
              `<li data-idx="${i}" ${selectedStore.value?.id === s.id ? 'class="selected"' : ''}>
                <div class="store-name">${s.name || '未知'}</div>
                <div class="store-desc">${s.location || ''} ${s.merchant_name ? `· ${s.merchant_name}` : ''}</div>
              </li>`
          )
          .join('') : '<li style="padding: 20px; text-align: center; color: var(--muted);">暂无店面</li>'}
      </ul>
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
      if (stores.value[idx]) {
        selectedStore.value = stores.value[idx]
        // 将选择的店面ID存储到localStorage
        localStorage.setItem('selectedStoreId', stores.value[idx].id)
        // 通知子组件店面已更改，需要重新加载菜品
        window.dispatchEvent(new CustomEvent('client-store-changed', { 
          detail: { store: stores.value[idx] } 
        }))
      }
      modal.remove()
    }
  })
  
  document.body.appendChild(modal)
}

const goBack = () => {
  router.back()
}

const goNotifications = () => {
  showAvatarMenu.value = false
  if (route.path !== '/client/notifications') router.push('/client/notifications')
}

const goProfile = () => {
  showAvatarMenu.value = false
  router.push('/client/profile')
}

const toggleAvatarMenu = () => {
  showAvatarMenu.value = !showAvatarMenu.value
}

const logout = () => {
  showAvatarMenu.value = false
  userStore.logout()
  router.push('/login')
}

const openHistoryDialog = () => {
  // 通过事件总线或者ref传递给AI助手页面
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

const openSettings = () => {
  // 通过事件总线传递给AI助手页面
  window.dispatchEvent(new CustomEvent('ai-open-settings'))
}

onMounted(() => {
  // 异步加载，不阻塞页面
  notificationStore.fetchNotifications().catch(err => console.error('加载通知失败:', err))
  
  // 异步加载店面列表
  getStores().then(res => {
    stores.value = res.data.data.stores || []
    console.log('初始加载店面:', stores.value)
    // 从localStorage恢复之前选择的店面
    const savedStoreId = localStorage.getItem('selectedStoreId')
    if (savedStoreId && stores.value.length > 0) {
      const savedStore = stores.value.find(s => s.id == savedStoreId)
      if (savedStore) {
        selectedStore.value = savedStore
      } else if (stores.value.length > 0) {
        selectedStore.value = stores.value[0]
        localStorage.setItem('selectedStoreId', stores.value[0].id)
      }
    } else if (stores.value.length > 0) {
      selectedStore.value = stores.value[0]
      localStorage.setItem('selectedStoreId', stores.value[0].id)
    }
  }).catch(err => {
    console.error('加载店面列表失败', err)
  })
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
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

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.small {
  width: auto;
  padding: 10px 14px;
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
