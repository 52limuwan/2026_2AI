<template>
  <div class="ai-chat-container">
    <!-- 对话消息区域 -->
    <div class="messages-area" ref="messagesRef">
      <!-- 消息列表 -->
      <div class="messages-list">
        <!-- 特殊的自我介绍消息框（始终显示，不会保存到数据库） -->
        <div class="message-item message-ai welcome-message">
          <div class="message-bubble">
            <div class="message-content markdown-content" v-html="renderMarkdown(welcomeMessage.content)"></div>
            <div class="message-time">{{ formatTime(welcomeMessage.timestamp) }}</div>
            <!-- 快捷提问按钮 -->
            <div class="quick-questions">
              <button
                v-for="(question, idx) in quickQuestions"
                :key="idx"
                class="quick-question-btn"
                @click="handleQuickQuestion(question)"
              >
                {{ question }}
              </button>
            </div>
          </div>
        </div>

        <!-- 普通聊天消息（从数据库加载或新发送的） -->
        <div
          v-for="(msg, index) in messages"
          :key="msg.id || index"
          class="message-item"
          :class="{ 'message-user': msg.role === 'user', 'message-ai': msg.role === 'ai' }"
        >
          <div class="message-bubble">
            <div class="message-content markdown-content" v-html="renderMarkdown(msg.content)"></div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <!-- AI 思考中 -->
        <div v-if="isThinking && !isStreaming" class="message-item message-ai">
          <div class="message-bubble">
            <div class="message-content thinking-indicator">
              <span class="thinking-text">思考中</span>
              <span class="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        </div>

        <!-- AI 正在输入中（备用，流式输出时不显示） -->
        <div v-if="isLoading && !isStreaming && !isThinking" class="message-item message-ai">
          <div class="message-bubble">
            <div class="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 胶囊输入框 - 固定在底部栏上方 -->
    <div class="input-wrapper">
      <div class="input-container">
        <!-- 电话按钮胶囊 -->
        <button class="phone-capsule" @click="handlePhoneCall" title="语音通话">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21 15.46l-5.27-.61-2.52 2.52a15.045 15.045 0 01-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z"
              fill="currentColor"
            />
          </svg>
        </button>
        <!-- 输入框胶囊 -->
        <div class="capsule-input">
          <input
            v-model="inputText"
            type="text"
            placeholder="输入消息..."
            class="input-field"
            :disabled="isLoading || isThinking"
            @keydown.enter.prevent="handleSend"
          />
          <button
            class="send-btn"
            :disabled="!inputText.trim() || isLoading || isThinking"
            @click="handleSend"
          >
            {{ isThinking ? '思考中...' : isLoading ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 历史对话列表 -->
  <BottomSheet :open="showHistoryDialog" @close="showHistoryDialog = false">
    <div class="sheet-content">
      <h3>历史对话</h3>
      <div v-if="conversations.length > 0" class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.conversation_id"
          class="conversation-item"
          :class="{ active: conv.conversation_id === conversationId }"
          @click="switchConversation(conv.conversation_id)"
        >
          <div class="conversation-info">
            <div class="conversation-title">{{ conv.title || `对话 ${conv.conversation_id.slice(-8)}` }}</div>
            <div class="conversation-meta">
              <span class="conversation-time">{{ formatConversationTime(conv.last_message_time) }}</span>
              <span class="conversation-count">{{ conv.message_count }}条消息</span>
            </div>
          </div>
          <button
            v-if="conv.conversation_id === conversationId"
            class="conversation-active-indicator"
            title="当前对话"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <p v-else class="muted empty-conversations">暂无历史对话</p>
    </div>
  </BottomSheet>

  <!-- 电话通话界面 -->
  <Teleport to="body">
    <div
      v-if="showPhoneCall || phoneCallAnimating"
      class="phone-call-overlay"
      :class="{ 'phone-call-visible': showPhoneCall, 'phone-call-animating': phoneCallAnimating }"
    >
      <!-- 动画遮罩层 -->
      <div
        ref="phoneCallMask"
        class="phone-call-mask"
        :style="maskStyle"
      ></div>
      
      <!-- 通话界面内容 -->
      <div class="phone-call-content">
        <div class="phone-call-header">
          <button class="phone-close-btn" @click="handleClosePhoneCall">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <div class="phone-call-body">
          <div class="caller-avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          
          <div class="caller-info">
            <h2 class="caller-name">膳食伙伴</h2>
            <p class="call-status" :class="{ 'calling': callStatus === 'calling', 'connected': callStatus === 'connected' }">
              {{ callStatusText }}
            </p>
          </div>
          
          <div class="call-controls">
            <button class="call-control-btn hangup-btn" @click="handleHangup">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 15.46l-5.27-.61-2.52 2.52a15.045 15.045 0 01-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z"
                  fill="currentColor"
                  transform="rotate(135 12 12)"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue'
import { marked } from 'marked'
import { sendXiaozhiMessage, getChatMessages, getConversations, createNewConversation, saveWebSocketMessage } from '../../api/ai'
import { useUserStore } from '../../stores/user'
import { showToast } from '../../utils/toast'
import BottomSheet from '../../components/BottomSheet.vue'
import { getXiaozhiWebSocket, getDeviceConfig, getOtaUrl } from '../../utils/xiaozhi-websocket'

const userStore = useUserStore()

// WebSocket 实例 - 监护人端专用
const ws = getXiaozhiWebSocket('guardian')
const wsConnected = ref(false)
const wsConnecting = ref(false)

// 监护人专属的 OTA URL
const GUARDIAN_OTA_URL = getOtaUrl('guardian')

const inputText = ref('')
const messagesRef = ref(null)
const isLoading = ref(false)
const isThinking = ref(false)
const isStreaming = ref(false)
const conversationId = ref('')
const messages = ref([])
// 欢迎消息始终显示，不允许隐藏
const showWelcomeMessage = ref(true)
const showHistoryDialog = ref(false)
const conversations = ref([])

// 电话通话相关状态
const showPhoneCall = ref(false)
const phoneCallAnimating = ref(false)
const phoneCallMask = ref(null)
const buttonPosition = ref({ x: 0, y: 0 })
const maskScale = ref(0)
const callStatus = ref('calling') // 'calling' | 'connected' | 'ended'
let callStatusTimer = null

// 欢迎消息（特殊的，不会保存到数据库）
const welcomeMessage = computed(() => {
  const userName = userStore.profile?.name || '用户'
  return {
    role: 'ai',
    content: `**${userName}，我是您的 AI顾问**

专为家属提供老年人健康管理服务。我可以帮你分析老人的饮食营养、解读健康报告、提供护理建议，让你更好地照顾家人的健康。

有什么我可以帮助你的吗？`,
    timestamp: Date.now()
  }
})

// 渲染 Markdown
const renderMarkdown = (text) => {
  return marked(text, { breaks: true })
}

// 快捷提问选项
const quickQuestions = ref([
  '老人最近的营养状况如何？',
  '如何改善老人的饮食习惯？',
  '老人有慢性病需要注意什么？',
  '推荐适合老人的健康菜品'
])

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 加载历史聊天记录
const loadChatHistory = async () => {
  if (!userStore.profile?.id) return

  try {
    // 如果当前没有会话ID，不自动加载，保持欢迎消息状态
    // 用户可以选择从历史对话中选择，或者直接发送消息创建新对话
    if (conversationId.value) {
      // 加载指定对话的聊天记录
      const { messages: historyMessages } = await getChatMessages({ conversationId: conversationId.value })
      
      if (historyMessages && historyMessages.length > 0) {
        // 加载历史消息
        messages.value = historyMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
        // 欢迎消息始终显示，不隐藏
        scrollToBottom()
      } else {
        messages.value = []
        // 欢迎消息始终显示
      }
    } else {
      // 没有会话ID，保持空消息列表，欢迎消息始终显示
      messages.value = []
    }
  } catch (err) {
    console.error('加载聊天记录失败:', err)
    messages.value = []
    showWelcomeMessage.value = true
  }
}

// 连接 WebSocket
const connectWebSocket = async () => {
  if (wsConnected.value || wsConnecting.value) return
  
  wsConnecting.value = true
  try {
    const deviceConfig = getDeviceConfig()
    
    // 检查是否配置了直接 WebSocket URL
    const directWsUrl = import.meta.env.VITE_CLIENT_WS_URL
    
    if (directWsUrl) {
      // 使用直接 WebSocket 连接
      console.log('使用直接 WebSocket 连接:', directWsUrl)
      await ws.connect(null, deviceConfig, directWsUrl)
    } else {
      // 使用 OTA 方式连接
      console.log('使用 OTA 连接:', GUARDIAN_OTA_URL)
      await ws.connect(GUARDIAN_OTA_URL, deviceConfig)
    }
    
    wsConnected.value = true
    
    // 注册消息处理器
    ws.onMessage(handleWebSocketMessage)
    
    // 注册连接状态处理器
    ws.onConnectionStateChange((isConnected) => {
      wsConnected.value = isConnected
      if (!isConnected) {
        showToast('连接已断开')
        // 3秒后尝试重连
        setTimeout(() => {
          if (!wsConnected.value) {
            connectWebSocket()
          }
        }, 3000)
      }
    })
    
    console.log('WebSocket 连接成功')
  } catch (error) {
    console.error('连接失败:', error)
    showToast('连接失败，请重试')
  } finally {
    wsConnecting.value = false
  }
}

// 处理 WebSocket 消息
const handleWebSocketMessage = (message) => {
  console.log('收到消息:', message)
  
  if (message.type === 'llm') {
    // AI 回复 - 只处理表情符号
    if (message.text && /^[\u{1F300}-\u{1F9FF}]$/u.test(message.text)) {
      console.log('收到表情:', message.text)
    }
  } else if (message.type === 'stt') {
    // 语音识别结果
    console.log('STT 识别结果:', message.text)
    
    // 只在语音模式下处理 STT 消息（避免文本消息重复）
    if (ws.getVoiceMode() && message.text && message.text.trim()) {
      const userMessage = {
        role: 'user',
        content: message.text,
        timestamp: Date.now()
      }
      messages.value.push(userMessage)
      scrollToBottom()
      
      // 保存用户消息到数据库
      saveMessageToDatabase(userMessage)
    }
    
  } else if (message.type === 'tts') {
    // TTS 状态和文本内容
    if (message.state === 'start') {
      // 开始新的 AI 回复 - 保持思考状态，等待第一个文本片段
      console.log('AI 开始回复')
      
    } else if (message.state === 'sentence_start' && message.text) {
      // 收到文本片段
      // 如果还没有创建消息，现在创建并停止思考
      if (currentAiMessageIndex.value === null) {
        isThinking.value = false
        
        const aiMessage = {
          role: 'ai',
          content: '',
          timestamp: Date.now()
        }
        messages.value.push(aiMessage)
        currentAiMessageIndex.value = messages.value.length - 1
      }
      
      // 添加到待输出队列
      pendingText.value += message.text
      
      // 如果没有正在进行的流式输出，启动它
      if (!streamingTimer.value) {
        startStreaming()
      }
      
    } else if (message.state === 'stop') {
      // TTS 结束，等待流式输出完成后保存
      isTtsComplete.value = true
    }
  }
}

// 当前正在输出的 AI 消息索引
const currentAiMessageIndex = ref(null)
// 待输出的文本
const pendingText = ref('')
// 流式输出定时器
const streamingTimer = ref(null)
// TTS 是否已完成
const isTtsComplete = ref(false)

// 开始流式输出
const startStreaming = () => {
  if (streamingTimer.value) return
  
  streamingTimer.value = setInterval(() => {
    if (currentAiMessageIndex.value === null) {
      stopStreaming()
      return
    }
    
    const message = messages.value[currentAiMessageIndex.value]
    if (!message) {
      stopStreaming()
      return
    }
    
    // 如果还有待输出的文本
    if (pendingText.value.length > 0) {
      // 每次输出一个字符
      message.content += pendingText.value[0]
      pendingText.value = pendingText.value.slice(1)
      scrollToBottom()
    } else if (isTtsComplete.value) {
      // 没有待输出文本且 TTS 已完成，停止流式输出
      stopStreaming()
      
      // 保存完整消息到数据库
      if (message.content) {
        saveMessageToDatabase(message)
      }
      
      // 重置状态
      currentAiMessageIndex.value = null
      isTtsComplete.value = false
    }
  }, 30) // 每 30ms 输出一个字符
}

// 停止流式输出
const stopStreaming = () => {
  if (streamingTimer.value) {
    clearInterval(streamingTimer.value)
    streamingTimer.value = null
  }
  isStreaming.value = false
}

// 保存消息到数据库
const saveMessageToDatabase = async (message) => {
  try {
    // 如果没有会话ID，先创建一个
    if (!conversationId.value) {
      const result = await createNewConversation()
      conversationId.value = result.conversationId
    }
    
    await saveWebSocketMessage({
      conversationId: conversationId.value,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    })
    
    console.log('消息已保存到数据库')
  } catch (error) {
    console.error('保存消息失败:', error)
    // 不影响用户体验，静默失败
  }
}

// 流式输出效果
const streamText = (text, messageIndex) => {
  return new Promise((resolve) => {
    isStreaming.value = true
    const fullText = text
    let currentIndex = 0
    const message = messages.value[messageIndex]
    
    const streamInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        // 逐字添加到消息内容
        message.content = fullText.slice(0, currentIndex + 1)
        currentIndex++
        scrollToBottom()
      } else {
        clearInterval(streamInterval)
        isStreaming.value = false
        // 确保最终内容是完整的
        message.content = fullText
        resolve()
      }
    }, 30) // 每30ms显示一个字符，可以调整速度
  })
}

