import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isElderMode = ref(localStorage.getItem('elderMode') === 'true')
  
  // 清除旧的主题设置，固定为浅色模式
  localStorage.removeItem('themeMode')
  localStorage.removeItem('manualTheme')
  const themeMode = ref('light')
  const manualTheme = ref(null)

  // 固定为浅色模式
  const effectiveTheme = computed(() => {
    // 始终返回浅色模式
    return 'light'
  })

  const applyTheme = (mode) => {
    document.documentElement.dataset.theme = mode
  }

  const setTheme = (mode) => {
    // 固定为浅色模式，忽略所有主题切换请求
    applyTheme('light')
  }

  const toggleElderMode = (value) => {
    isElderMode.value = typeof value === 'boolean' ? value : !isElderMode.value
  }

  watch(isElderMode, (val) => {
    localStorage.setItem('elderMode', val ? 'true' : 'false')
  })

  watch(
    effectiveTheme,
    (val) => {
      applyTheme(val)
    },
    { immediate: true }
  )

  return {
    isElderMode,
    toggleElderMode,
    themeMode,
    effectiveTheme,
    setTheme
  }
})
