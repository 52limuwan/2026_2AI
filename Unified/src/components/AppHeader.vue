<template>
  <header class="app-header">
    <div class="header-content card">
      <div class="left" v-if="showBack">
        <button class="icon-btn" @click="$emit('back')">←</button>
        <div class="text">
          <h1>{{ title }}</h1>
          <p v-if="subtitle" class="muted">{{ subtitle }}</p>
        </div>
      </div>
      <div class="greet" v-else>
        <div class="brand-title">{{ title }}</div>
        <div class="loc-text" @click="$emit('location')">{{ subtitle || '选择位置' }}</div>
      </div>
      <div class="right">
        <slot />
        <!-- AI助手页面的按钮 -->
        <div v-if="showAIButtons" class="ai-header-buttons">
          <button class="ai-header-btn" @click="$emit('skills')" title="技能管理">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" fill="currentColor"/>
            </svg>
          </button>
          <button class="ai-header-btn" @click="$emit('history')" title="历史对话">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>
              <path d="M7 9h10v2H7zm0-4h10v2H7zm0 8h7v2H7z" fill="currentColor"/>
            </svg>
          </button>
          <button class="ai-header-btn" @click="$emit('newChat')" title="开启新对话">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <button class="avatar-btn" @click="$emit('avatar')">
          <img v-if="avatar" :src="avatar" alt="avatar" />
          <div v-else-if="avatarText" class="text-avatar">{{ avatarText }}</div>
          <div v-else class="default-avatar"></div>
          <span v-if="hasUnread" class="avatar-badge"></span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: ''
  },
  avatarText: {
    type: String,
    default: ''
  },
  hasUnread: {
    type: Boolean,
    default: false
  },
  showAIButtons: {
    type: Boolean,
    default: false
  }
})

defineEmits(['back', 'avatar', 'location', 'history', 'newChat', 'skills'])
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0;
  background: var(--card);
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
  padding: 8px 18px;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  border-radius: 0 !important;
  background: var(--card);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
  border-bottom: 1px solid var(--border);
}

.left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text h1 {
  margin: 0;
  font-size: calc(var(--fs-title) * var(--font-scale));
  line-height: var(--lh-tight);
}

.text .muted {
  margin-top: 4px;
}

.greet {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  font-size: calc(var(--fs-display) * 0.85 * var(--font-scale));
  font-weight: var(--fw-semibold);
  line-height: var(--lh-tight);
}

.brand-title {
  font-size: calc(var(--fs-title) * var(--font-scale));
  font-weight: var(--fw-semibold);
}

.loc-text {
  font-size: calc(var(--fs-body) * var(--font-scale));
  color: var(--muted);
  cursor: pointer;
}

:global(.store-modal) {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}
:global(.store-dialog) {
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  width: min(420px, 100%);
  box-shadow: var(--shadow);
}
:global(.store-dialog h3) {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: var(--fw-semibold);
}
:global(.store-list) {
  list-style: none;
  padding: 0;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
:global(.store-list li) {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
:global(.store-list li:hover) {
  background: var(--ghost-bg);
  border-color: var(--accent-strong);
}
:global(.store-list li:active) {
  transform: scale(0.98);
}
:global(.store-name) {
  font-weight: var(--fw-semibold);
}
:global(.store-desc) {
  color: var(--muted);
  font-size: 13px;
}
:global(.store-close) {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--ghost-bg);
  cursor: pointer;
}

.icon-btn {
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--ghost-bg);
  font-size: 18px;
}

.right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.avatar-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--fw-semibold);
  color: var(--text);
  cursor: pointer;
  overflow: visible;
  box-shadow: none !important;
  padding: 0;
  background: transparent;
}
.avatar-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 0;
}
.avatar-btn .text-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-radius: 50%;
  font-size: 16px;
  font-weight: var(--fw-semibold);
  position: relative;
  z-index: 0;
}

.avatar-btn .default-avatar {
  width: 100%;
  height: 100%;
  display: block;
  background:
    url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23cbd5e1' stroke-width='6'%3E%3Ccircle cx='40' cy='28' r='14' fill='%23e5e7eb'/%3E%3Cpath d='M20 66c4-10 12-16 20-16s16 6 20 16' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E")
      center/64% no-repeat,
    linear-gradient(135deg, #eef2f7, #e5e7eb);
  border-radius: 50%;
  position: relative;
  z-index: 0;
}

.avatar-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: #ef4444;
  border: 2px solid var(--card);
  border-radius: 50%;
  z-index: 2;
}

.ai-header-buttons {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ai-header-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--ghost-bg);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.ai-header-btn:hover {
  background: var(--ghost-bg-hover);
}

.ai-header-btn svg {
  width: 18px;
  height: 18px;
}

/* 暗黑模式下头像灰色遮罩 */
.avatar-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(107, 114, 128, 0.5);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.2s ease;
}
</style>

<style>
/* 暗黑模式下显示遮罩 */
[data-theme='dark'] .avatar-btn::after {
  opacity: 1;
}
</style>
