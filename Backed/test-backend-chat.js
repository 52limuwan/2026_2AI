// 测试后端 /api/ai/chat/client 接口
const axios = require('axios');

async function testBackendChat() {
  console.log('测试后端聊天接口');
  console.log('');
  
  try {
    // 先登录获取 token
    console.log('=== 步骤 1: 登录 ===');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      identifier: 'client01',
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    console.log('登录成功，Token:', token.substring(0, 20) + '...');
    console.log('');
    
    // 创建新对话
    console.log('=== 步骤 2: 创建新对话 ===');
    const newConvResponse = await axios.post(
      'http://localhost:8000/api/ai/conversations/new',
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const conversationId = newConvResponse.data.data.conversationId;
    console.log('对话创建成功，ID:', conversationId);
    console.log('');
    
    // 发送聊天消息
    console.log('=== 步骤 3: 发送聊天消息 ===');
    const chatResponse = await axios.post(
      'http://localhost:8000/api/ai/chat/client',
      {
        conversationId: conversationId,
        message: '你好'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('状态码:', chatResponse.status);
    console.log('回复:', chatResponse.data.data.reply);
    console.log('会话ID:', chatResponse.data.data.conversationId);
    console.log('');
    
    console.log('✅ 测试成功！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误详情:', error);
    }
  }
}

testBackendChat();
