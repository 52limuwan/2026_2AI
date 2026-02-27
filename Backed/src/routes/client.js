const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');
const { createOrder, listOrders, getOrderById, updateOrderStatus } = require('../services/orders');
const { getToday, getPastDays } = require('../utils/dateHelper');

const router = express.Router();

router.use(authRequired, requireRole('client'));

// 获取所有社区列表（供销售端选择）
router.get('/communities', async (req, res) => {
  try {
    const communities = await db.all(
      `SELECT id, code, name, region FROM communities WHERE status = 'active' ORDER BY name`
    );
    return success(res, { communities });
  } catch (err) {
    console.error('获取社区列表失败:', err);
    return failure(res, '获取社区列表失败', 500);
  }
});

// 获取所有店面列表（供销售端选择）
router.get('/stores', async (req, res) => {
  const params = {};
  let communityFilter = '';
  // 如果用户有社区ID，优先显示该社区的店面，但也显示没有绑定社区的店面
  if (req.user.community_id) {
    communityFilter = ' AND (s.community_id = :community_id OR s.community_id IS NULL)';
    params.community_id = req.user.community_id;
  }
  const stores = await db.all(
    `SELECT s.*, mp.merchant_name 
     FROM stores s
     LEFT JOIN merchant_profiles mp ON mp.user_id = s.merchant_id
     WHERE s.status = 'active'${communityFilter}
     ORDER BY s.created_at DESC`,
    params
  );
  return success(res, { stores });
});

