const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');
const { createOrder, listOrders, updateOrderStatus } = require('../services/orders');
const { getLocalDateString, getPastDays, getToday } = require('../utils/dateHelper');

const router = express.Router();

router.use(authRequired, requireRole('guardian'));

router.get('/clients', async (req, res) => {
  const rows = await db.all(
    `SELECT u.id, u.name, u.phone, u.id_card, u.id_verified, cp.age, cp.gender, cp.address, cp.chronic_conditions, cp.taste_preferences, cp.elder_mode, l.relation
     FROM guardian_client_links l
     JOIN users u ON u.id = l.client_id
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     WHERE l.guardian_id = :guardian_id AND l.status = 'active'`,
    { guardian_id: req.user.id }
  );
  return success(res, { clients: rows.map(row => ({ ...row, id_verified: !!row.id_verified })) });
});

router.post('/bind', async (req, res) => {
  const { clientId, relation = '监护', idCard, phone } = req.body;
  if (!clientId && !idCard) return failure(res, '请输入身份证号或选择用户');

  let client = null;
  if (idCard) {
    client = await db.get('SELECT id, phone, id_card FROM users WHERE role = "client" AND id_card = :id_card', { id_card: idCard });
    if (!client) return failure(res, '未找到对应身份证的销售端用户', 404);
    if (phone && client.phone !== phone) return failure(res, '手机号与身份证不匹配', 400);
  } else if (clientId) {
    client = await db.get('SELECT id, phone, id_card FROM users WHERE id = :id AND role = "client"', { id: clientId });
    if (!client) return failure(res, '销售端用户不存在', 404);
  }

  if (!client?.id_card) {
    return failure(res, '该用户未完善身份证信息，无法绑定', 400);
  }
  if (phone && client.phone !== phone) {
    return failure(res, '手机号与身份证不匹配', 400);
  }

  const existing = await db.get(
    'SELECT id FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id',
    { guardian_id: req.user.id, client_id: client.id }
  );
  if (existing) {
    await db.run(
      `UPDATE guardian_client_links
       SET relation = :relation, bind_id_card = :bind_id_card, bind_phone = :bind_phone,
           status = 'active', verified_at = :verified_at
       WHERE id = :id`,
      {
        id: existing.id,
        relation,
        bind_id_card: client.id_card,
        bind_phone: phone || client.phone || null,
        verified_at: new Date().toISOString()
      }
    );
  } else {
    await db.run(
      `INSERT INTO guardian_client_links (guardian_id, client_id, relation, bind_id_card, bind_phone, status, verified_at)
       VALUES (:guardian_id, :client_id, :relation, :bind_id_card, :bind_phone, 'active', :verified_at)`,
      {
        guardian_id: req.user.id,
        client_id: client.id,
        relation,
        bind_id_card: client.id_card,
        bind_phone: phone || client.phone || null,
        verified_at: new Date().toISOString()
      }
    );
  }
  return success(res, { clientId: client.id, relation }, '绑定成功');
});

router.delete('/bind/:clientId', async (req, res) => {
  await db.run('DELETE FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id', {
    guardian_id: req.user.id,
    client_id: req.params.clientId
  });
  return success(res, { clientId: req.params.clientId }, '已解绑');
});

router.post('/orders', async (req, res) => {
  const {
    clientId,
    items = [],
    merchantId = null,
    store_id = null,
    address = '',
    contact = '',
    scheduledAt = null,
    remark = '',
    paymentMethod = 'recorded',
    community_name = '',
    window_name = ''
  } = req.body;
  if (!clientId) return failure(res, '缺少被监护人');
  if (!items.length) return failure(res, '请选择菜品下单');

  const allowed = await db.get(
    `SELECT 1 FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = 'active'`,
    { guardian_id: req.user.id, client_id: clientId }
  );
  if (!allowed) return failure(res, '未绑定该被监护人', 403);

  let resolvedMerchantId = merchantId;
  let resolvedStoreId = store_id;

  if (resolvedStoreId) {
    const store = await db.get('SELECT id, merchant_id FROM stores WHERE id = :store_id', { store_id: resolvedStoreId });
    if (!store) return failure(res, '所选店面不存在或已下线');
    resolvedMerchantId = resolvedMerchantId || store.merchant_id;
  }

  const formattedItems = [];
  for (const it of items) {
    let dishName = it.dish_name;
    let price = it.price || 0;
    let nutrition = it.nutrition;
    let dishMerchantId = it.merchant_id || null;
    let dishStoreId = it.store_id || null;
    if (it.dish_id) {
      const dish = await db.get('SELECT name, price, nutrition, merchant_id, store_id FROM dishes WHERE id = :id', { id: it.dish_id });
      if (dish) {
        dishName = dish.name;
        price = dish.price;
        nutrition = dish.nutrition ? JSON.parse(dish.nutrition) : nutrition;
        dishMerchantId = dish.merchant_id || dishMerchantId;
        dishStoreId = dish.store_id || dishStoreId;
      }
    }

    if (!resolvedMerchantId && dishMerchantId) {
      resolvedMerchantId = dishMerchantId;
    }
    if (!resolvedStoreId && dishStoreId) {
      resolvedStoreId = dishStoreId;
    }

    formattedItems.push({ ...it, dish_name: dishName, price, nutrition, merchant_id: dishMerchantId, store_id: dishStoreId });
  }

  if (!resolvedMerchantId) {
    return failure(res, '未找到对应商户，请重新选择店面后再下单');
  }
  if (!resolvedStoreId) {
    return failure(res, '请选择消费店面后再下单');
  }

  const crossMerchant = formattedItems.find((it) => it.merchant_id && it.merchant_id !== resolvedMerchantId);
  if (crossMerchant) {
    return failure(res, '暂不支持跨商户下单，请分开提交');
  }
  const crossStore = formattedItems.find((it) => it.store_id && it.store_id !== resolvedStoreId);
  if (crossStore) {
    return failure(res, '请选择同一店面的菜品下单');
  }

  const guardianLinks = await db.all(
    `SELECT guardian_id FROM guardian_client_links WHERE client_id = :client_id AND status = 'active'`,
    { client_id: clientId }
  );
  const guardianIds = guardianLinks.map((g) => g.guardian_id);

  let communityId = null;
  let communityCode = null;
  let resolvedCommunityName = community_name || '';
  const clientCommunity = await db.get('SELECT community_id, community_code FROM users WHERE id = :id', { id: clientId });
  if (clientCommunity?.community_id) {
    communityId = clientCommunity.community_id;
    communityCode = clientCommunity.community_code || null;
  }
  if (resolvedStoreId) {
    const store = await db.get(
      `SELECT s.community_id, c.code as community_code, c.name as community_name
       FROM stores s
       LEFT JOIN communities c ON c.id = s.community_id
       WHERE s.id = :store_id`,
      { store_id: resolvedStoreId }
    );
    if (store?.community_id) {
      communityId = store.community_id;
      communityCode = store.community_code || communityCode;
      resolvedCommunityName = resolvedCommunityName || store.community_name || '';
    }
  }

  const order = await createOrder({
    clientId,
    guardianId: req.user.id,
    guardianIds,
    merchantId: resolvedMerchantId,
    storeId: resolvedStoreId,
    communityId,
    communityCode,
    items: formattedItems,
    address,
    contact,
    scheduledAt,
    remark,
    paymentMethod,
    community_name: resolvedCommunityName,
    window_name
  });
  return success(res, { order }, '已为被监护人下单');
});

