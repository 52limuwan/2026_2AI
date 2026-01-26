<template>
  <div class="card-list">
    <div class="card">
      <div class="muted">重点关注推送</div>
      <h2>推送健康建议</h2>
      
      <!-- 选择用户 -->
      <div class="form-section">
        <label class="form-label">选择用户</label>
        <select v-model="selectedClientId" class="input" @change="onClientChange">
          <option value="">请选择销售端用户</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.name }} - {{ client.phone }}
          </option>
        </select>
      </div>

      <!-- 是否推送给监护人 -->
      <div class="form-section" v-if="selectedClientId && guardians.length > 0">
        <label class="checkbox-label">
          <input type="checkbox" v-model="sendToGuardian" />
          <span>同时推送给监护人</span>
        </label>
        <div v-if="sendToGuardian" class="guardian-info">
          <div class="muted" style="font-size: 13px; margin-bottom: 6px;">将推送给以下监护人：</div>
          <div class="guardian-list">
            <div class="guardian-tag" v-for="g in guardians" :key="g.id">
              {{ g.name }} ({{ g.relation }})
            </div>
          </div>
        </div>
      </div>

      <!-- 建议内容 -->
      <div class="form-section">
        <label class="form-label">风险提醒 / 优化建议</label>
        <textarea 
          v-model="form.content" 
          placeholder="输入健康建议内容..."
          class="input"
          rows="5"
        ></textarea>
      </div>

      <!-- 下一步建议 -->
      <div class="form-section">
        <label class="form-label">下一步健康管理建议</label>
        <textarea 
          v-model="form.nextStep" 
          placeholder="输入下一步行动建议..."
          class="input"
          rows="4"
        ></textarea>
      </div>

      <!-- AI生成按钮 -->
      <button 
        class="ghost-btn" 
        @click="generateAISuggestion" 
        :disabled="!selectedClientId || aiLoading"
        style="margin-bottom: 10px;"
      >
        <span v-if="!aiLoading">AI 智能生成建议</span>
        <span v-else class="thinking">
          <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
          AI思考中
        </span>
      </button>

      <!-- 推送按钮 -->
      <button 
        class="primary-btn" 
        @click="push"
        :disabled="!selectedClientId || !form.content"
      >
        推送建议
      </button>

      <p v-if="message" class="muted" style="margin-top: 10px;">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { pushSuggestion, generateAISuggestion as generateAISuggestionAPI } from '../../api/gov'
import http from '../../api/http'

const clients = ref([])
const selectedClientId = ref('')
const guardians = ref([])
const sendToGuardian = ref(false)

const form = ref({
  content: '',
  nextStep: ''
})
const message = ref('')
const aiLoading = ref(false)

// 加载所有用户
const loadClients = async () => {
  try {
    const response = await http.get('/gov/clients')
    clients.value = response.data.data.clients || []
  } catch (err) {
    console.error('加载用户列表失败:', err)
  }
}

// 当选择用户时，加载其监护人
const onClientChange = async () => {
  guardians.value = []
  sendToGuardian.value = false
  
  if (!selectedClientId.value) return
  
  try {
    const response = await http.get(`/gov/clients/${selectedClientId.value}/guardians`)
    guardians.value = response.data.data.guardians || []
    
    // 如果有监护人，默认勾选
    if (guardians.value.length > 0) {
      sendToGuardian.value = true
    }
  } catch (err) {
    console.error('加载监护人失败:', err)
  }
}

// AI生成建议
const generateAISuggestion = async () => {
  if (!selectedClientId.value) {
    message.value = '请先选择用户'
    return
  }

  aiLoading.value = true
  message.value = '正在生成 AI 建议...'

  try {
    const response = await generateAISuggestionAPI(Number(selectedClientId.value))
    
    console.log('AI 响应完整数据:', response)
    console.log('response.data:', response.data)
    
    // 后端返回 code: 0 表示成功
    if (response.data.code === 0) {
      const { content, nextStep } = response.data.data
      console.log('提取的 content:', content)
      console.log('提取的 nextStep:', nextStep)
      
      form.value.content = content
      form.value.nextStep = nextStep
      
      console.log('form.value 更新后:', form.value)
      
      message.value = 'AI 建议已生成，您可以编辑后推送'
    } else {
      message.value = response.data.message || '生成失败，请重试'
    }
  } catch (err) {
    console.error('生成AI建议失败:', err)
    console.error('错误详情:', err.response?.data)
    message.value = err?.response?.data?.message || '生成失败，请重试'
  } finally {
    aiLoading.value = false
  }
}

// 推送建议
const push = async () => {
  if (!selectedClientId.value || !form.value.content) {
    message.value = '请选择用户并填写建议内容'
    return
  }

  try {
    // 收集所有监护人ID
    const guardianIds = sendToGuardian.value ? guardians.value.map(g => g.id) : []
    
    await pushSuggestion({
      clientId: Number(selectedClientId.value),
      guardianId: guardianIds.length > 0 ? guardianIds[0] : null, // 兼容旧接口
      content: form.value.content,
      nextStep: form.value.nextStep
    })
    
    const targetText = sendToGuardian.value && guardians.value.length > 0 
      ? '已推送到销售端与监护人端' 
      : '已推送到销售端'
    
    message.value = targetText
    
    // 清空表单
    form.value = { content: '', nextStep: '' }
    selectedClientId.value = ''
    guardians.value = []
    sendToGuardian.value = false
  } catch (err) {
    message.value = err?.response?.data?.message || '推送失败'
  }
}

onMounted(() => {
  loadClients()
})
</script>

<style scoped>
.form-section {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: var(--fw-medium);
  color: var(--text);
  margin-bottom: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.guardian-info {
  margin-top: 10px;
  padding: 12px;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.guardian-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guardian-tag {
  padding: 6px 12px;
  background: var(--card);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text);
  border: 1px solid var(--border);
}

.thinking {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dot {
  animation: thinking 1.4s infinite;
  opacity: 0;
}

.dot:nth-child(1) {
  animation-delay: 0s;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking {
  0%, 60%, 100% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
