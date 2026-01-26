import axios from 'axios'
import config from '../config'
import { showToast } from '../utils/toast'
import { useUserStore } from '../stores/user'

const http = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout
})

http.interceptors.request.use((config) => {
  const userStore = useUserStore()
  const token = userStore.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const payload = response.data
    if (payload && typeof payload.code !== 'undefined' && payload.code !== 0) {
      showToast(payload.message || '请求失败', 'error')
      const err = new Error(payload.message || '请求失败')
      err.response = response
      return Promise.reject(err)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      showToast('登录已过期，请重新登录', 'error')
      const userStore = useUserStore()
      userStore.logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }
    
    const message = error?.response?.data?.message || error.message || '网络错误'
    showToast(message, 'error')
    return Promise.reject(error)
  }
)

export const unwrap = (resp) => resp?.data?.data ?? resp?.data ?? {}

export default http
