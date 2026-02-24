require('dotenv').config();
const db = require('./src/db');

async function checkNewClients() {
  console.log('=== 检查 client02 和 client03 ===\n');
  
  // 直接查询这两个用户
  const client02 = await db.get(
    `SELECT u.*, cp.age, cp.gender, cp.chronic_conditions, cp.health_conditions, cp.diet_preferences
     FROM users u
     LEFT JOIN client_profiles cp ON u.id = cp.user_id
     WHERE u.username = ?`,
    ['client02']
  );
  
  const client03 = await db.get(
    `SELECT u.*, cp.age, cp.gender, cp.chronic_conditions, cp.health_conditions, cp.diet_preferences
     FROM users u
     LEFT JOIN client_profiles cp ON u.id = cp.user_id
     WHERE u.username = ?`,
    ['client03']
  );

  if (client02) {
    console.log('✅ client02 信息:');
    console.log(`   ID: ${client02.id}`);
    console.log(`   用户名: ${client02.username}`);
    console.log(`   姓名: ${client02.name}`);
    console.log(`   手机: ${client02.phone}`);
    console.log(`   年龄: ${client02.age}岁`);
    console.log(`   性别: ${client02.gender}`);
    console.log(`   慢性病: ${client02.chronic_conditions}`);
    console.log(`   健康状况: ${client02.health_conditions}`);
    console.log(`   饮食偏好: ${client02.diet_preferences}\n`);
  } else {
    console.log('❌ client02 未找到\n');
  }

  if (client03) {
    console.log('✅ client03 信息:');
    console.log(`   ID: ${client03.id}`);
    console.log(`   用户名: ${client03.username}`);
    console.log(`   姓名: ${client03.name}`);
    console.log(`   手机: ${client03.phone}`);
    console.log(`   年龄: ${client03.age}岁`);
    console.log(`   性别: ${client03.gender}`);
    console.log(`   慢性病: ${client03.chronic_conditions}`);
    console.log(`   健康状况: ${client03.health_conditions}`);
    console.log(`   饮食偏好: ${client03.diet_preferences}\n`);
  } else {
    console.log('❌ client03 未找到\n');
  }
  
  if (client02 && client03) {
    console.log('✅ 两个用户都已成功创建！');
    console.log('\n📝 登录信息:');
    console.log('   client02 / 123456 (高血压患者)');
    console.log('   client03 / 123456 (高血糖患者)');
    console.log('\n💡 这些用户现在可以在AI营养师中获得针对性的健康建议了！');
  }
}

checkNewClients()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('检查失败:', err);
    process.exit(1);
  });
