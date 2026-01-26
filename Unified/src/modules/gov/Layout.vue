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
      @history="openHistoryDialog"
      @newChat="handleNewChat"
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
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useNotificationStore } from '../../stores/notifications'

const userStore = useUserStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const route = useRoute()

const tabs = [
  { label: '概览', to: '/gov', mode: 'exact' },
  { label: '数据', to: '/gov/summary', mode: 'prefix' },
  { label: '建议', to: '/gov/suggest', mode: 'prefix' },
  { label: 'AI助手', to: '/gov/ai', mode: 'prefix' }
]

const isTabPage = computed(() => !route.meta?.hideTabBar)
const showTabBar = computed(() => isTabPage.value)
const showBack = computed(() => !isTabPage.value)
const isAIPage = computed(() => route.path === '/gov/ai')
const headerTitle = computed(() => (isTabPage.value ? `您好，${userStore.profile?.name || '尊敬的用户'}` : route.meta?.title || '返回'))
const headerSubtitle = computed(() => (isTabPage.value ? '社区概览' : ''))
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
  if (route.path !== '/gov/notifications') router.push('/gov/notifications')
}

const goProfile = () => {
  showAvatarMenu.value = false
  if (route.path !== '/gov/profile') router.push('/gov/profile')
}

const toggleAvatarMenu = () => {
  showAvatarMenu.value = !showAvatarMenu.value
}

const openHistoryDialog = () => {
  // 通过事件总线传递给AI助手页面
  window.dispatchEvent(new CustomEvent('ai-open-history'))
}

const handleNewChat = () => {
  // 通过事件总线传递给AI助手页面
  window.dispatchEvent(new CustomEvent('ai-new-chat'))
}

onMounted(() => {
  // 异步加载通知，不阻塞页面
  notificationStore.fetchNotifications().catch(err => {
    console.error('加载通知失败:', err)
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