// 发送消息
const handleSend = async () => {
  const content = inputText.value.trim()
  if (!content || isLoading.value || isThinking.value) return

  // 添加用户消息到本地
  const userMessage = {
    role: 'user',
    content: content,
    timestamp: Date.now()
  }
  messages.value.push(userMessage)
  inputText.value = ''
  scrollToBottom()

  // 保存用户消息到数据库
  saveMessageToDatabase(userMessage)

  // 显示"思考中"状态
  isThinking.value = true
  
  try {
    // 尝试使用 WebSocket（如果已连接）
    if (wsConnected.value) {
      const success = ws.sendTextMessage(content)
      if (success) {
        // WebSocket 发送成功，设置超时
        setTimeout(() => {
          if (isThinking.value) {
            isThinking.value = false
            showToast('响应超时，请重试')
          }
        }, 30000) // 30秒超时
        return
      }
    }
    
    // WebSocket 不可用或发送失败，使用 HTTP API
    console.log('使用 HTTP API 发送消息')
    
    // 如果没有会话ID，先创建一个
    if (!conversationId.value) {
      const result = await createNewConversation()
      conversationId.value = result.conversationId
    }
    
    // 通过 HTTP API 发送消息
    const response = await sendXiaozhiMessage({
      conversationId: conversationId.value,
      message: content
    })
    
    isThinking.value = false
    
    // 添加 AI 回复
    const aiMessage = {
      role: 'ai',
      content: response.reply || '抱歉，我现在无法回答。',
      timestamp: Date.now()
    }
    messages.value.push(aiMessage)
    
    // 保存 AI 回复到数据库
    saveMessageToDatabase(aiMessage)
    
    // 流式输出效果
    const messageIndex = messages.value.length - 1
    await streamText(response.reply || '抱歉，我现在无法回答。', messageIndex)
    
    scrollToBottom()
    
  } catch (err) {
    console.error('发送消息失败:', err)
    isThinking.value = false
    isLoading.value = false
    showToast('发送失败，请稍后重试')
  }
}

