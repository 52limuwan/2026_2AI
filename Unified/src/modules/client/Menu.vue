<template>
  <div class="card-list" :class="{ 'has-message': message, 'is-leaving': isMessageLeaving }">
    <div class="card smart-card" :class="{ 'has-message': message, 'is-leaving': isMessageLeaving }">
      <div class="smart-head">
        <div class="smart-title-section">
          <div class="smart-title">
            <span class="smart-title-text">AI 营养师智能推荐</span>
          </div>
          <p class="smart-subtitle">根据您的饮食偏好与健康目标<br>为您精心甄选</p>
        </div>
        <button class="ghost-btn mini smart-btn" @click="runSmartRecommend">
          <span>{{ hasRecommended ? '重新推荐' : '开始推荐' }}</span>
        </button>
      </div>
      <transition 
        name="message-slide" 
        @before-leave="isMessageLeaving = true"
        @after-leave="isMessageLeaving = false"
      >
        <div v-if="message || recommendedDishes.length > 0" class="smart-result-container">
          <p v-if="message" class="smart-message" :class="{ loading: message.includes('正在') }">
            <span class="message-icon" v-if="message.includes('正在')">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
            <span class="message-text">{{ message }}</span>
          </p>
          
          <!-- 推荐菜品展示区域 -->
          <div class="recommended-dishes" v-if="recommendedDishes.length > 0">
            <transition-group name="dish-slide" appear>
              <div 
                v-for="dish in recommendedDishes" 
                :key="dish.id"
                class="recommended-dish-item"
                :class="{ adding: dish.isAdding }"
              >
                <div class="dish-image-wrapper" :class="{ adding: dish.isAdding }">
                  <img 
                    :data-src="dish.image || placeholderImage" 
                    :src="placeholderImage"
                    @error="onImgError($event)" 
                    alt="" 
                    class="lazy-image"
                  />
                  <div class="dish-badge" :class="{ adding: dish.isAdding }" v-if="dish.nutrition?.calories">
                    {{ dish.nutrition.calories }} kcal
                  </div>
                  <div class="adding-overlay" v-if="dish.isAdding">
                    <div class="check-icon">✓</div>
                  </div>
                </div>
                
                <div class="recommended-dish-info" :class="{ adding: dish.isAdding }">
                  <div class="dish-name-row">
                    <strong :class="{ adding: dish.isAdding }">{{ dish.name }}</strong>
                    <span class="price-tag" :class="{ adding: dish.isAdding }">￥{{ dish.price }}</span>
                  </div>
                  <p class="dish-desc" v-if="dish.description">{{ dish.description }}</p>
                  <div class="recommended-dish-meta" v-if="dish.nutrition">
                    <span class="nutrition-tag" v-if="dish.nutrition.protein">蛋白质 {{ dish.nutrition.protein }}g</span>
                    <span class="nutrition-tag" v-if="dish.nutrition.fiber">纤维 {{ dish.nutrition.fiber }}g</span>
                  </div>
                </div>
                
                <button 
                  class="add-recommended-btn" 
                  :class="{ adding: dish.isAdding }"
                  @click="addRecommendedToCart(dish)"
                  :disabled="dish.stock <= 0 || dish.isAdding"
                >
                  <span v-if="dish.isAdding" class="btn-adding">
                    <span class="btn-check">✓</span>
                    <span>已添加</span>
                  </span>
                  <span v-else-if="dish.stock <= 0">已售罄</span>
                  <span v-else>加入购物车</span>
                </button>
              </div>
            </transition-group>
          </div>
        </div>
      </transition>
    </div>

    <div class="card dish-card" v-for="dish in displayList" :key="dish.id">
      <div class="dish-top">
        <img 
          :data-src="dish.image || placeholderImage" 
          :src="placeholderImage"
          @error="onImgError($event)" 
          alt="" 
          class="lazy-image"
        />
        <div class="dish-info">
          <h3>{{ dish.name }}</h3>
          <p class="muted dish-description" v-if="dish.description">{{ dish.description }}</p>
          <div class="nutrition-info" v-if="dish.nutrition">
            <span class="nutrition-item">热量 {{ dish.nutrition.calories || 0 }} kcal</span>
            <span class="nutrition-item" v-if="dish.nutrition.protein">蛋白质 {{ dish.nutrition.protein }}g</span>
          </div>
          <div class="stock-sales-info">
            <p class="muted stock-info" :class="{ 'out-of-stock': dish.stock <= 0 }">
              库存 {{ dish.stock !== null && dish.stock !== undefined ? dish.stock : 0 }}
              <span v-if="dish.stock <= 0" class="stock-label">售罄</span>
            </p>
            <p class="muted stock-info">月销 {{ dish.monthly_sales || 0 }}</p>
          </div>
        </div>
      </div>
      <div class="dish-actions">
        <div class="price price-block">
          <div class="price-main-row">
            <div class="member-price-section" v-if="isMember && dish.member_price">
              <span class="currency">￥</span>
              <span class="member-amount">{{ dish.price }}</span>
            </div>
            <div class="regular-price-section" v-else>
              <span class="currency">￥</span>
              <span class="amount">{{ dish.price }}</span>
            </div>
            <div class="original-price-section" v-if="isMember && dish.member_price">
              <span class="original-currency">￥</span>
              <span class="original-amount">{{ dish.original_price || dish.price }}</span>
            </div>
          </div>
        </div>
        <button 
          class="primary-btn add-btn" 
          :class="{ 'disabled': dish.stock <= 0 }"
          :disabled="dish.stock <= 0"
          @click="addToCart(dish)"
        >
          {{ dish.stock <= 0 ? '已售罄' : '加入购物车' }}
        </button>
      </div>
    </div>
  </div>

  <button class="cart-fab" @click="showCart = true">
    购物车
    <span class="badge">{{ cart.length }}</span>
  </button>

  <StickyActionBar v-if="cart.length">
    <div class="cta-row">
      <div>
        <div class="muted">共 {{ cart.length }} 道菜</div>
        <strong>合计 ￥{{ total }}</strong>
      </div>
      <div class="cta-actions">
        <button class="ghost-btn mini" @click="showCart = true">查看清单</button>
        <button class="primary-btn mini" @click="showCart = true">去结算</button>
      </div>
    </div>
  </StickyActionBar>

  <BottomSheet :open="showCart" @close="showCart = false">
    <div class="sheet-content">
      <h3>送餐清单</h3>
      
      <div class="cart-section" v-if="cart.length">
        <div class="card-list">
          <div class="cart-item" v-for="item in cart" :key="item.id">
            <div class="cart-info">
              <img 
                :data-src="item.image || placeholderImage" 
                :src="placeholderImage"
                @error="onImgError($event)" 
                alt="" 
                class="lazy-image"
              />
              <div>
                <strong>{{ item.name }}</strong>
                <p class="muted" v-if="item.description">{{ item.description }}</p>
              </div>
            </div>
            <div class="cart-actions">
              <div class="qty">
                <button class="ghost-btn mini" @click="changeQuantity(item, -1)">-</button>
                <span>{{ item.quantity }}</span>
                <button class="ghost-btn mini" @click="changeQuantity(item, 1)">+</button>
              </div>
              <div class="muted">￥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="muted empty-cart">购物车为空，先去挑选菜品吧</p>

      <div class="order-type-section">
        <div class="muted address-label">订单类型</div>
        <select v-model="orderType" class="input address-select" @change="onOrderTypeChange">
          <option value="">请选择订单类型</option>
          <option value="delivery">外卖配送</option>
          <option value="dine_in">堂食自取</option>
        </select>
      </div>

      <div class="address-section" v-if="orderType === 'delivery'">
        <div class="muted address-label">配送地址</div>
        <div v-if="savedAddress" class="address-display">
          <div class="address-text">{{ savedAddress }}</div>
        </div>
        <div v-else class="address-empty">
          <p class="muted">您还未设置配送地址，请前往个人中心设置</p>
          <button class="ghost-btn mini" @click="goToProfile">前往设置</button>
        </div>
      </div>

      <div class="checkout-actions">
        <div class="checkout-summary">
          <div class="muted">共 {{ cart.length }} 道 · 合计</div>
          <strong>￥{{ total }}</strong>
        </div>
        <button class="primary-btn" :disabled="!cart.length || !orderType || (orderType === 'delivery' && !savedAddress)" @click="submitOrder">确认下单</button>
      </div>
    </div>
  </BottomSheet>

