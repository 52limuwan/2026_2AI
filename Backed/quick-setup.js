// 快速设置脚本 - 直接操作数据库
require('dotenv').config();
const db = require('./src/db');

async function quickSetup() {
  console.log('=== 快速设置个性化菜单 ===\n');

  try {
    // 1. 查找第一个客户用户
    console.log('1. 查找客户用户...');
    const client = await db.get(
      'SELECT id, username FROM users WHERE role = ? LIMIT 1',
      { role: 'client' }
    );
    
    if (!client) {
      console.log('❌ 找不到客户用户');
      return;
    }
    
    console.log(`✓ 找到用户: ${client.username} (ID: ${client.id})\n`);

    // 2. 设置健康信息
    console.log('2. 设置健康信息...');
    await db.run(
      `UPDATE client_profiles 
       SET chronic_conditions = :conditions 
       WHERE user_id = :user_id`,
      { 
        conditions: JSON.stringify(['高血压', '糖尿病']), 
        user_id: client.id 
      }
    );
    console.log('✓ 已设置：高血压、糖尿病\n');

    // 3. 查找菜品
    console.log('3. 查找菜品...');
    const dishes = await db.all('SELECT id, name FROM dishes LIMIT 5');
    
    if (dishes.length === 0) {
      console.log('❌ 没有找到菜品');
      return;
    }
    
    console.log(`✓ 找到 ${dishes.length} 道菜品\n`);

    // 4. 添加健康标签
    console.log('4. 添加健康标签...');
    const tags = [
      '低盐,低脂,清淡,鱼类',
      '低糖,粗粮,全谷物,控糖',
      '低盐,降压,芹菜,木耳',
      '高纤维,蔬菜,粗粮',
      '低脂,豆制品,清淡'
    ];

    for (let i = 0; i < dishes.length; i++) {
      await db.run(
        'UPDATE dishes SET tags = :tags WHERE id = :id',
        { tags: tags[i] || tags[0], id: dishes[i].id }
      );
      console.log(`✓ ${dishes[i].name} → ${tags[i] || tags[0]}`);
    }

    console.log('\n=== 设置完成！===\n');
    console.log('现在可以：');
    console.log(`1. 使用 ${client.username} 账号登录`);
    console.log('2. 在首页查看个性化推荐\n');

  } catch (error) {
    console.error('❌ 设置失败:', error.message);
  } finally {
    await db.pool.save();
    await db.pool.close();
  }
}

quickSetup();