// 处理快捷提问
const handleQuickQuestion = (question) => {
  inputText.value = question
  handleSend()
}

// 计算遮罩层样式
const maskStyle = computed(() => {
  if (!buttonPosition.value.x && !buttonPosition.value.y) {
    return {}
  }
  return {
    left: `${buttonPosition.value.x}px`,
    top: `${buttonPosition.value.y}px`,
    transform: `translate(-50%, -50%) scale(${maskScale.value})`
  }
})

// 计算通话状态文本
const callStatusText = computed(() => {
  switch (callStatus.value) {
    case 'calling':
      return '正在接通...'
    case 'connected':
      return '通话中'
    case 'ended':
      return '通话结束'
    default:
      return '通话中'
  }
})

// 处理电话呼叫
const handlePhoneCall = async (event) => {
  // 检查 WebSocket 是否已连接
  if (!wsConnected.value) {
    // 尝试连接 WebSocket
    try {
      await connectWebSocket()
    } catch (error) {
      console.error('WebSocket 连接失败:', error)
    }
    
    // 如果仍然未连接，提示用户
    if (!wsConnected.value) {
      showToast('语音通话功能暂不可用，请使用文字聊天')
      return
    }
  }

  // 启用语音模式
  ws.setVoiceMode(true)

  // 获取按钮位置
  const button = event.currentTarget
  const rect = button.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  buttonPosition.value = {
    x: centerX,
    y: centerY
  }

  // 计算需要的最大缩放值（确保覆盖整个屏幕）
  const maxDistance = Math.max(
    Math.sqrt(centerX * centerX + centerY * centerY),
    Math.sqrt((window.innerWidth - centerX) * (window.innerWidth - centerX) + centerY * centerY),
    Math.sqrt(centerX * centerX + (window.innerHeight - centerY) * (window.innerHeight - centerY)),
    Math.sqrt((window.innerWidth - centerX) * (window.innerWidth - centerX) + (window.innerHeight - centerY) * (window.innerHeight - centerY))
  )
  
  const buttonRadius = 24
  const maxScale = Math.ceil(maxDistance / buttonRadius) + 2

  // 重置状态
  maskScale.value = 0
  phoneCallAnimating.value = true
  showPhoneCall.value = false
  callStatus.value = 'calling'
  
  await nextTick()
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      maskScale.value = maxScale
      
      setTimeout(async () => {
        showPhoneCall.value = true
        
        // 开始语音会话
        try {
          // 开始录音会话（发送 listen start 消息）
          ws.startAudioSession()
          
          // 启动音频录制器
          const success = await ws.startRecording()
          
          if (success) {
            // 更新状态为已连接
            callStatus.value = 'connected'
          } else {
            throw new Error('启动录音失败')
          }
          
        } catch (error) {
          console.error('启动录音失败:', error)
          showToast('无法访问麦克风')
          handleClosePhoneCall()
        }
      }, 500)
    })
  })
}

