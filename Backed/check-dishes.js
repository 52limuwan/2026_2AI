require('dotenv').config();
const db = require('./src/db');

async function checkDishes() {
  const dishes = await db.all(`
    SELECT id, name, category, price, nutrition, description, stock
    FROM dishes
    WHERE stock > 0 AND store_id = 1
    ORDER BY monthly_sales DESC
    LIMIT 20
  `);
  
  console.log(`找到 ${dishes.length} 道可用菜品:\n`);
  
  dishes.forEach((dish, index) => {
    const nutrition = dish.nutrition ? JSON.parse(dish.nutrition) : {};
    console.log(`${index + 1}. ID:${dish.id} ${dish.name}`);
    console.log(`   分类: ${dish.category || '未分类'}`);
    console.log(`   价格: ￥${dish.price}`);
    console.log(`   营养: 热量${nutrition.calories || 0}kcal 蛋白质${nutrition.protein || 0}g 钠${nutrition.sodium || 0}mg`);
    console.log(`   描述: ${dish.description || '无'}\n`);
  });
}

checkDishes().catch(console.error);