router.get('/orders', async (req, res) => {
  const clientIds = (
    await db.all('SELECT client_id FROM guardian_client_links WHERE guardian_id = :guardian_id AND status = "active"', {
      guardian_id: req.user.id
    })
  ).map((r) => r.client_id);
  const orders = await listOrders({ clientIds });
  return success(res, { orders });
});

router.post('/orders/:id/pay', async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (!orderId) return failure(res, '订单ID无效');
  
  // 检查订单是否存在且属于该监护人关联的被监护人
  const order = await db.get(
    `SELECT o.* FROM orders o
     JOIN guardian_client_links gcl ON gcl.client_id = o.client_id
     WHERE o.id = :order_id AND gcl.guardian_id = :guardian_id AND gcl.status = 'active'`,
    { order_id: orderId, guardian_id: req.user.id }
  );
  
  if (!order) {
    return failure(res, '订单不存在或无权限操作', 404);
  }
  
  // 检查订单是否已经支付
  if (order.payment_status === 'paid') {
    return failure(res, '订单已支付', 400);
  }
  
  // 更新订单支付状态为已支付
  try {
    await updateOrderStatus(orderId, order.status, { payment_status: 'paid' });
    return success(res, { orderId }, '支付成功');
  } catch (err) {
    console.error('支付订单失败:', err);
    return failure(res, '支付失败，请重试', 500);
  }
});

// 计算今日营养数据的辅助函数
async function calculateTodayNutrition(clientId, today) {
  // 优先从 nutrition_intake_daily 表读取（这是订单创建时已经计算好的数据）
  const intakeRecord = await db.get(
    `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :today`,
    { client_id: clientId, today }
  );
  
  if (intakeRecord && intakeRecord.totals) {
    const totals = JSON.parse(intakeRecord.totals);
    // 确保所有字段都存在
    return {
      calories: totals.calories || 0,
      protein: totals.protein || 0,
      fat: totals.fat || 0,
      carbs: totals.carbs || 0,
      fiber: totals.fiber || 0,
      calcium: totals.calcium || 0,
      vitaminC: totals.vitaminC || totals.vitamin_c || 0,
      iron: totals.iron || 0
    };
  }
  
  // 如果 nutrition_intake_daily 表中没有数据，则实时计算（兼容旧逻辑）
  const totals = { 
    calories: 0, 
    protein: 0, 
    fat: 0, 
    carbs: 0, 
    fiber: 0,
    calcium: 0,
    vitaminC: 0,
    iron: 0
  };
  
  // 从订单获取营养数据
  const orders = await db.all(
    `SELECT id FROM orders 
     WHERE client_id = :client_id 
     AND date(created_at) = :today 
     AND status IN ('placed','preparing','delivering','delivered')`,
    { client_id: clientId, today }
  );
  for (const o of orders) {
    const items = await db.all('SELECT dish_id, nutrition, quantity FROM order_items WHERE order_id = :oid', { oid: o.id });
    for (const it of items) {
      let n = it.nutrition ? JSON.parse(it.nutrition) : null;
      if (!n && it.dish_id) {
        const d = await db.get('SELECT nutrition FROM dishes WHERE id = :id', { id: it.dish_id });
        n = d?.nutrition ? JSON.parse(d.nutrition) : null;
      }
      if (!n) continue;
      const qty = Number(it.quantity || 1);
      totals.calories += Number(n.calories || 0) * qty;
      totals.protein += Number(n.protein || 0) * qty;
      totals.fat += Number(n.fat || 0) * qty;
      totals.carbs += Number(n.carbs || 0) * qty;
      totals.fiber += Number(n.fiber || 0) * qty;
      totals.calcium += Number(n.calcium || 0) * qty;
      totals.vitaminC += Number(n.vitaminC || n.vitamin_c || 0) * qty;
      totals.iron += Number(n.iron || 0) * qty;
    }
  }
  
  // 从饮食记录获取营养数据
  const dietaryRecords = await db.all(
    `SELECT nutrition, quantity FROM dietary_records WHERE client_id = :client_id AND record_date = :today`,
    { client_id: clientId, today }
  );
  for (const dr of dietaryRecords) {
    const n = dr.nutrition ? JSON.parse(dr.nutrition) : {};
    const qty = Number(dr.quantity || 1);
    totals.calories += Number(n.calories || 0) * qty;
    totals.protein += Number(n.protein || 0) * qty;
    totals.fat += Number(n.fat || 0) * qty;
    totals.carbs += Number(n.carbs || 0) * qty;
    totals.fiber += Number(n.fiber || 0) * qty;
    totals.calcium += Number(n.calcium || 0) * qty;
    totals.vitaminC += Number(n.vitaminC || n.vitamin_c || 0) * qty;
    totals.iron += Number(n.iron || 0) * qty;
  }
  
  return totals;
}