// 关闭电话通话
const handleClosePhoneCall = () => {
  // 禁用语音模式
  ws.setVoiceMode(false)
  
  if (callStatusTimer) {
    clearInterval(callStatusTimer)
    callStatusTimer = null
  }
  
  // 先隐藏通话界面内容
  showPhoneCall.value = false
  
  // 然后收缩遮罩层
  setTimeout(() => {
    maskScale.value = 0
    
    // 等待收缩动画完成后清除所有状态
    setTimeout(() => {
      phoneCallAnimating.value = false
      callStatus.value = 'calling'
      buttonPosition.value = { x: 0, y: 0 }
    }, 500) // 等待收缩动画完成（与扩展动画时间相同）
  }, 100)
}

// 挂断电话
const handleHangup = () => {
  // 停止录音
  ws.stopRecording()
  
  // 停止录音会话
  ws.stopAudioSession()
  
  if (callStatusTimer) {
    clearInterval(callStatusTimer)
    callStatusTimer = null
  }
  
  callStatus.value = 'ended'
  
  setTimeout(() => {
    handleClosePhoneCall()
  }, 1000)
}

// 加载历史对话列表
const loadConversations = async () => {
  if (!userStore.profile?.id) return
  
  try {
    const { conversations: convs } = await getConversations({ limit: 50 })
    conversations.value = convs || []
  } catch (err) {
    console.error('加载对话列表失败:', err)
    conversations.value = []
  }
}

