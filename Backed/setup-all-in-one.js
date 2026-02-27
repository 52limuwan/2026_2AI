// 一条龙设置脚本 - 直接操作数据库，无需API
require('dotenv').config();
const db = require('./src/db');

async function setupAllInOne() {
  console.log('\n========================================');
  console.log('   个性化菜单一键设置');
  console.log('========================================\n');

  try {
    // 1. 查找所有客户用户
    console.log('📋 步骤1: 查找客户用户...');
    const clients = await db.all(
      'SELECT id, username, name FROM users WHERE role = ?',
      { role: 'client' }
    );
    
    if (clients.length === 0) {
      console.log('❌ 没有找到客户用户\n');
      return;
    }
    
    console.log(`✓ 找到 ${clients.length} 个客户用户:`);
    clients.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.username} (${c.name || '未命名'})`);
    });
    console.log('');

    // 2. 为所有客户用户设置健康信息
    console.log('💊 步骤2: 设置健康信息...');
    for (const client of clients) {
      await db.run(
        `UPDATE client_profiles 
         SET chronic_conditions = :conditions, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = :user_id`,
        { 
          conditions: JSON.stringify(['高血压', '糖尿病']), 
          user_id: client.id 
        }
      );
      console.log(`✓ ${client.username} → 高血压、糖尿病`);
    }
    console.log('');

    // 3. 查找所有菜品
    console.log('🍽️  步骤3: 查找菜品...');
    const dishes = await db.all('SELECT id, name, tags FROM dishes LIMIT 20');
    
    if (dishes.length === 0) {
      console.log('❌ 没有找到菜品\n');
      return;
    }
    
    console.log(`✓ 找到 ${dishes.length} 道菜品\n`);

    // 4. 为菜品添加健康标签
    console.log('🏷️  步骤4: 添加健康标签...');
    const healthTags = [
      { tags: '低盐,低脂,清淡,鱼类', desc: '适合高血压、高血脂' },
      { tags: '低糖,粗粮,全谷物,控糖', desc: '适合糖尿病' },
      { tags: '低盐,降压,芹菜,木耳', desc: '适合高血压' },
      { tags: '高纤维,蔬菜,粗粮', desc: '适合糖尿病、便秘' },
      { tags: '低脂,豆制品,清淡', desc: '适合高血脂' },
      { tags: '补钙,高钙,奶制品', desc: '适合骨质疏松' },
      { tags: '补铁,补血,红肉', desc: '适合贫血' },
      { tags: '低嘌呤,碱性,蔬菜', desc: '适合痛风' },
      { tags: '低盐,低蛋白,优质蛋白', desc: '适合肾病' },
      { tags: '清淡,易消化,软烂', desc: '适合消化不良' }
    ];

    let taggedCount = 0;
    for (let i = 0; i < dishes.length; i++) {
      const tagInfo = healthTags[i % healthTags.length];
      await db.run(
        'UPDATE dishes SET tags = :tags, updated_at = CURRENT_TIMESTAMP WHERE id = :id',
        { tags: tagInfo.tags, id: dishes[i].id }
      );
      console.log(`✓ ${dishes[i].name.padEnd(20)} → ${tagInfo.tags}`);
      taggedCount++;
    }
    console.log(`\n已为 ${taggedCount} 道菜品添加健康标签\n`);

    // 5. 验证设置
    console.log('✅ 步骤5: 验证设置...');
    
    // 验证用户健康信息
    const verifyClients = await db.all(
      `SELECT u.username, cp.chronic_conditions 
       FROM users u 
       JOIN client_profiles cp ON cp.user_id = u.id 
       WHERE u.role = 'client'`
    );
    
    console.log('\n用户健康信息:');
    verifyClients.forEach(c => {
      const conditions = c.chronic_conditions ? JSON.parse(c.chronic_conditions) : [];
      console.log(`   ${c.username}: ${conditions.join('、') || '无'}`);
    });

    // 验证菜品标签
    const verifyDishes = await db.all(
      'SELECT name, tags FROM dishes WHERE tags IS NOT NULL AND tags != "" LIMIT 5'
    );
    
    console.log('\n菜品标签示例:');
    verifyDishes.forEach(d => {
      console.log(`   ${d.name}: ${d.tags}`);
    });

    console.log('\n========================================');
    console.log('   ✨ 设置完成！');
    console.log('========================================\n');
    
    console.log('📱 下一步操作:');
    console.log('   1. 重启后端服务（如果正在运行）');
    console.log('   2. 启动前端: cd ../Unified && npm run dev');
    console.log(`   3. 使用任意客户账号登录（如: ${clients[0].username}）`);
    console.log('   4. 在首页查看个性化推荐菜单\n');

  } catch (error) {
    console.error('\n❌ 设置失败:', error.message);
    console.error(error.stack);
  } finally {
    // 保存并关闭数据库
    await db.pool.save();
    await db.pool.close();
    console.log('💾 数据已保存\n');
  }
}

// 运行设置
setupAllInOne();
