import http from './http'

export const getClients = () => http.get('/guardian/clients')
export const bindClient = (clientId, relation = '家庭监护') => http.post('/guardian/bind', { clientId, relation })
export const unbindClient = (clientId) => http.delete(`/guardian/bind/${clientId}`)
export const createOrder = (payload) => http.post('/guardian/orders', payload)
export const getOrders = () => http.get('/guardian/orders')
export const payOrder = (orderId) => http.post(`/guardian/orders/${orderId}/pay`)
export const getReports = (clientId) => http.get(`/guardian/reports/${clientId}`)
export const getWeeklyReport = (clientId) => http.get(`/guardian/reports/${clientId}/weekly`)
export const getMonthlyReport = (clientId) => http.get(`/guardian/reports/${clientId}/monthly`)
export const getNotifications = () => http.get('/guardian/notifications')
export const getClientNutrition = (clientId) => http.get(`/guardian/clients/${clientId}/nutrition/today`)
export const updateProfile = (payload) => http.put('/guardian/profile', payload)

// AI 饮食分析相关API
export const generateWeeklyAiAnalysis = (clientId) => http.post(`/ai/diet-analysis/guardian/weekly/${clientId}`)
export const generateMonthlyAiAnalysis = (clientId) => http.post(`/ai/diet-analysis/guardian/monthly/${clientId}`)
export const getAiDietReports = (clientId, params) => http.get(`/ai/guardian/diet-reports/${clientId}`, { params })
export const getAiDietReportById = (clientId, reportId) => http.get(`/ai/guardian/diet-reports/${clientId}/${reportId}`)
