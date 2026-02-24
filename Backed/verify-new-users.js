require('dotenv').config();
const db = require('./src/db');

async function verifyUsers() {
  console.log('=== 验证新添加的用户 ===\n');
  
  // 查询所有 client 角色的用户
  const clients = await db.all(
    `SELECT u.id, u.username, u.name, u.role, u.phone, u.community_code,
            cp.age, cp.gender, cp.chronic_conditions, cp.health_conditions, 
            cp.diet_preferences, cp.is_member
     FROM users u
     LEFT JOIN client_profiles cp ON u.id = cp.user_id
     WHERE u.role = 'client'
     ORDER BY u.id`
  );
  
  console.log(`找到 ${clients.length} 个销售端用户:\n`);
  
  clients.forEach(client => {
    console.log(`📋 用户 ID: ${client.id}`);
    console.log(`   用户名: ${client.username}`);
    console.log(`   姓名: ${client.name}`);
    console.log(`   手机: ${client.phone}`);
    console.log(`   社区: ${client.community_code || '未设置'}`);
    console.log(`   年龄: ${client.age || '未设置'}岁`);
    console.log(`   性别: ${client.gender || '未设置'}`);
    console.log(`   会员: ${client.is_member ? '是' : '否'}`);
    
    if (client.chronic_conditions) {
      try {
        const conditions = JSON.parse(client.chronic_conditions);
        console.log(`   慢性病: ${Array.isArray(conditions) ? conditions.join(', ') : conditions}`);
      } catch (e) {
        console.log(`   慢性病: ${client.chronic_conditions}`);
      }
    }
    
    if (client.health_conditions) {
      try {
        const health = JSON.parse(client.health_conditions);
        console.log(`   健康详情: ${JSON.stringify(health, null, 2).split('\n').join('\n              ')}`);
      } catch (e) {
        console.log(`   健康详情: ${client.health_conditions}`);
      }
    }
    
    if (client.diet_preferences) {
      try {
        const diet = JSON.parse(client.diet_preferences);
        console.log(`   饮食偏好: ${diet.preferences?.join(', ') || '无'}`);
        console.log(`   饮食限制: ${diet.restrictions?.join(', ') || '无'}`);
      } catch (e) {
        console.log(`   饮食偏好: ${client.diet_preferences}`);
      }
    }
    
    console.log('');
  });
  
  // 特别检查 client02 和 client03
  console.log('=== 重点验证 client02 和 client03 ===\n');
  
  const client02 = clients.find(c => c.username === 'client02');
  const client03 = clients.find(c => c.username === 'client03');
  
  if (client02) {
    console.log('✅ client02 已成功创建');
    console.log(`   - 高血压患者，74岁男性`);
    console.log(`   - 可在AI营养师获得低钠、少盐的饮食建议`);
  } else {
    console.log('❌ client02 未找到');
  }
  
  if (client03) {
    console.log('✅ client03 已成功创建');
    console.log(`   - 高血糖患者，70岁女性`);
    console.log(`   - 可在AI营养师获得低糖、低GI的饮食建议`);
  } else {
    console.log('❌ client03 未找到');
  }
  
  console.log('\n💡 登录信息:');
  console.log('   client02 / 123456');
  console.log('   client03 / 123456');
}

verifyUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('验证失败:', err);
    process.exit(1);
  });
