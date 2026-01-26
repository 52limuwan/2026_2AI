import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listNotifications, markRead } from '../api/notifications'

const STORAGE_KEY = 'client_notification_read_ids'
const normalizeId = (id) => (id == null ? '' : String(id))

const loadReadIds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.map(normalizeId) : [])
  } catch (err) {
    console.error('读取通知已读缓存失败', err)
    return new Set()
  }
}

const saveReadIds = (set) => {
  const arr = Array.from(set).map(normalizeId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
}

const fallbackNotifications = [
  {
    id: 1,
    title: '饮食提醒',
    message: '本周盐摄入偏高，请选择低钠菜品。',
    created_at: '2026-01-09 03:40:46',
    read: false
  },
  {
    id: 2,
    title: '订单配送',
    message: '您的订单 #20260108001 已开始配送，预计30分钟后送达。',
    created_at: '2026-01-09 02:15:23',
    read: false
  },
  {
    id: 3,
    title: '健康报告',
    message: '您的本周健康报告已生成，点击查看详细分析。',
    created_at: '2026-01-08 18:30:12',
    read: true
  },
  {
    id: 4,
    title: '系统通知',
    message: '系统将于今晚22:00进行维护升级，预计持续30分钟。',
    created_at: '2026-01-08 15:20:45',
    read: true
  },
  {
    id: 5,
    title: '营养建议',
    message: '根据您的健康档案，建议增加蛋白质摄入，推荐高蛋白套餐。',
    created_at: '2026-01-08 10:05:33',
    read: false
  },
  {
    id: 6,
    title: '订单完成',
    message: '您的订单 #20260107005 已完成，感谢您的使用。',
    created_at: '2026-01-07 19:45:21',
    read: true
  }
]

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const readIds = ref(loadReadIds())

  const hasUnread = computed(() => items.value.some((n) => {
    // 处理后端返回的status字段 ('unread'/'read') 或read布尔值
    if (n.status !== undefined) {
      return n.status === 'unread'
    }
    return !n.read
  }))
  const unreadCount = computed(() => items.value.filter((n) => {
    if (n.status !== undefined) {
      return n.status === 'unread'
    }
    return !n.read
  }).length)

  const applyReadState = (list = []) =>
    list.map((n) => {
      // 处理后端返回的status字段，转换为read布尔值
      let isRead = false
      if (n.status !== undefined) {
        isRead = n.status === 'read' || readIds.value.has(normalizeId(n.id))
      } else {
        isRead = n.read || readIds.value.has(normalizeId(n.id))
      }
      return {
        ...n,
        read: isRead,
        // 同时保留status字段以保持兼容
        status: isRead ? 'read' : 'unread'
      }
    })

  const setNotifications = (list = []) => {
    items.value = Array.isArray(list) ? applyReadState(list) : []
  }

  const fetchNotifications = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await listNotifications()
      const data = res?.data?.data?.notifications ?? res?.data?.data ?? res?.data ?? []
      // 确保后端返回的数据格式正确，将status字段映射为read布尔值
      const normalizedData = Array.isArray(data) ? data.map(n => ({
        ...n,
        // 如果后端返回status字段（'unread'/'read'），转换为read布尔值
        read: n.status === 'read' || (n.status !== 'unread' && n.read === true)
      })) : []
      setNotifications(normalizedData)
    } catch (err) {
      console.error('加载通知失败，使用示例数据', err)
      error.value = err
      setNotifications(fallbackNotifications)
    } finally {
      loading.value = false
    }
  }

  const markAsRead = async (id) => {
    const normalizedId = normalizeId(id)
    if (!normalizedId) return
    try {
      await markRead(id)
    } catch (err) {
      console.error(err)
    }
    const target = items.value.find((n) => normalizeId(n.id) === normalizedId)
    if (target) {
      target.read = true
      target.status = 'read'
    }
    readIds.value.add(normalizedId)
    saveReadIds(readIds.value)
  }

  return {
    items,
    loading,
    error,
    hasUnread,
    unreadCount,
    fetchNotifications,
    setNotifications,
    markAsRead
  }
})
