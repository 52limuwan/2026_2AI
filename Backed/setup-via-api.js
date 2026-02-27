const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function setupViaAPI() {
  console.log('=== 通过API设置个性化菜单测试数据 ===\n');

  try {
    // 1. 登录获取token
    console.log('1. 登录 client01 用户...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'client01',
      password: '123456'
    });
    const token = loginRes.data.data.token;
    console.log('✓ 登录成功\n');

    // 2. 更新用户健康信息
    console.log('2. 设置健康信息（高血压、糖尿病）...');
    await axios.put(
      `${API_BASE}/client/profile`,
      {
        chronic_conditions: ['高血压', '糖尿病']
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log('✓ 健康信息设置成功\n');

    // 3. 获取菜品列表
    console.log('3. 获取菜品列表...');
    const dishesRes = await axios.get(`${API_BASE}/client/dishes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dishes = dishesRes.data.data.dishes || [];
    console.log(`✓ 找到 ${dishes.length} 道菜品\n`);

    if (dishes.length === 0) {
      console.log('❌ 数据库中没有菜品，请先添加菜品');
      return;
    }

    console.log('注意：菜品标签需要通过商户端或直接修改数据库来设置');
    console.log('你可以：');
    console.log('1. 使用商户账号登录，编辑菜品，添加健康标签');
    console.log('2. 或者直接在数据库中执行 setup-personalized.sql\n');

    // 4. 测试个性化推荐
    console.log('4. 测试个性化推荐...');
    const personalizedRes = await axios.get(
      `${API_BASE}/client/recommendations/personalized`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const { recommendations, conditions } = personalizedRes.data.data;
    console.log(`✓ 健康状况: ${conditions ? conditions.join('、') : '无'}`);
    console.log(`✓ 推荐菜品数量: ${recommendations.length}\n`);

    if (recommendations.length > 0) {
      console.log('推荐菜品列表:');
      recommendations.forEach((dish, index) => {
        console.log(`\n${index + 1}. ${dish.name}`);
        console.log(`   价格: ¥${dish.price}`);
        console.log(`   标签: ${dish.tags.join(', ')}`);
        console.log(`   推荐理由: ${dish.matchReason}`);
      });
    } else {
      console.log('暂无个性化推荐（菜品可能没有相关健康标签）');
      console.log('\n请为菜品添加以下标签：');
      console.log('- 低盐、低脂、清淡、鱼类（适合高血压、高血脂）');
      console.log('- 低糖、粗粮、全谷物、控糖（适合糖尿病）');
      console.log('- 低盐、降压、芹菜、木耳（适合高血压）');
      console.log('- 高纤维、蔬菜、粗粮（适合糖尿病、便秘）');
    }

    console.log('\n=== 设置完成 ===');

  } catch (error) {
    console.error('设置失败:', error.response?.data || error.message);
  }
}

setupViaAPI();
