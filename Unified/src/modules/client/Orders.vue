<template>
  <div class="card-list">
    <div class="card" v-for="order in orders" :key="order.id">
      <div class="row">
        <div>
          <div class="muted">订单号</div>
          <strong>{{ order.order_number }}</strong>
        </div>
        <span class="status">{{ statusText(order.status) }}</span>
      </div>
      <p class="muted">配送地址：{{ maskAddress(order.address) }}</p>
      <p class="muted">取餐窗口：{{ order.window_name || '商户自取' }}</p>
      <div class="items">
        <div v-for="item in order.items" :key="item.id" class="item-line">
          <span>{{ item.dish_name }}</span>
          <span class="muted">× {{ item.quantity }}</span>
          <span>￥{{ (item.price * item.quantity).toFixed(2) }}</span>
        </div>
      </div>
      <div class="row">
        <div class="muted">应付</div>
        <strong>￥{{ order.total_amount }}</strong>
      </div>
      <div class="actions">
        <button v-if="order.status === 'placed'" class="ghost-btn" @click="cancel(order)">取消</button>
        <button v-if="order.status === 'delivering'" class="primary-btn" @click="markDelivered(order)">确认送达</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrders, updateOrderStatus } from '../../api/client'

const orders = ref([])

const loadOrders = async () => {
  const res = await getOrders()
  orders.value = res.data.data.orders || []
}

onMounted(loadOrders)

const cancel = async (order) => {
  await updateOrderStatus(order.id, 'cancelled')
  loadOrders()
}

const markDelivered = async (order) => {
  await updateOrderStatus(order.id, 'delivered')
  loadOrders()
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
      return s
  }
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
</script>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.item-line {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  font-size: 15px;
}
.status {
  padding: 8px 14px;
  background: var(--surface-soft);
  border-radius: 10px;
  color: var(--accent-strong);
  font-weight: var(--fw-semibold);
  font-size: 14px;
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
.actions button {
  flex: 1;
}
</style>