// 格式化对话时间
const formatConversationTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

// 创建新对话
const handleNewConversation = async () => {
  try {
    // 清空当前对话ID，不创建新ID
    // 当用户发送第一条消息时，后端会自动创建新的对话ID
    conversationId.value = ''
    
    // 清空当前消息（保留欢迎消息显示）
    messages.value = []
    
    // 欢迎消息始终显示
    
    // 重新加载对话列表（延迟一下，避免太快）
    setTimeout(async () => {
      await loadConversations()
    }, 500)
    
    // 滚动到底部
    scrollToBottom()
    
    showToast('已开启新对话')
  } catch (err) {
    console.error('创建新对话失败:', err)
    showToast('创建新对话失败，请重试')
  }
}

// 切换对话
const switchConversation = async (convId) => {
  if (convId === conversationId.value) {
    showHistoryDialog.value = false
    return
  }
  
  try {
    conversationId.value = convId
    
    // 加载该对话的消息
    const { messages: historyMessages } = await getChatMessages({ conversationId: convId })
    
    if (historyMessages && historyMessages.length > 0) {
      messages.value = historyMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
      // 欢迎消息始终显示，不隐藏
    } else {
      messages.value = []
      // 欢迎消息始终显示
    }
    
    // 关闭历史对话列表
    showHistoryDialog.value = false
    
    // 滚动到底部
    scrollToBottom()
    
    // 重新加载对话列表，确保显示最新的状态
    setTimeout(async () => {
      try {
        await loadConversations()
      } catch (err) {
        console.error('重新加载对话列表失败:', err)
      }
    }, 300)
  } catch (err) {
    console.error('切换对话失败:', err)
    showToast('加载对话失败，请重试')
    // 即使加载失败，也关闭对话框
    showHistoryDialog.value = false
  }
}

// 打开历史对话列表
const openHistoryDialog = async () => {
  await loadConversations()
  showHistoryDialog.value = true
}

// 监听来自Layout的事件
const handleHistoryEvent = () => {
  openHistoryDialog()
}

const handleNewChatEvent = () => {
  handleNewConversation()
}

// 组件卸载时清理
onUnmounted(() => {
  // 停止流式输出
  stopStreaming()
  
  // 停止录音
  ws.stopRecording()
  
  // 断开 WebSocket
  ws.disconnect()
  
  if (callStatusTimer) {
    clearInterval(callStatusTimer)
  }
  // 移除事件监听器
  window.removeEventListener('ai-open-history', handleHistoryEvent)
  window.removeEventListener('ai-new-chat', handleNewChatEvent)
})

onMounted(async () => {
  // 加载历史对话列表
  try {
    await loadConversations()
  } catch (error) {
    console.error('加载对话列表失败:', error)
  }
  
  // 加载历史聊天记录
  try {
    await loadChatHistory()
  } catch (error) {
    console.error('加载聊天记录失败:', error)
  }
  
  // 连接 WebSocket
  await connectWebSocket()
  
  // 监听来自Layout的事件
  window.addEventListener('ai-open-history', handleHistoryEvent)
  window.addEventListener('ai-new-chat', handleNewChatEvent)
  
  scrollToBottom()
})
</script>

