<template>
  <div class="card-list">
    <div class="card order-card" v-for="order in orders" :key="order.id">
      <div class="card-header">
        <div class="order-info">
          <div class="muted">订单号</div>
          <strong>{{ order.order_number }}</strong>
          <p class="muted customer-name">{{ order.client_name }}</p>
        </div>
        <div class="header-badges">
          <span :class="['status-badge', getStatusClass(order.status)]">
            {{ statusText(order.status) }}
          </span>
          <span :class="['payment-badge', getPaymentClass(order.payment_status)]">
            {{ paymentText(order.payment_status) }}
          </span>
        </div>
      </div>

      <div class="order-details">
        <div v-if="order.items && order.items.length > 0" class="dish-items">
          <span class="detail-label">菜品：</span>
          <span class="dish-names">{{ getDishNames(order.items) }}</span>
        </div>
        
        <div class="order-meta">
          <span class="detail-label">订单类型：</span>
          <span :class="getOrderTypeClass(order)">{{ getOrderType(order) }}</span>
        </div>

        <div class="order-amount">
          <span class="amount-label">订单金额：</span>
          <span class="amount-value">￥{{ order.total_amount }}</span>
        </div>
      </div>

      <div class="status-actions">
        <button
          v-for="s in statuses"
          :key="s.value"
          class="status-btn"
          :class="{ active: selectedStatus[order.id] === s.value }"
          @click="selectStatus(order.id, s.value)"
        >
          {{ s.label }}
        </button>
      </div>

      <button 
        v-if="selectedStatus[order.id] !== order.status"
        class="primary-btn update-btn" 
        @click="update(order)"
      >
        更新为：{{ statusText(selectedStatus[order.id]) }}
      </button>
      <div v-else class="status-unchanged">
        <span class="muted">当前状态已是最新</span>
      </div>
    </div>
    
    <div v-if="message" class="message-toast">{{ message }}</div>
    <div v-if="!orders.length" class="empty-state">
      <p class="muted">暂无订单</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrders, updateOrderStatus } from '../../api/merchant'

const orders = ref([])
const selectedStatus = ref({})
const message = ref('')

const statuses = [
  { value: 'preparing', label: '备餐中' },
  { value: 'delivering', label: '配送中' },
  { value: 'delivered', label: '已送达' },
  { value: 'cancelled', label: '已取消' }
]

const load = async () => {
  orders.value = (await getOrders()).data.data.orders || []
  orders.value.forEach((o) => (selectedStatus.value[o.id] = o.status))
}

onMounted(load)

const selectStatus = (orderId, status) => {
  selectedStatus.value[orderId] = status
}

const update = async (order) => {
  try {
    await updateOrderStatus(order.id, selectedStatus.value[order.id])
    message.value = '状态已更新'
    await load()
    setTimeout(() => { message.value = '' }, 2000)
  } catch (err) {
    message.value = '更新失败'
    setTimeout(() => { message.value = '' }, 2000)
  }
}

const statusText = (s) => {
  switch (s) {
    case 'placed':
      return '已下单'
    case 'preparing':
      return '备餐中'
    case 'delivering':
      return '配送中'
    case 'delivered':
      return '已送达'
    case 'cancelled':
      return '已取消'
    default:
      return s || ''
  }
}

const paymentText = (s) => {
  switch (s) {
    case 'pending':
      return '待支付'
    case 'paid':
      return '已支付'
    case 'recorded':
      return '已记账'
    case 'refunded':
      return '已退款'
    default:
      return s || '未知'
  }
}

const getStatusClass = (status) => {
  switch (status) {
    case 'placed':
      return 'status-placed'
    case 'preparing':
      return 'status-preparing'
    case 'delivering':
      return 'status-delivering'
    case 'delivered':
      return 'status-delivered'
    case 'cancelled':
      return 'status-cancelled'
    default:
      return ''
  }
}

const getPaymentClass = (paymentStatus) => {
  switch (paymentStatus) {
    case 'paid':
      return 'payment-paid'
    case 'recorded':
      return 'payment-recorded'
    case 'pending':
      return 'payment-pending'
    case 'refunded':
      return 'payment-refunded'
    default:
      return ''
  }
}

const getOrderType = (order) => {
  if (order.address && order.address.trim() !== '' && order.address.trim() !== '未填写') {
    return '外卖'
  }
  if (order.window_name && order.window_name.trim() !== '' && order.window_name.trim() !== '商户自取') {
    return '堂食'
  }
  if (order.address && order.address.trim() !== '' && order.window_name && order.window_name.trim() !== '') {
    return '外卖'
  }
  return '堂食'
}

const getOrderTypeClass = (order) => {
  const type = getOrderType(order)
  return type === '外卖' ? 'order-type-delivery' : 'order-type-dine-in'
}

const getDishNames = (items) => {
  if (!items || items.length === 0) return '暂无菜品'
  return items.map(item => {
    const name = item.dish_name || '未知菜品'
    const quantity = item.quantity || 1
    return quantity > 1 ? `${name} x${quantity}` : name
  }).join('、')
}
</script>

<style scoped>
.order-card {
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-info strong {
  font-size: 15px;
  display: block;
  margin: 4px 0;
}

.customer-name {
  margin-top: 4px;
  font-size: 14px;
}

.header-badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  flex-shrink: 0;
}

.status-badge,
.payment-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.status-placed {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.status-preparing {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-delivering {
  background: #e0e7ff;
  color: #4338ca;
}

.status-badge.status-delivered {
  background: var(--surface-soft);
  color: var(--accent-strong);
}

.status-badge.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.payment-badge.payment-paid {
  background: var(--surface-soft);
  color: var(--accent-strong);
}

.payment-badge.payment-recorded {
  background: #dbeafe;
  color: #1e40af;
}

.payment-badge.payment-pending {
  background: #fef3c7;
  color: #92400e;
}

.payment-badge.payment-refunded {
  background: #f3f4f6;
  color: #6b7280;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--surface-soft);
  border-radius: 10px;
}

.dish-items,
.order-meta,
.order-amount {
  font-size: 14px;
  line-height: 1.6;
}

.detail-label,
.amount-label {
  color: var(--muted);
  font-weight: 500;
}

.dish-names {
  color: var(--text);
  font-weight: 500;
}

.order-type-delivery {
  color: #2563eb;
  font-weight: 600;
}

.order-type-dine-in {
  color: var(--accent-strong);
  font-weight: 600;
}

.amount-value {
  color: var(--accent-strong);
  font-size: 18px;
  font-weight: 700;
}

.status-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.status-btn {
  padding: 10px 8px;
  border: 1.5px solid var(--border);
  background: var(--card);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text);
  white-space: nowrap;
}

.status-btn:hover {
  background: var(--ghost-bg-hover);
  border-color: var(--accent);
}

.status-btn.active {
  border-color: var(--accent);
  color: var(--accent-strong);
  background: var(--surface-soft);
  font-weight: 600;
}

.update-btn {
  width: 100%;
  margin-top: 0;
}

.status-unchanged {
  text-align: center;
  padding: 12px;
  background: var(--surface-soft);
  border-radius: 12px;
}

.message-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(17, 24, 39, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

@media (max-width: 480px) {
  .status-actions {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .status-btn {
    font-size: 12px;
    padding: 8px 6px;
  }
}
</style>
