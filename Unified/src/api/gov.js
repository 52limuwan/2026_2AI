import http from './http'

export const getClients = (params) => http.get('/gov/clients', { params })
export const updateClient = (id, payload) => http.put(`/gov/clients/${id}`, payload)
export const pushSuggestion = (payload) => http.post('/gov/suggestions', payload)
export const generateAISuggestion = (clientId) => http.post('/gov/suggestions/generate-ai', { clientId })
export const getSummary = () => http.get('/gov/reports/summary')
export const getClientGuardians = (clientId) => http.get(`/gov/clients/${clientId}/guardians`)
export const getGovCommunities = () => http.get('/gov/communities')

// 用户设置相关API
export const getUserSettings = () => http.get('/gov/settings')
export const updateUserSettings = (payload) => http.put('/gov/settings', payload)
