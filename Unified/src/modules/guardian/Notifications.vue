<template>
  <div class="card" v-if="notifications.length">
    <div class="list">
      <div 
        class="item" 
        v-for="n in notifications" 
        :key="n.id" 
        :class="{ unread: !n.read }"
        @click="!n.read && markAsRead(n)"
      >
        <transition name="fade">
          <div class="unread-indicator" v-if="!n.read"></div>
        </transition>
        <div class="item-content">
          <div class="item-header">
            <strong class="title">{{ n.title || '系统通知' }}</strong>
            <span class="time">{{ displayTime(n) }}</span>
          </div>
          <p class="content">{{ n.message || n.content || '暂无内容' }}</p>
        </div>
      </div>
    </div>
  </div>
  <div class="card" v-else>
    <p class="muted">暂无通知</p>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useNotificationStore } from '../../stores/notifications'

const notificationStore = useNotificationStore()
const notifications = computed(() => notificationStore.items)

const load = async () => {
  await notificationStore.fetchNotifications()
}

const markAsRead = async (n) => {
  if (!n?.id) return
  await notificationStore.markAsRead(n.id)
}

const displayTime = (n) => n.created_at || n.time || ''

onMounted(load)
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
}

.item {
  position: relative;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.2s ease;
}

.item:last-child {
  border-bottom: none;
}

.item:hover {
  background: var(--ghost-bg);
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}

.item.unread {
  padding-left: 20px;
}

.unread-indicator {
  position: absolute;
  left: 0;
  top: 20px;
  width: 4px;
  height: calc(100% - 40px);
  background: var(--accent);
  border-radius: 2px;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.title {
  font-size: 17px;
  font-weight: var(--fw-semibold);
  margin: 0;
  color: var(--text);
  line-height: 1.6;
  flex: 1;
  min-width: 0;
}

.item.unread .title {
  color: var(--accent-strong);
}

.content {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
  word-break: break-word;
  padding-right: 4px;
}

.time {
  color: var(--muted);
  font-size: 13px;
  flex-shrink: 0;
  white-space: nowrap;
  font-weight: var(--fw-regular);
}

.fade-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: scaleY(0.3);
}

.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.3);
}
</style>