<style scoped>
/* 覆盖 .page 的默认 padding，实现无容器布局 */
.ai-chat-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  /* 覆盖 .page 的默认 padding */
  margin: 0 !important;
  max-width: none !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  /* 顶部留出 AppHeader 的空间 (sticky, 约 72px) */
  padding-top: 72px;
  z-index: 1;
  overflow: hidden;
}

/* 对话消息区域 - 可滚动 */
.messages-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 14px;
  /* 添加足够的底部 padding，让消息可以滚动到输入框上方，不被遮挡 */
  /* 输入框位置：底部栏(84px) + 输入框高度(72px) + 额外空间(24px) + safe-bottom */
  padding-bottom: calc(84px + 72px + 24px + var(--safe-bottom, 0px));
  /* 使用 flex 布局自动适应高度 */
  min-height: 0;
  /* 确保可以滚动 */
  overscroll-behavior: contain;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 移除 min-height，让内容自然流动 */
}

/* 消息项 */
.message-item {
  display: flex;
  width: 100%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 用户消息 - 右侧 */
.message-user {
  justify-content: flex-end;
}

.message-user .message-bubble {
  max-width: 75%;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  border-bottom-right-radius: 4px;
  align-items: flex-end;
}

.message-user .message-time {
  color: rgba(255, 255, 255, 0.85);
  opacity: 0.9;
}

/* AI消息 - 左侧 */
.message-ai {
  justify-content: flex-start;
}

.message-ai .message-bubble {
  max-width: 75%;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text);
  border-bottom-left-radius: 4px;
  align-items: flex-start;
}

.message-ai .message-time {
  color: var(--muted);
  opacity: 0.8;
}

/* 消息气泡 */
.message-bubble {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  word-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

/* 欢迎消息特殊样式 */
.welcome-message {
  margin-top: 16px;
}

.welcome-message .message-bubble {
  position: relative;
}

/* 快捷提问按钮区域 */
.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.quick-question-btn {
  padding: 10px 14px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 8px;
  font-size: calc(var(--fs-body) * var(--font-scale) * 0.95);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  line-height: 1.4;
}

.quick-question-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  transform: translateX(2px);
}

.quick-question-btn:active {
  transform: translateX(0);
  opacity: 0.9;
}

.message-content {
  font-size: calc(var(--fs-body) * var(--font-scale));
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Markdown 内容样式 */
.markdown-content {
  white-space: normal;
}

.markdown-content :deep(p) {
  margin: 0.5em 0;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: inherit;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid var(--border);
  padding-left: 1em;
  margin: 0.5em 0;
  color: var(--muted);
}

/* 用户消息中的 Markdown 样式（白色背景） */
.message-user .markdown-content :deep(strong) {
  color: #fff;
}

.message-user .markdown-content :deep(code) {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.message-user .markdown-content :deep(pre) {
  background: rgba(255, 255, 255, 0.15);
}

.message-user .markdown-content :deep(a) {
  color: #fff;
  text-decoration: underline;
}

/* 流式输出光标 */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--accent);
  margin-left: 2px;
  animation: cursorBlink 1s infinite;
  vertical-align: baseline;
}

@keyframes cursorBlink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  align-self: flex-end;
  margin-top: 2px;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

/* 思考中指示器 */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.thinking-text {
  font-size: calc(var(--fs-body) * var(--font-scale));
  color: var(--muted);
  font-style: italic;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: thinking 1.4s infinite ease-in-out;
  opacity: 0.6;
}

.thinking-dots span:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* 输入框包装器 - 固定在底部栏上方，完全透明，无背景图层，悬浮显示 */
.input-wrapper {
  position: fixed;
  left: 0;
  right: 0;
  /* 底部栏高度：56px (tab高度) + 14px*2 (padding) + safe-bottom = 84px + safe-bottom */
  bottom: calc(84px + var(--safe-bottom, 0px));
  padding: 12px 14px;
  /* 完全透明，无背景 */
  background: transparent !important;
  /* 添加半透明背景，让输入框更明显（可选，如果不需要可以删除） */
  /* backdrop-filter: blur(8px); */
  z-index: 100;
  pointer-events: none;
}

/* 输入容器 - 包含电话按钮和输入框，无背景 */
.input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 960px;
  margin: 0 auto;
  background: transparent !important;
  pointer-events: auto;
}

