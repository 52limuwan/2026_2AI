// 为不同用户设置不同疾病和菜品标签
require('dotenv').config();
const db = require('./src/db');

async function setupDifferentUsers() {
  console.log('\n========================================');
  console.log('   设置不同用户的个性化推荐');
  console.log('========================================\n');

  try {
    // 1. 查找所有客户用户
    console.log('📋 步骤1: 查找客户用户...');
    const clients = await db.all(
      'SELECT id, username, name FROM users WHERE role = ? ORDER BY id',
      { role: 'client' }
    );
    
    if (clients.length < 2) {
      console.log('❌ 需要至少2个客户用户来演示差异化推荐\n');
      return;
    }
    
    console.log(`✓ 找到 ${clients.length} 个客户用户\n`);

    // 2. 为不同用户设置不同的疾病
    console.log('💊 步骤2: 设置不同的健康状况...');
    
    const userDiseases = [
      { conditions: ['高血糖', '糖尿病'], desc: '高血糖/糖尿病' },
      { conditions: ['高血压'], desc: '高血压' },
      { conditions: ['高血脂'], desc: '高血脂' },
      { conditions: ['痛风'], desc: '痛风' },
      { conditions: ['贫血'], desc: '贫血' }
    ];

    for (let i = 0; i < clients.length; i++) {
      const diseaseInfo = userDiseases[i % userDiseases.length];
      await db.run(
        `UPDATE client_profiles 
         SET chronic_conditions = :conditions, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = :user_id`,
        { 
          conditions: JSON.stringify(diseaseInfo.conditions), 
          user_id: clients[i].id 
        }
      );
      console.log(`✓ ${clients[i].username.padEnd(15)} → ${diseaseInfo.desc}`);
    }
    console.log('');

    // 3. 查找菜品
    console.log('🍽️  步骤3: 为菜品添加针对性标签...');
    const dishes = await db.all('SELECT id, name FROM dishes LIMIT 20');
    
    if (dishes.length === 0) {
      console.log('❌ 没有找到菜品\n');
      return;
    }

    // 4. 为菜品添加更有针对性的标签
    const dishTags = [
      // 适合糖尿病
      { tags: '低糖,无糖,粗粮,全谷物,控糖', desc: '适合糖尿病' },
      { tags: '低糖,苦瓜,燕麦,荞麦', desc: '适合糖尿病' },
      { tags: '粗粮,全谷物,膳食纤维', desc: '适合糖尿病' },
      
      // 适合高血压
      { tags: '低盐,低钠,降压,芹菜', desc: '适合高血压' },
      { tags: '低盐,木耳,菌菇,海带', desc: '适合高血压' },
      { tags: '低钠,紫菜,降压', desc: '适合高血压' },
      
      // 适合高血脂
      { tags: '低脂,鱼类,深海鱼', desc: '适合高血脂' },
      { tags: '低脂,豆制品,燕麦', desc: '适合高血脂' },
      { tags: '坚果,橄榄油,低脂', desc: '适合高血脂' },
      
      // 适合痛风
      { tags: '低嘌呤,碱性,蔬菜', desc: '适合痛风' },
      { tags: '低嘌呤,水果,碱性食物', desc: '适合痛风' },
      
      // 适合贫血
      { tags: '补铁,补血,红肉', desc: '适合贫血' },
      { tags: '补铁,动物肝脏,红枣', desc: '适合贫血' },
      { tags: '补血,菠菜,补铁', desc: '适合贫血' },
      
      // 通用健康
      { tags: '清淡,易消化,软烂', desc: '通用健康' },
      { tags: '高纤维,蔬菜,粗粮', desc: '通用健康' },
      { tags: '高钙,补钙,奶制品', desc: '适合骨质疏松' },
      { tags: '豆制品,虾皮,芝麻', desc: '适合骨质疏松' },
      { tags: '优质蛋白,低盐,低蛋白', desc: '适合肾病' },
      { tags: '低磷,低钾,优质蛋白', desc: '适合肾病' }
    ];

    for (let i = 0; i < dishes.length; i++) {
      const tagInfo = dishTags[i % dishTags.length];
      await db.run(
        'UPDATE dishes SET tags = :tags, updated_at = CURRENT_TIMESTAMP WHERE id = :id',
        { tags: tagInfo.tags, id: dishes[i].id }
      );
      console.log(`✓ ${dishes[i].name.padEnd(20)} → ${tagInfo.tags.padEnd(35)} (${tagInfo.desc})`);
    }
    console.log('');

    // 5. 验证设置
    console.log('✅ 步骤4: 验证设置...\n');
    
    console.log('用户健康状况:');
    for (const client of clients) {
      const profile = await db.get(
        `SELECT chronic_conditions FROM client_profiles WHERE user_id = :id`,
        { id: client.id }
      );
      const conditions = profile.chronic_conditions ? JSON.parse(profile.chronic_conditions) : [];
      console.log(`   ${client.username.padEnd(15)} → ${conditions.join('、')}`);
    }

    console.log('\n菜品标签分布:');
    const tagStats = {};
    for (const dish of dishes) {
      const dishData = await db.get('SELECT tags FROM dishes WHERE id = :id', { id: dish.id });
      if (dishData && dishData.tags) {
        const tags = dishData.tags.split(',')[0]; // 取第一个标签作为分类
        tagStats[tags] = (tagStats[tags] || 0) + 1;
      }
    }
    Object.entries(tagStats).forEach(([tag, count]) => {
      console.log(`   ${tag.padEnd(15)} → ${count} 道菜品`);
    });

    console.log('\n========================================');
    console.log('   ✨ 设置完成！');
    console.log('========================================\n');
    
    console.log('📱 测试方法:');
    console.log('   1. 重启后端服务');
    console.log('   2. 分别使用不同用户登录:');
    clients.slice(0, 3).forEach((c, i) => {
      const diseaseInfo = userDiseases[i % userDiseases.length];
      console.log(`      - ${c.username} (${diseaseInfo.desc})`);
    });
    console.log('   3. 查看首页的个性化推荐，应该看到不同的菜品\n');

  } catch (error) {
    console.error('\n❌ 设置失败:', error.message);
    console.error(error.stack);
  } finally {
    await db.pool.save();
    await db.pool.close();
    console.log('💾 数据已保存\n');
  }
}

setupDifferentUsers();
