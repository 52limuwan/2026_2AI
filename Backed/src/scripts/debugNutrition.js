/**
 * 调试脚本：检查营养摄入计算问题
 * 用法：node src/scripts/debugNutrition.js [client_id]
 */
require('dotenv').config();

const db = require('../db');

async function debugNutrition(clientId) {
  try {
    console.log('=== 调试营养摄入计算 ===\n');
    
    // 获取今天的日期
    const today = new Date().toISOString().slice(0, 10);
    console.log(`今天日期: ${today}\n`);
    
    // 查询今天的订单
    console.log('--- 查询今天的订单 ---');
    const orders = await db.all(
      `SELECT id, order_number, client_id, status, created_at, date(created_at) as order_date
       FROM orders 
       WHERE client_id = :client_id 
       AND date(created_at) = :today
       ORDER BY created_at DESC
       LIMIT 10`,
      { client_id: clientId, today }
    );
    
    console.log(`找到 ${orders.length} 个今天的订单:\n`);
    for (const order of orders) {
      console.log(`订单ID: ${order.id}, 订单号: ${order.order_number}, 状态: ${order.status}, 创建时间: ${order.created_at}, 日期: ${order.order_date}`);
    }
    
    if (orders.length === 0) {
      console.log('\n⚠️  没有找到今天的订单！');
      console.log('让我们检查最近的订单...\n');
      
      const recentOrders = await db.all(
        `SELECT id, order_number, client_id, status, created_at, date(created_at) as order_date
         FROM orders 
         WHERE client_id = :client_id
         ORDER BY created_at DESC
         LIMIT 5`,
        { client_id: clientId }
      );
      
      console.log(`最近的 ${recentOrders.length} 个订单:`);
      for (const order of recentOrders) {
        console.log(`订单ID: ${order.id}, 订单号: ${order.order_number}, 状态: ${order.status}, 创建时间: ${order.created_at}, 日期: ${order.order_date}`);
      }
      return;
    }
    
    // 检查状态过滤
    console.log('\n--- 检查状态过滤 ---');
    const validStatusOrders = orders.filter(o => ['placed', 'preparing', 'delivering', 'delivered'].includes(o.status));
    console.log(`有效状态的订单: ${validStatusOrders.length}/${orders.length}`);
    
    if (validStatusOrders.length === 0) {
      console.log('⚠️  所有订单都不在有效状态列表中 (placed, preparing, delivering, delivered)');
      return;
    }
    
    // 检查订单项和营养数据
    console.log('\n--- 检查订单项和营养数据 ---');
    let totalNutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, calcium: 0, vitaminC: 0, iron: 0 };
    
    for (const order of validStatusOrders) {
      console.log(`\n订单 ${order.order_number} (ID: ${order.id}):`);
      const items = await db.all(
        'SELECT id, dish_id, dish_name, nutrition, quantity FROM order_items WHERE order_id = :oid',
        { oid: order.id }
      );
      
      console.log(`  订单项数量: ${items.length}`);
      
      for (const item of items) {
        console.log(`  - 菜品: ${item.dish_name}, 数量: ${item.quantity}`);
        
        let n = item.nutrition ? JSON.parse(item.nutrition) : null;
        if (!n && item.dish_id) {
          const dish = await db.get('SELECT name, nutrition FROM dishes WHERE id = :id', { id: item.dish_id });
          if (dish) {
            console.log(`    从菜品表获取营养数据: ${dish.name}`);
            n = dish.nutrition ? JSON.parse(dish.nutrition) : null;
          }
        }
        
        if (!n) {
          console.log(`    ⚠️  警告: 没有营养数据！`);
          continue;
        }
        
        const qty = Number(item.quantity || 1);
        const itemCalories = Number(n.calories || 0) * qty;
        totalNutrition.calories += itemCalories;
        totalNutrition.protein += Number(n.protein || 0) * qty;
        totalNutrition.fat += Number(n.fat || 0) * qty;
        totalNutrition.carbs += Number(n.carbs || 0) * qty;
        totalNutrition.fiber += Number(n.fiber || 0) * qty;
        totalNutrition.calcium += Number(n.calcium || 0) * qty;
        totalNutrition.vitaminC += Number(n.vitaminC || n.vitamin_c || 0) * qty;
        totalNutrition.iron += Number(n.iron || 0) * qty;
        
        console.log(`    营养数据: 热量=${itemCalories} kcal (${n.calories || 0} x ${qty})`);
      }
    }
    
    console.log('\n--- 营养总计 ---');
    console.log(JSON.stringify(totalNutrition, null, 2));
    
    // 检查饮食记录
    console.log('\n--- 检查饮食记录 ---');
    const dietaryRecords = await db.all(
      `SELECT id, food_name, nutrition, quantity, record_date 
       FROM dietary_records 
       WHERE client_id = :client_id AND record_date = :today`,
      { client_id: clientId, today }
    );
    console.log(`饮食记录数量: ${dietaryRecords.length}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    if (db.close) {
      db.close();
    }
  }
}

// 获取命令行参数
const clientId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!clientId) {
  console.error('用法: node src/scripts/debugNutrition.js <client_id>');
  console.error('例如: node src/scripts/debugNutrition.js 1');
  process.exit(1);
}

debugNutrition(clientId).then(() => {
  process.exit(0);
});
