<template>
  <div class="card-list profile">
    <div class="card hero">
      <div class="hero-main">
        <div class="avatar default-avatar"></div>
        <div class="meta">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2>{{ profile?.name || '未填写姓名' }}</h2>
            <button class="ghost-btn mini edit-id-btn" @click="openNameEdit">编辑</button>
          </div>
          <p class="muted">身份证：{{ formatIdCard(profile?.id_card) || '未填写' }}</p>
          <p class="muted">认证状态：<span :class="idVerifiedClass">{{ idVerifiedText }}</span></p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">基本信息</div>
      <div class="info-grid">
        <div>
          <div class="muted">年龄</div>
          <strong>{{ calculateAge(profile?.id_card) || '未填写' }}</strong>
        </div>
        <div>
          <div class="muted">手机</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong>{{ profile?.phone || '未填写' }}</strong>
            <button class="ghost-btn mini edit-id-btn" @click="openPhoneEdit">编辑</button>
          </div>
        </div>
        <div>
          <div class="muted">地址</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong>{{ profile?.address || '未填写' }}</strong>
            <button class="ghost-btn mini edit-id-btn" @click="openAddressEdit">编辑</button>
          </div>
        </div>
        <div>
          <div class="muted">身份证</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong>{{ formatIdCard(profile?.id_card) || '未填写' }}</strong>
            <button class="ghost-btn mini edit-id-btn" @click="openIdCardEdit">编辑</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">偏好与安全</div>
      <div class="list">
        <div class="item" @click="showDietPreferences = true">
          <div>
            <div class="muted">饮食偏好</div>
            <p class="muted small-text">
              {{ dietPreferencesText || '用于个性化推荐和菜单提醒' }}
            </p>
          </div>
          <button class="ghost-btn mini">修改</button>
        </div>
        <div class="item" @click="showHealthReminders = true">
          <div>
            <div class="muted">健康提醒</div>
            <p class="muted small-text">
              {{ healthRemindersText || '下单、配送、报告推送' }}
            </p>
          </div>
          <button class="ghost-btn mini">调整</button>
        </div>
        <div class="item" @click="showPaymentMethods = true">
          <div>
            <div class="muted">支付方式</div>
            <p class="muted small-text">
              {{ paymentMethodsText || '绑定后可快捷下单' }}
            </p>
          </div>
          <button class="ghost-btn mini">管理</button>
        </div>
      </div>
    </div>

    <!-- 饮食偏好设置 -->
    <BottomSheet :open="showDietPreferences" @close="showDietPreferences = false">
      <div class="sheet-content">
        <h3>饮食偏好设置</h3>
        <p class="muted">选择您的饮食偏好，我们将为您推荐合适的菜品</p>
        <div class="preferences-grid">
          <button
            v-for="pref in dietPreferencesOptions"
            :key="pref.id"
            class="preference-chip"
            :class="{ active: selectedDietPreferences.includes(pref.id) }"
            @click="toggleDietPreference(pref.id)"
          >
            {{ pref.label }}
          </button>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="showDietPreferences = false">取消</button>
          <button class="primary-btn" @click="saveDietPreferences">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 健康提醒设置 -->
    <BottomSheet :open="showHealthReminders" @close="showHealthReminders = false">
      <div class="sheet-content">
        <h3>健康提醒设置</h3>
        <p class="muted">管理您的通知偏好，及时了解订单和健康信息</p>
        <div class="reminders-list">
          <div
            v-for="reminder in healthRemindersOptions"
            :key="reminder.id"
            class="reminder-item"
          >
            <div>
              <div class="reminder-label">{{ reminder.label }}</div>
              <p class="muted small-text">{{ reminder.desc }}</p>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="selectedHealthReminders"
                :value="reminder.id"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="showHealthReminders = false">取消</button>
          <button class="primary-btn" @click="saveHealthReminders">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 支付方式管理 -->
    <BottomSheet :open="showPaymentMethods" @close="showPaymentMethods = false">
      <div class="sheet-content">
        <h3>支付方式管理</h3>
        <p class="muted">管理您的支付方式，绑定后可快捷下单</p>
        <div class="payment-list">
          <div
            v-for="method in paymentMethods"
            :key="method.id"
            class="payment-item"
          >
            <div class="payment-info">
              <div>
                <div class="payment-label">{{ method.label }}</div>
                <p class="muted small-text">{{ method.desc }}</p>
              </div>
            </div>
            <div class="payment-actions">
              <span v-if="method.isDefault" class="default-badge">默认</span>
              <button
                v-if="!method.isDefault"
                class="ghost-btn mini"
                @click="setDefaultPayment(method.id)"
              >
                设为默认
              </button>
              <button class="ghost-btn mini danger" @click="removePayment(method.id)">
                删除
              </button>
            </div>
          </div>
          <div v-if="paymentMethods.length === 0" class="empty-state">
            <p class="muted">暂无支付方式</p>
          </div>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="showPaymentMethods = false">关闭</button>
          <button class="primary-btn" @click="showAddPayment = true">添加支付方式</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 姓名编辑弹窗 -->
    <BottomSheet :open="showNameEdit" @close="showNameEdit = false">
      <div class="sheet-content">
        <h3>编辑姓名</h3>
        <p class="muted">请输入您的姓名</p>
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input
            v-model="nameInput"
            type="text"
            class="input"
            placeholder="请输入姓名"
            maxlength="20"
          />
          <p v-if="nameError" class="error-text">{{ nameError }}</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelNameEdit">取消</button>
          <button class="primary-btn" @click="saveName" :disabled="!canSaveName || saving">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 手机编辑弹窗 -->
    <BottomSheet :open="showPhoneEdit" @close="showPhoneEdit = false">
      <div class="sheet-content">
        <h3>编辑手机</h3>
        <p class="muted">请输入您的手机号码</p>
        <div class="form-group">
          <label class="form-label">手机号码</label>
          <input
            v-model="phoneInput"
            type="tel"
            class="input"
            placeholder="请输入11位手机号码"
            maxlength="11"
            @input="onPhoneInput"
          />
          <p v-if="phoneError" class="error-text">{{ phoneError }}</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelPhoneEdit">取消</button>
          <button class="primary-btn" @click="savePhone" :disabled="!canSavePhone || saving">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 地址编辑弹窗 -->
    <BottomSheet :open="showAddressEdit" @close="showAddressEdit = false">
      <div class="sheet-content">
        <h3>编辑地址</h3>
        <p class="muted">请输入您的地址</p>
        <div class="form-group">
          <label class="form-label">地址</label>
          <textarea
            v-model="addressInput"
            class="input"
            placeholder="请输入详细地址"
            rows="3"
            maxlength="200"
          ></textarea>
          <p v-if="addressError" class="error-text">{{ addressError }}</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelAddressEdit">取消</button>
          <button class="primary-btn" @click="saveAddress" :disabled="!canSaveAddress || saving">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 身份证编辑弹窗 -->
    <BottomSheet :open="showIdCardEdit" @close="showIdCardEdit = false">
      <div class="sheet-content">
        <h3>编辑身份证</h3>
        <p class="muted">请输入您的身份证号码</p>
        <div class="form-group">
          <label class="form-label">身份证号码</label>
          <input
            v-model="idCardInput"
            type="text"
            class="input"
            placeholder="请输入18位身份证号码"
            maxlength="18"
            @input="onIdCardInput"
          />
          <p v-if="idCardError" class="error-text">{{ idCardError }}</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelIdCardEdit">取消</button>
          <button class="primary-btn" @click="saveIdCard" :disabled="!canSaveIdCard">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 添加支付方式 -->
    <BottomSheet :open="showAddPayment" @close="showAddPayment = false">
      <div class="sheet-content">
        <h3>添加支付方式</h3>
        <div class="form-group">
          <label class="form-label">支付类型</label>
          <select v-model="newPayment.type" class="input">
            <option value="">请选择</option>
            <option value="balance">账户余额</option>
            <option value="wechat">微信支付</option>
            <option value="alipay">支付宝</option>
            <option value="bank">银行卡</option>
          </select>
        </div>
        <div class="form-group" v-if="newPayment.type === 'bank'">
          <label class="form-label">银行卡号</label>
          <input
            v-model="newPayment.cardNumber"
            type="text"
            class="input"
            placeholder="请输入银行卡号"
            maxlength="19"
          />
        </div>
        <div class="form-group" v-if="newPayment.type === 'bank'">
          <label class="form-label">持卡人姓名</label>
          <input
            v-model="newPayment.cardName"
            type="text"
            class="input"
            placeholder="请输入持卡人姓名"
          />
        </div>
        <div class="form-group" v-if="newPayment.type === 'bank'">
          <label class="form-label">开户银行</label>
          <input
            v-model="newPayment.bankName"
            type="text"
            class="input"
            placeholder="请输入开户银行"
          />
        </div>
        <div class="form-group" v-if="newPayment.type !== 'bank' && newPayment.type !== 'balance'">
          <label class="form-label">账户信息</label>
          <input
            v-model="newPayment.account"
            type="text"
            class="input"
            :placeholder="newPayment.type === 'wechat' ? '请输入微信号' : '请输入支付宝账号'"
          />
        </div>
        <div class="form-group" v-if="newPayment.type === 'balance'">
          <p class="muted small-text">账户余额将自动关联，无需额外绑定信息</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelAddPayment">取消</button>
          <button class="primary-btn" @click="addPayment" :disabled="!canAddPayment">
            添加
          </button>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '../../stores/user'
