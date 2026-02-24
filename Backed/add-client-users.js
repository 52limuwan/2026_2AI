require('dotenv').config();
const db = require('./src/db');
const bcrypt = require('bcryptjs');

async function addClientUsers() {
  try {
    console.log('=== 开始添加销售端用户 ===\n');

    // 检查用户是否已存在
    const existingClient02 = await db.get('SELECT id FROM users WHERE username = ?', ['client02']);
    const existingClient03 = await db.get('SELECT id FROM users WHERE username = ?', ['client03']);

    // 密码哈希
    const password = await bcrypt.hash('123456', 10);

    // 添加 client02 (高血压)
    if (existingClient02) {
      console.log('⚠️  用户 client02 已存在，跳过创建');
    } else {
      const result02 = await db.run(
        `INSERT INTO users (username, password, name, role, phone, email, id_card, id_verified, community_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['client02', password, '张伟', 'client', '13800138002', 'client02@example.com', '110101195001020002', 1, 'COM001']
      );
      
      const userId02 = result02.lastInsertRowid;
      console.log(`✅ 创建用户 client02 (ID: ${userId02})`);

      // 创建 client_profiles，设置高血压
      await db.run(
        `INSERT INTO client_profiles (
          user_id, age, gender, address, chronic_conditions, 
          taste_preferences, restrictions, elder_mode, 
          health_conditions, diet_preferences, is_member
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId02,
          74,
          '男',
          '北京市朝阳区幸福社区1号楼101',
          JSON.stringify(['高血压']),
          JSON.stringify(['清淡', '少盐']),
          JSON.stringify(['低钠', '控制油脂']),
          1,
          JSON.stringify({
            conditions: ['高血压'],
            bloodPressure: { systolic: 145, diastolic: 90 },
            medications: ['降压药'],
            lastCheckup: '2025-02-01'
          }),
          JSON.stringify({
            preferences: ['清淡', '少盐', '低钠'],
            restrictions: ['高盐食物', '油炸食品'],
            allergies: []
          }),
          1
        ]
      );
      console.log(`   ✓ 设置健康档案: 高血压患者`);
      console.log(`   ✓ 年龄: 74岁, 性别: 男`);
      console.log(`   ✓ 饮食偏好: 清淡、少盐、低钠\n`);
    }

    // 添加 client03 (高血糖)
    if (existingClient03) {
      console.log('⚠️  用户 client03 已存在，跳过创建');
    } else {
      const result03 = await db.run(
        `INSERT INTO users (username, password, name, role, phone, email, id_card, id_verified, community_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['client03', password, '李芳', 'client', '13800138003', 'client03@example.com', '110101195503150003', 1, 'COM001']
      );
      
      const userId03 = result03.lastInsertRowid;
      console.log(`✅ 创建用户 client03 (ID: ${userId03})`);

      // 创建 client_profiles，设置高血糖
      await db.run(
        `INSERT INTO client_profiles (
          user_id, age, gender, address, chronic_conditions, 
          taste_preferences, restrictions, elder_mode, 
          health_conditions, diet_preferences, is_member
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId03,
          70,
          '女',
          '北京市朝阳区幸福社区2号楼202',
          JSON.stringify(['高血糖', '糖尿病前期']),
          JSON.stringify(['清淡', '少糖']),
          JSON.stringify(['低糖', '低GI食物', '控制碳水']),
          1,
          JSON.stringify({
            conditions: ['高血糖', '糖尿病前期'],
            bloodSugar: { fasting: 6.8, postprandial: 9.2 },
            medications: ['二甲双胍'],
            lastCheckup: '2025-02-01'
          }),
          JSON.stringify({
            preferences: ['清淡', '少糖', '粗粮'],
            restrictions: ['高糖食物', '精制碳水', '甜食'],
            allergies: []
          }),
          1
        ]
      );
      console.log(`   ✓ 设置健康档案: 高血糖患者`);
      console.log(`   ✓ 年龄: 70岁, 性别: 女`);
      console.log(`   ✓ 饮食偏好: 清淡、少糖、低GI食物\n`);
    }

    // 验证创建结果
    console.log('=== 验证用户信息 ===\n');
    
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
      console.log('📋 client02 信息:');
      console.log(`   用户名: ${client02.username}`);
      console.log(`   姓名: ${client02.name}`);
      console.log(`   角色: ${client02.role}`);
      console.log(`   手机: ${client02.phone}`);
      console.log(`   年龄: ${client02.age}岁`);
      console.log(`   性别: ${client02.gender}`);
      console.log(`   慢性病: ${client02.chronic_conditions}`);
      console.log(`   健康状况: ${client02.health_conditions}`);
      console.log(`   饮食偏好: ${client02.diet_preferences}\n`);
    }

    if (client03) {
      console.log('📋 client03 信息:');
      console.log(`   用户名: ${client03.username}`);
      console.log(`   姓名: ${client03.name}`);
      console.log(`   角色: ${client03.role}`);
      console.log(`   手机: ${client03.phone}`);
      console.log(`   年龄: ${client03.age}岁`);
      console.log(`   性别: ${client03.gender}`);
      console.log(`   慢性病: ${client03.chronic_conditions}`);
      console.log(`   健康状况: ${client03.health_conditions}`);
      console.log(`   饮食偏好: ${client03.diet_preferences}\n`);
    }

    console.log('✅ 用户添加完成！');
    console.log('📝 登录信息:');
    console.log('   client02 / 123456 (高血压患者)');
    console.log('   client03 / 123456 (高血糖患者)');
    console.log('\n💡 这些用户现在可以在AI营养师中获得针对性的健康建议了！');

    // 确保数据库保存
    console.log('\n⏳ 保存数据库...');
    db.pool.save();
    console.log('✅ 数据库已保存');

  } catch (error) {
    console.error('❌ 添加用户失败:', error);
    throw error;
  }
}

addClientUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
