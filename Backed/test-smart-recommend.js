require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testSmartRecommend(username, password, userLabel) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试用户: ${userLabel} (${username})`);
    console.log('='.repeat(60));
    
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password
    });
    
    const token = loginRes.data.data.token;
    const userId = loginRes.data.data.user.id;
    console.log(`登录成功 (用户ID: ${userId})`);
    
    const recommendRes = await axios.post(
      `${BASE_URL}/ai/smart-recommend`,
      { store_id: 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const recommendations = recommendRes.data.data.recommendations;
    console.log(`\n推荐菜品 (${recommendations.length}道):`);
    recommendations.forEach((dish, index) => {
      console.log(`  ${index + 1}. ${dish.name} (ID: ${dish.id}) - ${dish.reason}`);
    });
    
    return recommendations.map(d => d.id);
    
  } catch (error) {
    console.error(`测试失败:`, error.response?.data || error.message);
    return [];
  }
}

async function runTests() {
  console.log('AI智能推荐多样性测试\n');
  
  const results = {
    client01: await testSmartRecommend('client01', '123456', 'client01 - 高血压+糖尿病'),
    client02: await testSmartRecommend('client02', '123456', 'client02 - 高血压'),
    client03: await testSmartRecommend('client03', '123456', 'client03 - 高血糖')
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('推荐结果分析');
  console.log('='.repeat(60));
  
  console.log('\nclient01:', results.client01.join(', '));
  console.log('client02:', results.client02.join(', '));
  console.log('client03:', results.client03.join(', '));
  
  const allDishes = [...results.client01, ...results.client02, ...results.client03];
  const uniqueDishes = new Set(allDishes);
  
  console.log(`\n多样性评分: ${(uniqueDishes.size / allDishes.length * 100).toFixed(1)}%`);
  console.log(`(${uniqueDishes.size}/${allDishes.length} 不同菜品)`);
}

runTests().catch(console.error);
