import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './style.css'

// 静默 ECharts 的 alignTicks 警告
const originalConsoleWarn = console.warn
console.warn = function(...args) {
  const message = args[0]
  if (typeof message === 'string' && message.includes('alignTicks')) {
    return // 忽略 alignTicks 相关警告
  }
  originalConsoleWarn.apply(console, args)
}

const app = createApp(App)
const pinia = createPinia()

// 先注册 pinia，再注册 router（确保 store 在路由守卫中可用）
app.use(pinia)
app.use(ElementPlus)
app.use(router)

app.mount('#app')

// 控制台命令：切换主题
if (typeof window !== 'undefined') {
  // 等待 pinia 初始化后设置命令
  setTimeout(() => {
    import('./stores/ui').then(({ useUiStore }) => {
      const uiStore = useUiStore()
      
      // 暴露全局命令函数
      window.qs = () => {
        uiStore.setTheme('light')
      }
      
      window.ss = () => {
        uiStore.setTheme('dark')
      }
    })
  }, 100)
}