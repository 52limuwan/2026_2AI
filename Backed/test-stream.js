// 测试后端流式输出
const axios = require('axios');

async function testStream() {
  console.log('测试后端流式输出');
  console.log('');
  
  try {
    // 先登录
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      identifier: 'client01',
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    console.log('登录成功');
    console.log('');
    
    // 发送流式请求
    console.log('发送流式请求...');
    const response = await axios.post(
      'http://localhost:8000/api/ai/chat/client',
      {
        conversationId: '',
        message: '你好'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    
    console.log('响应头:', response.headers['content-type']);
    console.log('');
    console.log('接收流式数据:');
    console.log('---');
    
    response.data.on('data', (chunk) => {
      process.stdout.write(chunk.toString());
    });
    
    response.data.on('end', () => {
      console.log('');
      console.log('---');
      console.log('✅ 流式传输完成');
    });
    
    response.data.on('error', (error) => {
      console.error('❌ 流式传输错误:', error);
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
    }
  }
}

testStream();