</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { getRecommendations, createOrder, getClientDishes, getSmartRecommendation } from '../../api/client'
import StickyActionBar from '../../components/StickyActionBar.vue'
import BottomSheet from '../../components/BottomSheet.vue'

const router = useRouter()
const userStore = useUserStore()
const recommendations = ref([])
const dishes = ref([])
const cart = ref([])
const orderType = ref('')
const address = ref('')
const message = ref('')
const showCart = ref(false)
const hasRecommended = ref(false)
const isMessageLeaving = ref(false)
const recommendedDishes = ref([])
let recommendTimer = null

// 从用户store中获取保存的地址
const savedAddress = computed(() => userStore.profile?.address || '')
// 获取用户会员状态
const isMember = computed(() => userStore.profile?.is_member || false)
const placeholderImage =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22 viewBox=%220 0 200 150%22%3E%3Crect width=%22200%22 height=%22150%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%239ca3af%22 font-size=%2214%22 text-anchor=%22middle%22 dy=%225%22%3EMeal%3C/text%3E%3C/svg%3E'

const loadDishes = async () => {
  // 获取当前选择的店面ID
  const selectedStoreId = localStorage.getItem('selectedStoreId')
  
  try {
    const [recRes, dishRes] = await Promise.all([
      getRecommendations(selectedStoreId ? { store_id: selectedStoreId } : {}),
      getClientDishes(selectedStoreId ? { store_id: selectedStoreId } : {})
    ])
    recommendations.value = recRes.data.data.recommendations || []
    dishes.value = dishRes.data.data.dishes || []
    
    // 数据加载后重新观察图片
    setTimeout(observeImages, 100)
  } catch (err) {
    console.error('加载菜品失败', err)
  }
}

