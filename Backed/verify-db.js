// 验证数据库数据
require('dotenv').config();
const db = require('./src/db');

async function verifyDB() {
  console.log('\n验证数据库数据...\n');

  try {
    // 查看用户健康信息
    const users = await db.all(
      `SELECT u.id, u.username, cp.chronic_conditions 
       FROM users u 
       JOIN client_profiles cp ON cp.user_id = u.id 
       WHERE u.username IN ('client02', 'client03')`
    );
    
    console.log('用户健康信息:');
    users.forEach(u => {
      console.log(`  ${u.username}: ${u.chronic_conditions}`);
    });
    
    // 查看菜品标签
    const dishes = await db.all(
      'SELECT id, name, tags FROM dishes WHERE id BETWEEN 109 AND 118 ORDER BY id'
    );
    
    console.log('\n菜品标签:');
    dishes.forEach(d => {
      console.log(`  ${d.id}. ${d.name}: ${d.tags || '无标签'}`);
    });
    
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await db.pool.close();
  }
}

verifyDB();
