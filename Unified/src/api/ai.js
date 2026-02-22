import http from './http'
import { unwrap } from './http'
import { useUserStore } from '../stores/user'

// 根据用户角色发送消息到对应的 dify API 端点
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