onMounted(() => {
  loadDishes()
  // 初始化懒加载
  initLazyLoad()
  // 监听店面切换事件
  window.addEventListener('client-store-changed', loadDishes)
  // 监听用户信息更新事件（例如地址更新）
  window.addEventListener('user-profile-updated', async () => {
    await userStore.refreshProfile()
  })
  
  // 延迟观察图片，确保DOM已渲染
  setTimeout(observeImages, 100)
})

// 监听购物车显示状态，打开时刷新用户信息以确保地址最新
watch(showCart, async (isOpen) => {
  if (isOpen) {
    await userStore.refreshProfile()
    // 如果选择了外卖配送，使用最新的地址
    if (orderType.value === 'delivery') {
      address.value = savedAddress.value || ''
    }
    // 购物车打开时观察图片
    setTimeout(observeImages, 100)
  }
})

onUnmounted(() => {
  window.removeEventListener('client-store-changed', loadDishes)
  // 清理定时器
  if (recommendTimer) {
    clearTimeout(recommendTimer)
    recommendTimer = null
  }
  // 清理图片观察器
  if (imageObserver) {
    imageObserver.disconnect()
    imageObserver = null
  }
})

const total = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2))
const displayList = computed(() => dishes.value)

const addToCart = (dish) => {
  const exist = cart.value.find((c) => c.id === dish.id)
  if (exist) {
    exist.quantity += 1
  } else {
    cart.value.push({
      ...dish,
      quantity: 1,
      dish_id: dish.id,
      dish_name: dish.name
    })
  }
}

