<template>
  <div class="layout">
    <AppHeader
      :title="headerTitle"
      :subtitle="headerSubtitle"
      :showBack="showBack"
      :hasUnread="hasUnread"
      @back="goBack"
      @avatar="toggleAvatarMenu"
      @location="openStorePicker"
    />

    <div v-if="showAvatarMenu" class="avatar-menu" @click.self="showAvatarMenu = false">
      <div class="avatar-menu-panel drop-in">
        <button class="ghost-btn" @click="goProfile">店铺中心</button>
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
import { getStores, getCurrentStore, switchStore } from '../../api/merchant'

const userStore = useUserStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const route = useRoute()

const tabs = [
  { label: '看板', to: '/merchant', mode: 'exact' },
  { label: '订单', to: '/merchant/orders', mode: 'prefix' },
  { label: '菜品', to: '/merchant/dishes', mode: 'prefix' },
  { label: '采购计划', to: '/merchant/plans', mode: 'prefix' }
]

const stores = ref([])
const currentStore = ref(null)

// 移除地址中的地级市部分（如"杭州市"、"上海市"等）
const removeCityFromAddress = (address) => {
  if (!address || typeof address !== 'string') return address
  // 先去除首尾空格
  const trimmed = address.trim()
  // 匹配地级市模式：XX市（如"杭州市"、"上海市"、"北京市"等）
  // 使用正则表达式匹配：开头的2-4个中文字符 + "市" + 可能的空格或标点
  // 匹配示例：杭州市、上海市、北京市、乌鲁木齐市等
  // 支持：杭州市西湖区、杭州市，西湖区等格式
  const result = trimmed.replace(/^[\u4e00-\u9fa5]{2,4}市[\s，,]*/, '').trim()
  // 如果移除后为空或只有空格，说明原地址可能就是地级市名称，返回原地址
  return result || trimmed
}

const isTabPage = computed(() => !route.meta?.hideTabBar)
const showTabBar = computed(() => isTabPage.value)
const showBack = computed(() => !isTabPage.value)
const headerTitle = computed(() => (isTabPage.value ? `您好，${userStore.profile?.name || '尊敬的用户'}` : route.meta?.title || '返回'))
const headerSubtitle = computed(() => {
  if (!isTabPage.value) return ''
  // 显示当前店面位置，如果没有选择店面则显示"今日经验概览"
  if (currentStore.value) {
    // 如果有地址（location字段），移除地级市部分后显示
    if (currentStore.value.location) {
      return removeCityFromAddress(currentStore.value.location) || currentStore.value.name || '今日经验概览'
    }
    // 如果没有地址，显示店面名称
    return currentStore.value.name || '今日经验概览'
  }
  return '今日经验概览'
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
  if (route.path !== '/merchant/notifications') router.push('/merchant/notifications')
}

const goProfile = () => {
  showAvatarMenu.value = false
  if (route.path !== '/merchant/profile') router.push('/merchant/profile')
}

const toggleAvatarMenu = () => {
  showAvatarMenu.value = !showAvatarMenu.value
}

const openStorePicker = async () => {
  // 加载店面列表
  try {
    const res = await getStores()
    console.log('店面API响应:', res)
    stores.value = res.data.data.stores || []
    console.log('店面列表:', stores.value)
  } catch (err) {
    console.error('加载店面列表失败', err)
    console.error('错误详情:', err.response?.data)
    stores.value = []
  }
  
  // 生成店面列表 HTML
  const storeListHtml = stores.value.length > 0 ? stores.value
    .map((s, i) => {
      // 显示地址，如果地址存在则移除地级市部分
      const displayLocation = s.location ? removeCityFromAddress(s.location) : ''
      const locationText = displayLocation ? `· ${displayLocation}` : ''
      const descText = s.description ? (locationText ? '' : `· ${s.description}`) : ''
      const distanceText = s.distance || ''
      return `<li data-idx="${i}" ${currentStore.value?.id === s.id ? 'class="selected"' : ''}>
        <div class="store-name">${s.name || '未知'}</div>
        <div class="store-desc">${distanceText}${locationText}${descText}</div>
      </li>`
    })
    .join('') : '<li style="padding: 20px; text-align: center; color: var(--muted);">暂无店面，请先创建店面</li>'
  
  const modal = document.createElement('div')
  modal.className = 'store-modal'
  modal.innerHTML = `
    <div class="store-dialog">
      <h3>选择店面</h3>
      <ul class="store-list">
        ${storeListHtml}
      </ul>
      <div style="padding: 12px 0; border-top: 1px solid var(--border); margin-top: 8px;">
        <button class="store-add-btn" data-action="add" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--accent-strong); background: transparent; color: var(--accent-strong); font-weight: var(--fw-semibold); cursor: pointer;">+ 添加店面</button>
      </div>
      <button class="store-close">关闭</button>
    </div>
  `
  
  modal.addEventListener('click', async (e) => {
    if (e.target.classList.contains('store-close') || e.target === modal) {
      modal.remove()
    }
    const li = e.target.closest('li[data-idx]')
    if (li && li.dataset.idx !== undefined && !isNaN(Number(li.dataset.idx))) {
      const idx = Number(li.dataset.idx)
      if (stores.value[idx]) {
        const selectedStore = stores.value[idx]
        try {
          await switchStore(selectedStore.id)
          currentStore.value = selectedStore
          // 通知子组件店面已更改，需要重新加载数据
          window.dispatchEvent(new CustomEvent('merchant-store-changed', { 
            detail: { store: selectedStore } 
          }))
          modal.remove()
        } catch (err) {
          console.error('切换店面失败', err)
          alert('切换店面失败，请重试')
        }
      }
      return
    }
    if (e.target.classList.contains('store-add-btn') || e.target.closest('.store-add-btn')) {
      modal.remove()
      // 这里可以打开创建店面的对话框
      alert('创建店面功能开发中，请通过后台管理创建')
      return
    }
  })
  
  document.body.appendChild(modal)
}

const loadCurrentStore = async () => {
  try {
    const res = await getCurrentStore()
    currentStore.value = res.data.data.store || null
  } catch (err) {
    console.error('加载当前店面失败', err)
  }
}

onMounted(() => {
  // 异步加载，不阻塞页面
  notificationStore.fetchNotifications().catch(err => console.error('加载通知失败:', err))
  loadCurrentStore().catch(err => console.error('加载当前店面失败:', err))
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
