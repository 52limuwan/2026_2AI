const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// 测试用户登录凭证
const testUser = {
  identifier: 'client01',
  password: 'password123'
};

async function testPersonalizedMenu() {
  try {
    console.log('=== 测试个性化菜单功能 ===\n');
    
    // 1. 登录获取token
    console.log('1. 登录测试用户...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, testUser);
    const token = loginRes.data.data.token;
    console.log('✓ 登录成功\n');
    
    // 2. 获取个性化推荐
    console.log('2. 获取个性化推荐菜品...');
    const personalizedRes = await axios.get(`${API_BASE}/client/recommendations/personalized`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { recommendations, conditions } = personalizedRes.data.data;
    
    console.log(`✓ 获取成功`);
    console.log(`健康状况: ${conditions ? conditions.join('、') : '无'}`);
    console.log(`推荐菜品数量: ${recommendations.length}\n`);
    
    if (recommendations.length > 0) {
      console.log('推荐菜品列表:');
      recommendations.forEach((dish, index) => {
        console.log(`\n${index + 1}. ${dish.name}`);
        console.log(`   价格: ¥${dish.price}`);
        console.log(`   商户: ${dish.merchant}`);
        console.log(`   标签: ${dish.tags.join(', ')}`);
        console.log(`   推荐理由: ${dish.matchReason}`);
        console.log(`   营养: 热量${dish.nutrition.calories}kcal, 蛋白质${dish.nutrition.protein}g`);
      });
    } else {
      console.log('暂无个性化推荐（可能用户未设置健康状况或没有匹配的菜品）');
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testPersonalizedMenu();
