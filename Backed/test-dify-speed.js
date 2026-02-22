// 测试 Dify API 响应速度
const axios = require('axios');
require('dotenv').config();

async function testDifySpeed() {
  const difyApiKey = process.env.DIFY_API_KEY;
  const difyApiUrl = process.env.DIFY_API_URL;
  
  console.log('测试 Dify API 响应速度');
  console.log('API URL:', difyApiUrl);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${difyApiUrl}/chat-messages`,
      {
        inputs: {},
        query: '你好',
        response_mode: 'blocking',
        user: 'speed_test'
      },
      {
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000  // 60秒超时
      }
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('✅ 请求成功');
    console.log('响应时间:', duration.toFixed(2), '秒');
    console.log('回复长度:', response.data.answer.length, '字符');
    console.log('回复:', response.data.answer.substring(0, 100) + '...');
    
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.error('❌ 请求失败');
    console.error('耗时:', duration.toFixed(2), '秒');
    console.error('错误:', error.message);
    if (error.code === 'ECONNABORTED') {
      console.error('原因: 请求超时');
    }
  }
}

testDifySpeed();