import BottomSheet from '../../components/BottomSheet.vue'
import { updateProfile } from '../../api/guardian'
import { showToast } from '../../utils/toast'

const userStore = useUserStore()

// 个人中心页面应该始终显示监护人自己的信息，而不是被监护人的信息
const profile = computed(() => {
  return userStore.profile || {}
})

const showIdCardEdit = ref(false)
const idCardInput = ref('')
const idCardError = ref('')
const saving = ref(false)

// 姓名编辑相关状态
const showNameEdit = ref(false)
const nameInput = ref('')
const nameError = ref('')

// 手机编辑相关状态
const showPhoneEdit = ref(false)
const phoneInput = ref('')
const phoneError = ref('')

// 地址编辑相关状态
const showAddressEdit = ref(false)
const addressInput = ref('')
const addressError = ref('')

// 根据身份证计算年龄
const calculateAge = (idCard) => {
  if (!idCard || idCard.length !== 18) {
    return null
  }
  try {
    const birthYear = parseInt(idCard.substring(6, 10))
    const birthMonth = parseInt(idCard.substring(10, 12))
    const birthDay = parseInt(idCard.substring(12, 14))
    
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()
    
    let age = currentYear - birthYear
    
    // 如果还没过生日，年龄减1
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      age--
    }
    
    return age >= 0 ? `${age}岁` : null
  } catch (error) {
    return null
  }
}

