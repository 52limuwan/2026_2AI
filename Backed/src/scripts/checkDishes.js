const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function checkDishes() {
  try {
    const dishes = await db.all('SELECT id, name, price, merchant_id, store_id FROM dishes ORDER BY id DESC LIMIT 10');
    console.log(`\n数据库中共有 ${dishes.length} 道菜品（最新10条）:`);
    dishes.forEach(d => {
      console.log(`  ID:${d.id} ${d.name} ￥${d.price} (商户:${d.merchant_id}, 店面:${d.store_id})`);
    });
    
    const total = await db.get('SELECT COUNT(*) as count FROM dishes');
    console.log(`\n总计: ${total.count} 道菜品\n`);
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkDishes();