const changeQuantity = (item, delta) => {
  item.quantity += delta
  if (item.quantity <= 0) {
    cart.value = cart.value.filter((c) => c.id !== item.id)
  }
}

const onOrderTypeChange = () => {
  // 如果切换到外卖配送，使用用户保存的地址
  if (orderType.value === 'delivery') {
    address.value = savedAddress.value || ''
  } else if (orderType.value === 'dine_in') {
    // 如果切换到堂食，清空配送地址
    address.value = ''
  }
}

// 监听地址变化，当用户保存新地址时自动更新
watch(() => savedAddress.value, (newAddress) => {
  if (orderType.value === 'delivery' && newAddress) {
    address.value = newAddress
  }
})

const goToProfile = () => {
  showCart.value = false
  router.push('/client/profile')
}

const submitOrder = async () => {
  if (!cart.value.length || !orderType.value) return
  if (orderType.value === 'delivery' && !savedAddress.value) {
    message.value = '请先设置配送地址'
    return
  }
  
  try {
    const payload = {
      items: cart.value.map((item) => ({
        dish_id: item.dish_id,
        dish_name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      address: orderType.value === 'delivery' ? savedAddress.value : '',
      orderType: orderType.value,
      window_name: orderType.value === 'dine_in' ? '堂食自取' : ''
    }
    
    const storeId = localStorage.getItem('selectedStoreId')
    if (storeId) {
      payload.store_id = Number(storeId)
    }
    
    const res = await createOrder(payload)
    
    const order = res.data.data.order
    const orderId = order.id
    
    if (!orderId) {
      message.value = '订单创建失败：未返回订单ID'
      return
    }
    
    message.value = ''
    showCart.value = false
    cart.value = []
    orderType.value = ''
    address.value = ''
    
    // 跳转到订单状态页面
    router.push(`/client/order-status/${orderId}`)
  } catch (error) {
    console.error('创建订单失败:', error)
    message.value = '创建订单失败，请重试'
  }
}

// 图片懒加载观察器
let imageObserver = null

// 初始化懒加载
const initLazyLoad = () => {
  if ('IntersectionObserver' in window) {
    imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            const src = img.getAttribute('data-src')
            
            // 如果已经加载过，跳过
            if (img.classList.contains('loaded') || img.classList.contains('error')) {
              imageObserver.unobserve(img)
              return
            }
            
            if (src && src !== placeholderImage) {
              // 创建新图片对象预加载
              const tempImg = new Image()
              tempImg.onload = () => {
                // 使用 requestAnimationFrame 确保平滑过渡
                requestAnimationFrame(() => {
                  img.src = src
                  img.classList.add('loaded')
                })
              }
              tempImg.onerror = () => {
                img.src = placeholderImage
                img.classList.add('error')
              }
              tempImg.src = src
            } else {
              img.src = placeholderImage
              img.classList.add('loaded')
            }
            
            imageObserver.unobserve(img)
          }
        })
      },
      {
        rootMargin: '100px', // 提前100px开始加载，更流畅
        threshold: 0.01
      }
    )
  }
}

// 观察所有懒加载图片
const observeImages = () => {
  if (!imageObserver) return
  
  // 使用 requestIdleCallback 在浏览器空闲时观察图片
  const observeTask = () => {
    const lazyImages = document.querySelectorAll('img.lazy-image:not(.loaded):not(.error)')
    lazyImages.forEach((img) => {
      imageObserver.observe(img)
    })
  }
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(observeTask, { timeout: 200 })
  } else {
    setTimeout(observeTask, 0)
  }
}

const onImgError = (e) => {
  e.target.src = placeholderImage
  e.target.classList.add('error')
}

