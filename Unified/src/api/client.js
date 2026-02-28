import http from './http'

export const getRecommendations = (params) => http.get('/client/recommendations/menu', { params })
export const getPersonalizedRecommendations = (params) => http.get('/client/recommendations/personalized', { params })
export const getClientDishes = (params) => http.get('/client/dishes', { params })
export const createOrder = (payload) => http.post('/client/orders', payload)
export const getOrders = () => http.get('/client/orders')
export const getOrderById = (id) => http.get(`/client/orders/${id}`)
export const updateOrderStatus = (id, status) => http.patch(`/client/orders/${id}/status`, { status })
export const getWeeklyReport = () => http.get('/client/reports/weekly')
export const getMonthlyReport = () => http.get('/client/reports/monthly')
export const setElderMode = (enabled) => http.post('/client/elder-mode', { enabled })
export const getTodayNutrition = () => http.get('/client/nutrition/today')

// 饮食记录相关API
export const createDietaryRecord = (payload) => http.post('/client/dietary-records', payload)
export const getDietaryRecords = (params) => http.get('/client/dietary-records', { params })
export const updateDietaryRecord = (id, payload) => http.patch(`/client/dietary-records/${id}`, payload)
export const deleteDietaryRecord = (id) => http.delete(`/client/dietary-records/${id}`)

// 店面相关API
export const getStores = () => http.get('/client/stores')

// 个人资料相关API
export const updateProfile = (payload) => http.put('/client/profile', payload)

// AI 饮食分析相关API
export const generateWeeklyAiAnalysis = () => http.post('/ai/diet-analysis/weekly')
export const generateMonthlyAiAnalysis = () => http.post('/ai/diet-analysis/monthly')
export const getAiDietReports = (params) => http.get('/ai/diet-reports', { params })
export const getAiDietReportById = (id) => http.get(`/ai/diet-reports/${id}`)

// AI 智能推荐API
export const getSmartRecommendation = (payload) => http.post('/ai/smart-recommend', payload)

// 用户设置相关API
export const getUserSettings = () => http.get('/client/settings')
export const updateUserSettings = (payload) => http.put('/client/settings', payload)
