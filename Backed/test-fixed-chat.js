// 测试修复后的聊天功能
const axios = require('axios');

async function testFixedChat() {
  console.log('测试修复后的聊天功能');
  console.log('');
  
  try {
    // 登录
    console.log('=== 步骤 1: 登录 ===');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      identifier: 'client01',
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    console.log('登录成功');
    console.log('');
    
    // 第一次对话（不传 conversationId）
    console.log('=== 步骤 2: 第一次对话（新会话） ===');
    const chatResponse1 = await axios.post(
      'http://localhost:8000/api/ai/chat/client',
      {
        conversationId: '',  // 空字符串，后端会不传给 Dify
        message: '你好'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('状态码:', chatResponse1.status);
    console.log('回复:', chatResponse1.data.data.reply.substring(0, 50) + '...');
    console.log('会话ID:', chatResponse1.data.data.conversationId);
    console.log('');
    
    const conversationId = chatResponse1.data.data.conversationId;
    
    // 第二次对话（使用返回的 conversationId）
    console.log('=== 步骤 3: 第二次对话（继续会话） ===');
    const chatResponse2 = await axios.post(
      'http://localhost:8000/api/ai/chat/client',
      {
        conversationId: conversationId,
        message: '我刚才说了什么？'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('状态码:', chatResponse2.status);
    console.log('回复:', chatResponse2.data.data.reply.substring(0, 50) + '...');
    console.log('会话ID:', chatResponse2.data.data.conversationId);
    console.log('');
    
    console.log('✅ 测试成功！聊天功能正常工作');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFixedChat();