const runSmartRecommend = async () => {
  // 清除之前的定时器
  if (recommendTimer) {
    clearTimeout(recommendTimer)
    recommendTimer = null
  }
  
  // 清空之前的推荐结果
  recommendedDishes.value = []
  
  try {
    message.value = '正在为您智能推荐...'
    
    // 获取当前选择的店面ID
    const selectedStoreId = localStorage.getItem('selectedStoreId')
    const payload = {}
    if (selectedStoreId) {
      payload.store_id = Number(selectedStoreId)
    }
    
    // 调用 AI 推荐接口
    const res = await getSmartRecommendation(payload)
    const recommendations = res.data.data.recommendations || []
    
    if (!recommendations.length) {
      message.value = '暂无推荐结果，请稍后再试'
      recommendTimer = setTimeout(() => {
        message.value = ''
        recommendTimer = null
      }, 3000)
      return
    }
    
    // 更新提示信息 - 加上病症信息
    const chronicConditions = userStore.profile?.chronic_conditions
    let conditionText = ''
    if (chronicConditions) {
      try {
        const conditions = typeof chronicConditions === 'string' 
          ? JSON.parse(chronicConditions) 
          : chronicConditions
        if (Array.isArray(conditions) && conditions.length > 0) {
          conditionText = `（针对${conditions.join('、')}）`
        }
      } catch (e) {
        // 如果解析失败，尝试直接使用
        if (typeof chronicConditions === 'string' && chronicConditions.trim()) {
          conditionText = `（针对${chronicConditions}）`
        }
      }
    }
    message.value = `为您推荐了 ${recommendations.length} 道营养均衡的菜品${conditionText}`
    hasRecommended.value = true
    
    // 延迟300ms后开始逐个展示推荐菜品
    setTimeout(() => {
      recommendations.forEach((dish, index) => {
        setTimeout(() => {
          recommendedDishes.value.push(dish)
          // 每添加一个菜品后观察新图片
          setTimeout(observeImages, 50)
        }, index * 150) // 每个菜品间隔150ms
      })
    }, 300)
    
  } catch (error) {
    console.error('AI 推荐失败:', error)
    message.value = 'AI 推荐失败，请稍后再试'
    
    recommendTimer = setTimeout(() => {
      message.value = ''
      recommendedDishes.value = []
      recommendTimer = null
    }, 3000)
  }
}

const addRecommendedToCart = (dish) => {
  // 添加动画状态
  dish.isAdding = true
  
  // 延迟300ms后添加到购物车
  setTimeout(() => {
    addToCart(dish)
    
    // 再延迟300ms后从推荐列表中移除（让动画完整播放）
    setTimeout(() => {
      recommendedDishes.value = recommendedDishes.value.filter(d => d.id !== dish.id)
      
      // 如果所有推荐都已添加，清除提示
      if (recommendedDishes.value.length === 0) {
        message.value = '所有推荐菜品已加入购物车'
        
        // 2秒后清除提示
        setTimeout(() => {
          message.value = ''
        }, 2000)
      }
    }, 300)
  }, 300)
}
</script>

<style scoped>
.smart-card {
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.smart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.smart-title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.smart-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.smart-title-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.smart-subtitle {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.smart-subtitle.success {
  color: #16a34a;
  font-weight: 500;
}

.smart-btn {
  flex-shrink: 0;
}
.smart-result-container {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.smart-message {
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(31, 156, 122, 0.08), rgba(19, 120, 92, 0.05));
  border-radius: 12px;
  color: var(--accent-strong);
  font-size: 14px;
  font-weight: var(--fw-medium);
  text-align: center;
  margin: 0;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.smart-message.loading {
  background: linear-gradient(135deg, rgba(31, 156, 122, 0.12), rgba(19, 120, 92, 0.08));
  animation: loadingPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes loadingPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(31, 156, 122, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(31, 156, 122, 0);
  }
}

.message-icon {
  display: flex;
  align-items: center;
  gap: 5px;
}

.message-icon .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-strong);
  animation: dotBounce 1.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.message-icon .dot:nth-child(1) {
  animation-delay: 0s;
}

.message-icon .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.message-icon .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotBounce {
  0%, 60%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px) scale(1.2);
    opacity: 1;
  }
}

