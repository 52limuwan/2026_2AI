/**
 * 为 merchant01 添加三个店面：松柏店、文一路店、南湖店
 * 用法：node src/scripts/addStoresForMerchant01.js
 */
require('dotenv').config();

const db = require('../db');

async function addStores() {
  try {
    // 查找 merchant01 的用户ID
    const merchant = await db.get("SELECT id FROM users WHERE username = 'merchant01'");
    if (!merchant) {
      console.error('[error] merchant01 不存在，请先运行 npm run migrate 创建用户');
      process.exit(1);
    }

    const community = await db.get('SELECT id FROM communities ORDER BY id LIMIT 1');
    
    const merchantId = merchant.id;
    console.log(`[info] 找到 merchant01，用户ID: ${merchantId}`);
    
    // 检查是否已经存在这三个店面
    const existingStores = await db.all(
      'SELECT name FROM stores WHERE merchant_id = :merchant_id AND name IN ("松柏店", "文一路店", "南湖店")',
      { merchant_id: merchantId }
    );
    
    if (existingStores.length > 0) {
      console.log(`[info] 已存在以下店面：${existingStores.map(s => s.name).join(', ')}`);
      console.log('[info] 将删除这些店面并重新创建...');
      
      // 删除现有店面
      await db.run(
        'DELETE FROM stores WHERE merchant_id = :merchant_id AND name IN ("松柏店", "文一路店", "南湖店")',
        { merchant_id: merchantId }
      );
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
      
      console.log(`[success] 已创建店面: ${store.name} (ID: ${result.lastInsertRowid})`);
      
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
      console.log(`[success] 已将"松柏店"设置为 merchant01 的当前店面`);
    }
    
    console.log('[success] 完成！已为 merchant01 创建 3 个店面');
    process.exit(0);
  } catch (error) {
    console.error('[error] 添加店面失败:', error);
    process.exit(1);
  }
}

// 确保数据库连接关闭
addStores().then(() => {
  if (db.close) {
    db.close();
  }
});
