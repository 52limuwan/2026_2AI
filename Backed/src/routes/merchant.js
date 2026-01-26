const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');
const { listOrders, updateOrderStatus } = require('../services/orders');

const router = express.Router();

// 配置 multer 用于图片上传
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `dish-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只能上传图片文件'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

router.use(authRequired, requireRole('merchant'));

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    // 获取当前选择的店面ID
    const profile = await db.get('SELECT current_store_id FROM merchant_profiles WHERE user_id = :id', { id: req.user.id });
    const storeId = profile?.current_store_id;
    
    // 菜品条件
    let dishCondition = 'merchant_id = :id';
    const params = { id: req.user.id };
    
    if (storeId) {
      dishCondition += ' AND store_id = :store_id';
      params.store_id = storeId;
    }
    
    // 订单统计条件：包含该商户菜品的订单，且是今日订单
    // 使用SQLite的date()函数直接比较，不依赖参数绑定
    // 优先使用订单上的 store_id，旧数据则回落到菜品关联
    let orderCondition = `date(created_at) = date('now', 'localtime') AND (`;
    if (storeId) {
      orderCondition += `(merchant_id = :id AND store_id = :store_id) OR (store_id IS NULL AND EXISTS (SELECT 1 FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE oi.order_id = orders.id AND d.merchant_id = :id AND d.store_id = :store_id))`;
    } else {
      orderCondition += `merchant_id = :id OR EXISTS (SELECT 1 FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE oi.order_id = orders.id AND d.merchant_id = :id)`;
    }
    orderCondition += `)`;
    
    // 今日订单：只统计今天的订单（包含该商户菜品的订单）
    const totalOrdersResult = await db.get(
      `SELECT COUNT(DISTINCT id) as count FROM orders WHERE ${orderCondition}`,
      params
    );
    const totalOrders = Number(totalOrdersResult?.count || 0);
    
    // 配送中：只统计今日外卖订单（有address且状态为delivering）
    const deliveringResult = await db.get(
      `SELECT COUNT(DISTINCT id) as count FROM orders WHERE ${orderCondition} AND status = 'delivering' AND address IS NOT NULL AND address != ''`,
      params
    );
    const delivering = Number(deliveringResult?.count || 0);
    
    // 已送达：只统计今日已送达订单（已送达就是已完成的）
    const deliveredResult = await db.get(
      `SELECT COUNT(DISTINCT id) as count FROM orders WHERE ${orderCondition} AND status = 'delivered'`,
      params
    );
    const delivered = Number(deliveredResult?.count || 0);
    
    // 菜品数
    const dishesResult = await db.get(`SELECT COUNT(*) as count FROM dishes WHERE ${dishCondition}`, params);
    const dishes = Number(dishesResult?.count || 0);
    
    const stats = {
      totalOrders,
      delivering,
      delivered,
      dishes
    };
    
    // 调试日志
    console.log('Dashboard stats for merchant:', req.user.id, 'store:', storeId, 'today:', today, 'stats:', stats);
    
    return success(res, { stats });
  } catch (error) {
    console.error('Dashboard error:', error);
    return failure(res, '获取统计数据失败: ' + error.message, 500);
  }
});

router.get('/dishes', async (req, res) => {
  // 获取当前选择的店面ID
  const profile = await db.get('SELECT current_store_id FROM merchant_profiles WHERE user_id = :id', { id: req.user.id });
  const storeId = profile?.current_store_id;
  
  // 根据当前店面筛选菜品
  let query = 'SELECT * FROM dishes WHERE merchant_id = :id';
  const params = { id: req.user.id };
  
  if (storeId) {
    query += ' AND store_id = :store_id';
    params.store_id = storeId;
  }
  
  query += ' ORDER BY updated_at DESC';
  const rows = await db.all(query, params);
  return success(res, { dishes: rows });
});

// 图片上传路由
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return failure(res, '请选择要上传的图片');
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  return success(res, { imageUrl }, '图片上传成功');
});

router.post('/dishes', async (req, res) => {
  const { name, price, member_price, stock = 0, description = '', nutrition = {}, store_id, image } = req.body;
  if (!name || price == null) return failure(res, '菜品名称和价格必填');
  
  // 获取当前选择的店面ID（如果没有指定store_id，使用当前店面）
  const profile = await db.get('SELECT current_store_id FROM merchant_profiles WHERE user_id = :id', { id: req.user.id });
  const currentStoreId = store_id || profile?.current_store_id;
  
  // 验证店面是否属于当前商户
  if (currentStoreId) {
    const store = await db.get('SELECT id FROM stores WHERE id = :store_id AND merchant_id = :merchant_id', {
      store_id: currentStoreId,
      merchant_id: req.user.id
    });
    if (!store) return failure(res, '店面不存在或不属于当前商户');
  }
  
  const result = await db.run(
    `INSERT INTO dishes (merchant_id, store_id, name, price, member_price, stock, description, nutrition, image, status)
     VALUES (:merchant_id, :store_id, :name, :price, :member_price, :stock, :description, :nutrition, :image, 'available')`,
    {
      merchant_id: req.user.id,
      store_id: currentStoreId || null,
      name,
      price,
      member_price: member_price !== undefined && member_price !== null ? member_price : null,
      stock,
      description,
      nutrition: JSON.stringify(nutrition || {}),
      image: image || null
    }
  );
  const dish = await db.get('SELECT * FROM dishes WHERE id = :id', { id: result.lastInsertRowid });
  return success(res, { dish }, '菜品已创建');
});

router.put('/dishes/:id', async (req, res) => {
  const { name, price, member_price, stock, description = '', nutrition = {}, status = 'available', image } = req.body;
  
  // 构建更新字段
  const updates = [];
  const params = { id: req.params.id, merchant_id: req.user.id };
  
  if (name !== undefined) {
    updates.push('name = :name');
    params.name = name;
  }
  if (price !== undefined) {
    updates.push('price = :price');
    params.price = price;
  }
  if (member_price !== undefined) {
    updates.push('member_price = :member_price');
    params.member_price = member_price !== null && member_price !== '' ? member_price : null;
  }
  if (stock !== undefined) {
    updates.push('stock = :stock');
    params.stock = stock;
  }
  if (description !== undefined) {
    updates.push('description = :description');
    params.description = description;
  }
  if (nutrition !== undefined) {
    updates.push('nutrition = :nutrition');
    params.nutrition = JSON.stringify(nutrition || {});
  }
  if (status !== undefined) {
    updates.push('status = :status');
    params.status = status;
  }
  if (image !== undefined) {
    updates.push('image = :image');
    params.image = image;
  }
  
  if (updates.length === 0) {
    return failure(res, '没有要更新的字段');
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  await db.run(
    `UPDATE dishes SET ${updates.join(', ')} WHERE id = :id AND merchant_id = :merchant_id`,
    params
  );
  
  const dish = await db.get('SELECT * FROM dishes WHERE id = :id', { id: req.params.id });
  return success(res, { dish });
});

router.delete('/dishes/:id', async (req, res) => {
  await db.run('DELETE FROM dishes WHERE id = :id AND merchant_id = :merchant_id', { id: req.params.id, merchant_id: req.user.id });
  return success(res, { id: req.params.id }, '菜品已删除');
});

router.patch('/dishes/:id/status', async (req, res) => {
  const { status } = req.body;
  await db.run('UPDATE dishes SET status = :status WHERE id = :id AND merchant_id = :merchant_id', { status, id: req.params.id, merchant_id: req.user.id });
  const dish = await db.get('SELECT * FROM dishes WHERE id = :id', { id: req.params.id });
  return success(res, { dish });
});

router.get('/orders', async (req, res) => {
  try {
    // 获取查询参数：店面ID、分页参数、状态过滤等
    const { store_id, page = 1, page_size = 500, status, start_date, end_date } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(1000, Math.max(1, parseInt(page_size) || 500)); // 最多1000条，默认500条
    const offset = (pageNum - 1) * pageSize;
    
    const profile = await db.get('SELECT current_store_id FROM merchant_profiles WHERE user_id = :id', { id: req.user.id });
    const currentStoreId = store_id ? parseInt(store_id) : (profile?.current_store_id ? parseInt(profile.current_store_id) : null);

    // 获取该商户的所有店面ID列表
    const merchantStores = await db.all(
      'SELECT id FROM stores WHERE merchant_id = :merchant_id AND status = "active"',
      { merchant_id: req.user.id }
    );
    const storeIds = merchantStores.map(s => parseInt(s.id));

    let orders = [];
    const { formatOrderRow } = require('../services/orders');
    
    // 策略1：直接通过订单表的merchant_id和store_id查询
    let queryConditions = ['o.merchant_id = :merchant_id'];
    const params = { merchant_id: req.user.id };
    
    if (currentStoreId && storeIds.length > 0 && storeIds.includes(currentStoreId)) {
      // 查询指定店面的订单
      queryConditions.push('o.store_id = :store_id');
      params.store_id = currentStoreId;
    } else if (storeIds.length > 0) {
      // 查询该商户所有店面的订单（包含store_id为NULL的情况，兼容旧数据）
      const placeholders = storeIds.map((_, idx) => `:store${idx}`).join(',');
      queryConditions.push(`(o.store_id IN (${placeholders}) OR o.store_id IS NULL)`);
      storeIds.forEach((id, idx) => {
        params[`store${idx}`] = id;
      });
    }
    // 如果 storeIds 为空，则只通过 merchant_id 查询，不过滤 store_id
    
    // 添加状态过滤
    if (status) {
      queryConditions.push('o.status = :status');
      params.status = status;
    }
    
    // 添加日期范围过滤
    if (start_date) {
      queryConditions.push('date(o.created_at) >= :start_date');
      params.start_date = start_date;
    }
    if (end_date) {
      queryConditions.push('date(o.created_at) <= :end_date');
      params.end_date = end_date;
    }
    
    const whereClause = queryConditions.join(' AND ');
    
    // 先获取总数
    let totalCount = 0;
    try {
      const countResult = await db.get(
        `SELECT COUNT(DISTINCT o.id) as total
        FROM orders o
        WHERE ${whereClause}`,
        params
      );
      totalCount = countResult?.total || 0;
    } catch (err) {
      console.error('统计订单总数失败:', err);
    }
    
    let rows = [];
    try {
      rows = await db.all(
        `SELECT o.*, 
          u.name as client_name,
          m.name as merchant_name,
          s.name as store_name,
          s.location as store_location,
          c.name as community_display_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.client_id
        LEFT JOIN users m ON m.id = o.merchant_id
        LEFT JOIN stores s ON s.id = o.store_id
        LEFT JOIN communities c ON c.id = o.community_id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT :limit OFFSET :offset`,
        { ...params, limit: pageSize, offset }
      );
    } catch (err) {
      console.error('查询订单失败（策略1）:', err);
      // 如果查询失败，尝试简化查询
      rows = await db.all(
        `SELECT o.*, 
          u.name as client_name,
          m.name as merchant_name,
          s.name as store_name,
          s.location as store_location,
          c.name as community_display_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.client_id
        LEFT JOIN users m ON m.id = o.merchant_id
        LEFT JOIN stores s ON s.id = o.store_id
        LEFT JOIN communities c ON c.id = o.community_id
        WHERE o.merchant_id = :merchant_id
        ORDER BY o.created_at DESC
        LIMIT :limit OFFSET :offset`,
        { merchant_id: req.user.id, limit: pageSize, offset }
      );
    }
    
    // 策略2：如果策略1没有找到足够订单，通过订单项中的菜品关联查询（兼容旧数据）
    // 只有当第一页且订单数不足时才执行此策略
    if (pageNum === 1 && rows.length < pageSize) {
      try {
        let dishQueryConditions = ['d.merchant_id = :merchant_id'];
        const dishParams = { merchant_id: req.user.id };
        
        if (currentStoreId && storeIds.length > 0 && storeIds.includes(currentStoreId)) {
          dishQueryConditions.push('d.store_id = :store_id');
          dishParams.store_id = currentStoreId;
        } else if (storeIds.length > 0) {
          const placeholders = storeIds.map((_, idx) => `:store${idx}`).join(',');
          dishQueryConditions.push(`(d.store_id IN (${placeholders}) OR d.store_id IS NULL)`);
          storeIds.forEach((id, idx) => {
            dishParams[`store${idx}`] = id;
          });
        }
        
        // 添加状态和日期过滤
        if (status) {
          dishQueryConditions.push('o.status = :status');
          dishParams.status = status;
        }
        if (start_date) {
          dishQueryConditions.push('date(o.created_at) >= :start_date');
          dishParams.start_date = start_date;
        }
        if (end_date) {
          dishQueryConditions.push('date(o.created_at) <= :end_date');
          dishParams.end_date = end_date;
        }
        
        // 获取已查询的订单ID，避免重复
        const existingOrderIds = new Set(rows.map(r => r.id));
        if (existingOrderIds.size > 0) {
          const placeholdersForIds = Array.from(existingOrderIds).map((_, idx) => `:existing${idx}`).join(',');
          dishQueryConditions.push(`o.id NOT IN (${placeholdersForIds})`);
          Array.from(existingOrderIds).forEach((id, idx) => {
            dishParams[`existing${idx}`] = id;
          });
        }
        
        const dishWhereClause = dishQueryConditions.join(' AND ');
        const remainingLimit = pageSize - rows.length;
        
        const rowsByItems = await db.all(
          `SELECT DISTINCT o.*,
            u.name as client_name,
            m.name as merchant_name,
            s.name as store_name,
            s.location as store_location,
            c.name as community_display_name
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          JOIN dishes d ON d.id = oi.dish_id
          LEFT JOIN users u ON u.id = o.client_id
          LEFT JOIN users m ON m.id = o.merchant_id
          LEFT JOIN stores s ON s.id = o.store_id
          LEFT JOIN communities c ON c.id = o.community_id
          WHERE ${dishWhereClause}
          ORDER BY o.created_at DESC
          LIMIT :limit`,
          { ...dishParams, limit: remainingLimit }
        );
        
        rows.push(...rowsByItems);
      } catch (err) {
        console.error('查询订单失败（策略2）:', err);
      }
    }
    
    // 格式化订单数据
    const orderMap = new Map(); // 用于去重
    for (const row of rows) {
      if (!orderMap.has(row.id)) {
        orderMap.set(row.id, row);
      }
    }
    
    for (const row of orderMap.values()) {
      orders.push(await formatOrderRow(row));
    }
    
    // 按创建时间排序（确保最新的在前）
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return success(res, { 
      orders, 
      pagination: {
        page: pageNum,
        page_size: pageSize,
        total: totalCount || orders.length,
        total_pages: Math.ceil((totalCount || orders.length) / pageSize)
      },
      current_store_id: currentStoreId, 
      store_count: storeIds.length,
      filters: {
        status,
        start_date,
        end_date
      }
    });
  } catch (error) {
    console.error('获取商户订单失败:', error);
    return failure(res, '获取订单失败: ' + error.message, 500);
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['preparing', 'delivering', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return failure(res, '状态非法');
  const profile = await db.get('SELECT current_store_id FROM merchant_profiles WHERE user_id = :id', { id: req.user.id });
  const storeId = profile?.current_store_id;
  const storeClause = storeId ? ' AND (store_id = :store_id OR store_id IS NULL)' : '';
  const order = await db.get(
    `SELECT * FROM orders WHERE id = :id AND merchant_id = :merchant_id${storeClause}`,
    { id: req.params.id, merchant_id: req.user.id, store_id: storeId }
  );
  if (!order) return failure(res, '订单不存在', 404);
  const updated = await updateOrderStatus(order.id, status, { delivered_at: status === 'delivered' ? new Date().toISOString() : null });
  return success(res, { order: updated });
});

// 获取所有采购计划
router.get('/purchase-plans', async (req, res) => {
  const plans = await db.all(
    'SELECT * FROM purchase_plans WHERE merchant_id = :merchant_id ORDER BY plan_date DESC',
    { merchant_id: req.user.id }
  );
  return success(res, { plans });
});

// 获取单个采购计划（保持兼容性）
router.get('/purchase-plan', async (req, res) => {
  const plan = await db.get('SELECT * FROM purchase_plans WHERE merchant_id = :merchant_id ORDER BY plan_date DESC LIMIT 1', { merchant_id: req.user.id });
  return success(res, { plan });
});

// 获取指定ID的采购计划
router.get('/purchase-plan/:id', async (req, res) => {
  const plan = await db.get(
    'SELECT * FROM purchase_plans WHERE id = :id AND merchant_id = :merchant_id',
    { id: req.params.id, merchant_id: req.user.id }
  );
  if (!plan) return failure(res, '计划不存在');
  return success(res, { plan });
});

// 创建采购计划
router.post('/purchase-plan', async (req, res) => {
  try {
    const { planDate, items = [], notes = '', status = 'pending' } = req.body;
    if (!planDate) return failure(res, '缺少计划日期');
    
    const result = await db.run(
      `INSERT INTO purchase_plans (merchant_id, plan_date, items, notes, status)
       VALUES (:merchant_id, :plan_date, :items, :notes, :status)`,
      { merchant_id: req.user.id, plan_date: planDate, items: JSON.stringify(items), notes, status }
    );
    const plan = await db.get('SELECT * FROM purchase_plans WHERE id = :id', { id: result.lastInsertRowid });
    return success(res, { plan }, '采购计划已生成');
  } catch (error) {
    console.error('创建采购计划失败:', error);
    return failure(res, '创建采购计划失败: ' + error.message, 500);
  }
});

// 更新采购计划
router.put('/purchase-plan/:id', async (req, res) => {
  try {
    const { planDate, items, notes, status } = req.body;
    const plan = await db.get(
      'SELECT * FROM purchase_plans WHERE id = :id AND merchant_id = :merchant_id',
      { id: req.params.id, merchant_id: req.user.id }
    );
    if (!plan) return failure(res, '计划不存在');
    
    // 构建更新语句，只更新提供的字段
    const updates = [];
    const params = { id: req.params.id };
    
    if (planDate !== undefined) {
      updates.push('plan_date = :plan_date');
      params.plan_date = planDate;
    }
    if (items !== undefined) {
      updates.push('items = :items');
      params.items = JSON.stringify(items);
    }
    if (notes !== undefined) {
      updates.push('notes = :notes');
      params.notes = notes;
    }
    if (status !== undefined) {
      updates.push('status = :status');
      params.status = status;
    }
    
    if (updates.length === 0) {
      return failure(res, '没有要更新的字段');
    }
    
    await db.run(
      `UPDATE purchase_plans SET ${updates.join(', ')} WHERE id = :id`,
      params
    );
    
    const updated = await db.get('SELECT * FROM purchase_plans WHERE id = :id', { id: req.params.id });
    return success(res, { plan: updated }, '计划已更新');
  } catch (error) {
    console.error('更新采购计划失败:', error);
    return failure(res, '更新采购计划失败: ' + error.message, 500);
  }
});

// 删除采购计划
router.delete('/purchase-plan/:id', async (req, res) => {
  const plan = await db.get(
    'SELECT * FROM purchase_plans WHERE id = :id AND merchant_id = :merchant_id',
    { id: req.params.id, merchant_id: req.user.id }
  );
  if (!plan) return failure(res, '计划不存在');
  
  await db.run('DELETE FROM purchase_plans WHERE id = :id', { id: req.params.id });
  return success(res, null, '计划已删除');
});

// 获取常用食材统计
router.get('/purchase-stats', async (req, res) => {
  const plans = await db.all(
    'SELECT items FROM purchase_plans WHERE merchant_id = :merchant_id',
    { merchant_id: req.user.id }
  );
  
  const itemFrequency = {};
  plans.forEach(plan => {
    try {
      const items = JSON.parse(plan.items || '[]');
      items.forEach(item => {
        if (item.name) {
          itemFrequency[item.name] = (itemFrequency[item.name] || 0) + 1;
        }
      });
    } catch (err) {
      console.warn('Failed to parse plan items', err);
    }
  });
  
  const topItems = Object.entries(itemFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  return success(res, { topItems, totalPlans: plans.length });
});

// 店面管理相关API
router.get('/stores', async (req, res) => {
  const stores = await db.all(
    'SELECT * FROM stores WHERE merchant_id = :merchant_id AND status = "active" ORDER BY created_at DESC',
    { merchant_id: req.user.id }
  );
  return success(res, { stores });
});

router.post('/stores', async (req, res) => {
  const { name, location, description, distance, tags, community_id } = req.body;
  if (!name) return failure(res, '店面名称必填');

  const merchant = await db.get('SELECT community_id FROM users WHERE id = :id', { id: req.user.id });
  const resolvedCommunityId = community_id || merchant?.community_id || null;

  const result = await db.run(
    `INSERT INTO stores (merchant_id, community_id, name, location, description, distance, tags, status)
     VALUES (:merchant_id, :community_id, :name, :location, :description, :distance, :tags, 'active')`,
    {
      merchant_id: req.user.id,
      community_id: resolvedCommunityId,
      name,
      location: location || '',
      description: description || '',
      distance: distance || '',
      tags: Array.isArray(tags) ? tags.join(',') : (tags || '')
    }
  );
  
  const store = await db.get('SELECT * FROM stores WHERE id = :id', { id: result.lastInsertRowid });
  
  // 如果是第一个店面，自动设置为当前店面
  const profile = await db.get('SELECT current_store_id FROM merchant_profiles WHERE user_id = :id', { id: req.user.id });
  if (!profile?.current_store_id) {
    await db.run('UPDATE merchant_profiles SET current_store_id = :store_id WHERE user_id = :user_id', {
      store_id: result.lastInsertRowid,
      user_id: req.user.id
    });
  }
  
  return success(res, { store }, '店面已创建');
});

router.put('/stores/:id', async (req, res) => {
  const { name, location, description, distance, tags, community_id } = req.body;
  const storeId = req.params.id;
  
  // 验证店面是否属于当前商户
  const store = await db.get('SELECT id FROM stores WHERE id = :store_id AND merchant_id = :merchant_id', {
    store_id: storeId,
    merchant_id: req.user.id
  });
  if (!store) return failure(res, '店面不存在或不属于当前商户');
  
  const updates = [];
  const params = { store_id: storeId };
  
  if (name !== undefined) {
    updates.push('name = :name');
    params.name = name;
  }
  if (location !== undefined) {
    updates.push('location = :location');
    params.location = location;
  }
  if (description !== undefined) {
    updates.push('description = :description');
    params.description = description;
  }
  if (distance !== undefined) {
    updates.push('distance = :distance');
    params.distance = distance;
  }
  if (tags !== undefined) {
    updates.push('tags = :tags');
    params.tags = Array.isArray(tags) ? tags.join(',') : tags;
  }
  if (community_id !== undefined) {
    updates.push('community_id = :community_id');
    params.community_id = community_id;
  }
  
  if (updates.length === 0) {
    return failure(res, '没有要更新的字段');
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  await db.run(
    `UPDATE stores SET ${updates.join(', ')} WHERE id = :store_id`,
    params
  );
  
  const updated = await db.get('SELECT * FROM stores WHERE id = :id', { id: storeId });
  return success(res, { store: updated }, '店面已更新');
});

router.patch('/stores/:id/switch', async (req, res) => {
  const storeId = req.params.id;
  
  // 验证店面是否属于当前商户
  const store = await db.get('SELECT id FROM stores WHERE id = :store_id AND merchant_id = :merchant_id', {
    store_id: storeId,
    merchant_id: req.user.id
  });
  if (!store) return failure(res, '店面不存在或不属于当前商户');
  
  // 更新当前选择的店面
  await db.run('UPDATE merchant_profiles SET current_store_id = :store_id WHERE user_id = :user_id', {
    store_id: storeId,
    user_id: req.user.id
  });
  
  return success(res, { store_id: storeId }, '已切换到该店面');
});

router.get('/current-store', async (req, res) => {
  const profile = await db.get(
    `SELECT current_store_id FROM merchant_profiles WHERE user_id = :user_id`,
    { user_id: req.user.id }
  );
  
  if (!profile || !profile.current_store_id) {
    return success(res, { store: null });
  }
  
  const store = await db.get(
    `SELECT * FROM stores WHERE id = :store_id`,
    { store_id: profile.current_store_id }
  );
  
  if (!store) {
    return success(res, { store: null });
  }
  
  const storeData = {
    id: store.id,
    merchant_id: store.merchant_id,
    name: store.name,
    location: store.location,
    description: store.description,
    distance: store.distance,
    tags: store.tags ? store.tags.split(',').filter(Boolean) : [],
    status: store.status,
    created_at: store.created_at,
    updated_at: store.updated_at
  };
  
  return success(res, { store: storeData });
});

// AI生成24节气推荐菜品
router.post('/dishes/generate-seasonal', async (req, res) => {
  try {
    const { generateSeasonalDishes, generateDishImage } = require('../services/aiService');
    
    // 获取当前选择的店面ID
    const profile = await db.get('SELECT current_store_id FROM merchant_profiles WHERE user_id = :id', { id: req.user.id });
    const currentStoreId = profile?.current_store_id;
    
    console.log(`\n[Merchant] 商户 ${req.user.id} 请求生成节气菜品`);
    console.log(`  当前店面ID: ${currentStoreId || '未选择'}`);
    
    // 调用 AI 服务生成菜品
    const { dishes, solarTerm, tokensUsed, model } = await generateSeasonalDishes();
    
    console.log(`  生成结果: ${dishes.length} 道菜品`);
    console.log(`  当前节气: ${solarTerm}`);
    console.log(`  使用模型: ${model}`);
    console.log(`  Token 消耗: ${tokensUsed}`);
    
    // 批量插入菜品并生成图片
    const insertedDishes = [];
    let successfulImages = 0;
    
    for (const dish of dishes) {
      let imageUrl = '';
      
      // 尝试生成菜品图片
      try {
        console.log(`\n  为菜品"${dish.name}"生成图片...`);
        const imageBuffer = await generateDishImage(dish.name, dish.description);
        
        if (imageBuffer) {
          // 保存图片到本地
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `dish-ai-${uniqueSuffix}.jpg`;
          const filepath = path.join(uploadsDir, filename);
          
          fs.writeFileSync(filepath, imageBuffer);
          imageUrl = `/uploads/${filename}`;
          successfulImages++;
          console.log(`  ✓ 图片已保存: ${imageUrl}`);
        } else {
          console.log(`  ⚠ 图片生成失败，菜品将不包含图片`);
        }
      } catch (imageError) {
        console.error(`  ✗ 图片生成异常:`, imageError.message);
        // 图片生成失败不影响菜品创建
      }
      
      // 插入菜品
      const result = await db.run(
        `INSERT INTO dishes (merchant_id, store_id, name, price, member_price, stock, description, nutrition, image, status)
         VALUES (:merchant_id, :store_id, :name, :price, :member_price, :stock, :description, :nutrition, :image, 'available')`,
        {
          merchant_id: req.user.id,
          store_id: currentStoreId || null,
          name: dish.name,
          price: dish.price,
          member_price: dish.member_price || Math.round(dish.price * 0.9), // 会员价9折
          stock: dish.stock || 50, // 默认库存50
          description: `【${solarTerm}推荐】${dish.description}`,
          nutrition: JSON.stringify(dish.nutrition),
          image: imageUrl
        }
      );
      
      const insertedDish = await db.get('SELECT * FROM dishes WHERE id = :id', { id: result.lastInsertRowid });
      insertedDishes.push(insertedDish);
    }
    
    console.log(`  成功插入 ${insertedDishes.length} 道菜品到数据库`);
    console.log(`  成功生成 ${successfulImages} 张图片\n`);
    
    return success(res, { 
      dishes: insertedDishes,
      solarTerm,
      tokensUsed,
      model,
      imagesGenerated: successfulImages,
      message: `已根据当前节气【${solarTerm}】生成${insertedDishes.length}道推荐菜品${successfulImages > 0 ? `（含${successfulImages}张图片）` : ''}`
    }, `已生成${insertedDishes.length}道${solarTerm}时令菜品`);
  } catch (error) {
    console.error('生成节气菜品失败:', error);
    return failure(res, '生成菜品失败: ' + error.message, 500);
  }
});

router.put('/profile', async (req, res) => {
  const { name, phone, email, id_card, community_id, community_code } = req.body;
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
  
  if (updates.length === 0) {
    return failure(res, '没有要更新的字段');
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  await db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = :user_id`,
    params
  );
  
  const user = await db.get(
    'SELECT id, username, name, role, phone, email, avatar, id_card, id_verified, community_id, community_code, preferences FROM users WHERE id = :user_id',
    { user_id: req.user.id }
  );
  return success(res, { 
    user: {
      ...user,
      id_verified: !!user.id_verified,
      preferences: user.preferences ? JSON.parse(user.preferences) : {}
    }
  }, '信息已更新');
});

module.exports = router;
