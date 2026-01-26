// 加载环境变量
require('dotenv').config();

const db = require('../db');

async function deleteTodayData() {
  // 获取今天的日期 (YYYY-MM-DD) - 本地时间
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  console.log(`[INFO] 开始清空 ${today} 的数据...`);
  
  try {
    // 先查看今天有多少数据
    const todayOrders = await db.all(`
      SELECT id, order_number, created_at 
      FROM orders 
      WHERE created_at LIKE ?
    `, [`${today}%`]);
    console.log(`[INFO] 找到 ${todayOrders.length} 条今天的订单`);
    
    const todayNutrition = await db.all(`
      SELECT id, client_id, date 
      FROM nutrition_intake_daily 
      WHERE date = ?
    `, [today]);
    console.log(`[INFO] 找到 ${todayNutrition.length} 条今天的营养记录`);
    
    // 1. 删除今天的订单项
    const orderItemsResult = await db.run(`
      DELETE FROM order_items 
      WHERE order_id IN (
        SELECT id FROM orders 
        WHERE created_at LIKE ?
      )
    `, [`${today}%`]);
    console.log(`[SUCCESS] 删除了 ${orderItemsResult.changes} 条订单项`);
    
    // 2. 删除今天的订单
    const ordersResult = await db.run(`
      DELETE FROM orders 
      WHERE created_at LIKE ?
    `, [`${today}%`]);
    console.log(`[SUCCESS] 删除了 ${ordersResult.changes} 条订单`);
    
    // 3. 删除今天的营养摄入记录
    const nutritionResult = await db.run(`
      DELETE FROM nutrition_intake_daily 
      WHERE date = ?
    `, [today]);
    console.log(`[SUCCESS] 删除了 ${nutritionResult.changes} 条营养摄入记录`);
    
    // 4. 删除今天的营养报告
    const reportsResult = await db.run(`
      DELETE FROM nutrition_reports 
      WHERE created_at LIKE ?
    `, [`${today}%`]);
    console.log(`[SUCCESS] 删除了 ${reportsResult.changes} 条营养报告`);
    
    console.log(`\n[DONE] 成功清空 ${today} 的所有数据`);
    
  } catch (error) {
    console.error('[ERROR] 删除数据时出错:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  deleteTodayData()
    .then(() => {
      console.log('\n[COMPLETE] 操作完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n[FAILED] 操作失败:', error);
      process.exit(1);
    });
}

module.exports = { deleteTodayData };
