require('dotenv').config();
const db = require('./src/db');

async function checkUsers() {
  console.log('=== 检查用户表 ===');
  const users = await db.all('SELECT id, username, name, role, phone, password FROM users LIMIT 10');
  console.log(`找到 ${users.length} 个用户:`);
  users.forEach(user => {
    console.log(`ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}, 手机: ${user.phone || '无'}`);
    console.log(`  密码哈希: ${user.password ? user.password.substring(0, 30) + '...' : '无'}`);
  });
  
  if (users.length === 0) {
    console.log('\n数据库中没有用户！需要先注册。');
  }
}

checkUsers().catch(console.error);