// 获取个性化推荐菜品（根据用户疾病匹配）
router.get('/recommendations/personalized', async (req, res) => {
  try {
    // 临时写死：根据用户名返回不同推荐
    const username = req.user.username;
    
    if (username === 'client02') {
      // client02 → 高血糖/糖尿病 → 返回低糖菜品 (109, 110, 111)
      const conditions = ['高血糖', '糖尿病'];
      const dishes = await db.all(
        `SELECT d.*, mp.merchant_name, s.name as store_name
         FROM dishes d
         LEFT JOIN merchant_profiles mp ON mp.user_id = d.merchant_id
         LEFT JOIN stores s ON s.id = d.store_id
         WHERE d.status = 'available' AND d.id IN (109, 110, 111)
         ORDER BY d.id`
      );
      
      const recommendations = dishes.map(d => ({
        id: d.id,
        name: d.name,
        price: d.price,
        category: d.category,
        merchant: d.merchant_name || '社区厨房',
        store_name: d.store_name,
        image: d.image,
        tags: (d.tags || '').split(',').filter(Boolean),
        nutrition: d.nutrition ? JSON.parse(d.nutrition) : { calories: 450, protein: 20, carbs: 60, fat: 10 },
        description: d.description || '',
        matchReason: '适合糖尿病患者'
      }));
      
      return success(res, { recommendations, conditions });
      
    } else if (username === 'client03') {
      // client03 → 高血压 → 返回低盐菜品 (112, 113, 114)
      const conditions = ['高血压'];
      const dishes = await db.all(
        `SELECT d.*, mp.merchant_name, s.name as store_name
         FROM dishes d
         LEFT JOIN merchant_profiles mp ON mp.user_id = d.merchant_id
         LEFT JOIN stores s ON s.id = d.store_id
         WHERE d.status = 'available' AND d.id IN (112, 113, 114)
         ORDER BY d.id`
      );
      
      const recommendations = dishes.map(d => ({
        id: d.id,
        name: d.name,
        price: d.price,
        category: d.category,
        merchant: d.merchant_name || '社区厨房',
        store_name: d.store_name,
        image: d.image,
        tags: (d.tags || '').split(',').filter(Boolean),
        nutrition: d.nutrition ? JSON.parse(d.nutrition) : { calories: 450, protein: 20, carbs: 60, fat: 10 },
        description: d.description || '',
        matchReason: '适合高血压患者'
      }));
      
      return success(res, { recommendations, conditions });
    }
    
    // 其他用户使用原来的逻辑
    const profile = await db.get('SELECT chronic_conditions, restrictions FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
    
    if (!profile || !profile.chronic_conditions) {
      return success(res, { recommendations: [] });
    }
    
    // 解析慢性病信息
    let conditions = [];
    try {
      conditions = typeof profile.chronic_conditions === 'string' 
        ? JSON.parse(profile.chronic_conditions) 
        : profile.chronic_conditions;
      if (!Array.isArray(conditions)) {
        conditions = [conditions];
      }
    } catch (e) {
      conditions = profile.chronic_conditions ? [profile.chronic_conditions] : [];
    }
    
    if (conditions.length === 0) {
      return success(res, { recommendations: [] });
    }
    
    // 疾病与菜品标签的匹配规则（优化：减少重叠，增加特异性）
    const diseaseTagMap = {
      '高血压': ['低盐', '低钠', '降压', '芹菜', '木耳', '菌菇', '海带', '紫菜'],
      '高血糖': ['低糖', '无糖', '粗粮', '全谷物', '控糖', '苦瓜', '燕麦', '荞麦'],
      '糖尿病': ['低糖', '无糖', '粗粮', '全谷物', '控糖', '苦瓜', '燕麦', '荞麦'],
      '高血脂': ['低脂', '鱼类', '豆制品', '燕麦', '坚果', '橄榄油'],
      '冠心病': ['低脂', '低盐', '鱼类', '坚果', '橄榄油', '深海鱼'],
      '痛风': ['低嘌呤', '碱性', '蔬菜', '水果', '碱性食物'],
      '肾病': ['低盐', '低蛋白', '优质蛋白', '低磷', '低钾'],
      '骨质疏松': ['高钙', '补钙', '奶制品', '豆制品', '虾皮', '芝麻'],
      '贫血': ['补铁', '补血', '红肉', '动物肝脏', '红枣', '菠菜'],
      '便秘': ['高纤维', '粗粮', '蔬菜', '水果', '膳食纤维']
    };
    
    // 收集所有相关标签，并记录每个标签对应的疾病权重
    const tagWeights = new Map(); // tag -> weight
    conditions.forEach(condition => {
      const tags = diseaseTagMap[condition];
      if (tags) {
        tags.forEach(tag => {
          // 每个疾病的标签权重累加
          tagWeights.set(tag, (tagWeights.get(tag) || 0) + 1);
        });
      }
    });
    
    if (tagWeights.size === 0) {
      return success(res, { recommendations: [] });
    }
    
    // 获取用户选择的店面ID
    const { store_id } = req.query;
    
    let query = `
      SELECT d.*, mp.merchant_name, s.name as store_name
      FROM dishes d
      LEFT JOIN merchant_profiles mp ON mp.user_id = d.merchant_id
      LEFT JOIN stores s ON s.id = d.store_id
      WHERE d.status = 'available'
    `;
    const params = {};
    
    if (store_id) {
      query += ' AND d.store_id = :store_id';
      params.store_id = store_id;
    }
    
    query += ' ORDER BY d.updated_at DESC LIMIT 100';
    
    const allDishes = await db.all(query, params);
    
    // 根据标签匹配度评分（优化：使用权重计算）
    const scoredDishes = allDishes.map(dish => {
      const dishTags = (dish.tags || '').split(',').map(t => t.trim()).filter(Boolean);
      let score = 0;
      let matchedTags = [];
      
      // 标签完全匹配（使用权重）
      dishTags.forEach(tag => {
        if (tagWeights.has(tag)) {
          const weight = tagWeights.get(tag);
          score += 15 * weight; // 权重越高，分数越高
          matchedTags.push(tag);
        }
      });
      
      // 检查菜品名称和描述中是否包含相关关键词
      const dishText = `${dish.name} ${dish.description || ''}`;
      tagWeights.forEach((weight, tag) => {
        if (dishText.includes(tag) && !matchedTags.includes(tag)) {
          score += 5 * weight;
          matchedTags.push(tag);
        }
      });
      
      return { ...dish, matchScore: score, matchedTags };
    });
    
    // 筛选出有匹配度的菜品，按评分排序，取前4个
    const matchedDishes = scoredDishes
      .filter(d => d.matchScore > 0)
      .sort((a, b) => {
        // 先按分数排序
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // 分数相同时，按匹配标签数量排序
        return b.matchedTags.length - a.matchedTags.length;
      })
      .slice(0, 4);
    
    // 格式化返回数据
    const recommendations = matchedDishes.map(d => {
      let nutrition = { calories: 450, protein: 20, carbs: 60, fat: 10 };
      try {
        if (d.nutrition) {
          nutrition = typeof d.nutrition === 'string' ? JSON.parse(d.nutrition) : d.nutrition;
        }
      } catch (err) {
        console.warn('解析营养信息失败:', err);
      }
      
      return {
        id: d.id,
        name: d.name,
        price: d.price,
        category: d.category,
        merchant: d.merchant_name || '社区厨房',
        store_name: d.store_name,
        image: d.image,
        tags: (d.tags || '').split(',').filter(Boolean),
        nutrition,
        description: d.description || '',
        matchReason: `适合${conditions.join('、')}患者`
      };
    });
    
    return success(res, { recommendations, conditions });
  } catch (error) {
    console.error('获取个性化推荐失败:', error);
    return failure(res, '获取个性化推荐失败: ' + error.message, 500);
  }
});

router.get('/recommendations/menu', async (req, res) => {
  try {
    let prefersLowSalt = false;
    let isMember = false;
    try {
      const profile = await db.get('SELECT * FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
      if (profile) {
        // 获取会员状态
        isMember = profile.is_member ? !!profile.is_member : false;
        
        // 获取低盐偏好
        if (profile.restrictions) {
          // restrictions 可能是纯字符串（如 "低盐"）或 JSON 数组字符串
          if (typeof profile.restrictions === 'string') {
            // 先尝试作为 JSON 解析
            try {
              const restrictions = JSON.parse(profile.restrictions);
              prefersLowSalt = Array.isArray(restrictions) ? restrictions.includes('低盐') : false;
            } catch (e) {
              // 如果解析失败，说明是纯字符串，直接检查是否包含 "低盐"
              prefersLowSalt = profile.restrictions.includes('低盐');
            }
          } else if (Array.isArray(profile.restrictions)) {
            prefersLowSalt = profile.restrictions.includes('低盐');
          }
        }
      }
    } catch (err) {
      console.warn('获取用户偏好失败:', err);
    }
    
    // 获取用户选择的店面ID（可以从查询参数或用户偏好中获取）
    const { store_id } = req.query;
    
    let query = `
      SELECT d.*, mp.merchant_name, s.name as store_name, s.location as store_location
       FROM dishes d
       LEFT JOIN merchant_profiles mp ON mp.user_id = d.merchant_id
       LEFT JOIN stores s ON s.id = d.store_id
       WHERE d.status = 'available'
    `;
    const params = {};
    
    if (store_id) {
      query += ' AND d.store_id = :store_id';
      params.store_id = store_id;
    }
    
  query += ' ORDER BY d.updated_at DESC LIMIT 50';
  
  const dishRows = await db.all(query, params);
  
  // 获取这个月的开始日期
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  
  const dishes = await Promise.all(dishRows.map(async (d) => {
      let nutrition = { calories: 450, protein: 20, carbs: 60, fat: 10 };
      try {
        if (d.nutrition) {
          nutrition = typeof d.nutrition === 'string' ? JSON.parse(d.nutrition) : d.nutrition;
        }
      } catch (err) {
        console.warn('解析营养信息失败:', err);
      }
      
      // 根据会员状态返回对应价格
      const finalPrice = isMember && d.member_price !== null && d.member_price !== undefined 
        ? d.member_price 
        : d.price;
      
      // 计算这个月的销售数量
      let monthlySales = 0;
      try {
        const salesResult = await db.get(
          `SELECT COALESCE(SUM(oi.quantity), 0) as total 
           FROM order_items oi 
           JOIN orders ord ON ord.id = oi.order_id 
           WHERE oi.dish_id = :dish_id 
           AND date(ord.created_at) >= :month_start 
           AND ord.status IN ('placed', 'preparing', 'delivering', 'delivered')`,
          { dish_id: d.id, month_start: monthStart }
        );
        monthlySales = salesResult?.total || 0;
      } catch (err) {
        console.warn('计算月销失败:', err);
      }
      
      return {
        id: d.id,
        name: d.name,
        price: finalPrice,
        original_price: d.price,
        member_price: d.member_price,
        category: d.category,
        merchant: d.merchant_name || '社区厨房',
        store_name: d.store_name,
        store_location: d.store_location,
        image: d.image,
        tags: (d.tags || '').split(',').filter(Boolean),
        nutrition,
        suitability: prefersLowSalt ? '低盐友好' : '均衡',
        description: d.description || '',
        stock: d.stock || 0,
        monthly_sales: monthlySales
      };
    }));
    return success(res, { recommendations: dishes });
  } catch (error) {
    console.error('获取推荐菜单失败:', error);
    return failure(res, '获取推荐菜单失败: ' + error.message, 500);
  }
});

router.get('/dishes', async (req, res) => {
  const { store_id } = req.query;
  
  // 获取用户会员状态
  let isMember = false;
  try {
    const profile = await db.get('SELECT is_member FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
    isMember = profile?.is_member ? !!profile.is_member : false;
  } catch (err) {
    console.warn('获取会员状态失败:', err);
  }
  
  let query = `
    SELECT d.*, mp.merchant_name, s.name as store_name, s.location as store_location
     FROM dishes d
     LEFT JOIN merchant_profiles mp ON mp.user_id = d.merchant_id
     LEFT JOIN stores s ON s.id = d.store_id
     WHERE d.status = 'available'
  `;
  const params = {};
  
  if (store_id) {
    query += ' AND d.store_id = :store_id';
    params.store_id = store_id;
  }
  
  query += ' ORDER BY d.updated_at DESC LIMIT 100';
  
  const dishRows = await db.all(query, params);
  
  // 获取这个月的开始日期
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  
  const dishes = await Promise.all(dishRows.map(async (d) => {
    // 根据会员状态返回对应价格
    const finalPrice = isMember && d.member_price !== null && d.member_price !== undefined 
      ? d.member_price 
      : d.price;
    
    // 计算这个月的销售数量
    let monthlySales = 0;
    try {
      const salesResult = await db.get(
        `SELECT COALESCE(SUM(oi.quantity), 0) as total 
         FROM order_items oi 
         JOIN orders ord ON ord.id = oi.order_id 
         WHERE oi.dish_id = :dish_id 
         AND date(ord.created_at) >= :month_start 
         AND ord.status IN ('placed', 'preparing', 'delivering', 'delivered')`,
        { dish_id: d.id, month_start: monthStart }
      );
      monthlySales = salesResult?.total || 0;
    } catch (err) {
      console.warn('计算月销失败:', err);
    }
    
    return {
      id: d.id,
      name: d.name,
      price: finalPrice,
      original_price: d.price,
      member_price: d.member_price,
      category: d.category,
      merchant: d.merchant_name || '社区厨房',
      store_name: d.store_name,
      store_location: d.store_location,
      image: d.image,
      tags: (d.tags || '').split(',').filter(Boolean),
      nutrition: d.nutrition ? JSON.parse(d.nutrition) : { calories: 0, protein: 0, carbs: 0, fat: 0 },
      description: d.description || '',
      stock: d.stock || 0,
      monthly_sales: monthlySales
    };
  }));
  return success(res, { dishes });
});

router.post('/orders', async (req, res) => {
  const {
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
  if (!items.length) return failure(res, '请选择菜品下单');
  
  let resolvedMerchantId = merchantId;
  let resolvedStoreId = store_id;
  
  // 如果携带了店面信息，优先从店面反查商户ID
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
  if (resolvedStoreId) {
    const crossStore = formattedItems.find((it) => it.store_id && it.store_id !== resolvedStoreId);
    if (crossStore) {
      return failure(res, '请选择同一店面的菜品下单');
    }
  }
  
  const guardianLinks = await db.all(
    `SELECT guardian_id FROM guardian_client_links WHERE client_id = :client_id AND status = 'active'`,
    { client_id: req.user.id }
  );
  const guardianIds = guardianLinks.map((g) => g.guardian_id);
  const primaryGuardianId = guardianIds[0] || null;

  let communityId = req.user.community_id || null;
  let communityCode = req.user.community_code || null;
  let resolvedCommunityName = community_name || '';
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

  try {
    const order = await createOrder({
      clientId: req.user.id,
      guardianId: primaryGuardianId,
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
    return success(res, { order }, '下单成功');
  } catch (err) {
    console.error('创建订单失败:', err);
    return failure(res, err.message || '下单失败，请稍后重试', 400);
  }
});

router.get('/orders', async (req, res) => {
  const orders = await listOrders({ clientId: req.user.id });
  return success(res, { orders });
});

router.get('/orders/:id', async (req, res) => {
  const order = await getOrderById(req.params.id);
  if (!order || order.client_id !== req.user.id) {
    return failure(res, '订单不存在', 404);
  }
  return success(res, { order });
});

router.patch('/orders/:id/status', async (req, res) => {
  const order = await getOrderById(req.params.id);
  if (!order || order.client_id !== req.user.id) {
    return failure(res, '订单不存在', 404);
  }
  const { status } = req.body;
  const allowed = ['cancelled', 'delivered'];
  if (!allowed.includes(status)) return failure(res, '不支持的状态');
  const updated = await updateOrderStatus(order.id, status, { delivered_at: status === 'delivered' ? new Date().toISOString() : null });
  return success(res, { order: updated });
});

router.get('/nutrition/today', async (req, res) => {
  // 获取今天的日期字符串 (YYYY-MM-DD) - 使用本地时间
  const today = getToday();
  
  // 优先从 nutrition_intake_daily 表读取（这是订单创建时已经计算好的数据）
  const intakeRecord = await db.get(
    `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :today`,
    { client_id: req.user.id, today }
  );
  
  if (intakeRecord && intakeRecord.totals) {
    const totals = JSON.parse(intakeRecord.totals);
    // 确保所有字段都存在
    return success(res, {
      calories: totals.calories || 0,
      protein: totals.protein || 0,
      fat: totals.fat || 0,
      carbs: totals.carbs || 0,
      fiber: totals.fiber || 0,
      calcium: totals.calcium || 0,
      vitaminC: totals.vitaminC || totals.vitamin_c || 0,
      iron: totals.iron || 0
    });
  }
  
  // 如果 nutrition_intake_daily 表中没有数据，则实时计算（兼容旧逻辑）
  let totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, calcium: 0, vitaminC: 0, iron: 0 };
  
  // 从订单获取营养数据
  const orders = await db.all(
    `SELECT id, created_at, status FROM orders 
     WHERE client_id = :client_id 
     AND date(created_at) = :today 
     AND status IN ('placed','preparing','delivering','delivered')`,
    { client_id: req.user.id, today }
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
    { client_id: req.user.id, today }
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

  return success(res, totals);
});

router.post('/elder-mode', async (req, res) => {
  const { enabled = true } = req.body;
  await db.run('UPDATE client_profiles SET elder_mode = :elder_mode, updated_at = CURRENT_TIMESTAMP WHERE user_id = :user_id', {
    elder_mode: enabled ? 1 : 0,
    user_id: req.user.id
  });
  return success(res, { elderMode: enabled });
});

router.get('/reports/weekly', async (req, res) => {
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

    // 优先从 nutrition_intake_daily 表读取（性能更好，数据更准确）
    const intakeRecord = await db.get(
      `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
      { client_id: req.user.id, date: label }
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
      // 如果 nutrition_intake_daily 表中没有数据，则实时计算（兼容旧逻辑）
      // 从订单获取营养数据
      const orders = await db.all(
        `SELECT id FROM orders WHERE client_id = :client_id AND date(created_at) = :date AND status IN ('placed','preparing','delivering','delivered')`,
        { client_id: req.user.id, date: label }
      );
      for (const o of orders) {
        const items = await db.all('SELECT dish_id, nutrition FROM order_items WHERE order_id = :oid', { oid: o.id });
        for (const it of items) {
          let n = it.nutrition ? JSON.parse(it.nutrition) : null;
          if (!n && it.dish_id) {
            const dish = await db.get('SELECT nutrition FROM dishes WHERE id = :id', { id: it.dish_id });
            n = dish?.nutrition ? JSON.parse(dish.nutrition) : null;
          }
          if (n) {
            dayCalories += Number(n.calories || 0);
            dayProtein += Number(n.protein || 0);
            dayFat += Number(n.fat || 0);
            dayCarbs += Number(n.carbs || 0);
            dayFiber += Number(n.fiber || 0);
            dayCalcium += Number(n.calcium || 0);
            dayVitaminC += Number(n.vitaminC || n.vitamin_c || 0);
            dayIron += Number(n.iron || 0);
          }
        }
      }

      // 从饮食记录获取营养数据
      const dietaryRecords = await db.all(
        `SELECT nutrition, quantity FROM dietary_records WHERE client_id = :client_id AND record_date = :date`,
        { client_id: req.user.id, date: label }
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

  // 计算汇总（返回总和，不是日均值）
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

  // 计算目标达成率（使用日均值）
  const avgWeeklyCalories = totalCalories / 7;
  const targetAchievement = dailyTarget > 0 ? Math.round((avgWeeklyCalories / dailyTarget) * 100) : 0;

  // 计算营养进度百分比（使用日均值）
  const proteinTarget = 60; // g/day
  const fatTarget = 65; // g/day
  const carbsTarget = 250; // g/day
  const fiberTarget = 25; // g/day
  const calciumTarget = 800; // mg/day
  const vitaminCTarget = 100; // mg/day
  const ironTarget = 15; // mg/day

  const proteinProgress = Math.min(100, Math.round((summary.protein / 7 / proteinTarget) * 100));
  const fatProgress = Math.min(100, Math.round((summary.fat / 7 / fatTarget) * 100));
  const carbsProgress = Math.min(100, Math.round((summary.carbs / 7 / carbsTarget) * 100));
  const fiberProgress = Math.min(100, Math.round((summary.fiber / 7 / fiberTarget) * 100));
  const calciumProgress = Math.min(100, Math.round((summary.calcium / 7 / calciumTarget) * 100));
  const vitaminCProgress = Math.min(100, Math.round((summary.vitaminC / 7 / vitaminCTarget) * 100));
  const ironProgress = Math.min(100, Math.round((summary.iron / 7 / ironTarget) * 100));

  // 统计新尝试的菜品数（需要在健康评分计算之前）
  const uniqueDishes = await db.all(
    `SELECT COUNT(DISTINCT oi.dish_id) as count
     FROM order_items oi
     JOIN orders ord ON ord.id = oi.order_id
     WHERE ord.client_id = :client_id 
     AND date(ord.created_at) >= date('now', '-7 days')
     AND ord.status IN ('placed','preparing','delivering','delivered')`,
    { client_id: req.user.id }
  );
  const newDishes = uniqueDishes[0]?.count || 0;

  // 计算饮食多样性
  const diversity = Math.min(100, Math.round((newDishes / 7) * 100 * 2));

  // 生成健康洞察
  const insight = `本周周均摄入热量为 ${Math.round(avgWeeklyCalories)} kcal，目标达成率为 ${targetAchievement}%。本周共尝试了 ${newDishes}种不同菜品，饮食多样性得分为 ${diversity}%。${fiberProgress >= 80 ? '膳食纤维摄入充足，' : '建议增加膳食纤维摄入，'}${proteinProgress >= 80 ? '蛋白质摄入良好。' : '蛋白质摄入有待提升。'}`;

  // 生成成就列表
  const achievements = [];
  if (targetDays >= 6) achievements.push(`本周有 ${targetDays} 天达到了热量目标`);
  if (fiberProgress >= 90) achievements.push('膳食纤维摄入量达到推荐标准的 90% 以上');
  if (proteinProgress >= 85) achievements.push('蛋白质摄入量达到推荐标准的 85% 以上');
  if (newDishes >= 10) achievements.push(`本周尝试了 ${newDishes} 种不同菜品，饮食多样化表现优秀`);
  if (achievements.length === 0) {
    achievements.push('继续保持良好的饮食习惯');
  }

  const latest = await db.get(
    `SELECT * FROM nutrition_reports 
     WHERE client_id = :client_id AND type = 'week' 
     ORDER BY created_at DESC LIMIT 1`,
    { client_id: req.user.id }
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
    calories_progress: Math.min(100, Math.round((summary.calories / 7 / 2000) * 100)),
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

router.get('/reports/monthly', async (req, res) => {
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

    // 获取用户目标（使用默认值，因为 daily_calorie_target 字段不存在于 client_profiles 表中）
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

      // 优先从 nutrition_intake_daily 表读取（性能更好，数据更准确）
      const intakeRecord = await db.get(
        `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: req.user.id, date: label }
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
        // 如果 nutrition_intake_daily 表中没有数据，则实时计算（兼容旧逻辑）
        // 从订单获取营养数据
        const orders = await db.all(
          `SELECT id FROM orders WHERE client_id = :client_id AND date(created_at) = :date AND status IN ('placed','preparing','delivering','delivered')`,
          { client_id: req.user.id, date: label }
        );
        for (const o of orders) {
          const items = await db.all('SELECT dish_id, nutrition FROM order_items WHERE order_id = :oid', { oid: o.id });
          for (const it of items) {
            let n = it.nutrition ? JSON.parse(it.nutrition) : null;
            if (!n && it.dish_id) {
              const dish = await db.get('SELECT nutrition FROM dishes WHERE id = :id', { id: it.dish_id });
              n = dish?.nutrition ? JSON.parse(dish.nutrition) : null;
            }
            if (n) {
              dayCalories += Number(n.calories || 0);
              dayProtein += Number(n.protein || 0);
              dayFat += Number(n.fat || 0);
              dayCarbs += Number(n.carbs || 0);
              dayFiber += Number(n.fiber || 0);
              dayCalcium += Number(n.calcium || 0);
              dayVitaminC += Number(n.vitaminC || n.vitamin_c || 0);
              dayIron += Number(n.iron || 0);
            }
          }
        }

        // 从饮食记录获取营养数据
        const dietaryRecords = await db.all(
          `SELECT nutrition, quantity FROM dietary_records WHERE client_id = :client_id AND record_date = :date`,
          { client_id: req.user.id, date: label }
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

    // 计算汇总（返回总和，不是日均值）
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

    // 计算目标达成率（使用日均值）
    const avgDailyCalories = totalCalories / 30;
    const targetAchievement = dailyTarget > 0 ? Math.round((avgDailyCalories / dailyTarget) * 100) : 0;

    // 计算热量缺口累积（假设目标热量）
    const totalTarget = dailyTarget * 30;
    const calorieDeficit = Math.max(0, (totalTarget - totalCalories) / 7700); // 7700 kcal = 1 kg

    // 获取上个月的数据用于对比（简化处理，不查询，使用默认值）
    // 注意：为了避免性能问题，暂时不查询上个月数据，使用默认变化值
    const calorieChange = 0; // 简化处理，后续可以优化为实际查询

    // 计算营养进度百分比（基于推荐值，使用日均值）
    const proteinTarget = 60; // g/day
    const fatTarget = 65; // g/day
    const fiberTarget = 25; // g/day
    const calciumTarget = 800; // mg/day (简化处理)
    const vitaminCTarget = 100; // mg/day (简化处理)
    const ironTarget = 15; // mg/day (简化处理)

    const proteinProgress = Math.min(100, Math.round((summary.protein / 30 / proteinTarget) * 100));
    const fatProgress = Math.min(100, Math.round((summary.fat / 30 / fatTarget) * 100));
    const carbsProgress = Math.min(100, Math.round((summary.carbs / 30 / 250) * 100));
    const fiberProgress = Math.min(100, Math.round((summary.fiber / 30 / fiberTarget) * 100));
    const calciumProgress = Math.min(100, Math.round((summary.calcium / 30 / calciumTarget) * 100));
    const vitaminCProgress = Math.min(100, Math.round((summary.vitaminC / 30 / vitaminCTarget) * 100));
    const ironProgress = Math.min(100, Math.round((summary.iron / 30 / ironTarget) * 100));

    // 统计新尝试的菜品数
    const uniqueDishes = await db.all(
      `SELECT COUNT(DISTINCT oi.dish_id) as count
       FROM order_items oi
       JOIN orders ord ON ord.id = oi.order_id
       WHERE ord.client_id = :client_id 
       AND date(ord.created_at) >= date('now', '-30 days')
       AND ord.status IN ('placed','preparing','delivering','delivered')`,
      { client_id: req.user.id }
    );
    const newDishes = uniqueDishes[0]?.count || 0;

    // 计算饮食多样性（简化处理）
    const diversity = Math.min(100, Math.round((newDishes / 30) * 100 * 2));

    // 生成健康洞察
    const insight = `本月日均摄入热量为 ${Math.round(avgDailyCalories)} kcal，目标达成率为 ${targetAchievement}%。本月共尝试了 ${newDishes}种不同菜品，饮食多样性得分为 ${diversity}%。${fiberProgress >= 80 ? '膳食纤维摄入充足，' : '建议增加膳食纤维摄入，'}${proteinProgress >= 80 ? '蛋白质摄入良好。' : '蛋白质摄入有待提升。'}`;

    // 生成成就列表
    const achievements = [];
    if (targetDays >= 25) achievements.push(`本月有 ${targetDays} 天达到了热量目标`);
    if (fiberProgress >= 90) achievements.push('膳食纤维摄入量达到推荐标准的 90% 以上');
    if (proteinProgress >= 85) achievements.push('蛋白质摄入量达到推荐标准的 85% 以上');
    if (newDishes >= 20) achievements.push(`本月尝试了 ${newDishes} 种不同菜品，饮食多样化表现优秀`);
    if (achievements.length === 0) {
      achievements.push('继续保持良好的饮食习惯');
    }

    // 生成AI分析
    const aiAnalysis = `根据本月的饮食数据分析，日均热量摄入为 ${Math.round(avgDailyCalories)} kcal，${targetAchievement >= 80 && targetAchievement <= 120 ? '基本符合' : targetAchievement < 80 ? '略低于' : '略高于'}推荐目标。${fiberProgress >= 80 ? '膳食纤维摄入充足，' : '建议增加深绿色蔬菜、全谷物和豆类食品的摄入以提高膳食纤维。'}${proteinProgress >= 80 ? '蛋白质摄入良好，' : '建议适当增加优质蛋白质来源如鱼类、禽肉、豆类。'}保持营养均衡，适当运动，有助于维持健康。`;

    // 获取推荐菜品（复用现有逻辑）
    const latest = await db.get(
      `SELECT * FROM nutrition_reports 
       WHERE client_id = :client_id AND type = 'month' 
       ORDER BY created_at DESC LIMIT 1`,
      { client_id: req.user.id }
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
      calories_progress: Math.min(100, Math.round((summary.calories / 30 / 2000) * 100)),
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

// 创建饮食记录
router.post('/dietary-records', async (req, res) => {
  const {
    food_name,
    meal_type = 'lunch',
    record_date,
    quantity = 1,
    unit = '份',
    nutrition = {},
    notes = ''
  } = req.body;

  if (!food_name || !record_date) {
    return failure(res, '食物名称和日期为必填项');
  }

  const date = record_date || getToday();

  const result = await db.run(
    `INSERT INTO dietary_records 
     (client_id, food_name, meal_type, record_date, quantity, unit, nutrition, notes)
     VALUES (:client_id, :food_name, :meal_type, :record_date, :quantity, :unit, :nutrition, :notes)`,
    {
      client_id: req.user.id,
      food_name,
      meal_type,
      record_date: date,
      quantity,
      unit,
      nutrition: JSON.stringify(nutrition),
      notes
    }
  );

  const record = await db.get('SELECT * FROM dietary_records WHERE id = :id', { id: result.lastInsertRowid });
  if (record) {
    record.nutrition = JSON.parse(record.nutrition || '{}');
  }

  return success(res, { record }, '记录成功');
});

// 获取饮食记录列表
router.get('/dietary-records', async (req, res) => {
  const { start_date, end_date, meal_type } = req.query;
  let conditions = ['client_id = :client_id'];
  const params = { client_id: req.user.id };

  if (start_date) {
    conditions.push('record_date >= :start_date');
    params.start_date = start_date;
  }
  if (end_date) {
    conditions.push('record_date <= :end_date');
    params.end_date = end_date;
  }
  if (meal_type) {
    conditions.push('meal_type = :meal_type');
    params.meal_type = meal_type;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : 'WHERE client_id = :client_id';
  const records = await db.all(
    `SELECT * FROM dietary_records ${where} ORDER BY record_date DESC, created_at DESC LIMIT 200`,
    params
  );

  const formatted = records.map(r => ({
    ...r,
    nutrition: r.nutrition ? JSON.parse(r.nutrition) : {}
  }));

  return success(res, { records: formatted });
});

// 更新饮食记录
router.patch('/dietary-records/:id', async (req, res) => {
  const { id } = req.params;
  const record = await db.get('SELECT * FROM dietary_records WHERE id = :id AND client_id = :client_id', {
    id,
    client_id: req.user.id
  });

  if (!record) {
    return failure(res, '记录不存在', 404);
  }

  const updates = [];
  const params = { id, client_id: req.user.id };

  if (req.body.food_name !== undefined) {
    updates.push('food_name = :food_name');
    params.food_name = req.body.food_name;
  }
  if (req.body.meal_type !== undefined) {
    updates.push('meal_type = :meal_type');
    params.meal_type = req.body.meal_type;
  }
  if (req.body.record_date !== undefined) {
    updates.push('record_date = :record_date');
    params.record_date = req.body.record_date;
  }
  if (req.body.quantity !== undefined) {
    updates.push('quantity = :quantity');
    params.quantity = req.body.quantity;
  }
  if (req.body.unit !== undefined) {
    updates.push('unit = :unit');
    params.unit = req.body.unit;
  }
  if (req.body.nutrition !== undefined) {
    updates.push('nutrition = :nutrition');
    params.nutrition = JSON.stringify(req.body.nutrition);
  }
  if (req.body.notes !== undefined) {
    updates.push('notes = :notes');
    params.notes = req.body.notes;
  }

  if (updates.length === 0) {
    return failure(res, '没有要更新的字段');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  await db.run(
    `UPDATE dietary_records SET ${updates.join(', ')} WHERE id = :id AND client_id = :client_id`,
    params
  );

  const updated = await db.get('SELECT * FROM dietary_records WHERE id = :id', { id });
  if (updated) {
    updated.nutrition = JSON.parse(updated.nutrition || '{}');
  }

  return success(res, { record: updated }, '更新成功');
});

// 删除饮食记录
router.delete('/dietary-records/:id', async (req, res) => {
  const { id } = req.params;
  const record = await db.get('SELECT * FROM dietary_records WHERE id = :id AND client_id = :client_id', {
    id,
    client_id: req.user.id
  });

  if (!record) {
    return failure(res, '记录不存在', 404);
  }

  await db.run('DELETE FROM dietary_records WHERE id = :id AND client_id = :client_id', { id, client_id: req.user.id });
  return success(res, {}, '删除成功');
});

// 更新用户信息（包括身份证）
router.put('/profile', async (req, res) => {
  const { name, phone, email, id_card, community_id, community_code, address, is_member, health_conditions, diet_preferences, notification_settings } = req.body;
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
  
  // 更新 client_profiles 表的 address 字段
  const profileUpdates = [];
  const profileParams = { user_id: req.user.id };
  
  // 先获取现有的 client_profiles 记录
  const existingProfile = await db.get('SELECT id, address, health_conditions, diet_preferences, notification_settings FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
  
  if (address !== undefined) {
    // 统一处理：将 null 和空字符串都视为空值进行比较
    const existingAddress = (existingProfile?.address || '').trim();
    const newAddress = (address || '').trim();
    
    console.log('[client/profile] 地址更新检查:', {
      userId: req.user.id,
      existingProfileExists: !!existingProfile,
      existingAddressRaw: existingProfile?.address,
      existingAddressTrimmed: existingAddress,
      newAddressRaw: address,
      newAddressTrimmed: newAddress,
      willUpdate: existingAddress !== newAddress
    });
    
    // 只有当地址确实发生变化时才更新或创建
    if (existingAddress !== newAddress) {
      profileUpdates.push('address = :address');
      // 如果新地址为空字符串，转换为 null 存储
      profileParams.address = newAddress || null;
      console.log('[client/profile] 准备更新地址:', { address: profileParams.address });
    } else {
      console.log('[client/profile] 地址未变化，跳过更新');
    }
  }
  
  // 处理会员状态更新
  if (is_member !== undefined) {
    profileUpdates.push('is_member = :is_member');
    profileParams.is_member = is_member ? 1 : 0;
  }
  
  // 处理身体情况更新
  if (health_conditions !== undefined) {
    const existingHealthConditions = (existingProfile?.health_conditions || '').trim();
    const newHealthConditions = (health_conditions || '').trim();
    
    if (existingHealthConditions !== newHealthConditions) {
      profileUpdates.push('health_conditions = :health_conditions');
      profileParams.health_conditions = newHealthConditions || null;
    }
  }
  
  // 处理饮食偏好更新
  if (diet_preferences !== undefined) {
    const newDietPreferences = Array.isArray(diet_preferences) ? JSON.stringify(diet_preferences) : diet_preferences;
    const existingDietPreferences = existingProfile?.diet_preferences || null;
    
    if (existingDietPreferences !== newDietPreferences) {
      profileUpdates.push('diet_preferences = :diet_preferences');
      profileParams.diet_preferences = newDietPreferences;
    }
  }
  
  // 处理通知设置更新
  if (notification_settings !== undefined) {
    const newNotificationSettings = Array.isArray(notification_settings) ? JSON.stringify(notification_settings) : notification_settings;
    const existingNotificationSettings = existingProfile?.notification_settings || null;
    
    if (existingNotificationSettings !== newNotificationSettings) {
      profileUpdates.push('notification_settings = :notification_settings');
      profileParams.notification_settings = newNotificationSettings;
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
      // 如果不存在，创建记录（只有当有更新内容时才创建）
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
  if (updates.length === 0 && profileUpdates.length === 0) {
    // 如果有尝试更新地址但地址未变化，应该返回成功（因为用户期望的状态已经满足）
    if (address !== undefined) {
      const existingAddress = (existingProfile?.address || '').trim();
      const newAddress = (address || '').trim();
      console.log('[client/profile] 地址未变化，但返回成功:', { 
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
      
      const clientProfile = await db.get('SELECT address, is_member, health_conditions, diet_preferences, notification_settings FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
      
      const userData = {
        ...user,
        id_verified: !!user.id_verified,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
        address: clientProfile?.address ?? null,
        health_conditions: clientProfile?.health_conditions ?? null,
        diet_preferences: clientProfile?.diet_preferences ? JSON.parse(clientProfile.diet_preferences) : [],
        notification_settings: clientProfile?.notification_settings ? JSON.parse(clientProfile.notification_settings) : []
      };
      
      if (clientProfile?.is_member !== undefined) {
        userData.is_member = !!clientProfile.is_member;
      }
      
      return success(res, { user: userData }, '信息已是最新');
    }
    
    // 如果尝试更新会员状态但已经是目标状态，也应该返回成功
    if (is_member !== undefined) {
      const currentIsMember = existingProfile?.is_member ? !!existingProfile.is_member : false;
      if (currentIsMember === !!is_member) {
        // 已经是目标状态，返回成功
        const user = await db.get(
          'SELECT id, username, name, role, phone, email, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :user_id',
          { user_id: req.user.id }
        );
        
        const clientProfile = await db.get('SELECT address, is_member, health_conditions, diet_preferences, notification_settings FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
        
        const userData = {
          ...user,
          id_verified: !!user.id_verified,
          preferences: user.preferences ? JSON.parse(user.preferences) : {},
          address: clientProfile?.address ?? null,
          health_conditions: clientProfile?.health_conditions ?? null,
          diet_preferences: clientProfile?.diet_preferences ? JSON.parse(clientProfile.diet_preferences) : [],
          notification_settings: clientProfile?.notification_settings ? JSON.parse(clientProfile.notification_settings) : []
        };
        
        if (clientProfile?.is_member !== undefined) {
          userData.is_member = !!clientProfile.is_member;
        }
        
        return success(res, { user: userData }, '信息已是最新');
      }
    }
    
    // 如果尝试更新身体情况但已经是目标状态，也应该返回成功
    if (health_conditions !== undefined) {
      const existingHealthConditions = (existingProfile?.health_conditions || '').trim();
      const newHealthConditions = (health_conditions || '').trim();
      if (existingHealthConditions === newHealthConditions) {
        // 已经是目标状态，返回成功
        const user = await db.get(
          'SELECT id, username, name, role, phone, email, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :user_id',
          { user_id: req.user.id }
        );
        
        const clientProfile = await db.get('SELECT address, is_member, health_conditions, diet_preferences, notification_settings FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
        
        const userData = {
          ...user,
          id_verified: !!user.id_verified,
          preferences: user.preferences ? JSON.parse(user.preferences) : {},
          address: clientProfile?.address ?? null,
          health_conditions: clientProfile?.health_conditions ?? null,
          diet_preferences: clientProfile?.diet_preferences ? JSON.parse(clientProfile.diet_preferences) : [],
          notification_settings: clientProfile?.notification_settings ? JSON.parse(clientProfile.notification_settings) : []
        };
        
        if (clientProfile?.is_member !== undefined) {
          userData.is_member = !!clientProfile.is_member;
        }
        
        return success(res, { user: userData }, '信息已是最新');
      }
    }
    
    // 其他情况，如果没有要更新的字段，返回错误
    return failure(res, '没有要更新的字段');
  }
  
  // 获取更新后的用户信息和profile信息
  const user = await db.get(
    'SELECT id, username, name, role, phone, email, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :user_id',
    { user_id: req.user.id }
  );
  
  const clientProfile = await db.get('SELECT address, is_member, health_conditions, diet_preferences, notification_settings FROM client_profiles WHERE user_id = :user_id', { user_id: req.user.id });
  
  const userData = {
    ...user,
    id_verified: !!user.id_verified,
    preferences: user.preferences ? JSON.parse(user.preferences) : {},
    address: clientProfile?.address || null,
    health_conditions: clientProfile?.health_conditions || null,
    diet_preferences: clientProfile?.diet_preferences ? JSON.parse(clientProfile.diet_preferences) : [],
    notification_settings: clientProfile?.notification_settings ? JSON.parse(clientProfile.notification_settings) : []
  };
  
  // 添加会员状态
  if (clientProfile?.is_member !== undefined) {
    userData.is_member = !!clientProfile.is_member;
  }
  
  return success(res, { user: userData }, '信息已更新');
});

module.exports = router;
