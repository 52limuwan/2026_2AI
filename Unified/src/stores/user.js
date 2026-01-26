import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, register as registerApi, fetchMe } from '../api/auth'

const STORAGE_KEY = 'auth_storage'
const TOKEN_EXPIRY_KEY = 'token_expiry'
const TOKEN_EXPIRY_DURATION = 60 * 60 * 1000 // 1小时（毫秒）

function getStorage() {
  const mode = localStorage.getItem(STORAGE_KEY) || 'local'
  return mode === 'session' ? sessionStorage : localStorage
}

function isTokenExpired() {
  const storage = getStorage()
  const expiry = storage.getItem(TOKEN_EXPIRY_KEY)
  if (!expiry) return true
  const expiryTime = parseInt(expiry, 10)
  return Date.now() > expiryTime
}

function loadProfile() {
  const storage = getStorage()
  const stored = storage.getItem('profile')
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch (err) {
    storage.removeItem('profile')
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  // 初始化时检查token是否过期
  const initStorage = getStorage()
  const tokenValue = initStorage.getItem('token') || ''
  const isExpired = tokenValue ? isTokenExpired() : true
  
  if (isExpired && tokenValue) {
    // token过期，清除所有认证信息
    initStorage.removeItem('token')
    initStorage.removeItem('profile')
    initStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem('token')
    localStorage.removeItem('profile')
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('profile')
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY)
  }
  
  const token = ref(isExpired ? '' : tokenValue)
  const profile = ref(isExpired ? null : loadProfile())
  
  const logout = () => {
    token.value = ''
    profile.value = null
    clearAll()
  }

  const setAuth = (authToken, data, rememberMe = true) => {
    const mode = rememberMe ? 'local' : 'session'
    localStorage.setItem(STORAGE_KEY, mode)
    localStorage.removeItem('token')
    localStorage.removeItem('profile')
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('profile')
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY)
    const storage = mode === 'session' ? sessionStorage : localStorage
    token.value = authToken || ''
    profile.value = data || null
    storage.setItem('token', token.value)
    storage.setItem('profile', JSON.stringify(profile.value))
    // 设置过期时间（1小时后）
    if (rememberMe && authToken) {
      const expiryTime = Date.now() + TOKEN_EXPIRY_DURATION
      storage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
    }
  }

  const clearAll = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('profile')
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('profile')
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY)
  }
  
  const checkAuth = () => {
    // 检查token是否过期
    if (token.value && isTokenExpired()) {
      logout()
      return false
    }
    return !!token.value
  }

  const unwrap = (res) => res?.data?.data || res?.data || {}

  const login = async (payload) => {
    const { token: authToken, user } = unwrap(await loginApi(payload))
    setAuth(authToken, user, payload.rememberMe !== false)
    return user
  }

  const register = async (payload) => {
    const { token: authToken, user } = unwrap(await registerApi(payload))
    setAuth(authToken, user, true)
    return user
  }

  const refreshProfile = async () => {
    if (!token.value) return null
    const { user } = unwrap(await fetchMe())
    profile.value = user || null
    const storage = getStorage()
    storage.setItem('profile', JSON.stringify(profile.value))
    return profile.value
  }

  // 更新用户信息并同步到storage
  const updateProfile = (userData) => {
    if (!profile.value) return
    profile.value = { ...profile.value, ...userData }
    const storage = getStorage()
    storage.setItem('profile', JSON.stringify(profile.value))
  }

  return {
    token,
    profile,
    login,
    register,
    refreshProfile,
    updateProfile,
    logout,
    checkAuth
  }
})
