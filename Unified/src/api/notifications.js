import http from './http'

export const listNotifications = () => http.get('/notifications')
export const markRead = (id) => http.post(`/notifications/${id}/read`)
