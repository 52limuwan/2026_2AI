// 测试个性化推荐
require('dotenv').config();
const db = require('./src/db');

async function testRecommendations() {
  console.log('\n========================================');
  console.log('   测试个性化推荐');
  console.log('========================================\n');

  try {
    // 1. 查看用户健康信息
    console.log('📋 用户健康信息:');
    const users = await db.all(
      `SELECT u.id, u.username, cp.chronic_conditions 
       FROM users u 
       JOIN client_profiles cp ON cp.user_id = u.id 
       WHERE u.username IN ('client02', 'client03')`
    );
    
    users.forEach(u => {
      const conditions = u.chronic_conditions ? JSON.parse(u.chronic_conditions) : [];
      console.log(`   ${u.username}: ${conditions.join('、')}`);
    });
    console.log('');

    // 2. 查看菜品标签
    console.log('🍽️  菜品标签分布:');
    const dishes = await db.all(
      'SELECT id, name, tags FROM dishes WHERE tags IS NOT NULL AND tags != "" ORDER BY id LIMIT 20'
    );
    
    dishes.forEach(d => {
      console.log(`   ${d.id}. ${d.name.padEnd(20)} → ${d.tags}`);
    });
    console.log('');

    // 3. 模拟推荐算法
    console.log('🎯 模拟推荐结果:\n');
    
    for (const user of users) {
      console.log(`--- ${user.username} ---`);
      const conditions = JSON.parse(user.chronic_conditions);
      console.log(`疾病: ${conditions.join('、')}`);
      
      // 疾病标签映射
      const diseaseTagMap = {
        '高血压': ['低盐', '低钠', '降压', '芹菜', '木耳', '菌菇', '海带', '紫菜'],
        '高血糖': ['低糖', '无糖', '粗粮', '全谷物', '控糖', '苦瓜', '燕麦', '荞麦'],
        '糖尿病': ['低糖', '无糖', '粗粮', '全谷物', '控糖', '苦瓜', '燕麦', '荞麦'],
        '高血脂': ['低脂', '鱼类', '豆制品', '燕麦', '坚果', '橄榄油']
      };
      
      // 收集标签权重
      const tagWeights = new Map();
      conditions.forEach(condition => {
        const tags = diseaseTagMap[condition];
        if (tags) {
          tags.forEach(tag => {
            tagWeights.set(tag, (tagWeights.get(tag) || 0) + 1);
          });
        }
      });
      
      console.log(`匹配标签: ${Array.from(tagWeights.keys()).join(', ')}`);
      
      // 计算每道菜的匹配分数
      const scoredDishes = dishes.map(dish => {
        const dishTags = (dish.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        let score = 0;
        let matchedTags = [];
        
        dishTags.forEach(tag => {
          if (tagWeights.has(tag)) {
            const weight = tagWeights.get(tag);
            score += 15 * weight;
            matchedTags.push(tag);
          }
        });
        
        return { ...dish, matchScore: score, matchedTags };
      });
      
      // 排序并取前4个
      const topDishes = scoredDishes
        .filter(d => d.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 4);
      
      console.log(`推荐菜品 (${topDishes.length}道):`);
      topDishes.forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.name.padEnd(20)} (分数:${d.matchScore}, 匹配:${d.matchedTags.join(',')})`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await db.pool.close();
  }
}

testRecommendations();
