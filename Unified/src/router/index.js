import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

// 只预加载登录页，其他组件使用懒加载
import Login from '../views/Login.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login, meta: { public: true } },
  {
    path: '/client',
    component: () => import('../modules/client/Layout.vue'),
    meta: { role: 'client' },
    children: [
      { path: '', component: () => import('../modules/client/Home.vue'), meta: { title: '首页' } },
      { path: 'menu', component: () => import('../modules/client/Menu.vue'), meta: { title: '点餐' } },
      { path: 'orders', component: () => import('../modules/client/Orders.vue'), meta: { title: '订单' } },
      { path: 'order-status/:id', component: () => import('../modules/client/OrderStatus.vue'), meta: { title: '订单状态', hideTabBar: true } },
      { path: 'ai', component: () => import('../modules/client/AIAssistant.vue'), meta: { title: 'AI助手' } },
      { path: 'reports', component: () => import('../modules/client/Reports.vue'), meta: { title: '报告' } },
      { path: 'ai-reports', component: () => import('../modules/client/AiReports.vue'), meta: { title: '历史报告', hideTabBar: true } },
      { path: 'ai-reports/:id', component: () => import('../modules/client/AiReportDetail.vue'), meta: { title: '报告详情', hideTabBar: true } },
      { path: 'notifications', component: () => import('../modules/client/Notifications.vue'), meta: { title: '通知' } },
      { path: 'profile', component: () => import('../modules/client/Profile.vue'), meta: { title: '个人中心' } }
    ]
  },
  {
    path: '/guardian',
    component: () => import('../modules/guardian/Layout.vue'),
    meta: { role: 'guardian' },
    children: [
      { path: '', component: () => import('../modules/guardian/Home.vue'), meta: { title: '首页' } },
      { path: 'orders', component: () => import('../modules/guardian/Orders.vue'), meta: { title: '订单' } },
      { path: 'reports', component: () => import('../modules/guardian/Reports.vue'), meta: { title: '报告' } },
      { path: 'ai-reports/:clientId', component: () => import('../modules/guardian/AiReports.vue'), meta: { title: '历史报告', hideTabBar: true } },
      { path: 'ai-reports/:clientId/:reportId', component: () => import('../modules/guardian/AiReportDetail.vue'), meta: { title: '报告详情', hideTabBar: true } },
      { path: 'ai', component: () => import('../modules/guardian/AIAssistant.vue'), meta: { title: 'AI助手' } },
      { path: 'health-monitor', component: () => import('../modules/guardian/HealthMonitor.vue'), meta: { title: '健康监测', hideTabBar: true } },
      { path: 'notifications', component: () => import('../modules/guardian/Notifications.vue'), meta: { title: '通知' } },
      { path: 'profile', component: () => import('../modules/guardian/Profile.vue'), meta: { title: '个人中心' } },
      { path: 'client/:clientId', component: () => import('../modules/guardian/ClientProfile.vue'), meta: { title: '守护对象档案', hideTabBar: true } }
    ]
  },
  {
    path: '/merchant',
    component: () => import('../modules/merchant/Layout.vue'),
    meta: { role: 'merchant' },
    children: [
      { path: '', component: () => import('../modules/merchant/Dashboard.vue'), meta: { title: '看板' } },
      { path: 'dishes', component: () => import('../modules/merchant/Dishes.vue'), meta: { title: '菜品' } },
      { path: 'orders', component: () => import('../modules/merchant/Orders.vue'), meta: { title: '订单' } },
      { path: 'plans', component: () => import('../modules/merchant/PurchasePlan.vue'), meta: { title: '采购计划' } },
      { path: 'notifications', component: () => import('../modules/merchant/Notifications.vue'), meta: { title: '通知', hideTabBar: true } },
      { path: 'profile', component: () => import('../modules/merchant/Profile.vue'), meta: { title: '店铺中心', hideTabBar: true } },
      { path: 'solar-tips', component: () => import('../modules/merchant/SolarTips.vue'), meta: { title: '节气建议' } }
    ]
  },
  {
    path: '/gov',
    component: () => import('../modules/gov/Layout.vue'),
    meta: { role: 'gov' },
    children: [
      { path: '', component: () => import('../modules/gov/Residents.vue'), meta: { title: '概览' } },
      { path: 'clients/:id', component: () => import('../modules/gov/ClientDetail.vue'), meta: { title: '居民详情', hideTabBar: true } },
      { path: 'summary', component: () => import('../modules/gov/Summary.vue'), meta: { title: '数据' } },
      { path: 'suggest', component: () => import('../modules/gov/Suggest.vue'), meta: { title: '建议' } },
      { path: 'ai', component: () => import('../modules/gov/AIAssistant.vue'), meta: { title: 'AI助手' } },
      { path: 'notifications', component: () => import('../modules/gov/Notifications.vue'), meta: { title: '通知', hideTabBar: true } },
      { path: 'profile', component: () => import('../modules/gov/Profile.vue'), meta: { title: '个人中心', hideTabBar: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  const store = useUserStore()
  if (to.meta.public) {
    // 如果访问登录页且已登录，自动重定向到对应角色页面
    if (to.path === '/login' && store.checkAuth()) {
      // 只在没有 profile 时才刷新，避免每次都请求
      if (!store.profile || !store.profile.id) {
        try {
          await store.refreshProfile()
        } catch (err) {
          console.error('刷新用户信息失败:', err)
        }
      }
      const roleRoutes = {
        client: '/client',
        guardian: '/guardian',
        merchant: '/merchant',
        gov: '/gov'
      }
      const target = roleRoutes[store.profile?.role] || '/client'
      next(target)
      return
    }
    next()
    return
  }
  // 检查认证状态（包括过期检查）
  if (!store.checkAuth()) {
    next('/login')
    return
  }
  // 只在首次进入或 profile 为空时才刷新用户信息
  if (!store.profile || !store.profile.id) {
    try {
      await store.refreshProfile()
    } catch (err) {
      console.error('刷新用户信息失败:', err)
      next('/login')
      return
    }
  }
  if (to.meta.role && store.profile?.role && to.meta.role !== store.profile.role) {
    next('/login')
    return
  }
  next()
})

export default router
