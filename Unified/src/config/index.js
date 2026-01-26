/**
 * 前端配置管理
 * 集中管理所有配置项
 */

const config = {
  // API配置
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
    retryTimes: parseInt(import.meta.env.VITE_API_RETRY_TIMES || '3', 10),
    retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000', 10)
  },

  // 认证配置
  auth: {
    tokenKey: 'token',
    profileKey: 'profile',
    expiryKey: 'token_expiry',
    storageKey: 'auth_storage',
    tokenExpiryDuration: 60 * 60 * 1000, // 1小时
    refreshThreshold: 5 * 60 * 1000 // 提前5分钟刷新
  },

  // 应用配置
  app: {
    name: '智膳伙伴',
    version: '1.0.0',
    env: import.meta.env.MODE || 'development',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  },

  // 路由配置
  routes: {
    client: '/client',
    guardian: '/guardian',
    merchant: '/merchant',
    gov: '/gov',
    login: '/login'
  },

  // 分页配置
  pagination: {
    defaultPageSize: 20,
    pageSizes: [10, 20, 50, 100]
  },

  // 文件上传配置
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    acceptTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    acceptExtensions: ['.jpg', '.jpeg', '.png']
  },

  // 缓存配置
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000 // 5分钟
  }
};

export default config;
