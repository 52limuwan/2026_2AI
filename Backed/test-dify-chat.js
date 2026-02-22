// 测试 Dify API 聊天功能
const axios = require('axios');
require('dotenv').config();

async function testDifyChat() {
  const difyApiKey = process.env.DIFY_API_KEY;
  const difyApiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
  
  console.log('测试 Dify API 聊天功能');
  console.log('API URL:', difyApiUrl);
  console.log('API Key:', difyApiKey ? `${difyApiKey.substring(0, 10)}...` : '未配置');
  console.log('');
  
  try {
    // 第一次对话（不传 conversation_id）
    console.log('=== 第一次对话（新会话） ===');
    const requestBody1 = {
      inputs: {},
      query: '你好',
      response_mode: 'blocking',
      user: 'test_user_1'
    };
    
    console.log('请求体:', JSON.stringify(requestBody1, null, 2));
    
    const response1 = await axios.post(
      `${difyApiUrl}/chat-messages`,
      requestBody1,
      {
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('状态码:', response1.status);
    console.log('回复:', response1.data.answer);
    console.log('会话ID:', response1.data.conversation_id);
    console.log('');
    
    // 第二次对话（使用返回的 conversation_id）
    console.log('=== 第二次对话（继续会话） ===');
    const conversationId = response1.data.conversation_id;
    const requestBody2 = {
      inputs: {},
      query: '我刚才说了什么？',
      response_mode: 'blocking',
      conversation_id: conversationId,
      user: 'test_user_1'
    };
    
    console.log('请求体:', JSON.stringify(requestBody2, null, 2));
    
    const response2 = await axios.post(
      `${difyApiUrl}/chat-messages`,
      requestBody2,
      {
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('状态码:', response2.status);
    console.log('回复:', response2.data.answer);
    console.log('会话ID:', response2.data.conversation_id);
    console.log('');
    
    console.log('✅ 测试成功！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDifyChat();
