const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { getToday } = require('../utils/dateHelper');

function generateOrderNumber() {
  return `ORD-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.floor(Math.random() * 999)}`;
}

async function createOrder({
  clientId,
  guardianId = null,
  guardianIds = [],
  merchantId = null,
  storeId = null,
  communityId = null,
  communityCode = null,
  items = [],
  address = '',
  contact = '',
  scheduledAt = null,
  remark = '',
  paymentMethod = 'recorded',
  community_name = '',
  window_name = ''
}) {
  const orderNumber = generateOrderNumber();
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const notifyGuardians = Array.isArray(guardianIds) ? guardianIds.filter(Boolean) : [];
  if (guardianId && !notifyGuardians.includes(guardianId)) {
    notifyGuardians.push(guardianId);
  }
  const uniqueGuardians = [...new Set(notifyGuardians)];

  // 生成本地时间字符串 (YYYY-MM-DD HH:mm:ss)
  // SQLite的CURRENT_TIMESTAMP返回UTC时间，我们需要使用本地时间
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const localTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const result = await db.run(
    `INSERT INTO orders (order_number, client_id, guardian_id, merchant_id, store_id, community_id, community_code, total_amount, status, payment_status, payment_method, scheduled_at, address, contact, remark, community_name, window_name, created_at)
     VALUES (:orderNumber, :clientId, :guardianId, :merchantId, :storeId, :communityId, :communityCode, :totalAmount, 'placed', 'recorded', :paymentMethod, :scheduledAt, :address, :contact, :remark, :community_name, :window_name, :created_at)`,
    {
      orderNumber,
      clientId,
      guardianId,
      merchantId,
      storeId,
      communityId,
      communityCode,
      totalAmount,
      paymentMethod,
      scheduledAt,
      address,
      contact,
      remark,
      community_name,
      window_name,
      created_at: localTime
    }
  );

  const orderId = result.lastInsertRowid;

  for (const item of items) {
    // 如果有dish_id，减少库存
    if (item.dish_id) {
      const dish = await db.get('SELECT stock FROM dishes WHERE id = :dish_id', { dish_id: item.dish_id });
      if (dish) {
        const quantity = item.quantity || 1;
        const currentStock = dish.stock || 0;
        
        // 检查库存是否足够
        if (currentStock < quantity) {
          // 库存不足，删除已创建的订单
          await db.run('DELETE FROM orders WHERE id = :order_id', { order_id: orderId });
          throw new Error(`菜品"${item.dish_name || '未知'}"库存不足，当前库存：${currentStock}，需要：${quantity}`);
        }
        
        // 减少库存
        const newStock = Math.max(0, currentStock - quantity);
        const newStatus = newStock <= 0 ? 'offline' : 'available';
        await db.run(
          'UPDATE dishes SET stock = :stock, status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :dish_id',
          { stock: newStock, status: newStatus, dish_id: item.dish_id }
        );
      }
    }
    
    await db.run(
      `INSERT INTO order_items (order_id, dish_id, dish_name, quantity, price, nutrition)
       VALUES (:order_id, :dish_id, :dish_name, :quantity, :price, :nutrition)`,
      {
        order_id: orderId,
        dish_id: item.dish_id || null,
        dish_name: item.dish_name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        nutrition: item.nutrition ? JSON.stringify(item.nutrition) : null
      }
    );
  }

  const order = await getOrderById(orderId);

  // 同步营养数据到每日摄入记录
  if (order && items.length > 0) {
    const today = getToday(); // 使用本地日期
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

    for (const item of items) {
      if (item.nutrition) {
        const nutrition = typeof item.nutrition === 'string' ? JSON.parse(item.nutrition) : item.nutrition;
        const quantity = Number(item.quantity || 1);
        totalNutrition.calories += Number(nutrition.calories || 0) * quantity;
        totalNutrition.protein += Number(nutrition.protein || 0) * quantity;
        totalNutrition.fat += Number(nutrition.fat || 0) * quantity;
        totalNutrition.carbs += Number(nutrition.carbs || 0) * quantity;
        totalNutrition.fiber += Number(nutrition.fiber || 0) * quantity;
        totalNutrition.calcium += Number(nutrition.calcium || 0) * quantity;
        totalNutrition.vitaminC += Number(nutrition.vitaminC || nutrition.vitamin_c || 0) * quantity;
        totalNutrition.iron += Number(nutrition.iron || 0) * quantity;
      }
    }

    // 插入或更新每日营养摄入记录
    const existing = await db.get(
      'SELECT id, totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date',
      { client_id: clientId, date: today }
    );

    if (existing) {
      const existingTotals = existing.totals ? JSON.parse(existing.totals) : {};
      const updatedTotals = {
        calories: (existingTotals.calories || 0) + totalNutrition.calories,
        protein: (existingTotals.protein || 0) + totalNutrition.protein,
        fat: (existingTotals.fat || 0) + totalNutrition.fat,
        carbs: (existingTotals.carbs || 0) + totalNutrition.carbs,
        fiber: (existingTotals.fiber || 0) + totalNutrition.fiber,
        calcium: (existingTotals.calcium || 0) + totalNutrition.calcium,
        vitaminC: (existingTotals.vitaminC || existingTotals.vitamin_c || 0) + totalNutrition.vitaminC,
        iron: (existingTotals.iron || 0) + totalNutrition.iron
      };
      await db.run(
        `UPDATE nutrition_intake_daily SET totals = :totals, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
        { id: existing.id, totals: JSON.stringify(updatedTotals) }
      );
    } else {
      await db.run(
        `INSERT INTO nutrition_intake_daily (client_id, date, totals, source) VALUES (:client_id, :date, :totals, 'order')`,
        { client_id: clientId, date: today, totals: JSON.stringify(totalNutrition) }
      );
    }
  }

  if (order) {
    // 获取用户的通知设置
    const clientProfile = await db.get(
      'SELECT notification_settings FROM client_profiles WHERE user_id = :user_id',
      { user_id: clientId }
    );
    
    const notificationSettings = clientProfile?.notification_settings 
      ? JSON.parse(clientProfile.notification_settings) 
      : [];
    
    // 只有当用户开启了下单提醒时才发送
    if (notificationSettings.includes('order_placed')) {
      const storeInfo = order.store ? `，店面：${order.store.name || ''}` : '';
      const basePayload = {
        title: '下单提醒',
        content: `您的订单 ${order.order_number} 已提交成功，总额 ¥${order.total_amount.toFixed(2)}${storeInfo}`,
        channel: 'in_app',
        status: 'unread',
        event_type: 'order_placed',
        related_id: order.id,
        severity: 'info'
      };

      await db.run(
        `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, related_id, severity)
         VALUES (:user_id, :role, :title, :content, :channel, :status, :event_type, :related_id, :severity)`,
        { ...basePayload, user_id: clientId, role: 'client' }
      );
    }

    // 通知监护人（监护人总是收到通知）
    const storeInfo = order.store ? `，店面：${order.store.name || ''}` : '';
    const guardianPayload = {
      title: '新订单通知',
      content: `订单 ${order.order_number}，总额 ¥${order.total_amount.toFixed(2)}${storeInfo}`,
      channel: 'in_app',
      status: 'unread',
      event_type: 'order',
      related_id: order.id,
      severity: 'info'
    };

    for (const gid of uniqueGuardians) {
      await db.run(
        `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, related_id, severity)
         VALUES (:user_id, :role, :title, :content, :channel, :status, :event_type, :related_id, :severity)`,
        { ...guardianPayload, user_id: gid, role: 'guardian' }
      );
    }
  }

  return order;
}

async function listOrders(filter = {}) {
  const conditions = [];
  const params = {};
  if (filter.clientId) {
    conditions.push('o.client_id = :clientId');
    params.clientId = filter.clientId;
  }
  if (filter.clientIds && Array.isArray(filter.clientIds) && filter.clientIds.length) {
    conditions.push(`o.client_id IN (${filter.clientIds.map((_, idx) => `:c${idx}`).join(',')})`);
    filter.clientIds.forEach((id, idx) => {
      params[`c${idx}`] = id;
    });
  }
  if (filter.guardianId) {
    conditions.push('o.guardian_id = :guardianId');
    params.guardianId = filter.guardianId;
  }
  if (filter.merchantId) {
    conditions.push('o.merchant_id = :merchantId');
    params.merchantId = filter.merchantId;
  }
  if (filter.storeId) {
    conditions.push('o.store_id = :storeId');
    params.storeId = filter.storeId;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db.all(
    `
    SELECT o.*, 
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
    ${where}
    ORDER BY o.created_at DESC
    LIMIT 200
  `,
    params
  );
  const orders = [];
  for (const row of rows) {
    orders.push(await formatOrderRow(row));
  }
  return orders;
}

async function getOrderById(id) {
  const row = await db.get(
    `
    SELECT o.*, 
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
    WHERE o.id = :id
  `,
    { id }
  );
  if (!row) return null;
  return formatOrderRow(row);
}

async function updateOrderStatus(id, status, opts = {}) {
  // 获取订单信息用于发送通知
  const order = await getOrderById(id);
  
  await db.run(
    `
    UPDATE orders SET status = :status, payment_status = COALESCE(:payment_status, payment_status),
      delivered_at = COALESCE(:delivered_at, delivered_at),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = :id
  `,
    {
      id,
      status,
      payment_status: opts.payment_status || null,
      delivered_at: opts.delivered_at || null
    }
  );
  
  // 发送订单状态变化通知
  if (order) {
    await sendOrderStatusNotification(order, status);
  }
  
  return getOrderById(id);
}

// 发送订单状态变化通知
async function sendOrderStatusNotification(order, newStatus) {
  const clientId = order.client_id;
  const guardianId = order.guardian_id;
  
  // 获取用户的通知设置
  const clientProfile = await db.get(
    'SELECT notification_settings FROM client_profiles WHERE user_id = :user_id',
    { user_id: clientId }
  );
  
  const notificationSettings = clientProfile?.notification_settings 
    ? JSON.parse(clientProfile.notification_settings) 
    : [];
  
  // 定义状态对应的通知类型和内容
  const statusNotifications = {
    'preparing': {
      eventType: 'order_preparing',
      title: '备餐提醒',
      content: `您的订单 ${order.order_number} 商家已开始准备，请耐心等待`
    },
    'delivering': {
      eventType: 'order_delivering',
      title: '配送提醒',
      content: `您的订单 ${order.order_number} 已开始配送，预计很快送达`
    },
    'delivered': {
      eventType: 'order_delivered',
      title: '送达提醒',
      content: `您的订单 ${order.order_number} 已送达，请及时享用美食`
    }
  };
  
  const notification = statusNotifications[newStatus];
  if (!notification) return;
  
  // 检查用户是否开启了该类型的通知
  if (!notificationSettings.includes(notification.eventType)) {
    return;
  }
  
  const basePayload = {
    title: notification.title,
    content: notification.content,
    channel: 'in_app',
    status: 'unread',
    event_type: notification.eventType,
    related_id: order.id,
    severity: 'info'
  };
  
  // 发送给客户端用户
  await db.run(
    `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, related_id, severity)
     VALUES (:user_id, :role, :title, :content, :channel, :status, :event_type, :related_id, :severity)`,
    { ...basePayload, user_id: clientId, role: 'client' }
  );
  
  // 发送给监护人
  if (guardianId) {
    await db.run(
      `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, related_id, severity)
       VALUES (:user_id, :role, :title, :content, :channel, :status, :event_type, :related_id, :severity)`,
      { ...basePayload, user_id: guardianId, role: 'guardian' }
    );
  }
}

async function formatOrderRow(row) {
  const items = (await db.all('SELECT * FROM order_items WHERE order_id = :order_id', { order_id: row.id })).map((item) => ({
    id: item.id,
    dish_id: item.dish_id,
    dish_name: item.dish_name,
    quantity: item.quantity,
    price: item.price,
    nutrition: item.nutrition ? JSON.parse(item.nutrition) : null
  }));
  return {
    ...row,
    store: row.store_id
      ? { id: row.store_id, name: row.store_name || null, location: row.store_location || null }
      : null,
    community: row.community_id
      ? {
          id: row.community_id,
          code: row.community_code || null,
          name: row.community_name || row.community_display_name || null
        }
      : null,
    items
  };
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  formatOrderRow
};
