const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

// 主食列表（从菜品名称判断）
const STAPLE_FOODS = ['米饭', '面', '粉', '粥', '包', '饼', '卷', '饺', '馒头', '花卷', '油条', '烧卖'];

/**
 * 判断是否为主食
 */
function isStapleFood(dishName) {
  return STAPLE_FOODS.some(keyword => dishName.includes(keyword));
}

/**
 * 生成指定日期范围的订单
 */
async function generateHistoryOrders() {
  console.log('\n========================================');
  console.log('[生成历史订单]');
  console.log('========================================');
  console.log('开始时间:', new Date().toLocaleString('zh-CN'));
  
  let database, save;
  
  try {
    // 获取数据库实例
    const dbInstance = await db.getDatabase();
    database = dbInstance.database;
    save = dbInstance.save;
    
    console.log(`数据库文件路径: ${db.dbPath}`);
    
    // 查找client01用户
    const clientStmt = database.prepare('SELECT id, name, community_id FROM users WHERE username = ?');
    clientStmt.bind(['client01']);
    const hasClient = clientStmt.step();
    if (!hasClient) {
      throw new Error('未找到用户 client01');
    }
    const client = clientStmt.getAsObject();
    clientStmt.free();
    
    console.log(`\n找到用户: ${client.name} (ID: ${client.id})`);
    
    // 查询所有可用菜品
    const dishesStmt = database.prepare('SELECT * FROM dishes WHERE status = "available"');
    const allDishes = [];
    while (dishesStmt.step()) {
      allDishes.push(dishesStmt.getAsObject());
    }
    dishesStmt.free();
    
    console.log(`数据库中共有 ${allDishes.length} 道可用菜品`);
    
    if (allDishes.length === 0) {
      throw new Error('数据库中没有可用菜品');
    }
    
    // 分类菜品：主食和非主食
    const stapleDishes = allDishes.filter(d => isStapleFood(d.name));
    const nonStapleDishes = allDishes.filter(d => !isStapleFood(d.name));
    
    console.log(`主食: ${stapleDishes.length} 道`);
    console.log(`非主食: ${nonStapleDishes.length} 道`);
    
    if (stapleDishes.length === 0) {
      console.log('警告: 没有主食，将从所有菜品中随机选择');
    }
    
    // 生成日期范围：2025-12-15 到 2026-01-11
    const startDate = new Date('2025-12-15');
    const endDate = new Date('2026-01-11');
    
    const mealTimes = [
      { hour: 9, minute: 0, name: '早餐' },
      { hour: 12, minute: 0, name: '午餐' },
      { hour: 19, minute: 0, name: '晚餐' }
    ];
    
    let totalOrders = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      console.log(`\n生成 ${dateStr} 的订单...`);
      
      for (const mealTime of mealTimes) {
        // 创建订单时间
        const orderTime = new Date(currentDate);
        orderTime.setHours(mealTime.hour, mealTime.minute, 0, 0);
        const createdAt = orderTime.toISOString();
        
        // 随机选择3道菜，其中必须有1道主食
        const selectedDishes = [];
        
        // 先选一道主食
        if (stapleDishes.length > 0) {
          const randomStaple = stapleDishes[Math.floor(Math.random() * stapleDishes.length)];
          selectedDishes.push(randomStaple);
        }
        
        // 再选2道非主食（如果没有主食，就选3道普通菜）
        const dishesToSelect = stapleDishes.length > 0 ? 2 : 3;
        const availableDishes = stapleDishes.length > 0 ? nonStapleDishes : allDishes;
        
        for (let i = 0; i < dishesToSelect && availableDishes.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * availableDishes.length);
          selectedDishes.push(availableDishes[randomIndex]);
        }
        
        // 计算总价和营养
        let totalAmount = 0;
        let totalNutrition = {
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
          fiber: 0,
          calcium: 0,
          vitaminC: 0,
          iron: 0
        };
        
        selectedDishes.forEach(dish => {
          totalAmount += parseFloat(dish.price || 0);
          
          try {
            const nutrition = JSON.parse(dish.nutrition || '{}');
            totalNutrition.calories += nutrition.calories || 0;
            totalNutrition.protein += nutrition.protein || 0;
            totalNutrition.fat += nutrition.fat || 0;
            totalNutrition.carbs += nutrition.carbs || 0;
            totalNutrition.fiber += nutrition.fiber || 0;
            totalNutrition.calcium += nutrition.calcium || 0;
            totalNutrition.vitaminC += nutrition.vitaminC || 0;
            totalNutrition.iron += nutrition.iron || 0;
          } catch (e) {
            console.warn(`解析菜品 ${dish.name} 的营养信息失败`);
          }
        });
        
        // 插入订单
        const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const orderStmt = database.prepare(
          `INSERT INTO orders (order_number, client_id, merchant_id, store_id, community_id, total_amount, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        const merchantId = selectedDishes[0].merchant_id;
        const storeId = selectedDishes[0].store_id;
        
        orderStmt.bind([
          orderNumber,
          client.id,
          merchantId,
          storeId,
          client.community_id,
          totalAmount.toFixed(2),
          'delivered', // 历史订单都是已完成状态
          createdAt,
          createdAt
        ]);
        orderStmt.step();
        orderStmt.free();
        
        const orderId = database.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0];
        
        // 插入订单项
        for (const dish of selectedDishes) {
          const itemStmt = database.prepare(
            `INSERT INTO order_items (order_id, dish_id, dish_name, quantity, price)
             VALUES (?, ?, ?, ?, ?)`
          );
          itemStmt.bind([orderId, dish.id, dish.name, 1, dish.price]);
          itemStmt.step();
          itemStmt.free();
        }
        
        const dishNames = selectedDishes.map(d => d.name).join(', ');
        console.log(`  ${mealTime.name} (${mealTime.hour}:00): ${dishNames} - ￥${totalAmount.toFixed(2)} - ${Math.round(totalNutrition.calories)}kcal`);
        
        // 更新当天的营养摄入汇总
        const checkDailyStmt = database.prepare(
          'SELECT id, totals FROM nutrition_intake_daily WHERE client_id = ? AND date = ?'
        );
        checkDailyStmt.bind([client.id, dateStr]);
        const hasDailyRecord = checkDailyStmt.step();
        
        if (hasDailyRecord) {
          // 更新现有记录
          const dailyRecord = checkDailyStmt.getAsObject();
          const existingTotals = JSON.parse(dailyRecord.totals || '{}');
          
          // 累加营养数据
          existingTotals.calories = (existingTotals.calories || 0) + Math.round(totalNutrition.calories);
          existingTotals.protein = (existingTotals.protein || 0) + Math.round(totalNutrition.protein * 10) / 10;
          existingTotals.fat = (existingTotals.fat || 0) + Math.round(totalNutrition.fat * 10) / 10;
          existingTotals.carbs = (existingTotals.carbs || 0) + Math.round(totalNutrition.carbs * 10) / 10;
          existingTotals.fiber = (existingTotals.fiber || 0) + Math.round(totalNutrition.fiber * 10) / 10;
          existingTotals.calcium = (existingTotals.calcium || 0) + Math.round(totalNutrition.calcium * 10) / 10;
          existingTotals.vitaminC = (existingTotals.vitaminC || 0) + Math.round(totalNutrition.vitaminC * 10) / 10;
          existingTotals.iron = (existingTotals.iron || 0) + Math.round(totalNutrition.iron * 10) / 10;
          
          checkDailyStmt.free();
          
          const updateDailyStmt = database.prepare(
            'UPDATE nutrition_intake_daily SET totals = ?, updated_at = ? WHERE id = ?'
          );
          updateDailyStmt.bind([JSON.stringify(existingTotals), createdAt, dailyRecord.id]);
          updateDailyStmt.step();
          updateDailyStmt.free();
        } else {
          checkDailyStmt.free();
          
          // 创建新记录
          const dailyTotals = {
            calories: Math.round(totalNutrition.calories),
            protein: Math.round(totalNutrition.protein * 10) / 10,
            fat: Math.round(totalNutrition.fat * 10) / 10,
            carbs: Math.round(totalNutrition.carbs * 10) / 10,
            fiber: Math.round(totalNutrition.fiber * 10) / 10,
            calcium: Math.round(totalNutrition.calcium * 10) / 10,
            vitaminC: Math.round(totalNutrition.vitaminC * 10) / 10,
            iron: Math.round(totalNutrition.iron * 10) / 10
          };
          
          const insertDailyStmt = database.prepare(
            'INSERT INTO nutrition_intake_daily (client_id, date, totals, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          );
          insertDailyStmt.bind([client.id, dateStr, JSON.stringify(dailyTotals), 'order', createdAt, createdAt]);
          insertDailyStmt.step();
          insertDailyStmt.free();
        }
        
        totalOrders++;
      }
      
      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 保存数据库
    console.log('\n正在保存数据库...');
    save();
    console.log('数据库已保存');
    
    console.log('\n========================================');
    console.log('[生成完成]');
    console.log('========================================');
    console.log(`总计生成: ${totalOrders} 个订单`);
    console.log('完成时间:', new Date().toLocaleString('zh-CN'));
    console.log('========================================\n');
    
    return {
      success: true,
      totalOrders
    };
  } catch (error) {
    console.error('\n[错误] 生成失败:', error);
    throw error;
  } finally {
    // 最后确保保存并关闭数据库
    if (save) {
      try {
        save();
        console.log('\n最终保存完成');
      } catch (saveError) {
        console.error('最终保存失败:', saveError);
      }
    }
    if (database && typeof database.close === 'function') {
      database.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  generateHistoryOrders()
    .then(result => {
      console.log('\n脚本执行成功');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { generateHistoryOrders };
