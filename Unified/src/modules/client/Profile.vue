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
        <div>
          <div class="muted">所属社区</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong>{{ communityName || '未绑定' }}</strong>
            <button class="ghost-btn mini edit-id-btn" @click="openCommunityEdit">编辑</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">会员服务</div>
      <div class="member-section">
        <div class="member-content">
          <div>
            <div class="muted">会员状态</div>
            <strong :class="profile?.is_member ? 'member-status' : 'non-member-status'">
              {{ profile?.is_member ? '已开通会员' : '未开通会员' }}
            </strong>
            <p v-if="profile?.is_member" class="muted small-text">享受会员专属优惠价格</p>
            <p v-else class="muted small-text">可享受专属优惠价格</p>
          </div>
          <div v-if="!profile?.is_member">
            <button 
              class="primary-btn member-btn" 
              @click="openMember"
              :disabled="openingMember"
            >
              {{ openingMember ? '开通中...' : '开通会员' }}
            </button>
          </div>
          <div v-else class="member-badge">
            <span>✓ 会员</span>
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
        <div class="item" @click="showHealthConditionsEdit = true">
          <div>
            <div class="muted">身体情况</div>
            <p class="muted small-text">
              {{ healthConditionsText || '如过敏、慢性病等，用于饮食建议' }}
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
        <div class="item">
          <div>
            <div class="muted">支付方式</div>
            <p class="muted small-text">
              默认：代付
            </p>
          </div>
        </div>
        <div class="item danger-item" @click="showDeleteConfirm = true">
          <div>
            <div class="muted">删除聊天记录</div>
            <p class="muted small-text">
              删除与AI助手的所有对话记录
            </p>
          </div>
          <button class="ghost-btn mini danger">删除</button>
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

    <!-- 身体情况编辑弹窗 -->
    <BottomSheet :open="showHealthConditionsEdit" @close="showHealthConditionsEdit = false">
      <div class="sheet-content">
        <h3>身体情况</h3>
        <p class="muted">请填写您的身体情况，如过敏、慢性病等，以便为您提供更合适的饮食建议</p>
        <div class="form-group">
          <label class="form-label">身体情况</label>
          <textarea
            v-model="healthConditionsInput"
            class="input"
            placeholder="例如：高血压、糖尿病、对海鲜过敏"
            rows="4"
            maxlength="500"
          ></textarea>
          <p class="muted small-text" style="margin-top: 6px;">
            {{ healthConditionsInput.length }}/500
          </p>
          <p v-if="healthConditionsError" class="error-text">{{ healthConditionsError }}</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelHealthConditionsEdit">取消</button>
          <button class="primary-btn" @click="saveHealthConditions" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
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

    <!-- 社区编辑弹窗 -->
    <BottomSheet :open="showCommunityEdit" @close="showCommunityEdit = false">
      <div class="sheet-content">
        <h3>编辑所属社区</h3>
        <p class="muted">请选择您所属的社区</p>
        <div class="form-group">
          <label class="form-label">所属社区</label>
          <select v-model="communityInput" class="input">
            <option value="">请选择社区</option>
            <option v-for="community in availableCommunities" :key="community.id" :value="community.id">
              {{ community.name }}
            </option>
          </select>
          <p v-if="communityError" class="error-text">{{ communityError }}</p>
        </div>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="cancelCommunityEdit">取消</button>
          <button class="primary-btn" @click="saveCommunity" :disabled="!canSaveCommunity || saving">保存</button>
        </div>
      </div>
    </BottomSheet>

    <!-- 删除聊天记录确认对话框 -->
    <BottomSheet :open="showDeleteConfirm" @close="showDeleteConfirm = false">
      <div class="sheet-content">
        <h3>删除聊天记录</h3>
        <p class="muted">确定要删除与AI助手的所有对话记录吗？</p>
        <p class="muted small-text danger-text">
          此操作不可恢复，删除后将无法找回任何聊天记录。
        </p>
        <div class="sheet-actions">
          <button class="ghost-btn" @click="showDeleteConfirm = false" :disabled="deletingChatHistory">
            取消
          </button>
          <button 
            class="primary-btn danger-btn" 
            @click="handleDeleteChatHistory" 
            :disabled="deletingChatHistory"
          >
            {{ deletingChatHistory ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import BottomSheet from '../../components/BottomSheet.vue'
import { deleteChatMessages } from '../../api/ai'
import { showToast } from '../../utils/toast'
import { updateProfile } from '../../api/client'
import http from '../../api/http'

const userStore = useUserStore()

const profile = computed(() => userStore.profile || {})

// 删除聊天记录相关状态
const showDeleteConfirm = ref(false)
const deletingChatHistory = ref(false)

// 身份证编辑相关状态
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

// 身体情况编辑相关状态
const showHealthConditionsEdit = ref(false)
const healthConditionsInput = ref('')
const healthConditionsError = ref('')

// 会员相关状态
const openingMember = ref(false)

// 社区相关状态
const showCommunityEdit = ref(false)
const communityInput = ref('')
const communityError = ref('')
const availableCommunities = ref([])

// 计算社区名称
const communityName = computed(() => {
  console.log('[Profile] communityName 计算:', {
    community_id: profile.value?.community_id,
    availableCommunities: availableCommunities.value,
    profile: profile.value
  })
  
  // 如果用户有 community_id，尝试从列表中查找
  if (profile.value?.community_id) {
    if (availableCommunities.value.length > 0) {
      const community = availableCommunities.value.find(c => c.id === profile.value.community_id)
      if (community) {
        return community.name
      }
    }
    // 如果列表中找不到，但用户有 community_id，显示 ID
    return `社区 #${profile.value.community_id}`
  }
  return null
})

// 获取可用社区列表
onMounted(async () => {
  try {
    console.log('[Profile] 开始获取社区列表...')
    const res = await http.get('/client/communities')
    console.log('[Profile] API 响应:', res)
    console.log('[Profile] res.data:', res.data)
    console.log('[Profile] res.data.data:', res.data.data)
    
    // 修复：应该从 res.data.data 中获取 communities
    const communities = res.data?.data?.communities || res.data?.communities || []
    availableCommunities.value = communities
    console.log('[Profile] 获取到社区列表:', availableCommunities.value)
    console.log('[Profile] 社区列表长度:', availableCommunities.value.length)
  } catch (err) {
    console.error('[Profile] 获取社区列表失败:', err)
    console.error('[Profile] 错误详情:', err.response)
  }
})

// 社区编辑
const openCommunityEdit = () => {
  communityInput.value = profile.value?.community_id || ''
  communityError.value = ''
  showCommunityEdit.value = true
}

const cancelCommunityEdit = () => {
  showCommunityEdit.value = false
  communityInput.value = profile.value?.community_id || ''
  communityError.value = ''
}

const canSaveCommunity = computed(() => {
  return communityInput.value && !saving.value
})

const saveCommunity = async () => {
  if (!canSaveCommunity.value) return
  
  const selectedCommunity = availableCommunities.value.find(c => c.id === parseInt(communityInput.value))
  if (!selectedCommunity) {
    communityError.value = '请选择有效的社区'
    return
  }
  
  communityError.value = ''
  saving.value = true
  try {
    const response = await updateProfile({ 
      community_id: selectedCommunity.id,
      community_code: selectedCommunity.code
    })
    // 更新本地用户信息并保存到storage
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ 
        community_id: selectedCommunity.id,
        community_code: selectedCommunity.code
      })
    }
    showCommunityEdit.value = false
    showToast('所属社区已保存')
  } catch (err) {
    console.error('保存社区失败:', err)
    communityError.value = err.response?.data?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

const ageText = computed(() => profile.value?.age || profile.value?.birthday || '未填写')
const idAuthText = computed(() => (profile.value?.id_verified ? '已认证' : '未认证'))

const idVerifiedText = computed(() => {
  return profile.value?.id_verified ? '已认证' : '未认证'
})

const idVerifiedClass = computed(() => {
  return profile.value?.id_verified ? 'verified' : 'unverified'
})

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

// 身份证格式化
const formatIdCard = (idCard) => {
  if (!idCard) return null
  // 显示前6位和后4位，中间用*代替
  if (idCard.length === 18) {
    return `${idCard.substring(0, 6)}******${idCard.substring(14)}`
  }
  return idCard
}

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
  // 统一处理：将 null 和空字符串都视为空值
  const currentAddress = (profile.value?.address || '').trim()
  
  console.log('[前端] 保存地址检查:', {
    newAddress,
    currentAddress,
    profileAddress: profile.value?.address,
    areEqual: newAddress === currentAddress
  })
  
  if (newAddress === currentAddress) {
    showToast('地址未变化')
    showAddressEdit.value = false
    return
  }
  
  addressError.value = ''
  saving.value = true
  try {
    console.log('[前端] 发送地址更新请求:', { address: newAddress })
    const response = await updateProfile({ address: newAddress })
    console.log('[前端] 地址更新成功:', response?.data)
    // 更新本地用户信息并保存到storage
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ address: newAddress })
    }
    showAddressEdit.value = false
    showToast('地址已保存')
  } catch (err) {
    console.error('[前端] 保存地址失败:', err)
    console.error('[前端] 错误详情:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    })
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

// 从profile初始化饮食偏好
const initDietPreferences = () => {
  const prefs = profile.value?.diet_preferences
  if (Array.isArray(prefs)) {
    selectedDietPreferences.value = [...prefs]
  } else {
    selectedDietPreferences.value = []
  }
}

// 监听profile变化，更新饮食偏好
watch(() => profile.value?.diet_preferences, () => {
  initDietPreferences()
}, { immediate: true })

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

const saveDietPreferences = async () => {
  saving.value = true
  try {
    const response = await updateProfile({ diet_preferences: selectedDietPreferences.value })
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ diet_preferences: selectedDietPreferences.value })
    }
    showDietPreferences.value = false
    showToast('饮食偏好已保存')
  } catch (err) {
    console.error('保存饮食偏好失败:', err)
    showToast(err.response?.data?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 健康提醒
const showHealthReminders = ref(false)
const healthRemindersOptions = [
  { id: 'order_placed', label: '下单提醒', desc: '订单提交成功后通知' },
  { id: 'order_preparing', label: '备餐提醒', desc: '商家开始准备订单时通知' },
  { id: 'order_delivering', label: '配送提醒', desc: '订单开始配送时通知' },
  { id: 'order_delivered', label: '送达提醒', desc: '订单送达时通知' },
  { id: 'daily_report', label: '每日报告', desc: '每日营养摄入报告推送' },
  { id: 'weekly_report', label: '每周报告', desc: '每周健康分析报告推送' },
  { id: 'meal_time', label: '用餐提醒', desc: '每日用餐时间提醒' },
  { id: 'nutrition_alert', label: '营养警告', desc: '营养摄入异常时提醒' },
  { id: 'health_tips', label: '健康小贴士', desc: '每日健康知识推送' },
  { id: 'seasonal_tips', label: '节气养生', desc: '节气变化时推送养生建议' }
]

// 默认全部开启
const selectedHealthReminders = ref([
  'order_placed',
  'order_preparing', 
  'order_delivering',
  'order_delivered',
  'daily_report',
  'weekly_report',
  'meal_time',
  'nutrition_alert',
  'health_tips',
  'seasonal_tips'
])

// 从profile初始化健康提醒
const initHealthReminders = () => {
  const settings = profile.value?.notification_settings
  if (Array.isArray(settings) && settings.length > 0) {
    selectedHealthReminders.value = [...settings]
  } else {
    // 默认全部开启
    selectedHealthReminders.value = healthRemindersOptions.map(opt => opt.id)
  }
}

// 监听profile变化，更新健康提醒
watch(() => profile.value?.notification_settings, () => {
  initHealthReminders()
}, { immediate: true })

const healthRemindersText = computed(() => {
  const count = selectedHealthReminders.value.length
  if (count === 0) return '未开启任何提醒'
  if (count === healthRemindersOptions.length) return '已开启全部提醒'
  return `已开启${count}项提醒`
})

const saveHealthReminders = async () => {
  saving.value = true
  try {
    const response = await updateProfile({ notification_settings: selectedHealthReminders.value })
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ notification_settings: selectedHealthReminders.value })
    }
    showHealthReminders.value = false
    showToast('健康提醒设置已保存')
  } catch (err) {
    console.error('保存健康提醒失败:', err)
    showToast(err.response?.data?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 身体情况编辑
const healthConditionsText = computed(() => {
  const conditions = profile.value?.health_conditions
  if (!conditions || conditions.trim() === '') return ''
  // 如果内容太长，截断显示
  return conditions.length > 30 ? conditions.substring(0, 30) + '...' : conditions
})

const openHealthConditionsEdit = () => {
  healthConditionsInput.value = profile.value?.health_conditions || ''
  healthConditionsError.value = ''
  showHealthConditionsEdit.value = true
}

const cancelHealthConditionsEdit = () => {
  showHealthConditionsEdit.value = false
  healthConditionsInput.value = profile.value?.health_conditions || ''
  healthConditionsError.value = ''
}

const saveHealthConditions = async () => {
  const newHealthConditions = healthConditionsInput.value.trim()
  const currentHealthConditions = (profile.value?.health_conditions || '').trim()
  
  if (newHealthConditions === currentHealthConditions) {
    showToast('身体情况未变化')
    showHealthConditionsEdit.value = false
    return
  }
  
  healthConditionsError.value = ''
  saving.value = true
  try {
    const response = await updateProfile({ health_conditions: newHealthConditions })
    // 更新本地用户信息并保存到storage
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
    } else {
      userStore.updateProfile({ health_conditions: newHealthConditions })
    }
    showHealthConditionsEdit.value = false
    showToast('身体情况已保存')
  } catch (err) {
    console.error('保存身体情况失败:', err)
    healthConditionsError.value = err.response?.data?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}


const toast = (msg) => {
  // 简单的提示，后续可以替换为更好的toast组件
  alert(msg)
}

// 开通会员
const openMember = async () => {
  if (openingMember.value) return
  
  openingMember.value = true
  try {
    const response = await updateProfile({ is_member: true })
    // 更新本地用户信息
    if (response?.data?.data?.user) {
      userStore.updateProfile(response.data.data.user)
      await userStore.refreshProfile()
    } else {
      userStore.updateProfile({ is_member: true })
    }
    showToast('会员开通成功！')
  } catch (err) {
    console.error('开通会员失败:', err)
    console.error('错误详情:', err.response?.data)
    showToast(err?.response?.data?.message || err?.response?.data?.error || '开通会员失败，请稍后重试')
  } finally {
    openingMember.value = false
  }
}

// 删除聊天记录
const handleDeleteChatHistory = async () => {
  if (deletingChatHistory.value) return

  deletingChatHistory.value = true

  try {
    const res = await deleteChatMessages()
    const deletedCount = res?.deletedCount || 0
    showToast(`已成功删除 ${deletedCount} 条聊天记录`)
    showDeleteConfirm.value = false
  } catch (err) {
    console.error('删除聊天记录失败:', err)
    showToast(err?.message || '删除聊天记录失败，请稍后重试')
  } finally {
    deletingChatHistory.value = false
  }
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

/* 删除聊天记录样式 */
.danger-item {
  opacity: 1;
}

.danger-item:hover {
  background: rgba(239, 68, 68, 0.05);
}

.danger-item .muted {
  color: var(--text);
}

.danger-item .muted.small-text {
  color: var(--muted);
}

.danger-item button.danger {
  color: #ef4444;
  border-color: #fecaca;
}

.danger-item button.danger:hover {
  background: #fee2e2;
  border-color: #ef4444;
}

.danger-item:active button.danger {
  background: #fecaca;
}

/* 删除确认对话框样式 */
.danger-text {
  color: #ef4444 !important;
  margin-top: 8px;
}

.danger-btn {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
}

.danger-btn:hover:not(:disabled) {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.edit-id-btn {
  padding: 6px 12px;
  font-size: 13px;
  white-space: nowrap;
  border: 1px solid var(--border);
  background: var(--ghost-bg);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-id-btn:hover {
  background: var(--ghost-bg-hover);
  border-color: var(--accent);
  color: var(--accent-strong);
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 6px;
}

.verified {
  color: #16a34a;
}

.unverified {
  color: var(--muted);
}

/* 会员相关样式 */
.member-section {
  padding: 0;
}

.member-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(31, 156, 122, 0.08), rgba(19, 120, 92, 0.06));
  border-radius: 12px;
  border: 1px solid rgba(31, 156, 122, 0.15);
}

.member-content > div:first-child {
  flex: 1;
  min-width: 0;
}

.member-status {
  color: var(--accent-strong);
  font-size: 18px;
  display: block;
  margin-top: 4px;
}

.non-member-status {
  color: var(--text);
  font-size: 18px;
  display: block;
  margin-top: 4px;
}

.member-content > div:last-child {
  flex-shrink: 0;
}

.member-btn {
  min-width: 120px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: var(--fw-medium);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.member-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ee5a6f, #dd4a5f);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(238, 90, 111, 0.3);
}

.member-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.member-badge {
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  border-radius: 20px;
  font-weight: var(--fw-semibold);
  font-size: 14px;
  white-space: nowrap;
}

.member-badge span {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
