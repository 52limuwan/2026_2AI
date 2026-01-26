<template>
  <div class="card-list">
    <div class="card order-card" v-for="order in orders" :key="order.id">
      <div class="card-header">
        <div class="order-info">
          <div class="muted">订单号</div>
          <strong>{{ order.order_number }}</strong>
          <p class="muted customer-name">被监护人：{{ order.client_name }}</p>
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
        <div class="order-meta">
          <span class="detail-label">店面：</span>
          <span>{{ order.store_name || order.store?.name || order.merchant_name || '未知店面' }}</span>
        </div>

        <div class="order-meta">
          <span class="detail-label">订单类型：</span>
          <span :class="getOrderTypeClass(order)">{{ getOrderType(order) }}</span>
        </div>

        <div class="items">
          <div v-for="item in order.items" :key="item.id" class="item-line">
            <span class="item-name">{{ item.dish_name }}</span>
            <span class="item-quantity">× {{ item.quantity }}</span>
            <span class="item-price">￥{{ ((item.price || 0) * (item.quantity || 1)).toFixed(2) }}</span>
          </div>
        </div>

        <div class="order-total">
          <span class="total-label">订单总额</span>
          <span class="total-amount">￥{{ (order.total_amount || 0).toFixed(2) }}</span>
        </div>
      </div>

      <div class="actions" v-if="order.payment_status !== 'paid'">
        <button 
          class="primary-btn pay-btn" 
          @click="handlePay(order)"
          :disabled="paying === order.id"
        >
          {{ paying === order.id ? '支付中...' : '立即付款' }}
        </button>
      </div>
    </div>
    
    <div v-if="!orders.length" class="empty-state">
      <p class="muted">暂无订单</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrders, payOrder } from '../../api/guardian'
import { showToast } from '../../utils/toast'

const orders = ref([])
const paying = ref(null)

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
      return s
  }
}

const paymentText = (s) => {
  switch (s) {
    case 'pending':
      return '待支付'
    case 'paid':
      return '已支付'
    case 'recorded':
      return '待支付'  // 已记账也显示为待支付，对用户更友好
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
      return 'payment-pending'  // 已记账使用待支付的样式
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

const maskAddress = (address) => {
  if (!address || address === '未填写') return '未填写'
  // 隐藏真实地址，改用"某某区某某路"格式
  const districtMatch = address.match(/(.{2,4}区)/)
  const roadMatch = address.match(/(.{2,6}路|.{2,6}街|.{2,6}道)/)
  
  if (districtMatch && roadMatch) {
    return `${districtMatch[1]}${roadMatch[1]}`
  } else if (districtMatch) {
    return `${districtMatch[1]}某某路`
  } else {
    return '某某区某某路'
  }
}

const getOrderTypeClass = (order) => {
  const type = getOrderType(order)
  return type === '外卖' ? 'order-type-delivery' : 'order-type-dine-in'
}

const load = async () => {
  try {
    const res = await getOrders()
    orders.value = res.data.data.orders || []
  } catch (err) {
    console.error('加载订单失败:', err)
    orders.value = []
  }
}

const handlePay = async (order) => {
  if (paying.value === order.id) return
  if (order.payment_status === 'paid') {
    showToast('订单已支付')
    return
  }
  
  if (!confirm(`确认支付订单 ${order.order_number}，金额 ￥${(order.total_amount || 0).toFixed(2)} 吗？`)) {
    return
  }
  
  paying.value = order.id
  try {
    await payOrder(order.id)
    showToast('支付成功')
    await load()
    window.dispatchEvent(new CustomEvent('guardian-order-paid'))
  } catch (err) {
    console.error('支付失败:', err)
    showToast(err.response?.data?.message || '支付失败，请重试')
  } finally {
    paying.value = null
  }
}

onMounted(load)
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
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--surface-soft);
  border-radius: 10px;
}

.order-meta {
  font-size: 14px;
  line-height: 1.6;
}

.detail-label {
  color: var(--muted);
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

.items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.item-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.item-name {
  flex: 1;
  font-weight: 500;
}

.item-quantity {
  color: var(--muted);
  font-size: 13px;
}

.item-price {
  color: var(--text);
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.order-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.total-label {
  color: var(--muted);
  font-weight: 500;
  font-size: 14px;
}

.total-amount {
  color: var(--accent-strong);
  font-size: 20px;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 10px;
}

.pay-btn {
  width: 100%;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px 20px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.pay-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 156, 122, 0.3);
}

.pay-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}
</style>