/* 电话按钮胶囊 - 悬浮样式 */
.phone-capsule {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--accent);
  cursor: pointer;
  border-radius: 999px;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
  padding: 0;
  /* 添加阴影，让胶囊悬浮更明显 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.phone-capsule:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent);
}

.phone-capsule:active {
  opacity: 0.8;
}

.phone-capsule svg {
  width: 22px;
  height: 22px;
}

/* 胶囊输入框 - 悬浮样式 */
.capsule-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 8px 8px 16px;
  /* 无阴影效果 */
  box-shadow: none;
  flex: 1;
  height: 48px;
  min-height: 48px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: calc(var(--fs-body) * var(--font-scale));
  color: var(--text);
  line-height: 1.5;
  padding: 0;
  height: 32px;
  min-height: 32px;
}

.input-field::placeholder {
  color: var(--muted);
  opacity: 0.8;
}

.input-field:-webkit-autofill,
.input-field:-webkit-autofill:hover,
.input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text);
  -webkit-box-shadow: 0 0 0px 1000px transparent inset;
  transition: background-color 5000s ease-in-out 0s;
}

.send-btn {
  min-width: 60px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #fff;
  font-size: calc(var(--fs-body) * var(--font-scale));
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  flex-shrink: 0;
  box-shadow: none;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .ai-chat-container {
    padding-top: 72px;
  }

  .messages-area {
    padding: 20px 14px;
    padding-bottom: calc(84px + 72px + 24px + var(--safe-bottom, 0px));
    min-height: 0;
  }

  .input-wrapper {
    padding: 12px 14px;
  }

  .message-user .message-bubble,
  .message-ai .message-bubble {
    max-width: 85%;
  }

  .message-bubble {
    padding: 10px 12px;
    font-size: 15px;
  }
}

/* 平板及以上适配 */
@media (min-width: 768px) {
  .ai-chat-container {
    padding-top: 80px;
  }

  .messages-area {
    padding-bottom: calc(84px + 72px + 24px + var(--safe-bottom, 0px));
    min-height: 0;
  }
}
/* 历史对话列表样式 */
.sheet-content {
  padding: 0 16px 16px;
}

.sheet-content h3 {
  margin: 0 0 16px;
  font-size: calc(var(--fs-title) * var(--font-scale));
  font-weight: var(--fw-semibold);
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  cursor: pointer;
  transition: all 0.2s ease;
}

.conversation-item:hover {
  background: var(--ghost-bg);
  border-color: var(--accent);
}

.conversation-item.active {
  background: var(--ghost-bg);
  border-color: var(--accent);
}

.conversation-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-title {
  font-size: calc(var(--fs-body) * var(--font-scale));
  font-weight: var(--fw-medium);
  color: var(--text);
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--muted);
}

.conversation-time {
  flex-shrink: 0;
}

.conversation-count {
  flex-shrink: 0;
}

.conversation-active-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  cursor: default;
}

.conversation-active-indicator svg {
  width: 14px;
  height: 14px;
}

.empty-conversations {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
}

</style>

<style>
/* 暗黑模式适配 - 使用全局样式确保正确应用 */
[data-theme='dark'] .input-wrapper {
  background: transparent !important;
}

[data-theme='light'] .input-wrapper {
  background: transparent !important;
}

[data-theme='dark'] .input-container {
  background: transparent !important;
}

[data-theme='light'] .input-container {
  background: transparent !important;
}

[data-theme='dark'] .phone-capsule {
  background: var(--card) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

[data-theme='dark'] .phone-capsule:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

[data-theme='light'] .phone-capsule {
  background: var(--card) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

[data-theme='light'] .phone-capsule:hover {
  background: rgba(255, 255, 255, 0.95) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

[data-theme='dark'] .capsule-input {
  background: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: none !important;
}

[data-theme='dark'] .capsule-input:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(34, 197, 94, 0.3) !important;
  box-shadow: none !important;
}

[data-theme='dark'] .capsule-input:focus-within {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(34, 197, 94, 0.5) !important;
  box-shadow: none !important;
}

[data-theme='light'] .capsule-input {
  background: var(--card) !important;
  box-shadow: none !important;
}

[data-theme='light'] .capsule-input:hover {
  background: rgba(255, 255, 255, 0.95) !important;
  border-color: rgba(31, 156, 122, 0.3) !important;
  box-shadow: none !important;
}

[data-theme='light'] .capsule-input:focus-within {
  background: rgba(255, 255, 255, 1) !important;
  border-color: rgba(31, 156, 122, 0.5) !important;
  box-shadow: none !important;
}

[data-theme='dark'] .input-field {
  color: var(--text) !important;
}

[data-theme='dark'] .input-field::placeholder {
  color: #9ca3af !important;
  opacity: 0.8;
}

/* 浅色模式 placeholder */
[data-theme='light'] .input-field::placeholder {
  color: #6b7280 !important;
  opacity: 0.8;
}

[data-theme='dark'] .input-field:-webkit-autofill,
[data-theme='dark'] .input-field:-webkit-autofill:hover,
[data-theme='dark'] .input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text) !important;
  -webkit-box-shadow: 0 0 0px 1000px var(--card) inset !important;
}