const formatIdCard = (idCard) => {
  if (!idCard) return null
  // 显示前6位和后4位，中间用*代替
  if (idCard.length === 18) {
    return `${idCard.substring(0, 6)}******${idCard.substring(14)}`
  }
  return idCard
}

const idVerifiedText = computed(() => {
  return profile.value?.id_verified ? '已认证' : '未认证'
})

const idVerifiedClass = computed(() => {
  return profile.value?.id_verified ? 'verified' : 'unverified'
})

// 身份证验证
const validateIdCard = (idCard) => {
  if (!idCard) {
    return '请输入身份证号码'
  }
  // 18位身份证号码验证
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  if (!idCardRegex.test(idCard)) {
    return '请输入有效的18位身份证号码'
  }
  return ''
}

const onIdCardInput = () => {
  idCardError.value = ''
  // 只允许输入数字和X
  idCardInput.value = idCardInput.value.replace(/[^\dXx]/g, '').toUpperCase()
}

const canSaveIdCard = computed(() => {
  return idCardInput.value.length === 18 && !idCardError.value && !saving.value
})

const saveIdCard = async () => {
  const error = validateIdCard(idCardInput.value)
  if (error) {
    idCardError.value = error
    return
  }

  saving.value = true
  try {
    const response = await updateProfile({ id_card: idCardInput.value })
    // 使用API返回的完整用户信息更新本地profile并保存到storage
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      // 如果API没有返回完整信息，至少更新id_card和id_verified
      userStore.updateProfile({
        id_card: idCardInput.value,
        id_verified: true // 后端会自动设置id_verified为1
      })
    }
    showIdCardEdit.value = false
    showToast('身份证已保存')
  } catch (err) {
    console.error('保存身份证失败:', err)
    idCardError.value = err.response?.data?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

const cancelIdCardEdit = () => {
  showIdCardEdit.value = false
  idCardInput.value = profile.value?.id_card || ''
  idCardError.value = ''
}

// 打开编辑弹窗时初始化输入值
const openIdCardEdit = () => {
  idCardInput.value = profile.value?.id_card || ''
  idCardError.value = ''
  showIdCardEdit.value = true
}

// 姓名编辑
const openNameEdit = () => {
  nameInput.value = profile.value?.name || ''
  nameError.value = ''
  showNameEdit.value = true
}

const cancelNameEdit = () => {
  showNameEdit.value = false
  nameInput.value = profile.value?.name || ''
  nameError.value = ''
}

const canSaveName = computed(() => {
  return nameInput.value.trim().length > 0 && !saving.value
})

const saveName = async () => {
  if (!canSaveName.value) return
  
  nameError.value = ''
  saving.value = true
  try {
    const response = await updateProfile({ name: nameInput.value.trim() })
    // 更新本地用户信息并保存到storage
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ name: nameInput.value.trim() })
    }
    showNameEdit.value = false
    showToast('姓名已保存')
  } catch (err) {
    console.error('保存姓名失败:', err)
    nameError.value = err.response?.data?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

// 手机编辑
const openPhoneEdit = () => {
  phoneInput.value = profile.value?.phone || ''
  phoneError.value = ''
  showPhoneEdit.value = true
}

const cancelPhoneEdit = () => {
  showPhoneEdit.value = false
  phoneInput.value = profile.value?.phone || ''
  phoneError.value = ''
}

const onPhoneInput = () => {
  phoneError.value = ''
  // 只允许输入数字
  phoneInput.value = phoneInput.value.replace(/[^\d]/g, '')
}

const validatePhone = (phone) => {
  if (!phone) {
    return '请输入手机号码'
  }
  // 11位手机号码验证
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phone)) {
    return '请输入有效的11位手机号码'
  }
  return ''
}

