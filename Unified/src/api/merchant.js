import http from './http'

export const getDashboard = () => http.get('/merchant/dashboard')
export const getDishes = () => http.get('/merchant/dishes')
export const createDish = (payload) => http.post('/merchant/dishes', payload)
export const updateDish = (id, payload) => http.put(`/merchant/dishes/${id}`, payload)
export const deleteDish = (id) => http.delete(`/merchant/dishes/${id}`)
export const updateDishStatus = (id, status) => http.patch(`/merchant/dishes/${id}/status`, { status })
export const generateSeasonalDishes = () => http.post('/merchant/dishes/generate-seasonal')

// 图片上传API
export const uploadImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return http.post('/merchant/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getOrders = () => http.get('/merchant/orders')
export const updateOrderStatus = (id, status) => http.patch(`/merchant/orders/${id}/status`, { status })

export const getPurchasePlan = () => http.get('/merchant/purchase-plan')
export const getPurchasePlans = () => http.get('/merchant/purchase-plans')
export const getPurchasePlanById = (id) => http.get(`/merchant/purchase-plan/${id}`)
export const createPurchasePlan = (payload) => http.post('/merchant/purchase-plan', payload)
export const updatePurchasePlan = (id, payload) => http.put(`/merchant/purchase-plan/${id}`, payload)
export const deletePurchasePlan = (id) => http.delete(`/merchant/purchase-plan/${id}`)
export const getPurchaseStats = () => http.get('/merchant/purchase-stats')
export const generateAIPurchasePlan = () => http.post('/merchant/purchase-plan/generate')

export const getSolarTips = () => http.get('/merchant/solar-term/tips')
export const createSolarTip = (payload) => http.post('/merchant/solar-term/tips', payload)
export const updateProfile = (payload) => http.put('/merchant/profile', payload)
export const getStores = () => http.get('/merchant/stores')
export const createStore = (payload) => http.post('/merchant/stores', payload)
export const updateStore = (id, payload) => http.put(`/merchant/stores/${id}`, payload)
export const switchStore = (id) => http.patch(`/merchant/stores/${id}/switch`)
export const getCurrentStore = () => http.get('/merchant/current-store')