.message-text {
  animation: textFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes textFadeIn {
  0% {
    opacity: 0;
    transform: translateY(5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.recommended-dishes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px;
}

.recommended-dish-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--card);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  will-change: transform, box-shadow;
}

.recommended-dish-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(31, 156, 122, 0.05), transparent);
  opacity: 0;
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.recommended-dish-item:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 6px 24px rgba(31, 156, 122, 0.18);
}

.recommended-dish-item:hover::after {
  opacity: 1;
}

.recommended-dish-item:active {
  transform: translateY(-1px) scale(0.99);
  transition-duration: 0.1s;
}

.recommended-dish-item.adding {
  animation: addingPulse 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  background: linear-gradient(135deg, rgba(31, 156, 122, 0.08), rgba(19, 120, 92, 0.05));
}

@keyframes addingPulse {
  0% {
    transform: scale(1);
  }
  15% {
    transform: scale(0.96);
  }
  30% {
    transform: scale(1.04);
  }
  45% {
    transform: scale(0.98);
  }
  60% {
    transform: scale(1.01);
  }
  100% {
    transform: scale(1);
  }
}

/* 图片容器添加动画 */
.dish-image-wrapper.adding {
  animation: imageZoom 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes imageZoom {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15) rotate(3deg);
  }
  100% {
    transform: scale(1);
  }
}

/* 添加成功遮罩层 */
.adding-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(31, 156, 122, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlayFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 12px;
}

@keyframes overlayFadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.check-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: white;
  color: var(--accent-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  animation: checkBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

@keyframes checkBounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.dish-image-wrapper {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-soft);
  flex-shrink: 0;
}

.recommended-dish-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease-in-out, filter 0.4s ease-in-out;
  will-change: transform;
  background: var(--surface-soft);
}

.recommended-dish-item img.lazy-image {
  opacity: 0.6;
  filter: blur(5px);
}

.recommended-dish-item img.lazy-image.loaded {
  opacity: 1;
  filter: blur(0);
}

.recommended-dish-item:hover img {
  transform: scale(1.12) rotate(1deg);
}

.dish-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  font-size: 11px;
  font-weight: var(--fw-semibold);
  color: var(--accent-strong);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dish-badge.adding {
  animation: badgePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes badgePop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3) translateY(-5px);
  }
  100% {
    transform: scale(1);
  }
}