const canSavePhone = computed(() => {
  return phoneInput.value.length === 11 && !phoneError.value && !saving.value
})

const savePhone = async () => {
  const error = validatePhone(phoneInput.value)
  if (error) {
    phoneError.value = error
    return
  }

  saving.value = true
  try {
    const response = await updateProfile({ phone: phoneInput.value })
    // 更新本地用户信息并保存到storage
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ phone: phoneInput.value })
    }
    showPhoneEdit.value = false
    showToast('手机号码已保存')
  } catch (err) {
    console.error('保存手机号码失败:', err)
    phoneError.value = err.response?.data?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

// 地址编辑
const openAddressEdit = () => {
  addressInput.value = profile.value?.address || ''
  addressError.value = ''
  showAddressEdit.value = true
}

const cancelAddressEdit = () => {
  showAddressEdit.value = false
  addressInput.value = profile.value?.address || ''
  addressError.value = ''
}

const canSaveAddress = computed(() => {
  return addressInput.value.trim().length > 0 && !saving.value
})

const saveAddress = async () => {
  if (!canSaveAddress.value) return
  
  // 检查地址是否真的变化了
  const newAddress = addressInput.value.trim()
  // 获取当前地址：个人中心页面始终显示监护人自己的信息
  // 统一处理：将 null 和空字符串都视为空值
  const currentAddress = (userStore.profile?.address || '').trim()
  
  if (newAddress === currentAddress) {
    showToast('地址未变化')
    showAddressEdit.value = false
    return
  }
  
  addressError.value = ''
  saving.value = true
  try {
    // 个人中心页面只保存监护人自己的信息，不传递 client_id
    const payload = { address: newAddress }
    
    const response = await updateProfile(payload)
    // 更新本地信息
    if (response?.data?.data?.user) {
      // 更新监护人自己的信息
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ address: newAddress })
    }
    showAddressEdit.value = false
    showToast('地址已保存')
  } catch (err) {
    console.error('保存地址失败:', err)
    // 如果后端返回"没有要更新的字段"，提示更友好的消息
    if (err.response?.data?.message?.includes('没有要更新的字段')) {
      addressError.value = '地址未变化，无需更新'
      showToast('地址未变化')
      showAddressEdit.value = false
    } else {
      addressError.value = err.response?.data?.message || '保存失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

// 饮食偏好
const showDietPreferences = ref(false)
const dietPreferencesOptions = [
  { id: 'vegetarian', label: '素食' },
  { id: 'low_salt', label: '低盐' },
  { id: 'low_sugar', label: '低糖' },
  { id: 'low_fat', label: '低脂' },
  { id: 'high_protein', label: '高蛋白' },
  { id: 'high_fiber', label: '高纤维' },
  { id: 'soft_food', label: '软食' },
  { id: 'liquid', label: '流质' },
  { id: 'no_spicy', label: '不辣' },
  { id: 'no_seafood', label: '无海鲜' },
  { id: 'no_nuts', label: '无坚果' },
  { id: 'no_dairy', label: '无乳制品' }
]
const selectedDietPreferences = ref([])

const dietPreferencesText = computed(() => {
  if (selectedDietPreferences.value.length === 0) return ''
  const labels = selectedDietPreferences.value
    .map(id => dietPreferencesOptions.find(p => p.id === id)?.label)
    .filter(Boolean)
  return labels.length > 2 ? `${labels.slice(0, 2).join('、')}等${labels.length}项` : labels.join('、')
})

const toggleDietPreference = (id) => {
  const index = selectedDietPreferences.value.indexOf(id)
  if (index > -1) {
    selectedDietPreferences.value.splice(index, 1)
  } else {
    selectedDietPreferences.value.push(id)
  }
}

const saveDietPreferences = () => {
  // TODO: 调用后端API保存
  console.log('保存饮食偏好:', selectedDietPreferences.value)
  showDietPreferences.value = false
  toast('饮食偏好已保存')
}

// 健康提醒
const showHealthReminders = ref(false)
const healthRemindersOptions = [
  { id: 'order_reminder', label: '下单提醒', desc: '订单提交成功后通知' },
  { id: 'delivery_reminder', label: '配送提醒', desc: '订单配送状态更新时通知' },
  { id: 'report_reminder', label: '报告推送', desc: '健康报告生成时推送' },
  { id: 'meal_reminder', label: '用餐提醒', desc: '每日用餐时间提醒' },
  { id: 'nutrition_reminder', label: '营养提醒', desc: '营养摄入异常时提醒' },
  { id: 'health_tip', label: '健康小贴士', desc: '每日健康知识推送' }
]
const selectedHealthReminders = ref(['order_reminder', 'delivery_reminder'])

const healthRemindersText = computed(() => {
  const count = selectedHealthReminders.value.length
  if (count === 0) return '未开启任何提醒'
  if (count === healthRemindersOptions.length) return '已开启全部提醒'
  return `已开启${count}项提醒`
})

const saveHealthReminders = () => {
  // TODO: 调用后端API保存
  console.log('保存健康提醒:', selectedHealthReminders.value)
  showHealthReminders.value = false
  toast('健康提醒设置已保存')
}

// 支付方式
const showPaymentMethods = ref(false)
const showAddPayment = ref(false)
const paymentMethods = ref([
  {
    id: 1,
    type: 'wechat',
    label: '微信支付',
    desc: '已绑定',
    isDefault: true
  },
  {
    id: 2,
    type: 'alipay',
    label: '支付宝',
    desc: '已绑定',
    isDefault: false
  }
])

const paymentMethodsText = computed(() => {
  if (paymentMethods.value.length === 0) return '未绑定支付方式'
  const defaultMethod = paymentMethods.value.find(m => m.isDefault)
  if (defaultMethod) return `默认：${defaultMethod.label}`
  return `已绑定${paymentMethods.value.length}种支付方式`
})

const newPayment = ref({
  type: '',
  cardNumber: '',
  cardName: '',
  bankName: '',
  account: ''
})

const canAddPayment = computed(() => {
  if (!newPayment.value.type) return false
  if (newPayment.value.type === 'balance') return true
  if (newPayment.value.type === 'bank') {
    return newPayment.value.cardNumber && newPayment.value.cardName && newPayment.value.bankName
  }
  return !!newPayment.value.account
})

const setDefaultPayment = (id) => {
  paymentMethods.value.forEach(m => {
    m.isDefault = m.id === id
  })
  // TODO: 调用后端API保存
  toast('已设为默认支付方式')
}

const removePayment = (id) => {
  if (confirm('确定要删除此支付方式吗？')) {
    const index = paymentMethods.value.findIndex(m => m.id === id)
    if (index > -1) {
      paymentMethods.value.splice(index, 1)
      // TODO: 调用后端API删除
      toast('支付方式已删除')
    }
  }
}

const addPayment = () => {
  if (!canAddPayment.value) return
  
  let label = '银行卡'
  let desc = '已绑定'
  
  if (newPayment.value.type === 'balance') {
    label = '账户余额'
    desc = '可用余额支付'
  } else if (newPayment.value.type === 'wechat') {
    label = '微信支付'
    desc = newPayment.value.account || '已绑定'
  } else if (newPayment.value.type === 'alipay') {
    label = '支付宝'
    desc = newPayment.value.account || '已绑定'
  } else if (newPayment.value.type === 'bank') {
    label = '银行卡'
    desc = `${newPayment.value.bankName} · ${newPayment.value.cardNumber.slice(-4)}`
  }
  
  const method = {
    id: Date.now(),
    type: newPayment.value.type,
    label,
    desc,
    isDefault: paymentMethods.value.length === 0
  }
  
  paymentMethods.value.push(method)
  cancelAddPayment()
  // TODO: 调用后端API添加
  toast('支付方式已添加')
}

const cancelAddPayment = () => {
  showAddPayment.value = false
  newPayment.value = {
    type: '',
    cardNumber: '',
    cardName: '',
    bankName: '',
    account: ''
  }
}

const toast = (msg) => {
  // 简单的提示，后续可以替换为更好的toast组件
  alert(msg)
}
</script>

<style scoped>
.profile {
  gap: 12px;
}
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.hero-main {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: #e5e7eb;
}
.default-avatar {
  background:
    url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23cbd5e1' stroke-width='6'%3E%3Ccircle cx='40' cy='28' r='14' fill='%23e5e7eb'/%3E%3Cpath d='M20 66c4-10 12-16 20-16s16 6 20 16' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E")
      center/64% no-repeat,
    linear-gradient(135deg, #eef2f7, #e5e7eb);
}
.meta h2 {
  margin: 0 0 6px;
}
.meta p {
  margin: 2px 0;
}
.small-text {
  margin: 0;
  font-size: 12px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.item:last-child {
  border-bottom: none;
}

/* Sheet Content */
.sheet-content {
  padding: 0 16px 16px;
}
.sheet-content h3 {
  margin: 0 0 8px;
  font-size: calc(var(--fs-title) * var(--font-scale));
}
.sheet-content > .muted {
  margin: 0 0 20px;
}

/* 饮食偏好 */
.preferences-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
.preference-chip {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--ghost-bg);
  color: var(--text);
  font-size: calc(var(--fs-body) * var(--font-scale));
  cursor: pointer;
  transition: all 0.2s ease;
}
.preference-chip:hover {
  background: var(--ghost-bg-hover);
}
.preference-chip.active {
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #fff;
  border-color: var(--accent-strong);
}

/* 健康提醒 */
.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.reminder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--ghost-bg);
}
.reminder-label {
  font-weight: var(--fw-medium);
  margin-bottom: 4px;
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  cursor: pointer;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: 0.3s;
  border-radius: 26px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}
.toggle-switch input:checked + .slider {
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
}
.toggle-switch input:checked + .slider:before {
  transform: translateX(22px);
}

/* 支付方式 */
.payment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
}
.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--ghost-bg);
}
.payment-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.payment-label {
  font-weight: var(--fw-medium);
  margin-bottom: 4px;
}
.payment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.default-badge {
  padding: 4px 10px;
  border-radius: 12px;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #fff;
  font-size: 12px;
  font-weight: var(--fw-medium);
}
.ghost-btn.danger {
  color: #ef4444;
  border-color: #fecaca;
}
.ghost-btn.danger:hover {
  background: #fee2e2;
}
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 表单 */
.form-group {
  margin-bottom: 16px;
}
.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--fw-medium);
  font-size: calc(var(--fs-body) * var(--font-scale));
}
.form-group select.input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%236b7280' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.form-group textarea.input {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

/* Sheet Actions */
.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.sheet-actions .ghost-btn,
.sheet-actions .primary-btn {
  flex: 1;
}
.sheet-actions .primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost-btn.mini {
  width: auto;
  padding: 8px 14px;
  font-size: 14px;
  min-height: 36px;
}

.verified {
  color: #16a34a;
}

.unverified {
  color: var(--muted);
}

.edit-id-btn {
  padding: 4px 10px;
  font-size: 12px;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 6px;
}
</style>