router.get('/nutrition/:clientId', async (req, res) => {
  const clientId = req.params.clientId;
  const allowed = await db.get(
    'SELECT 1 FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = "active"',
    {
      guardian_id: req.user.id,
      client_id: clientId
    }
  );
  if (!allowed) return failure(res, '无权限查看该被监护人', 403);

  const today = getToday();
  const totals = await calculateTodayNutrition(clientId, today);
  return success(res, totals);
});

// 新增路由：匹配前端的路径 /clients/:clientId/nutrition/today
router.get('/clients/:clientId/nutrition/today', async (req, res) => {
  const clientId = req.params.clientId;
  const allowed = await db.get(
    'SELECT 1 FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = "active"',
    {
      guardian_id: req.user.id,
      client_id: clientId
    }
  );
  if (!allowed) return failure(res, '无权限查看该被监护人', 403);

  const today = getToday();
  const totals = await calculateTodayNutrition(clientId, today);
  return success(res, { nutrition: totals });
});

// 权限检查辅助函数
const checkGuardianPermission = async (guardianId, clientId) => {
  const allowed = await db.get(
    'SELECT 1 FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = "active"',
    {
      guardian_id: guardianId,
      client_id: clientId
    }
  );
  return !!allowed;
};

router.get('/reports/:clientId', async (req, res) => {
  const clientId = req.params.clientId;
  if (!(await checkGuardianPermission(req.user.id, clientId))) {
    return failure(res, '未绑定该被监护人', 403);
  }
  const reports = (await db.all('SELECT * FROM nutrition_reports WHERE client_id = :client_id ORDER BY created_at DESC LIMIT 6', { client_id: clientId })).map(
    (r) => ({ ...r, summary: r.summary ? JSON.parse(r.summary) : {} })
  );
  return success(res, { reports });
});

