<template>
  <div class="login-page">
    <div class="login-body">
      <h1 class="title">智膳伙伴</h1>
      <p class="muted">统一认证</p>

      <label class="field">
        <span>用户名</span>
        <input class="input" v-model="identifier" placeholder="手机号 / 用户名" />
      </label>

      <label class="field">
        <span>密码</span>
        <input class="input" type="password" v-model="password" placeholder="请输入密码" @keyup.enter="login" />
      </label>

      <div class="actions">
        <div class="actions-left">
          <label class="remember">
            <input type="checkbox" v-model="rememberMe" />
            记住我
          </label>
          <button class="link-btn" type="button" @click="registerPrompt">还没有账号？点击注册</button>
        </div>
        <button class="link-btn" type="button" @click="forgot">忘记密码</button>
      </div>

      <button class="primary-btn" type="button" @click="login">登录</button>

      <p v-if="message" class="status">{{ message }}</p>

      <div class="other">
        <span class="muted">其他登录方式</span>
        <div class="social">
          <button class="ghost-btn" type="button" @click="placeholder">微信</button>
          <button class="ghost-btn" type="button" @click="placeholder">短信</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const STORAGE_KEY = 'auth_storage'
const LAST_IDENTIFIER_KEY = 'login_identifier'

const router = useRouter()
const userStore = useUserStore()

const identifier = ref('')
const password = ref('')
const message = ref('')
const rememberMe = ref(true) // 默认勾选

const initRemember = () => {
  const mode = localStorage.getItem(STORAGE_KEY)
  // 如果之前没有存储过模式，默认使用local（记住我）
  rememberMe.value = mode !== 'session'
  if (rememberMe.value) {
    identifier.value = localStorage.getItem(LAST_IDENTIFIER_KEY) || ''
  }
  // 检查是否已登录，如果已登录则自动重定向
  if (userStore.checkAuth()) {
    const roleRoutes = {
      client: '/client',
      guardian: '/guardian',
      merchant: '/merchant',
      gov: '/gov'
    }
    const target = roleRoutes[userStore.profile?.role] || '/client'
    router.push(target)
  }
}

if (typeof window !== 'undefined') {
  initRemember()
}

const roleRoutes = {
  client: '/client',
  guardian: '/guardian',
  merchant: '/merchant',
  gov: '/gov'
}

const redirect = () => {
  const target = roleRoutes[userStore.profile?.role] || '/client'
  router.push(target)
}

const login = async () => {
  message.value = ''
  try {
    await userStore.login({ identifier: identifier.value, password: password.value, rememberMe: rememberMe.value })
    if (rememberMe.value) {
      localStorage.setItem(LAST_IDENTIFIER_KEY, identifier.value || '')
    } else {
      localStorage.removeItem(LAST_IDENTIFIER_KEY)
    }
    redirect()
  } catch (err) {
    message.value = err?.response?.data?.message || '操作失败'
  }
}

const forgot = () => {
  message.value = '功能开发中，敬请期待'
}

const placeholder = () => {
  message.value = '第三方登录对接中，先用示例账号体验吧'
}

const registerPrompt = () => {
  message.value = '功能开发中，敬请期待'
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: #fff;
  color: var(--text);
}

.login-body {
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

.title {
  margin: 0;
  font-size: 24px;
  color: var(--text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
  color: var(--text);
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.link-btn {
  border: none;
  background: none;
  color: var(--accent-strong);
  font-weight: 700;
  cursor: pointer;
  padding: 6px 0;
  transition: opacity 0.2s ease;
}

.link-btn:hover {
  opacity: 0.8;
}

.actions-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.remember {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--text);
}

.other {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.social {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.status {
  margin: 0;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
  padding: 10px 12px;
  border-radius: 12px;
  font-weight: 700;
}
</style>

<style>
/* 暗黑模式适配 */
[data-theme='dark'] .login-page {
  background: #0f172a;
}

[data-theme='dark'] .status {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}
</style>