.recommended-dish-item:hover .dish-badge {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.recommended-dish-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.recommended-dish-info.adding {
  animation: infoShake 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes infoShake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}

.dish-name-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.recommended-dish-info strong {
  font-size: 15px;
  color: var(--text);
  font-weight: var(--fw-semibold);
  line-height: 1.3;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.recommended-dish-info strong.adding {
  animation: textGlow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes textGlow {
  0%, 100% {
    color: var(--text);
    text-shadow: none;
  }
  50% {
    color: var(--accent-strong);
    text-shadow: 0 0 10px rgba(31, 156, 122, 0.5);
  }
}

.price-tag {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-strong);
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.price-tag.adding {
  animation: priceJump 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes priceJump {
  0% {
    transform: scale(1) translateY(0);
  }
  30% {
    transform: scale(1.4) translateY(-8px);
    color: var(--accent);
  }
  50% {
    transform: scale(1.5) translateY(-10px) rotate(5deg);
  }
  70% {
    transform: scale(1.2) translateY(-5px) rotate(-3deg);
  }
  100% {
    transform: scale(1) translateY(0) rotate(0deg);
  }
}

.dish-desc {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.recommended-dish-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.nutrition-tag {
  font-size: 11px;
  color: var(--accent-strong);
  background: rgba(31, 156, 122, 0.1);
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: var(--fw-medium);
}

.add-recommended-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  font-size: 13px;
  font-weight: var(--fw-semibold);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(31, 156, 122, 0.3);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
  will-change: transform, box-shadow;
}

.add-recommended-btn.adding {
  animation: btnSuccess 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  background: linear-gradient(135deg, #10b981, #059669);
}

@keyframes btnSuccess {
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(0.9);
  }
  40% {
    transform: scale(1.15) rotate(5deg);
  }
  60% {
    transform: scale(0.95) rotate(-3deg);
  }
  80% {
    transform: scale(1.05) rotate(1deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.btn-adding {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-check {
  display: inline-block;
  animation: checkSpin 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes checkSpin {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.add-recommended-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1), height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.add-recommended-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 16px rgba(31, 156, 122, 0.45);
}

.add-recommended-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
  transition-duration: 0.1s;
}

.add-recommended-btn:active:not(:disabled)::before {
  width: 250px;
  height: 250px;
  transition-duration: 0s;
}

.add-recommended-btn:disabled {
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

/* 丝滑流畅的进入动画 - 从上往下 */
.dish-slide-enter-active {
  animation: silkySlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.dish-slide-leave-active {
  animation: silkySlideOut 0.45s cubic-bezier(0.6, 0.04, 0.98, 0.34) both;
}

@keyframes silkySlideIn {
  0% {
    opacity: 0;
    transform: translateY(-40px) scale(0.88);
    filter: blur(4px);
  }
  40% {
    opacity: 0.6;
    filter: blur(1px);
  }
  70% {
    transform: translateY(4px) scale(1.02);
    filter: blur(0);
  }
  85% {
    transform: translateY(-1px) scale(0.99);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes silkySlideOut {
  0% {
    opacity: 1;
    transform: scale(1) translateX(0) rotateY(0deg);
  }
  30% {
    opacity: 0.7;
    transform: scale(0.98) translateX(8px) rotateY(5deg);
  }
  60% {
    opacity: 0.3;
    transform: scale(0.94) translateX(20px) rotateY(10deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.88) translateX(40px) rotateY(15deg);
  }
}

/* 响应式调整 */
@media (max-width: 640px) {
  .dish-image-wrapper {
    width: 80px;
    height: 80px;
  }
  
  .recommended-dish-info strong {
    font-size: 14px;
  }
  
  .price-tag {
    font-size: 16px;
  }
  
  .add-recommended-btn {
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
  }
}

.message-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.message-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19);
}

.message-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.message-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 卡片滑动动画 - 与提示信息同步 */
.smart-card.has-message:not(.is-leaving) {
  transform: translateY(8px);
}

.smart-card.is-leaving {
  transform: translateY(0) !important;
  transition: transform 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19) !important;
}

.small-text {
  font-size: 12px;
}
.cart-fab {
  position: fixed;
  right: 18px;
  bottom: calc(104px + var(--safe-bottom));
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #fff;
  font-weight: var(--fw-semibold);
  font-size: 15px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 60;
}
.badge {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  padding: 0 7px;
}
.slide-enter-active,
.slide-leave-active {
  transition: all 0.22s cubic-bezier(0.22, 0.68, 0.12, 1);
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}
.dish-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 当有提示信息时，菜品卡片也往下滑动 */
.card-list.has-message:not(.is-leaving) .dish-card {
  transform: translateY(8px);
}

/* 当提示信息消失时，菜品卡片同步往上滑动 */
.card-list.is-leaving .dish-card {
  transform: translateY(0) !important;
  transition: transform 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19) !important;
}
.dish-top {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.dish-top img {
  width: 130px;
  height: 130px;
  object-fit: cover;
  border-radius: 12px;
  background: var(--surface-soft);
  transition: opacity 0.3s ease-in-out, transform 0.3s ease;
}

/* 懒加载图片样式 */
.lazy-image {
  opacity: 0.6;
  filter: blur(5px);
  transition: opacity 0.4s ease-in-out, filter 0.4s ease-in-out;
}

.lazy-image.loaded {
  opacity: 1;
  filter: blur(0);
}

.lazy-image.error {
  opacity: 0.8;
  filter: blur(0);
}
.dish-info h3 {
  margin: 0 0 6px;
  font-size: 18px;
}
.dish-description {
  margin: 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
  line-height: 1.4;
}
.nutrition-info {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}
.nutrition-item {
  color: var(--accent-strong);
  background: rgba(31, 156, 122, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}
.stock-sales-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.stock-info {
  margin: 0;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.stock-info.out-of-stock {
  color: #ef4444;
}
.stock-label {
  display: inline-block;
  padding: 2px 6px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  font-size: 11px;
  font-weight: var(--fw-medium);
  margin-left: 4px;
}
.add-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--muted) !important;
}
.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.price {
  font-weight: var(--fw-semibold);
  margin: 6px 0 0;
  font-size: 16px;
}
.dish-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 0;
}
.price-block {
  flex: 1;
  margin: 0;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(31, 156, 122, 0.08), rgba(19, 120, 92, 0.06));
  border-radius: 12px;
  border: 1px solid rgba(31, 156, 122, 0.15);
}
.price-main-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.member-price-section {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.member-tag {
  display: inline-block;
  padding: 2px 6px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  color: #fff;
  font-size: 10px;
  font-weight: var(--fw-semibold);
  border-radius: 4px;
  margin-right: 4px;
  line-height: 1.4;
  letter-spacing: 0.3px;
}
.member-price-section .currency {
  font-size: 14px;
  color: var(--accent-strong);
  font-weight: var(--fw-medium);
}
.member-amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-strong);
  line-height: 1;
}
.regular-price-section {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.regular-price-section .currency {
  font-size: 14px;
  color: var(--accent-strong);
  font-weight: var(--fw-medium);
}
.regular-price-section .amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-strong);
  line-height: 1;
}
.original-price-section {
  display: flex;
  align-items: baseline;
  gap: 2px;
  opacity: 0.6;
}
.original-currency {
  font-size: 11px;
  color: var(--muted);
  text-decoration: line-through;
}
.original-amount {
  font-size: 14px;
  color: var(--muted);
  text-decoration: line-through;
  font-weight: var(--fw-medium);
}
.pill.soft {
  background: rgba(31, 156, 122, 0.12);
  border: 1px solid rgba(31, 156, 122, 0.25);
  color: var(--accent-strong);
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: var(--fw-medium);
  font-size: 12px;
}
.add-btn {
  flex: 1;
  width: 100%;
}
.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.cta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cta-actions {
  display: flex;
  gap: 8px;
}
.mini {
  width: auto;
  padding: 10px 14px;
}
.sheet-content {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sheet-content h3 {
  margin: 0 0 4px;
}
.cart-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.cart-info {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.cart-info img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 10px;
}
.cart-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}
.qty {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.qty .mini {
  width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
}
.sheet-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cart-section {
  margin-top: 4px;
}

.empty-cart {
  padding: 20px 0;
  text-align: center;
}

.order-type-section {
  margin-top: 8px;
}

.address-section {
  margin-top: 8px;
}

.address-label {
  margin-bottom: 8px;
  font-weight: var(--fw-medium);
}

.address-display {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--ghost-bg);
}

.address-text {
  font-size: 15px;
  line-height: 1.5;
  color: var(--text);
}

.address-empty {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--ghost-bg);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.address-empty p {
  margin: 0;
  font-size: 14px;
}

.checkout-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}

.checkout-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.message {
  text-align: center;
  padding: 8px 0;
}

</style>
