import http from './http'

export const login = (payload) => http.post('/auth/login', payload)
export const register = (payload) => http.post('/auth/register', payload)
export const fetchMe = () => http.get('/auth/me')