[data-theme='dark'] .send-btn {
  background: linear-gradient(120deg, var(--accent), var(--accent-strong)) !important;
  color: #fff !important;
}

[data-theme='dark'] .send-btn:hover:not(:disabled) {
  opacity: 0.9 !important;
  box-shadow: none !important;
}

[data-theme='dark'] .messages-area::-webkit-scrollbar-thumb {
  background: var(--border) !important;
}

[data-theme='dark'] .messages-area::-webkit-scrollbar-thumb:hover {
  background: var(--muted) !important;
}

/* 浅色模式增强 */

/* 暗黑模式消息气泡样式 */
[data-theme='dark'] .message-ai .message-bubble {
  background: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  color: var(--text) !important;
}

[data-theme='dark'] .message-ai .message-time {
  color: var(--muted) !important;
}

[data-theme='dark'] .message-user .message-bubble {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3) !important;
}

[data-theme='dark'] .typing-indicator span {
  background: var(--muted) !important;
}

/* 暗黑模式思考中指示器样式 */
[data-theme='dark'] .thinking-text {
  color: var(--muted) !important;
}

[data-theme='dark'] .thinking-dots span {
  background: var(--accent) !important;
}

/* 暗黑模式流式输出光标样式 */
[data-theme='dark'] .streaming-cursor {
  background: var(--accent) !important;
}

/* 暗黑模式快捷提问按钮样式 */
[data-theme='dark'] .quick-questions {
  border-top-color: var(--border) !important;
}

[data-theme='dark'] .quick-question-btn {
  background: var(--bg) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}

[data-theme='dark'] .quick-question-btn:hover {
  background: var(--accent) !important;
  color: #fff !important;
  border-color: var(--accent) !important;
}

[data-theme='light'] .quick-question-btn {
  background: rgba(255, 255, 255, 0.6) !important;
}

[data-theme='light'] .quick-question-btn:hover {
  background: var(--accent) !important;
  color: #fff !important;
}

/* 暗黑模式电话按钮胶囊样式 */

/* 电话通话界面样式 */
.phone-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  overflow: hidden;
  pointer-events: none;
}

.phone-call-overlay.phone-call-animating {
  pointer-events: auto;
}

.phone-call-overlay.phone-call-visible {
  pointer-events: auto;
}

/* 遮罩层动画 */
.phone-call-mask {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  pointer-events: none;
  z-index: 1;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
              background-color 0.3s ease 0.3s;
}

.phone-call-overlay.phone-call-visible .phone-call-mask {
  background: var(--bg);
}

/* 通话界面内容 */
.phone-call-content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  opacity: 0;
  transition: opacity 0.3s ease 0.2s;
}

.phone-call-overlay.phone-call-visible .phone-call-content {
  opacity: 1;
}

/* 通话界面头部 */
.phone-call-header {
  padding: 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.phone-close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.phone-close-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.phone-close-btn svg {
  width: 20px;
  height: 20px;
}

/* 通话界面主体 */
.phone-call-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 40px;
}

/* 头像 */
.caller-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--card);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  animation: pulse 2s ease-in-out infinite;
}

.caller-avatar svg {
  width: 60px;
  height: 60px;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 34, 197, 94), 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(var(--accent-rgb, 34, 197, 94), 0);
  }
}

/* 通话信息 */
.caller-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.caller-name {
  font-size: 28px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.call-status {
  font-size: 16px;
  color: var(--muted);
  margin: 0;
  position: relative;
  padding-left: 20px;
}

.call-status::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
  animation: blink 1.5s ease-in-out infinite;
}

.call-status.calling::before {
  background: var(--accent);
}

.call-status.connected::before {
  background: #22c55e;
  animation: none;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* 通话控制按钮 */
.call-controls {
  display: flex;
  gap: 24px;
  align-items: center;
  margin-top: 20px;
}

.call-control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text);
}

.call-control-btn:hover {
  transform: scale(1.1);
}

.call-control-btn svg {
  width: 24px;
  height: 24px;
}

.mute-btn.active,
.speaker-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.hangup-btn {
  width: 64px;
  height: 64px;
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}

.hangup-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.hangup-btn svg {
  width: 28px;
  height: 28px;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .caller-avatar {
    width: 100px;
    height: 100px;
  }

  .caller-avatar svg {
    width: 50px;
    height: 50px;
  }

  .caller-name {
    font-size: 24px;
  }

  .call-controls {
    gap: 20px;
  }

  .call-control-btn {
    width: 52px;
    height: 52px;
  }

  .hangup-btn {
    width: 60px;
    height: 60px;
  }
}

</style>