router.get('/reports/:clientId/weekly', async (req, res) => {
  const clientId = parseInt(req.params.clientId);
  if (!(await checkGuardianPermission(req.user.id, clientId))) {
    return failure(res, '未绑定该被监护人', 403);
  }

  // 计算过去7天的数据（使用本地日期）
  const days = getPastDays(7);
  const calories = [];
  const protein = [];
  const fat = [];
  const carbs = [];
  const fiber = [];
  const calcium = [];
  const vitaminC = [];
  const iron = [];

  const dailyTarget = 2000; // 默认值

  for (const label of days) {
    let dayCalories = 0;
    let dayProtein = 0;
    let dayFat = 0;
    let dayCarbs = 0;
    let dayFiber = 0;
    let dayCalcium = 0;
    let dayVitaminC = 0;
    let dayIron = 0;

    // 优先从 nutrition_intake_daily 表读取
    const intakeRecord = await db.get(
      `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
      { client_id: clientId, date: label }
    );
    
    if (intakeRecord && intakeRecord.totals) {
      const totals = JSON.parse(intakeRecord.totals);
      dayCalories = Number(totals.calories || 0);
      dayProtein = Number(totals.protein || 0);
      dayFat = Number(totals.fat || 0);
      dayCarbs = Number(totals.carbs || 0);
      dayFiber = Number(totals.fiber || 0);
      dayCalcium = Number(totals.calcium || 0);
      dayVitaminC = Number(totals.vitaminC || totals.vitamin_c || 0);
      dayIron = Number(totals.iron || 0);
    } else {
      // 如果没有记录，从订单实时计算
      const orders = await db.all(
        `SELECT id FROM orders WHERE client_id = :client_id AND date(created_at) = :date AND status IN ('placed','preparing','delivering','delivered')`,
        { client_id: clientId, date: label }
      );
      for (const o of orders) {
        const items = await db.all('SELECT dish_id, nutrition, quantity FROM order_items WHERE order_id = :oid', { oid: o.id });
        for (const it of items) {
          let n = it.nutrition ? JSON.parse(it.nutrition) : null;
          if (!n && it.dish_id) {
            const dish = await db.get('SELECT nutrition FROM dishes WHERE id = :id', { id: it.dish_id });
            n = dish?.nutrition ? JSON.parse(dish.nutrition) : null;
          }
          if (n) {
            const qty = Number(it.quantity || 1);
            dayCalories += Number(n.calories || 0) * qty;
            dayProtein += Number(n.protein || 0) * qty;
            dayFat += Number(n.fat || 0) * qty;
            dayCarbs += Number(n.carbs || 0) * qty;
            dayFiber += Number(n.fiber || 0) * qty;
            dayCalcium += Number(n.calcium || 0) * qty;
            dayVitaminC += Number(n.vitaminC || n.vitamin_c || 0) * qty;
            dayIron += Number(n.iron || 0) * qty;
          }
        }
      }

      // 从饮食记录获取营养数据
      const dietaryRecords = await db.all(
        `SELECT nutrition, quantity FROM dietary_records WHERE client_id = :client_id AND record_date = :date`,
        { client_id: clientId, date: label }
      );
      for (const dr of dietaryRecords) {
        const n = dr.nutrition ? JSON.parse(dr.nutrition) : {};
        const qty = Number(dr.quantity || 1);
        dayCalories += Number(n.calories || 0) * qty;
        dayProtein += Number(n.protein || 0) * qty;
        dayFat += Number(n.fat || 0) * qty;
        dayCarbs += Number(n.carbs || 0) * qty;
        dayFiber += Number(n.fiber || 0) * qty;
        dayCalcium += Number(n.calcium || 0) * qty;
        dayVitaminC += Number(n.vitaminC || n.vitamin_c || 0) * qty;
        dayIron += Number(n.iron || 0) * qty;
      }
    }

    calories.push(dayCalories);
    protein.push(dayProtein);
    fat.push(dayFat);
    carbs.push(dayCarbs);
    fiber.push(dayFiber);
    calcium.push(dayCalcium);
    vitaminC.push(dayVitaminC);
    iron.push(dayIron);
  }

  // 计算汇总
  const totalCalories = calories.reduce((a, b) => a + b, 0);
  const totalProtein = protein.reduce((a, b) => a + b, 0);
  const totalFat = fat.reduce((a, b) => a + b, 0);
  const totalCarbs = carbs.reduce((a, b) => a + b, 0);
  const totalFiber = fiber.reduce((a, b) => a + b, 0);
  const totalCalcium = calcium.reduce((a, b) => a + b, 0);
  const totalVitaminC = vitaminC.reduce((a, b) => a + b, 0);
  const totalIron = iron.reduce((a, b) => a + b, 0);

  const summary = {
    calories: totalCalories,
    protein: totalProtein,
    fat: totalFat,
    carbs: totalCarbs,
    fiber: totalFiber,
    calcium: totalCalcium,
    vitaminC: totalVitaminC,
    iron: totalIron
  };

  // 计算目标达成天数
  const targetDays = calories.filter(cal => cal >= dailyTarget * 0.8 && cal <= dailyTarget * 1.2).length;

  // 计算目标达成率
  const avgWeeklyCalories = totalCalories / 7;
  const targetAchievement = dailyTarget > 0 ? Math.round((avgWeeklyCalories / dailyTarget) * 100) : 0;

  // 计算营养进度百分比
  const caloriesTarget = 2000; // kcal/day
  const proteinTarget = 60; // g/day
  const fatTarget = 65; // g/day
  const carbsTarget = 250; // g/day
  const fiberTarget = 25; // g/day
  const calciumTarget = 800; // mg/day
  const vitaminCTarget = 100; // mg/day
  const ironTarget = 15; // mg/day

  const caloriesProgress = caloriesTarget > 0 ? Math.min(100, Math.round((summary.calories / 7 / caloriesTarget) * 100)) : 0;
  const proteinProgress = proteinTarget > 0 ? Math.min(100, Math.round((summary.protein / 7 / proteinTarget) * 100)) : 0;
  const fatProgress = fatTarget > 0 ? Math.min(100, Math.round((summary.fat / 7 / fatTarget) * 100)) : 0;
  const carbsProgress = carbsTarget > 0 ? Math.min(100, Math.round((summary.carbs / 7 / carbsTarget) * 100)) : 0;
  const fiberProgress = fiberTarget > 0 ? Math.min(100, Math.round((summary.fiber / 7 / fiberTarget) * 100)) : 0;
  const calciumProgress = calciumTarget > 0 ? Math.min(100, Math.round((summary.calcium / 7 / calciumTarget) * 100)) : 0;
  const vitaminCProgress = vitaminCTarget > 0 ? Math.min(100, Math.round((summary.vitaminC / 7 / vitaminCTarget) * 100)) : 0;
  const ironProgress = ironTarget > 0 ? Math.min(100, Math.round((summary.iron / 7 / ironTarget) * 100)) : 0;

  // 统计新尝试的菜品数
  const uniqueDishes = await db.all(
    `SELECT COUNT(DISTINCT oi.dish_id) as count
     FROM order_items oi
     JOIN orders ord ON ord.id = oi.order_id
     WHERE ord.client_id = :client_id 
     AND date(ord.created_at) >= date('now', '-7 days')
     AND ord.status IN ('placed','preparing','delivering','delivered')`,
    { client_id: clientId }
  );
  const newDishes = uniqueDishes[0]?.count || 0;

  // 计算饮食多样性
  const diversity = Math.min(100, Math.round((newDishes / 7) * 100 * 2));

  // 生成健康洞察
  const insight = avgWeeklyCalories > 0 
    ? `本周周均摄入热量为 ${Math.round(avgWeeklyCalories)} kcal，目标达成率为 ${targetAchievement}%。本周共尝试了 ${newDishes}种不同菜品，饮食多样性得分为 ${diversity}%。${fiberProgress >= 80 ? '膳食纤维摄入充足，' : '建议增加膳食纤维摄入，'}${proteinProgress >= 80 ? '蛋白质摄入良好。' : '蛋白质摄入有待提升。'}`
    : '';

  // 生成成就列表
  const achievements = [];
  if (avgWeeklyCalories > 0) {
    if (targetDays >= 6) achievements.push(`本周有 ${targetDays} 天达到了热量目标`);
    if (fiberProgress >= 90) achievements.push('膳食纤维摄入量达到推荐标准的 90% 以上');
    if (proteinProgress >= 85) achievements.push('蛋白质摄入量达到推荐标准的 85% 以上');
    if (newDishes >= 10) achievements.push(`本周尝试了 ${newDishes} 种不同菜品，饮食多样化表现优秀`);
  }

  const latest = await db.get(
    `SELECT * FROM nutrition_reports 
     WHERE client_id = :client_id AND type = 'week' 
     ORDER BY created_at DESC LIMIT 1`,
    { client_id: clientId }
  );

  const recommendations = latest?.recommendations || '';

  const report = {
    type: 'week',
    summary,
    recommendations,
    days,
    calories,
    protein,
    fat,
    carbs,
    fiber,
    target_achievement: targetAchievement,
    target_days: targetDays,
    new_dishes: newDishes,
    diversity,
    insight,
    achievements,
    calories_progress: caloriesProgress,
    protein_progress: proteinProgress,
    fat_progress: fatProgress,
    carbs_progress: carbsProgress,
    fiber_progress: fiberProgress,
    calcium_progress: calciumProgress,
    vitamin_c_progress: vitaminCProgress,
    iron_progress: ironProgress,
    calorie_change: 0,
    deficit_change: 0,
    achievement_change: 0,
    score_change: 0
  };

  return success(res, { report });
});

router.get('/reports/:clientId/monthly', async (req, res) => {
  const clientId = parseInt(req.params.clientId);
  if (!(await checkGuardianPermission(req.user.id, clientId))) {
    return failure(res, '未绑定该被监护人', 403);
  }

  try {
    // 计算过去30天的数据（使用本地日期）
    const days = getPastDays(30);
    const calories = [];
    const protein = [];
    const fat = [];
    const carbs = [];
    const fiber = [];
    const calcium = [];
    const vitaminC = [];
    const iron = [];

    const dailyTarget = 2000; // 默认值

    for (const label of days) {
      let dayCalories = 0;
      let dayProtein = 0;
      let dayFat = 0;
      let dayCarbs = 0;
      let dayFiber = 0;
      let dayCalcium = 0;
      let dayVitaminC = 0;
      let dayIron = 0;

      // 优先从 nutrition_intake_daily 表读取
      const intakeRecord = await db.get(
        `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: clientId, date: label }
      );
      
      if (intakeRecord && intakeRecord.totals) {
        const totals = JSON.parse(intakeRecord.totals);
        dayCalories = Number(totals.calories || 0);
        dayProtein = Number(totals.protein || 0);
        dayFat = Number(totals.fat || 0);
        dayCarbs = Number(totals.carbs || 0);
        dayFiber = Number(totals.fiber || 0);
        dayCalcium = Number(totals.calcium || 0);
        dayVitaminC = Number(totals.vitaminC || totals.vitamin_c || 0);
        dayIron = Number(totals.iron || 0);
      } else {
        // 如果没有记录，从订单实时计算
        const orders = await db.all(
          `SELECT id FROM orders WHERE client_id = :client_id AND date(created_at) = :date AND status IN ('placed','preparing','delivering','delivered')`,
          { client_id: clientId, date: label }
        );
        for (const o of orders) {
          const items = await db.all('SELECT dish_id, nutrition, quantity FROM order_items WHERE order_id = :oid', { oid: o.id });
          for (const it of items) {
            let n = it.nutrition ? JSON.parse(it.nutrition) : null;
            if (!n && it.dish_id) {
              const dish = await db.get('SELECT nutrition FROM dishes WHERE id = :id', { id: it.dish_id });
              n = dish?.nutrition ? JSON.parse(dish.nutrition) : null;
            }
            if (n) {
              const qty = Number(it.quantity || 1);
              dayCalories += Number(n.calories || 0) * qty;
              dayProtein += Number(n.protein || 0) * qty;
              dayFat += Number(n.fat || 0) * qty;
              dayCarbs += Number(n.carbs || 0) * qty;
              dayFiber += Number(n.fiber || 0) * qty;
              dayCalcium += Number(n.calcium || 0) * qty;
              dayVitaminC += Number(n.vitaminC || n.vitamin_c || 0) * qty;
              dayIron += Number(n.iron || 0) * qty;
            }
          }
        }

        // 从饮食记录获取营养数据
        const dietaryRecords = await db.all(
          `SELECT nutrition, quantity FROM dietary_records WHERE client_id = :client_id AND record_date = :date`,
          { client_id: clientId, date: label }
        );
        for (const dr of dietaryRecords) {
          const n = dr.nutrition ? JSON.parse(dr.nutrition) : {};
          const qty = Number(dr.quantity || 1);
          dayCalories += Number(n.calories || 0) * qty;
          dayProtein += Number(n.protein || 0) * qty;
          dayFat += Number(n.fat || 0) * qty;
          dayCarbs += Number(n.carbs || 0) * qty;
          dayFiber += Number(n.fiber || 0) * qty;
          dayCalcium += Number(n.calcium || 0) * qty;
          dayVitaminC += Number(n.vitaminC || n.vitamin_c || 0) * qty;
          dayIron += Number(n.iron || 0) * qty;
        }
      }

      calories.push(dayCalories);
      protein.push(dayProtein);
      fat.push(dayFat);
      carbs.push(dayCarbs);
      fiber.push(dayFiber);
      calcium.push(dayCalcium);
      vitaminC.push(dayVitaminC);
      iron.push(dayIron);
    }

    // 计算汇总
    const totalCalories = calories.reduce((a, b) => a + b, 0);
    const totalProtein = protein.reduce((a, b) => a + b, 0);
    const totalFat = fat.reduce((a, b) => a + b, 0);
    const totalCarbs = carbs.reduce((a, b) => a + b, 0);
    const totalFiber = fiber.reduce((a, b) => a + b, 0);
    const totalCalcium = calcium.reduce((a, b) => a + b, 0);
    const totalVitaminC = vitaminC.reduce((a, b) => a + b, 0);
    const totalIron = iron.reduce((a, b) => a + b, 0);

    const summary = {
      calories: totalCalories,
      protein: totalProtein,
      fat: totalFat,
      carbs: totalCarbs,
      fiber: totalFiber,
      calcium: totalCalcium,
      vitaminC: totalVitaminC,
      iron: totalIron
    };

    const targetDays = calories.filter(cal => cal >= dailyTarget * 0.8 && cal <= dailyTarget * 1.2).length;
    const avgDailyCalories = totalCalories / 30;
    const targetAchievement = dailyTarget > 0 ? Math.round((avgDailyCalories / dailyTarget) * 100) : 0;
    const totalTarget = dailyTarget * 30;
    const calorieDeficit = Math.max(0, (totalTarget - totalCalories) / 7700);
    const calorieChange = 0;

    // 计算营养进度百分比
    const caloriesTarget = 2000; // kcal/day
    const proteinTarget = 60; // g/day
    const fatTarget = 65; // g/day
    const carbsTarget = 250; // g/day
    const fiberTarget = 25; // g/day
    const calciumTarget = 800; // mg/day
    const vitaminCTarget = 100; // mg/day
    const ironTarget = 15; // mg/day

    const caloriesProgress = caloriesTarget > 0 ? Math.min(100, Math.round((summary.calories / 30 / caloriesTarget) * 100)) : 0;
    const proteinProgress = proteinTarget > 0 ? Math.min(100, Math.round((summary.protein / 30 / proteinTarget) * 100)) : 0;
    const fatProgress = fatTarget > 0 ? Math.min(100, Math.round((summary.fat / 30 / fatTarget) * 100)) : 0;
    const carbsProgress = carbsTarget > 0 ? Math.min(100, Math.round((summary.carbs / 30 / carbsTarget) * 100)) : 0;
    const fiberProgress = fiberTarget > 0 ? Math.min(100, Math.round((summary.fiber / 30 / fiberTarget) * 100)) : 0;
    const calciumProgress = calciumTarget > 0 ? Math.min(100, Math.round((summary.calcium / 30 / calciumTarget) * 100)) : 0;
    const vitaminCProgress = vitaminCTarget > 0 ? Math.min(100, Math.round((summary.vitaminC / 30 / vitaminCTarget) * 100)) : 0;
    const ironProgress = ironTarget > 0 ? Math.min(100, Math.round((summary.iron / 30 / ironTarget) * 100)) : 0;

    // 统计新尝试的菜品数
    const uniqueDishes = await db.all(
      `SELECT COUNT(DISTINCT oi.dish_id) as count
       FROM order_items oi
       JOIN orders ord ON ord.id = oi.order_id
       WHERE ord.client_id = :client_id 
       AND date(ord.created_at) >= date('now', '-30 days')
       AND ord.status IN ('placed','preparing','delivering','delivered')`,
      { client_id: clientId }
    );
    const newDishes = uniqueDishes[0]?.count || 0;

    const diversity = Math.min(100, Math.round((newDishes / 30) * 100 * 2));

    const insight = avgDailyCalories > 0
      ? `本月日均摄入热量为 ${Math.round(avgDailyCalories)} kcal，目标达成率为 ${targetAchievement}%。本月共尝试了 ${newDishes}种不同菜品，饮食多样性得分为 ${diversity}%。${fiberProgress >= 80 ? '膳食纤维摄入充足，' : '建议增加膳食纤维摄入，'}${proteinProgress >= 80 ? '蛋白质摄入良好。' : '蛋白质摄入有待提升。'}`
      : '';

    const achievements = [];
    if (avgDailyCalories > 0) {
      if (targetDays >= 25) achievements.push(`本月有 ${targetDays} 天达到了热量目标`);
      if (fiberProgress >= 90) achievements.push('膳食纤维摄入量达到推荐标准的 90% 以上');
      if (proteinProgress >= 85) achievements.push('蛋白质摄入量达到推荐标准的 85% 以上');
      if (newDishes >= 20) achievements.push(`本月尝试了 ${newDishes} 种不同菜品，饮食多样化表现优秀`);
    }

    const aiAnalysis = avgDailyCalories > 0
      ? `根据本月的饮食数据分析，日均热量摄入为 ${Math.round(avgDailyCalories)} kcal，${targetAchievement >= 80 && targetAchievement <= 120 ? '基本符合' : targetAchievement < 80 ? '略低于' : '略高于'}推荐目标。${fiberProgress >= 80 ? '膳食纤维摄入充足，' : '建议增加深绿色蔬菜、全谷物和豆类食品的摄入以提高膳食纤维。'}${proteinProgress >= 80 ? '蛋白质摄入良好，' : '建议适当增加优质蛋白质来源如鱼类、禽肉、豆类。'}保持营养均衡，适当运动，有助于维持健康。`
      : '';

    const latest = await db.get(
      `SELECT * FROM nutrition_reports 
       WHERE client_id = :client_id AND type = 'month' 
       ORDER BY created_at DESC LIMIT 1`,
      { client_id: clientId }
    );

    const recommendations = latest?.recommendations || '';

    const report = {
      type: 'month',
      summary,
      recommendations,
      days,
      calories,
      protein,
      fat,
      carbs,
      fiber,
      avg_daily_calories: avgDailyCalories,
      calorie_target_achievement: targetAchievement,
      calorie_change: calorieChange,
      calorie_deficit: Math.round(calorieDeficit * 10) / 10,
      target_days: targetDays,
      new_dishes: newDishes,
      diversity,
      insight,
      achievements,
      ai_analysis: aiAnalysis,
      calories_progress: caloriesProgress,
      protein_progress: proteinProgress,
      fat_progress: fatProgress,
      carbs_progress: carbsProgress,
      fiber_progress: fiberProgress,
      calcium_progress: calciumProgress,
      vitamin_c_progress: vitaminCProgress,
      iron_progress: ironProgress
    };

    return success(res, { report });
  } catch (error) {
    console.error('月报生成错误:', error);
    return failure(res, '生成月报失败: ' + error.message, 500);
  }
});

