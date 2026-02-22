import http from './http'
import { unwrap } from './http'
import { useUserStore } from '../stores/user'
import config from '../config'

// 根据用户角色发送消息到对应的 dify API 端点（流式）
export const sendXiaozhiMessageStream = (payload, onChunk, onEnd, onError) => {
  const userStore = useUserStore()
  const role = userStore.profile?.role || 'client'
  
  // 根据角色选择端点
  let endpoint = '/ai/chat/client'
  if (role === 'guardian') {
    endpoint = '/ai/chat/guardian'
  } else if (role === 'gov') {
    endpoint = '/ai/chat/gov'
  }
  
  const token = localStorage.getItem('token')
  
  // 构建完整 URL
  // config.api.baseURL 是 '/api'，所以完整路径是 '/api/ai/chat/client'
  const fullUrl = `${config.api.baseURL}${endpoint}`
  
  // 使用 fetch 进行 SSE 连接
  fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    console.log('[SSE] 开始读取流式数据')
    
    function readStream() {
      reader.read().then(({ done, value }) => {
        if (done) {
          console.log('[SSE] 流式数据读取完成')
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        console.log('[SSE] 收到数据块:', chunk.substring(0, 100))
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))
              console.log('[SSE] 解析数据:', data.type, data.content?.substring(0, 20))
              
              if (data.type === 'text') {
                onChunk(data.content)
              } else if (data.type === 'end') {
                console.log('[SSE] 收到结束事件，会话ID:', data.conversationId)
                onEnd(data.conversationId, data.fullReply)
              } else if (data.type === 'error') {
                onError(new Error(data.message))
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e, line)
            }
          }
        }
        
        readStream()
      }).catch(onError)
    }
    
    readStream()
  }).catch(onError)
}

// 根据用户角色发送消息到对应的 dify API 端点（阻塞模式，保留用于兼容）
export const sendXiaozhiMessage = (payload) => {
  const userStore = useUserStore()
  const role = userStore.profile?.role || 'client'
  
  // 根据角色选择端点
  let endpoint = '/ai/chat/client'
  if (role === 'guardian') {
    endpoint = '/ai/chat/guardian'
  } else if (role === 'gov') {
    endpoint = '/ai/chat/gov'
  }
  
  return http.post(endpoint, payload).then((res) => unwrap(res))
}

// 获取聊天记录
export const getChatMessages = (params = {}) =>
  http.get('/ai/messages', { params }).then((res) => unwrap(res))

// 获取会话列表
export const getConversations = (params = {}) =>
  http.get('/ai/conversations', { params }).then((res) => unwrap(res))

// 创建新对话
export const createNewConversation = () =>
  http.post('/ai/conversations/new').then((res) => unwrap(res))

// 删除当前用户的所有聊天记录
export const deleteChatMessages = () =>
  http.delete('/ai/messages').then((res) => unwrap(res))

// 保存 WebSocket 消息到数据库
export const saveWebSocketMessage = (payload) =>
  http.post('/ai/messages/save', payload).then((res) => unwrap(res))
