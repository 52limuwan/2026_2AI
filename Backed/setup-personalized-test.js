const db = require('./src/db');

async function setupTestData() {
  console.log('=== 设置个性化菜单测试数据 ===\n');

  try {
    // 1. 为 client01 用户添加慢性病信息
    console.log('1. 为测试用户添加健康信息...');
    const user = await db.get('SELECT id FROM users WHERE username = ?', { username: 'client01' });
    
    if (!user) {
      console.log('❌ 找不到 client01 用户，请先创建该用户');
      return;
    }

    await db.run(
      `UPDATE client_profiles 
       SET chronic_conditions = :conditions, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = :user_id`,
      { 
        conditions: JSON.stringify(['高血压', '糖尿病']), 
        user_id: user.id 
      }
    );
    console.log('✓ 已设置健康信息：高血压、糖尿病\n');

    // 2. 检查现有菜品的标签
    console.log('2. 检查现有菜品标签...');
    const dishes = await db.all('SELECT id, name, tags FROM dishes LIMIT 10');
    console.log(`找到 ${dishes.length} 道菜品\n`);

    if (dishes.length === 0) {
      console.log('❌ 数据库中没有菜品，请先添加菜品');
      return;
    }

    // 3. 为前几道菜品添加健康标签
    console.log('3. 为菜品添加健康标签...');
    const healthTags = [
      { tags: '低盐,低脂,清淡,鱼类', desc: '适合高血压、高血脂' },
      { tags: '低糖,粗粮,全谷物,控糖', desc: '适合糖尿病' },
      { tags: '低盐,降压,芹菜,木耳', desc: '适合高血压' },
      { tags: '高纤维,蔬菜,粗粮', desc: '适合糖尿病、便秘' },
      { tags: '低脂,豆制品,清淡', desc: '适合高血脂' }
    ];
    
    for (let i = 0; i < Math.min(dishes.length, healthTags.length); i++) {
      await db.run(
        'UPDATE dishes SET tags = :tags, updated_at = CURRENT_TIMESTAMP WHERE id = :id',
        { tags: healthTags[i].tags, id: dishes[i].id }
      );
      console.log(`✓ ${dishes[i].name} - 标签: ${healthTags[i].tags}`);
    }

    console.log('\n=== 设置完成 ===');
    console.log('\n现在可以：');
    console.log('1. 启动后端服务: npm start');
    console.log('2. 启动前端服务: cd ../Unified && npm run dev');
    console.log('3. 使用 client01 账号登录查看首页的个性化推荐\n');

  } catch (error) {
    console.error('设置失败:', error);
  } finally {
    // 确保数据保存
    await db.pool.save();
    await db.pool.close();
  }
}

setupTestData();