router.get('/notifications', async (req, res) => {
  const rows = await db.all('SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 50', { user_id: req.user.id });
  return success(res, { notifications: rows });
});

router.get('/search-client', async (req, res) => {
  const keyword = String(req.query.keyword || '').trim();
  if (!keyword) return failure(res, '请输入搜索关键词');
  
  // 根据手机号或身份证搜索client用户（精确匹配），需要返回id_card字段以便前端计算年龄
  const rows = await db.all(
    `SELECT u.id, u.name, u.phone, u.id_card, cp.age, cp.gender
     FROM users u
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     WHERE u.role = 'client' 
     AND (u.phone = :keyword OR u.id_card = :keyword)
     LIMIT 10`,
    { keyword }
  );
  
  if (rows.length === 0) {
    return failure(res, '未找到该用户，请检查手机号或身份证号是否正确', 404);
  }
  
  // 如果只找到一个，直接返回
  if (rows.length === 1) {
    return success(res, { client: rows[0] });
  }
  
  // 如果有多个，返回列表让用户选择
  return success(res, { clients: rows });
});

// 更新用户信息（包括身份证）
// 如果提供了 client_id，则更新被监护人的信息；否则更新监护人自己的信息
router.put('/profile', async (req, res) => {
  const { name, phone, email, id_card, community_id, community_code, address, client_id } = req.body;
  
  // 如果提供了 client_id，更新被监护人的信息
  if (client_id !== undefined) {
    // 检查权限：确保该被监护人与当前监护人已绑定
    const allowed = await db.get(
      'SELECT 1 FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = "active"',
      { guardian_id: req.user.id, client_id: client_id }
    );
    if (!allowed) {
      return failure(res, '无权限更新该被监护人信息', 403);
    }
    
    // 更新被监护人的 users 表字段
    const userUpdates = [];
    const userParams = { user_id: client_id };
    
    if (name !== undefined) {
      userUpdates.push('name = :name');
      userParams.name = name;
    }
    if (phone !== undefined) {
      userUpdates.push('phone = :phone');
      userParams.phone = phone;
    }
    if (email !== undefined) {
      userUpdates.push('email = :email');
      userParams.email = email;
    }
    if (id_card !== undefined) {
      userUpdates.push('id_card = :id_card');
      userParams.id_card = id_card;
      userUpdates.push('id_verified = 1');
    }
    if (community_id !== undefined) {
      userUpdates.push('community_id = :community_id');
      userParams.community_id = community_id;
    }
    if (community_code !== undefined) {
      userUpdates.push('community_code = :community_code');
      userParams.community_code = community_code;
    }
    
    if (userUpdates.length > 0) {
      userUpdates.push('updated_at = CURRENT_TIMESTAMP');
      await db.run(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = :user_id`,
        userParams
      );
    }
    
    // 更新被监护人的 client_profiles 表字段
    const profileUpdates = [];
    const profileParams = { user_id: client_id };
    
    // 先获取现有的 client_profiles 记录
    const existingProfile = await db.get('SELECT id, address FROM client_profiles WHERE user_id = :user_id', { user_id: client_id });
    
    if (address !== undefined) {
      // 统一处理：将 null 和空字符串都视为空值
      const existingAddress = (existingProfile?.address || '').trim();
      const newAddress = (address || '').trim();
      
      // 只有当地址确实发生变化时才更新
      if (existingAddress !== newAddress) {
        profileUpdates.push('address = :address');
        profileParams.address = newAddress || null; // 空字符串转换为 null
      }
    }
    
    if (profileUpdates.length > 0) {
      if (existingProfile) {
        // 如果记录已存在，更新它
        profileUpdates.push('updated_at = CURRENT_TIMESTAMP');
        await db.run(
          `UPDATE client_profiles SET ${profileUpdates.join(', ')} WHERE user_id = :user_id`,
          profileParams
        );
      } else {
        // 如果不存在，创建记录
        // 提取字段名（例如从 'address = :address' 中提取 'address'）
        const fieldParts = profileUpdates.map(u => {
          const parts = u.split(' = ');
          return { field: parts[0], placeholder: parts[1] };
        });
        const insertFields = ['user_id', ...fieldParts.map(p => p.field), 'updated_at'];
        const insertPlaceholders = [':user_id', ...fieldParts.map(p => p.placeholder), 'CURRENT_TIMESTAMP'];
        await db.run(
          `INSERT INTO client_profiles (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`,
          profileParams
        );
      }
    }
    
    // 如果没有更新任何字段，检查是否有尝试更新的字段
    if (userUpdates.length === 0 && profileUpdates.length === 0) {
      // 如果有尝试更新地址但地址未变化，应该返回成功（因为用户期望的状态已经满足）
      if (address !== undefined && client_id !== undefined) {
        const existingAddress = (existingProfile?.address || '').trim();
        const newAddress = (address || '').trim();
        console.log('[guardian/profile] 被监护人地址未变化，但返回成功:', { 
          clientId: client_id,
          existingAddress, 
          newAddress, 
          existingProfileExists: !!existingProfile,
          areEqual: existingAddress === newAddress 
        });
        
        // 地址未变化，但应该返回成功，因为用户期望的状态已经满足
        // 返回更新后的被监护人信息
        const client = await db.get(
          `SELECT u.id, u.username, u.name, u.role, u.phone, u.email, u.avatar, u.id_card, u.id_verified, u.community_id, u.community_code, u.preferences,
                  cp.age, cp.gender, cp.address, cp.chronic_conditions, cp.taste_preferences, cp.elder_mode
           FROM users u
           LEFT JOIN client_profiles cp ON cp.user_id = u.id
           WHERE u.id = :user_id`,
          { user_id: client_id }
        );
        
        return success(res, {
          user: {
            ...client,
            id_verified: !!client.id_verified,
            preferences: client.preferences ? JSON.parse(client.preferences) : {},
            address: client.address || null
          }
        }, '信息已是最新');
      }
      
      // 其他情况，如果没有要更新的字段，返回错误
      return failure(res, '没有要更新的字段');
    }
    
    // 返回更新后的被监护人信息
    const client = await db.get(
      `SELECT u.id, u.username, u.name, u.role, u.phone, u.email, u.avatar, u.id_card, u.id_verified, u.community_id, u.community_code, u.preferences,
              cp.age, cp.gender, cp.address, cp.chronic_conditions, cp.taste_preferences, cp.elder_mode
       FROM users u
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.id = :user_id`,
      { user_id: client_id }
    );
    
    return success(res, {
      user: {
        ...client,
        id_verified: !!client.id_verified,
        preferences: client.preferences ? JSON.parse(client.preferences) : {},
        address: client.address || null
      }
    }, '信息已更新');
  }
  
  // 更新监护人自己的信息
  const updates = [];
  const params = { user_id: req.user.id };
  
  if (name !== undefined) {
    updates.push('name = :name');
    params.name = name;
  }
  if (phone !== undefined) {
    updates.push('phone = :phone');
    params.phone = phone;
  }
  if (email !== undefined) {
    updates.push('email = :email');
    params.email = email;
  }
  if (id_card !== undefined) {
    updates.push('id_card = :id_card');
    params.id_card = id_card;
    // 如果提供了身份证，自动设置为已认证状态
    updates.push('id_verified = 1');
  }
  if (community_id !== undefined) {
    updates.push('community_id = :community_id');
    params.community_id = community_id;
  }
  if (community_code !== undefined) {
    updates.push('community_code = :community_code');
    params.community_code = community_code;
  }
  
  // 更新 users 表
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = :user_id`,
      params
    );
  }
  
  // 更新 guardian_profiles 表的 address 字段
  const profileUpdates = [];
  const profileParams = { user_id: req.user.id };
  
  // 先获取现有的 guardian_profiles 记录
  const existingProfile = await db.get('SELECT id, address FROM guardian_profiles WHERE user_id = :user_id', { user_id: req.user.id });
  
  if (address !== undefined) {
    // 统一处理：将 null 和空字符串都视为空值
    const existingAddress = (existingProfile?.address || '').trim();
    const newAddress = (address || '').trim();
    
    // 只有当地址确实发生变化时才更新
    if (existingAddress !== newAddress) {
      profileUpdates.push('address = :address');
      profileParams.address = newAddress || null; // 空字符串转换为 null
    }
  }
  
  if (profileUpdates.length > 0) {
    if (existingProfile) {
      // 如果记录已存在，更新它
      profileUpdates.push('updated_at = CURRENT_TIMESTAMP');
      await db.run(
        `UPDATE guardian_profiles SET ${profileUpdates.join(', ')} WHERE user_id = :user_id`,
        profileParams
      );
    } else {
      // 如果不存在，创建记录
      const fieldParts = profileUpdates.map(u => {
        const parts = u.split(' = ');
        return { field: parts[0], placeholder: parts[1] };
      });
      const insertFields = ['user_id', ...fieldParts.map(p => p.field), 'updated_at'];
      const insertPlaceholders = [':user_id', ...fieldParts.map(p => p.placeholder), 'CURRENT_TIMESTAMP'];
      await db.run(
        `INSERT INTO guardian_profiles (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`,
        profileParams
      );
    }
  }
  
  // 如果没有更新任何字段，检查是否有尝试更新的字段
  if (updates.length === 0 && profileUpdates.length === 0) {
    // 如果有尝试更新地址但地址未变化，应该返回成功（因为用户期望的状态已经满足）
    if (address !== undefined) {
      const existingAddress = (existingProfile?.address || '').trim();
      const newAddress = (address || '').trim();
      console.log('[guardian/profile] 地址未变化，但返回成功:', { 
        existingAddress, 
        newAddress, 
        existingProfileExists: !!existingProfile,
        areEqual: existingAddress === newAddress 
      });
      
      // 地址未变化，但应该返回成功，因为用户期望的状态已经满足
      // 获取当前的用户信息和profile信息返回
      const user = await db.get(
        'SELECT id, username, name, role, phone, email, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :user_id',
        { user_id: req.user.id }
      );
      
      const guardianProfile = await db.get('SELECT address FROM guardian_profiles WHERE user_id = :user_id', { user_id: req.user.id });
      
      return success(res, { 
        user: {
          ...user,
          id_verified: !!user.id_verified,
          preferences: user.preferences ? JSON.parse(user.preferences) : {},
          address: guardianProfile?.address ?? null
        }
      }, '信息已是最新');
    }
    
    // 其他情况，如果没有要更新的字段，返回错误
    return failure(res, '没有要更新的字段');
  }
  
  // 获取更新后的用户信息和profile信息
  const user = await db.get(
    'SELECT id, username, name, role, phone, email, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :user_id',
    { user_id: req.user.id }
  );
  
  const guardianProfile = await db.get('SELECT address FROM guardian_profiles WHERE user_id = :user_id', { user_id: req.user.id });
  
  return success(res, { 
    user: {
      ...user,
      id_verified: !!user.id_verified,
      preferences: user.preferences ? JSON.parse(user.preferences) : {},
      address: guardianProfile?.address || null
    }
  }, '信息已更新');
});

module.exports = router;
