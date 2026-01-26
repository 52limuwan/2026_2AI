/**
 * 迁移 Mongo 描述到 SQLite 并写入示例数据（含菜品图片）
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('../db');
const { initSchema } = require('../db/schema');
const { hashPassword } = require('../utils/security');
const { createOrder } = require('../services/orders');

function readMongoSchema() {
  const schemaPath = path.join(__dirname, '../../DataArchive/schema.json');
  if (!fs.existsSync(schemaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } catch (err) {
    console.warn('schema.json 解析失败，已跳过', err.message);
    return null;
  }
}

async function ensureDefaultCommunity() {
  const existing = await db.get('SELECT id, code, name FROM communities ORDER BY id LIMIT 1');
  if (existing) return existing;

  const payload = {
    code: 'HP001',
    name: '和平社区',
    region: '和平街道'
  };
  await db.run(
    `INSERT INTO communities (code, name, region)
     VALUES (:code, :name, :region)`,
    payload
  );
  return db.get('SELECT id, code, name FROM communities WHERE code = :code', { code: payload.code });
}

async function seedUsers() {
  const countRow = await db.get('SELECT COUNT(*) as c FROM users');
  if (countRow?.c > 0) {
    console.log(`[seed] 已存在 ${countRow.c} 个用户，跳过示例用户写入`);
    return;
  }

  const community = await ensureDefaultCommunity();

  const users = [
    {
      username: 'client01',
      password: '123456',
      name: '李阿姨',
      role: 'client',
      phone: '13800000001',
      id_card: '330101194601010018',
      profile: { age: 72, gender: '女', address: '和平社区 3 栋', chronic_conditions: '高血压、糖尿病', taste_preferences: '清淡、低糖', restrictions: '低盐', elder_mode: true }
    },
    {
      username: 'guardian01',
      password: '123456',
      name: '王女士',
      role: 'guardian',
      phone: '13900000002',
      id_card: '330101197501010020',
      profile: { relationship: '女儿', notification_channel: 'in_app' }
    },
    {
      username: 'merchant01',
      password: '123456',
      name: '社区厨房',
      role: 'merchant',
      phone: '13700000003',
      profile: { merchant_name: '智膳伙伴餐厨房', community: '和平社区', contact: '13700000003' }
    },
    {
      username: 'gov01',
      password: '123456',
      name: '张社工',
      role: 'gov',
      phone: '13600000004',
      profile: { region: '和平街道', department: '社区健康办' }
    }
  ];

  for (const user of users) {
    const res = await db.run(
      `INSERT INTO users (username, password, name, role, phone, preferences, id_card, id_verified, community_id, community_code)
       VALUES (:username, :password, :name, :role, :phone, :preferences, :id_card, :id_verified, :community_id, :community_code)`,
      {
        username: user.username,
        password: hashPassword(user.password),
        name: user.name,
        role: user.role,
        phone: user.phone,
        preferences: JSON.stringify({ elderMode: !!user.profile?.elder_mode }),
        id_card: user.id_card || null,
        id_verified: user.id_card ? 1 : 0,
        community_id: community?.id || null,
        community_code: community?.code || null
      }
    );
    const userId = res.lastInsertRowid;
    switch (user.role) {
      case 'client':
        await db.run(
          `INSERT INTO client_profiles (user_id, age, gender, address, chronic_conditions, taste_preferences, restrictions, elder_mode)
           VALUES (:user_id, :age, :gender, :address, :chronic_conditions, :taste_preferences, :restrictions, :elder_mode)`,
          {
            user_id: userId,
            age: user.profile.age,
            gender: user.profile.gender,
            address: user.profile.address,
            chronic_conditions: user.profile.chronic_conditions,
            taste_preferences: user.profile.taste_preferences,
            restrictions: user.profile.restrictions,
            elder_mode: user.profile.elder_mode ? 1 : 0
          }
        );
        break;
      case 'guardian':
        await db.run('INSERT INTO guardian_profiles (user_id, relationship, notification_channel) VALUES (:user_id, :relationship, :notification_channel)', {
          user_id: userId,
          relationship: user.profile.relationship,
          notification_channel: user.profile.notification_channel
        });
        await db.run(
          `INSERT OR IGNORE INTO guardian_client_links (guardian_id, client_id, relation, bind_id_card, bind_phone, status, verified_at)
           VALUES (:guardian_id, 1, :relation, :bind_id_card, :bind_phone, 'active', :verified_at)`,
          {
            guardian_id: userId,
            relation: '家庭监护',
            bind_id_card: '330101194601010018',
            bind_phone: '13800000001',
            verified_at: new Date().toISOString()
          }
        );
        break;
      case 'merchant':
        await db.run('INSERT INTO merchant_profiles (user_id, merchant_name, community, contact) VALUES (:user_id, :merchant_name, :community, :contact)', {
          user_id: userId,
          merchant_name: user.profile.merchant_name,
          community: user.profile.community,
          contact: user.profile.contact
        });
        break;
      case 'gov':
        await db.run('INSERT INTO gov_profiles (user_id, region, department) VALUES (:user_id, :region, :department)', {
          user_id: userId,
          region: user.profile.region,
          department: user.profile.department
        });
        if (community?.id) {
          await db.run(
            `INSERT OR IGNORE INTO gov_scopes (gov_user_id, community_id, role_in_scope)
             VALUES (:gov_user_id, :community_id, :role_in_scope)`,
            { gov_user_id: userId, community_id: community.id, role_in_scope: 'primary' }
          );
        }
        break;
    }
  }

  console.log('[seed] 已写入示例用户数据');
}

async function seedDishes() {
  const csvPath = path.join(__dirname, '../../../web01/data/dishes.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('[seed] dishes.csv 未找到，跳过菜品导入');
    return;
  }

  const lines = fs
    .readFileSync(csvPath, 'utf-8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length);
  const header = lines.shift().split(',');
  const idx = (field) => header.indexOf(field);
  const map = {
    name: idx('name'),
    price: idx('price'),
    description: idx('description'),
    image_url: idx('image_url'),
    allergens: idx('allergens')
  };

  let processed = 0;
  for (const line of lines) {
    const cols = line.split(',');
    const name = cols[map.name];
    if (!name) continue;
    const price = parseFloat(cols[map.price]) || 0;
    const description = cols[map.description] || '';
    const image = cols[map.image_url] || '';
    const tags = (cols[map.allergens] || '').replace(/，/g, ',');

    const existing = await db.get('SELECT id FROM dishes WHERE name = :name', { name });
    if (existing) {
      await db.run(
        `UPDATE dishes
         SET price = :price,
             description = :description,
             image = :image,
             tags = :tags,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id`,
        { id: existing.id, price, description, image, tags }
      );
    } else {
      await db.run(
        `INSERT INTO dishes (merchant_id, name, category, price, stock, tags, description, image, status)
         VALUES (3, :name, '家常菜', :price, 20, :tags, :description, :image, 'available')`,
        { name, price, tags, description, image }
      );
    }
    processed += 1;
  }

  console.log(`[seed] 已同步菜品 ${processed} 条（含图片）`);
}

async function seedOrders() {
  const count = (await db.get('SELECT COUNT(*) as c FROM orders'))?.c || 0;
  if (count > 0) return;
  const store = await db.get('SELECT id, community_id FROM stores ORDER BY id LIMIT 1');
  const community = store?.community_id
    ? await db.get('SELECT id, code, name FROM communities WHERE id = :id', { id: store.community_id })
    : null;
  await createOrder({
    clientId: 1,
    guardianId: 2,
    merchantId: 3,
    storeId: store?.id || null,
    communityId: community?.id || null,
    communityCode: community?.code || null,
    address: '和平社区 3 栋 401',
    contact: '李阿姨 13800000001',
    items: [
      { dish_id: 1, dish_name: '清蒸鲈鱼', price: 28, quantity: 1 },
      { dish_id: 3, dish_name: '燕麦鸡胸沙拉', price: 18, quantity: 1 }
    ],
    remark: '血压偏高，少盐',
    paymentMethod: 'recorded',
    community_name: community?.name || ''
  });
  console.log('[seed] 已写入示例订单数据');
}

async function seedStores() {
  const community = await ensureDefaultCommunity();
  // 查找 merchant01 的用户ID
  const merchant = await db.get("SELECT id FROM users WHERE username = 'merchant01'");
  if (!merchant) {
    console.log('[seed] merchant01 不存在，跳过店面数据写入');
    return;
  }
  
  const merchantId = merchant.id;
  
  // 检查是否已经存在店面
  const storeCount = await db.get('SELECT COUNT(*) as c FROM stores WHERE merchant_id = :merchant_id', { merchant_id: merchantId });
  if (storeCount?.c > 0) {
    console.log(`[seed] merchant01 已存在 ${storeCount.c} 个店面，跳过店面数据写入`);
    return;
  }
  
  // 创建三个店面
  const stores = [
    { name: '松柏店', location: ' 西湖区松柏路123号', description: '低盐轻食', distance: '距您 800m', tags: '低盐,轻食' },
    { name: '文一路店', location: ' 西湖区文一路456号', description: '高蛋白', distance: '距您 1.2km', tags: '高蛋白' },
    { name: '南湖店', location: ' 西湖区南湖路789号', description: '软食适老', distance: '距您 2.1km', tags: '软食,适老' }
  ];
  
  let firstStoreId = null;
  for (const store of stores) {
    const result = await db.run(
      `INSERT INTO stores (merchant_id, community_id, name, location, description, distance, tags, status)
       VALUES (:merchant_id, :community_id, :name, :location, :description, :distance, :tags, 'active')`,
      {
        merchant_id: merchantId,
        community_id: community?.id || null,
        name: store.name,
        location: store.location,
        description: store.description,
        distance: store.distance,
        tags: store.tags
      }
    );
    
    if (!firstStoreId) {
      firstStoreId = result.lastInsertRowid;
    }
  }
  
  // 将第一个店面设置为当前店面
  if (firstStoreId) {
    await db.run(
      'UPDATE merchant_profiles SET current_store_id = :store_id WHERE user_id = :user_id',
      { store_id: firstStoreId, user_id: merchantId }
    );
  }
  
  console.log('[seed] 已为 merchant01 创建 3 个店面，并设置松柏店为当前店面');
}

async function seedReportsAndNotifications() {
  const reportCount = (await db.get('SELECT COUNT(*) as c FROM nutrition_reports'))?.c || 0;
  if (!reportCount) {
    await db.run(
      `INSERT INTO nutrition_reports (client_id, type, period_start, period_end, summary, recommendations)
       VALUES (:client_id, 'week', :start, :end, :summary, :recommendations)`,
      {
        client_id: 1,
        start: '2024-12-01',
        end: '2024-12-07',
        summary: JSON.stringify({ calories: 1750, protein: 70, carbs: 210, fat: 45, fiber: 30 }),
        recommendations: '继续保持低盐饮食，适量增加蔬菜摄入。'
      }
    );
  }
  const noteCount = (await db.get('SELECT COUNT(*) as c FROM notifications'))?.c || 0;
  if (!noteCount) {
    await db.run('INSERT INTO notifications (user_id, role, title, content) VALUES (1, "client", "饮食提醒", "本周盐摄入偏高，请选择低钠菜品。")');
    await db.run('INSERT INTO notifications (user_id, role, title, content) VALUES (2, "guardian", "被监护人饮食提醒", "李阿姨本周碳水偏高，建议减少主食份量。")');
  }
}

async function run() {
  console.log('[migrate] 初始化 SQLite 模式...');
  await initSchema(db);
  const schema = readMongoSchema();
  if (schema) {
    console.log(`[migrate] 已读取 Mongo schema（集合数：${Object.keys(schema).length}）`);
  }
  await ensureDefaultCommunity();
  await seedUsers();
  await seedDishes();
  await seedStores();
  await seedOrders();
  await seedReportsAndNotifications();
  console.log('[migrate] 完成。数据库位于 data/app.db');
}

if (require.main === module) {
  run();
}

module.exports = { run };
