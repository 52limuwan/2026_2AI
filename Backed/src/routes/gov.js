const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');

const router = express.Router();

router.use(authRequired, requireRole('gov'));

// 辅助函数：获取政府用户的社区ID列表
async function getGovCommunityIds(govUserId) {
  const scopes = await db.all(
    `SELECT community_id FROM gov_scopes WHERE gov_user_id = :gov_user_id`,
    { gov_user_id: govUserId }
  );
  
  // 如果没有指定范围，返回null表示可以访问所有社区（超级管理员）
  if (scopes.length === 0) {
    return null;
  }
  
  return scopes.map(s => s.community_id);
}

// 辅助函数：构建社区筛选SQL
function buildCommunityFilter(communityIds, tableAlias = 'u') {
  if (!communityIds) {
    // 超级管理员，不需要筛选
    return { filter: '', params: {} };
  }
  
  if (communityIds.length === 0) {
    // 没有任何社区权限
    return { filter: ` AND 1=0`, params: {} };
  }
  
  if (communityIds.length === 1) {
    return { 
      filter: ` AND ${tableAlias}.community_id = :community_id`, 
      params: { community_id: communityIds[0] } 
    };
  }
  
  // 多个社区
  const placeholders = communityIds.map((_, i) => `:community_id_${i}`).join(',');
  const params = {};
  communityIds.forEach((id, i) => {
    params[`community_id_${i}`] = id;
  });
  
  return { 
    filter: ` AND ${tableAlias}.community_id IN (${placeholders})`, 
    params 
  };
}

// 获取政府用户可管理的社区列表
router.get('/communities', async (req, res) => {
  try {
    // 获取当前政府用户的管理范围
    const scopes = await db.all(
      `SELECT c.id, c.code, c.name, c.region, gs.role_in_scope
       FROM gov_scopes gs
       JOIN communities c ON c.id = gs.community_id
       WHERE gs.gov_user_id = :gov_user_id AND c.status = 'active'
       ORDER BY c.name`,
      { gov_user_id: req.user.id }
    );
    
    // 如果没有指定范围，返回所有社区（用于超级管理员）
    let communities = [];
    if (scopes.length === 0) {
      communities = await db.all(
        `SELECT id, code, name, region FROM communities WHERE status = 'active' ORDER BY name`
      );
    } else {
      communities = scopes;
    }
    
    // 为每个社区添加用户数量统计
    for (const community of communities) {
      const clientCount = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE community_id = ? AND role = "client"',
        community.id
      );
      community.client_count = clientCount?.count || 0;
    }
    
    return success(res, { communities });
  } catch (err) {
    console.error('获取社区列表失败:', err);
    return failure(res, '获取社区列表失败', 500);
  }
});

// 切换当前社区
router.post('/switch-community', async (req, res) => {
  try {
    const { community_id } = req.body;
    if (!community_id) return failure(res, '缺少社区ID');
    
    // 验证是否有权限管理该社区
    const scope = await db.get(
      `SELECT 1 FROM gov_scopes WHERE gov_user_id = :gov_user_id AND community_id = :community_id`,
      { gov_user_id: req.user.id, community_id }
    );
    
    if (!scope) {
      // 如果没有指定范围，允许访问所有社区（超级管理员）
      const exists = await db.get('SELECT 1 FROM communities WHERE id = :community_id', { community_id });
      if (!exists) return failure(res, '社区不存在', 404);
    }
    
    // 将当前选择的社区保存到用户偏好中（可以创建一个新表或者使用preferences字段）
    const preferences = req.user.preferences ? JSON.parse(req.user.preferences) : {};
    preferences.current_community_id = community_id;
    
    await db.run(
      'UPDATE users SET preferences = :preferences WHERE id = :user_id',
      { preferences: JSON.stringify(preferences), user_id: req.user.id }
    );
    
    return success(res, { community_id }, '已切换社区');
  } catch (err) {
    console.error('切换社区失败:', err);
    return failure(res, '切换社区失败', 500);
  }
});

// 获取首页概览（重要信息、统计数据）
router.get('/dashboard', async (req, res) => {
  try {
    const { community_id } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    
    // 构建社区筛选条件
    let communityFilter = '';
    const params = {};
    
    if (community_id) {
      communityFilter = ' AND u.community_id = :community_id';
      params.community_id = community_id;
    } else {
      // 如果没有指定社区，获取用户偏好中的社区
      const user = await db.get('SELECT preferences FROM users WHERE id = :user_id', { user_id: req.user.id });
      if (user?.preferences) {
        const prefs = JSON.parse(user.preferences);
        if (prefs.current_community_id) {
          communityFilter = ' AND u.community_id = :community_id';
          params.community_id = prefs.current_community_id;
        }
      }
    }
    
    // 总用户数
    const totalClients = await db.get(
      `SELECT COUNT(*) as count FROM users u WHERE u.role = 'client'${communityFilter}`,
      params
    );
    
    // 高风险用户数
    const highRisk = await db.get(
      `SELECT COUNT(*) as count FROM users u
       JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.role = 'client' AND cp.risk_flags IS NOT NULL AND cp.risk_flags != ''${communityFilter}`,
      params
    );
    
    // 今日新增订单数
    const todayOrders = await db.get(
      `SELECT COUNT(*) as count FROM orders o
       JOIN users u ON u.id = o.client_id
       WHERE date(o.created_at) = :today${community_id ? ' AND o.community_id = :community_id' : ''}`,
      { ...params, today }
    );
    
    // 今日预警数（今日新增的风险事件）
    const todayWarnings = await db.get(
      `SELECT COUNT(*) as count FROM risk_events re
       JOIN users u ON u.id = re.client_id
       WHERE date(re.created_at) = :today AND re.status = 'open'${communityFilter}`,
      { ...params, today }
    );
    
    // 营养异常用户数（今日摄入量超过正常范围的用户）
    const nutritionAbnormal = await db.all(
      `SELECT nid.client_id, u.name, nid.totals
       FROM nutrition_intake_daily nid
       JOIN users u ON u.id = nid.client_id
       WHERE nid.date = :today${communityFilter}`,
      { ...params, today }
    );
    
    let abnormalCount = 0;
    const abnormalList = [];
    for (const record of nutritionAbnormal) {
      const totals = record.totals ? JSON.parse(record.totals) : {};
      const calories = Number(totals.calories || 0);
      // 假设正常范围是 1500-2500 卡路里
      if (calories < 1000 || calories > 3000) {
        abnormalCount++;
        abnormalList.push({
          client_id: record.client_id,
          name: record.name,
          calories,
          reason: calories < 1000 ? '摄入不足' : '摄入过量'
        });
      }
    }
    
    // 饮食多样性差的用户（近7天尝试的菜品种类少于5种）
    const lowDiversityUsers = await db.all(
      `SELECT DISTINCT o.client_id, u.name, COUNT(DISTINCT oi.dish_id) as dish_count
       FROM orders o
       JOIN users u ON u.id = o.client_id
       JOIN order_items oi ON oi.order_id = o.id
       WHERE date(o.created_at) >= date('now', '-7 days')
       AND o.status IN ('placed', 'preparing', 'delivering', 'delivered')
       ${community_id ? ' AND o.community_id = :community_id' : communityFilter.replace('u.', 'o.')}
       GROUP BY o.client_id, u.name
       HAVING dish_count < 5`,
      params
    );
    
    // 获取最近的预警事件
    const recentWarnings = await db.all(
      `SELECT re.*, u.name as client_name, u.phone, cp.age, rr.name as rule_name, rr.severity
       FROM risk_events re
       JOIN users u ON u.id = re.client_id
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       LEFT JOIN risk_rules rr ON rr.id = re.rule_id
       WHERE re.status = 'open'${communityFilter}
       ORDER BY re.created_at DESC
       LIMIT 10`,
      params
    );
    
    // 获取今日营养摄入汇总（平均值）
    const avgNutrition = await db.all(
      `SELECT AVG(JSON_EXTRACT(totals, '$.calories')) as avg_calories,
              AVG(JSON_EXTRACT(totals, '$.protein')) as avg_protein,
              AVG(JSON_EXTRACT(totals, '$.fat')) as avg_fat,
              AVG(JSON_EXTRACT(totals, '$.carbs')) as avg_carbs
       FROM nutrition_intake_daily nid
       JOIN users u ON u.id = nid.client_id
       WHERE nid.date = :today${communityFilter}`,
      { ...params, today }
    );
    
    const dashboard = {
      summary: {
        totalClients: totalClients?.count || 0,
        highRisk: highRisk?.count || 0,
        todayOrders: todayOrders?.count || 0,
        todayWarnings: todayWarnings?.count || 0,
        nutritionAbnormal: abnormalCount,
        lowDiversityUsers: lowDiversityUsers.length
      },
      recentWarnings: recentWarnings.map(w => ({
        id: w.id,
        client_id: w.client_id,
        client_name: w.client_name,
        rule_name: w.rule_name,
        severity: w.severity,
        triggered_at: w.triggered_at,
        data_snapshot: w.data_snapshot ? JSON.parse(w.data_snapshot) : null
      })),
      nutritionAbnormalList: abnormalList,
      lowDiversityUsers: lowDiversityUsers,
      avgNutrition: avgNutrition[0] || {
        avg_calories: 0,
        avg_protein: 0,
        avg_fat: 0,
        avg_carbs: 0
      }
    };
    
    return success(res, { dashboard });
  } catch (err) {
    console.error('获取首页概览失败:', err);
    return failure(res, '获取首页概览失败: ' + err.message, 500);
  }
});

// 获取当前社区的用户列表（支持筛选）
router.get('/clients', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    // 获取政府用户的社区权限
    const communityIds = await getGovCommunityIds(req.user.id);
    const { filter: communityFilter, params: communityParams } = buildCommunityFilter(communityIds);
    
    const params = { ...communityParams };
    
    let keywordFilter = '';
    if (keyword) {
      keywordFilter = ' AND (u.name LIKE :keyword OR u.phone LIKE :keyword OR u.id_card LIKE :keyword)';
      params.keyword = `%${keyword}%`;
    }
    
    const rows = await db.all(
      `SELECT u.id, u.name, u.phone, u.id_card, u.community_id, c.name as community_name,
              cp.age, cp.gender, cp.address, cp.health_conditions, cp.diet_preferences, cp.risk_flags,
              COUNT(DISTINCT o.id) as order_count,
              MAX(o.created_at) as last_order_time
       FROM users u
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       LEFT JOIN communities c ON c.id = u.community_id
       LEFT JOIN orders o ON o.client_id = u.id
       WHERE u.role = 'client'${communityFilter}${keywordFilter}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 300`,
      params
    );
    
    return success(res, { clients: rows });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    return failure(res, '获取用户列表失败', 500);
  }
});

// 获取用户的监护人信息
router.get('/clients/:id/guardians', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证政府用户是否有权限访问该客户
    const client = await db.get('SELECT community_id FROM users WHERE id = :id AND role = "client"', { id });
    if (!client) {
      return failure(res, '用户不存在', 404);
    }
    
    // 检查社区权限
    const communityIds = await getGovCommunityIds(req.user.id);
    if (communityIds && !communityIds.includes(client.community_id)) {
      return failure(res, '无权限访问该用户', 403);
    }
    
    // 获取监护人信息
    const guardians = await db.all(
      `SELECT u.id, u.name, u.phone, u.id_card, gcl.relation, gcl.bind_id_card, gcl.bind_phone
       FROM guardian_client_links gcl
       JOIN users u ON u.id = gcl.guardian_id
       WHERE gcl.client_id = :client_id AND gcl.status = 'active'`,
      { client_id: id }
    );
    
    // 如果bind_id_card为空，使用监护人自己的id_card
    const processedGuardians = guardians.map(g => ({
      ...g,
      bind_id_card: g.bind_id_card || g.id_card
    }));
    
    return success(res, { guardians: processedGuardians });
  } catch (err) {
    console.error('获取监护人信息失败:', err);
    return failure(res, '获取监护人信息失败', 500);
  }
});

// 获取用户详情（包含营养数据、订单历史等）
router.get('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;
    
    // 获取用户基本信息
    const user = await db.get(
      `SELECT u.*, c.name as community_name, cp.*
       FROM users u
       LEFT JOIN communities c ON c.id = u.community_id
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.id = :id AND u.role = 'client'`,
      { id }
    );
    
    if (!user) {
      return failure(res, '用户不存在', 404);
    }
    
    // 验证社区权限
    const communityIds = await getGovCommunityIds(req.user.id);
    if (communityIds && !communityIds.includes(user.community_id)) {
      return failure(res, '无权限访问该用户', 403);
    }
    if (!user) {
      return failure(res, '用户不存在', 404);
    }
    
    // 获取监护人信息
    const guardians = await db.all(
      `SELECT u.id, u.name, u.phone, u.id_card, gcl.relation, gcl.bind_id_card, gcl.bind_phone
       FROM guardian_client_links gcl
       JOIN users u ON u.id = gcl.guardian_id
       WHERE gcl.client_id = :client_id AND gcl.status = 'active'`,
      { client_id: id }
    );
    
    // 如果bind_id_card为空，使用监护人自己的id_card
    const processedGuardians = guardians.map(g => ({
      ...g,
      bind_id_card: g.bind_id_card || g.id_card
    }));
    
    // 获取最近的订单（使用服务函数确保包含完整信息）
    const { listOrders, getOrderById } = require('../services/orders');
    const recentOrdersRaw = await db.all(
      `SELECT o.id FROM orders o
       WHERE o.client_id = :client_id
       ORDER BY o.created_at DESC
       LIMIT 20`,
      { client_id: id }
    );
    
    const recentOrders = [];
    for (const orderRow of recentOrdersRaw) {
      const fullOrder = await getOrderById(orderRow.id);
      if (fullOrder) {
        recentOrders.push(fullOrder);
      }
    }
    
    // 获取最近N天的营养摄入数据
    const nutritionData = [];
    const endDate = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      
      const intake = await db.get(
        `SELECT * FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: id, date: dateStr }
      );
      
      if (intake) {
        const totals = intake.totals ? JSON.parse(intake.totals) : {};
        nutritionData.push({
          date: dateStr,
          ...totals
        });
      } else {
        nutritionData.push({
          date: dateStr,
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
          fiber: 0
        });
      }
    }
    
    // 计算平均摄入量
    const avgNutrition = nutritionData.reduce((acc, day) => {
      acc.calories += day.calories || 0;
      acc.protein += day.protein || 0;
      acc.fat += day.fat || 0;
      acc.carbs += day.carbs || 0;
      acc.fiber += day.fiber || 0;
      return acc;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });
    
    const daysCount = nutritionData.length || 1;
    Object.keys(avgNutrition).forEach(key => {
      avgNutrition[key] = Math.round(avgNutrition[key] / daysCount * 10) / 10;
    });
    
    // 获取风险事件
    const riskEvents = await db.all(
      `SELECT re.*, rr.name as rule_name, rr.severity
       FROM risk_events re
       LEFT JOIN risk_rules rr ON rr.id = re.rule_id
       WHERE re.client_id = :client_id
       ORDER BY re.created_at DESC
       LIMIT 20`,
      { client_id: id }
    );
    
    // 统计饮食多样性（最近7天尝试的菜品种类）
    const dishDiversity = await db.all(
      `SELECT COUNT(DISTINCT oi.dish_id) as dish_count
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.client_id = :client_id
       AND date(o.created_at) >= date('now', '-7 days')
       AND o.status IN ('placed', 'preparing', 'delivering', 'delivered')`,
      { client_id: id }
    );
    
    const clientDetail = {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        id_card: user.id_card,
        community_id: user.community_id,
        community_name: user.community_name,
        age: user.age,
        gender: user.gender,
        address: user.address,
        health_conditions: user.health_conditions,
        diet_preferences: user.diet_preferences,
        risk_flags: user.risk_flags
      },
      guardians: processedGuardians,
      recentOrders,
      nutritionData,
      avgNutrition,
      riskEvents: riskEvents.map(re => ({
        ...re,
        data_snapshot: re.data_snapshot ? JSON.parse(re.data_snapshot) : null
      })),
      dishDiversity: dishDiversity[0]?.dish_count || 0
    };
    
    return success(res, { client: clientDetail });
  } catch (err) {
    console.error('获取用户详情失败:', err);
    return failure(res, '获取用户详情失败: ' + err.message, 500);
  }
});

router.put('/clients/:id', async (req, res) => {
  const { address, chronic_conditions, risk_flags, elder_mode, community_id, community_code } = req.body;
  const updates = [];
  const params = { user_id: req.params.id };
  
  // 更新client_profiles
  if (address !== undefined || chronic_conditions !== undefined || risk_flags !== undefined || elder_mode !== undefined) {
    const profileUpdates = [];
    if (address !== undefined) {
      profileUpdates.push('address = :address');
      params.address = address;
    }
    if (chronic_conditions !== undefined) {
      profileUpdates.push('chronic_conditions = :chronic_conditions');
      params.chronic_conditions = chronic_conditions;
    }
    if (risk_flags !== undefined) {
      profileUpdates.push('risk_flags = :risk_flags');
      params.risk_flags = risk_flags;
    }
    if (elder_mode !== undefined) {
      profileUpdates.push('elder_mode = :elder_mode');
      params.elder_mode = typeof elder_mode === 'boolean' ? (elder_mode ? 1 : 0) : elder_mode;
    }
    profileUpdates.push('updated_at = CURRENT_TIMESTAMP');
    
    await db.run(
      `UPDATE client_profiles SET ${profileUpdates.join(', ')} WHERE user_id = :user_id`,
      params
    );
  }
  
  // 更新users表的社区信息
  if (community_id !== undefined || community_code !== undefined) {
    const userUpdates = [];
    if (community_id !== undefined) {
      userUpdates.push('community_id = :community_id');
      params.community_id = community_id;
    }
    if (community_code !== undefined) {
      userUpdates.push('community_code = :community_code');
      params.community_code = community_code;
    }
    userUpdates.push('updated_at = CURRENT_TIMESTAMP');
    
    await db.run(
      `UPDATE users SET ${userUpdates.join(', ')} WHERE id = :user_id`,
      params
    );
  }
  
  const client = await db.get('SELECT * FROM client_profiles WHERE user_id = :user_id', { user_id: req.params.id });
  return success(res, { client }, '档案已更新');
});

// 处理风险事件（标记为已解决）
router.patch('/risk-events/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取风险事件信息
    const event = await db.get('SELECT * FROM risk_events WHERE id = :id', { id });
    if (!event) {
      return failure(res, '风险事件不存在', 404);
    }
    
    // 验证政府用户是否有权限访问该客户
    const client = await db.get('SELECT community_id FROM users WHERE id = :id AND role = "client"', { id: event.client_id });
    if (!client) {
      return failure(res, '用户不存在', 404);
    }
    
    // 检查社区权限
    const communityIds = await getGovCommunityIds(req.user.id);
    if (communityIds && !communityIds.includes(client.community_id)) {
      return failure(res, '无权限访问该用户', 403);
    }
    
    // 更新风险事件状态为已解决
    await db.run(
      `UPDATE risk_events SET status = 'resolved', resolved_at = :resolved_at, resolved_by = :resolved_by WHERE id = :id`,
      {
        id,
        resolved_at: new Date().toISOString(),
        resolved_by: req.user.id
      }
    );
    
    return success(res, {}, '风险事件已标记为已处理');
  } catch (err) {
    console.error('处理风险事件失败:', err);
    return failure(res, '处理风险事件失败: ' + err.message, 500);
  }
});

// 人工风险提示和优化（选择用户或监护人ID，推送通知）
router.post('/risk-intervention', async (req, res) => {
  try {
    const { clientId, guardianId = null, content, actionPlan = '', severity = 'medium' } = req.body;
    if (!clientId && !guardianId) return failure(res, '缺少用户ID或监护人ID');
    if (!content) return failure(res, '缺少提示内容');
    
    // 如果提供了clientId，找到所有关联的监护人
    let guardianIds = [];
    if (guardianId) {
      guardianIds = [guardianId];
    } else if (clientId) {
      const links = await db.all(
        `SELECT guardian_id FROM guardian_client_links WHERE client_id = :client_id AND status = 'active'`,
        { client_id: clientId }
      );
      guardianIds = links.map(l => l.guardian_id);
    }
    
    // 创建干预记录
    let riskEventId = null;
    if (clientId) {
      // 如果有clientId，创建一个风险事件（如果没有对应的自动检测规则）
      const result = await db.run(
        `INSERT INTO risk_events (client_id, community_id, rule_id, status, triggered_at, data_snapshot, assigned_gov_user_id)
         VALUES (:client_id, :community_id, NULL, 'open', :triggered_at, :data_snapshot, :gov_user_id)`,
        {
          client_id: clientId,
          community_id: null, // 可以从用户信息获取
          triggered_at: new Date().toISOString(),
          data_snapshot: JSON.stringify({ manual_intervention: true, content, actionPlan }),
          gov_user_id: req.user.id
        }
      );
      riskEventId = result.lastInsertRowid;
      
      // 创建干预记录
      await db.run(
        `INSERT INTO interventions (risk_event_id, gov_user_id, suggestion, action_plan, status, notified_at)
         VALUES (:risk_event_id, :gov_user_id, :suggestion, :action_plan, 'sent', :notified_at)`,
        {
          risk_event_id: riskEventId,
          gov_user_id: req.user.id,
          suggestion: content,
          action_plan: actionPlan,
          notified_at: new Date().toISOString()
        }
      );
    }
    
    // 发送通知给销售端用户
    if (clientId) {
      await db.run(
        `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, related_id, severity)
         VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', :event_type, :related_id, :severity)`,
        {
          user_id: clientId,
          role: 'client',
          title: '健康风险提示',
          content: content + (actionPlan ? `\n建议措施：${actionPlan}` : ''),
          event_type: 'risk_intervention',
          related_id: riskEventId,
          severity
        }
      );
    }
    
    // 发送通知给所有关联的监护人
    for (const gid of guardianIds) {
      await db.run(
        `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, related_id, severity)
         VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', :event_type, :related_id, :severity)`,
        {
          user_id: gid,
          role: 'guardian',
          title: '被监护人健康风险提示',
          content: content + (actionPlan ? `\n建议措施：${actionPlan}` : ''),
          event_type: 'risk_intervention',
          related_id: riskEventId,
          severity
        }
      );
    }
    
    return success(res, { 
      riskEventId,
      notifiedClients: clientId ? 1 : 0,
      notifiedGuardians: guardianIds.length 
    }, '风险提示已推送');
  } catch (err) {
    console.error('创建风险干预失败:', err);
    return failure(res, '创建风险干预失败: ' + err.message, 500);
  }
});

// 数据统计页面（按社区筛选，支持多种统计维度）
router.get('/data/statistics', async (req, res) => {
  try {
    const { community_id, start_date, end_date, type = 'overview' } = req.query;
    
    let communityFilter = '';
    const params = {};
    
    if (community_id) {
      communityFilter = ' AND u.community_id = :community_id';
      params.community_id = community_id;
    }
    
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = ' AND date(o.created_at) BETWEEN :start_date AND :end_date';
      params.start_date = start_date;
      params.end_date = end_date;
    } else {
      // 默认最近30天
      dateFilter = " AND date(o.created_at) >= date('now', '-30 days')";
    }
    
    let statistics = {};
    
    if (type === 'overview' || type === 'all') {
      // 总体统计
      const totalStats = await db.get(
        `SELECT 
          COUNT(DISTINCT o.client_id) as active_users,
          COUNT(DISTINCT o.id) as total_orders,
          SUM(o.total_amount) as total_revenue,
          AVG(o.total_amount) as avg_order_amount
         FROM orders o
         JOIN users u ON u.id = o.client_id
         WHERE o.status IN ('placed', 'preparing', 'delivering', 'delivered')${communityFilter}${dateFilter}`,
        params
      );
      
      statistics.total = {
        activeUsers: totalStats?.active_users || 0,
        totalOrders: totalStats?.total_orders || 0,
        totalRevenue: totalStats?.total_revenue || 0,
        avgOrderAmount: totalStats?.avg_order_amount || 0
      };
    }
    
    if (type === 'nutrition' || type === 'all') {
      // 营养统计分析
      const nutritionStats = await db.all(
        `SELECT 
          AVG(JSON_EXTRACT(nid.totals, '$.calories')) as avg_calories,
          AVG(JSON_EXTRACT(nid.totals, '$.protein')) as avg_protein,
          AVG(JSON_EXTRACT(nid.totals, '$.fat')) as avg_fat,
          AVG(JSON_EXTRACT(nid.totals, '$.carbs')) as avg_carbs,
          AVG(JSON_EXTRACT(nid.totals, '$.fiber')) as avg_fiber,
          nid.date
         FROM nutrition_intake_daily nid
         JOIN users u ON u.id = nid.client_id
         WHERE nid.date >= date('now', '-30 days')${communityFilter}
         GROUP BY nid.date
         ORDER BY nid.date DESC`,
        params
      );
      
      statistics.nutrition = nutritionStats.map(stat => ({
        date: stat.date,
        avgCalories: Math.round(stat.avg_calories || 0),
        avgProtein: Math.round(stat.avg_protein || 0),
        avgFat: Math.round(stat.avg_fat || 0),
        avgCarbs: Math.round(stat.avg_carbs || 0),
        avgFiber: Math.round(stat.avg_fiber || 0)
      }));
    }
    
    if (type === 'risk' || type === 'all') {
      // 风险事件统计
      const riskStats = await db.all(
        `SELECT 
          COUNT(*) as count,
          rr.severity,
          rr.name as rule_name
         FROM risk_events re
         JOIN users u ON u.id = re.client_id
         LEFT JOIN risk_rules rr ON rr.id = re.rule_id
         WHERE re.created_at >= date('now', '-30 days')${communityFilter}
         GROUP BY rr.severity, rr.name
         ORDER BY count DESC`,
        params
      );
      
      statistics.risk = riskStats.map(stat => ({
        severity: stat.severity || 'unknown',
        ruleName: stat.rule_name || '人工干预',
        count: stat.count || 0
      }));
    }
    
    if (type === 'orders' || type === 'all') {
      // 订单趋势统计（按日期）
      const orderTrends = await db.all(
        `SELECT 
          date(o.created_at) as date,
          COUNT(*) as order_count,
          SUM(o.total_amount) as daily_revenue
         FROM orders o
         JOIN users u ON u.id = o.client_id
         WHERE o.status IN ('placed', 'preparing', 'delivering', 'delivered')${communityFilter}${dateFilter}
         GROUP BY date(o.created_at)
         ORDER BY date(o.created_at) DESC`,
        params
      );
      
      statistics.orderTrends = orderTrends.map(trend => ({
        date: trend.date,
        orderCount: trend.order_count || 0,
        dailyRevenue: trend.daily_revenue || 0
      }));
    }
    
    return success(res, { statistics });
  } catch (err) {
    console.error('获取统计数据失败:', err);
    return failure(res, '获取统计数据失败: ' + err.message, 500);
  }
});

// 系统自动预警检测（检测营养异常、饮食多样性等）
router.post('/risk-detection/run', async (req, res) => {
  try {
    const { community_id } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    
    let communityFilter = '';
    const params = {};
    
    if (community_id) {
      communityFilter = ' AND u.community_id = :community_id';
      params.community_id = community_id;
    }
    
    // 获取或创建风险规则
    const getOrCreateRule = async (code, name, severity, condition) => {
      let rule = await db.get('SELECT id FROM risk_rules WHERE code = :code', { code });
      if (!rule) {
        const result = await db.run(
          `INSERT INTO risk_rules (code, name, severity, condition_json, enabled)
           VALUES (:code, :name, :severity, :condition_json, 1)`,
          { code, name, severity, condition_json: JSON.stringify(condition) }
        );
        rule = { id: result.lastInsertRowid };
      }
      return rule.id;
    };
    
    const warnings = [];
    
    // 1. 检测营养摄入异常（今日摄入量超过正常范围）
    const nutritionAbnormal = await db.all(
      `SELECT nid.client_id, u.name, u.community_id, nid.totals
       FROM nutrition_intake_daily nid
       JOIN users u ON u.id = nid.client_id
       WHERE nid.date = :today${communityFilter}`,
      { ...params, today }
    );
    
    for (const record of nutritionAbnormal) {
      const totals = record.totals ? JSON.parse(record.totals) : {};
      const calories = Number(totals.calories || 0);
      const protein = Number(totals.protein || 0);
      
      // 检测卡路里异常（正常范围：1500-2500）
      if (calories < 1000) {
        const ruleId = await getOrCreateRule(
          'nutrition_low_calories',
          '营养摄入不足',
          'high',
          { min_calories: 1000, actual: calories }
        );
        
        const existing = await db.get(
          `SELECT id FROM risk_events 
           WHERE client_id = :client_id AND rule_id = :rule_id 
           AND date(triggered_at) = :today AND status = 'open'`,
          { client_id: record.client_id, rule_id: ruleId, today }
        );
        
        if (!existing) {
          const result = await db.run(
            `INSERT INTO risk_events (client_id, community_id, rule_id, status, triggered_at, data_snapshot)
             VALUES (:client_id, :community_id, :rule_id, 'open', :triggered_at, :data_snapshot)`,
            {
              client_id: record.client_id,
              community_id: record.community_id,
              rule_id: ruleId,
              triggered_at: new Date().toISOString(),
              data_snapshot: JSON.stringify({ calories, reason: '摄入不足' })
            }
          );
          
          warnings.push({
            type: 'nutrition_low_calories',
            client_id: record.client_id,
            client_name: record.name,
            message: `用户 ${record.name} 今日摄入热量仅 ${calories.toFixed(0)} 卡路里，低于正常范围`
          });
          
          // 发送通知给销售端和监护人
          await sendRiskNotification(record.client_id, '营养摄入不足', 
            `您今日摄入热量仅 ${calories.toFixed(0)} 卡路里，低于正常范围（1500-2500卡路里），建议增加营养摄入。`);
        }
      } else if (calories > 3000) {
        const ruleId = await getOrCreateRule(
          'nutrition_high_calories',
          '营养摄入过量',
          'medium',
          { max_calories: 3000, actual: calories }
        );
        
        const existing = await db.get(
          `SELECT id FROM risk_events 
           WHERE client_id = :client_id AND rule_id = :rule_id 
           AND date(triggered_at) = :today AND status = 'open'`,
          { client_id: record.client_id, rule_id: ruleId, today }
        );
        
        if (!existing) {
          await db.run(
            `INSERT INTO risk_events (client_id, community_id, rule_id, status, triggered_at, data_snapshot)
             VALUES (:client_id, :community_id, :rule_id, 'open', :triggered_at, :data_snapshot)`,
            {
              client_id: record.client_id,
              community_id: record.community_id,
              rule_id: ruleId,
              triggered_at: new Date().toISOString(),
              data_snapshot: JSON.stringify({ calories, reason: '摄入过量' })
            }
          );
          
          warnings.push({
            type: 'nutrition_high_calories',
            client_id: record.client_id,
            client_name: record.name,
            message: `用户 ${record.name} 今日摄入热量 ${calories.toFixed(0)} 卡路里，超过正常范围`
          });
          
          await sendRiskNotification(record.client_id, '营养摄入过量', 
            `您今日摄入热量 ${calories.toFixed(0)} 卡路里，超过正常范围（1500-2500卡路里），建议适当控制饮食。`);
        }
      }
      
      // 检测蛋白质摄入不足（正常范围：50-80g）
      if (protein < 30) {
        const ruleId = await getOrCreateRule(
          'nutrition_low_protein',
          '蛋白质摄入不足',
          'medium',
          { min_protein: 30, actual: protein }
        );
        
        const existing = await db.get(
          `SELECT id FROM risk_events 
           WHERE client_id = :client_id AND rule_id = :rule_id 
           AND date(triggered_at) = :today AND status = 'open'`,
          { client_id: record.client_id, rule_id: ruleId, today }
        );
        
        if (!existing) {
          await db.run(
            `INSERT INTO risk_events (client_id, community_id, rule_id, status, triggered_at, data_snapshot)
             VALUES (:client_id, :community_id, :rule_id, 'open', :triggered_at, :data_snapshot)`,
            {
              client_id: record.client_id,
              community_id: record.community_id,
              rule_id: ruleId,
              triggered_at: new Date().toISOString(),
              data_snapshot: JSON.stringify({ protein, reason: '蛋白质摄入不足' })
            }
          );
          
          warnings.push({
            type: 'nutrition_low_protein',
            client_id: record.client_id,
            client_name: record.name,
            message: `用户 ${record.name} 今日蛋白质摄入仅 ${protein.toFixed(1)}g，低于正常范围`
          });
          
          await sendRiskNotification(record.client_id, '蛋白质摄入不足', 
            `您今日蛋白质摄入仅 ${protein.toFixed(1)}g，低于正常范围（50-80g），建议增加优质蛋白质摄入。`);
        }
      }
    }
    
    // 2. 检测饮食多样性不足（最近7天尝试的菜品种类少于5种）
    const lowDiversity = await db.all(
      `SELECT o.client_id, u.name, u.community_id, COUNT(DISTINCT oi.dish_id) as dish_count
       FROM orders o
       JOIN users u ON u.id = o.client_id
       JOIN order_items oi ON oi.order_id = o.id
       WHERE date(o.created_at) >= date('now', '-7 days')
       AND o.status IN ('placed', 'preparing', 'delivering', 'delivered')${communityFilter}
       GROUP BY o.client_id, u.name, u.community_id
       HAVING dish_count < 5`,
      params
    );
    
    for (const record of lowDiversity) {
      const ruleId = await getOrCreateRule(
        'diet_low_diversity',
        '饮食多样性不足',
        'low',
        { min_dishes: 5, actual: record.dish_count }
      );
      
      const existing = await db.get(
        `SELECT id FROM risk_events 
         WHERE client_id = :client_id AND rule_id = :rule_id 
         AND date(triggered_at) >= date('now', '-1 days') AND status = 'open'`,
        { client_id: record.client_id, rule_id: ruleId }
      );
      
      if (!existing) {
        await db.run(
          `INSERT INTO risk_events (client_id, community_id, rule_id, status, triggered_at, data_snapshot)
           VALUES (:client_id, :community_id, :rule_id, 'open', :triggered_at, :data_snapshot)`,
          {
            client_id: record.client_id,
            community_id: record.community_id,
            rule_id: ruleId,
            triggered_at: new Date().toISOString(),
            data_snapshot: JSON.stringify({ dish_count: record.dish_count, reason: '饮食多样性不足' })
          }
        );
        
        warnings.push({
          type: 'diet_low_diversity',
          client_id: record.client_id,
          client_name: record.name,
          message: `用户 ${record.name} 近7天仅尝试了 ${record.dish_count} 种菜品，饮食多样性不足`
        });
        
        await sendRiskNotification(record.client_id, '饮食多样性不足', 
          `您近7天仅尝试了 ${record.dish_count} 种不同菜品，建议增加饮食多样性，尝试更多种类的食物。`);
      }
    }
    
    return success(res, { 
      warnings,
      total: warnings.length,
      timestamp: new Date().toISOString()
    }, `检测完成，发现 ${warnings.length} 个预警`);
  } catch (err) {
    console.error('风险检测失败:', err);
    return failure(res, '风险检测失败: ' + err.message, 500);
  }
});

// 辅助函数：发送风险通知
async function sendRiskNotification(clientId, title, content) {
  // 发送给销售端用户
  await db.run(
    `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
     VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'risk_warning', 'high')`,
    { user_id: clientId, role: 'client', title, content }
  );
  
  // 发送给所有关联的监护人
  const guardians = await db.all(
    `SELECT guardian_id FROM guardian_client_links WHERE client_id = :client_id AND status = 'active'`,
    { client_id: clientId }
  );
  
  for (const g of guardians) {
    await db.run(
      `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
       VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'risk_warning', 'high')`,
      { user_id: g.guardian_id, role: 'guardian', title: `被监护人${title}`, content }
    );
  }
}

// AI 生成健康建议
router.post('/suggestions/generate-ai', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return failure(res, '缺少用户ID');

    const { generateHealthSuggestion } = require('../services/aiService');
    const { getPastDays } = require('../utils/dateHelper');

    console.log(`\n[GOV] 政府用户 ${req.user.id} 为用户 ${clientId} 生成健康建议`);

    // 获取用户基本信息
    const client = await db.get(
      `SELECT u.id, u.name, u.phone, cp.age, cp.gender, cp.chronic_conditions, cp.taste_preferences, cp.risk_flags
       FROM users u
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.id = :id AND u.role = 'client'`,
      { id: clientId }
    );

    if (!client) {
      return failure(res, '用户不存在', 404);
    }

    // 获取近7天的营养数据
    const days = getPastDays(7);
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let totalFiber = 0;
    let dayCount = 0;

    for (const date of days) {
      const intakeRecord = await db.get(
        `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: clientId, date }
      );

      if (intakeRecord && intakeRecord.totals) {
        const totals = JSON.parse(intakeRecord.totals);
        totalCalories += Number(totals.calories || 0);
        totalProtein += Number(totals.protein || 0);
        totalFat += Number(totals.fat || 0);
        totalCarbs += Number(totals.carbs || 0);
        totalFiber += Number(totals.fiber || 0);
        dayCount++;
      }
    }

    // 计算平均值
    const avgCalories = dayCount > 0 ? totalCalories / dayCount : 0;
    const avgProtein = dayCount > 0 ? totalProtein / dayCount : 0;
    const avgFat = dayCount > 0 ? totalFat / dayCount : 0;
    const avgCarbs = dayCount > 0 ? totalCarbs / dayCount : 0;
    const avgFiber = dayCount > 0 ? totalFiber / dayCount : 0;

    // 准备用户数据
    const clientData = {
      clientId: client.id,
      clientName: client.name,
      age: client.age,
      gender: client.gender,
      chronicConditions: client.chronic_conditions,
      tastePreferences: client.taste_preferences,
      riskFlags: client.risk_flags,
      avgCalories,
      avgProtein,
      avgFat,
      avgCarbs,
      avgFiber
    };

    console.log(`  用户: ${client.name}, 年龄: ${client.age}, 平均热量: ${Math.round(avgCalories)} kcal`);

    // 调用 AI 服务生成建议
    const { content, nextStep, tokensUsed, model } = await generateHealthSuggestion(clientData);

    console.log(`  生成成功, 使用模型: ${model}, Token: ${tokensUsed}\n`);

    return success(res, {
      content,
      nextStep,
      tokensUsed,
      model
    }, 'AI 建议生成成功');
  } catch (error) {
    console.error('生成 AI 建议失败:', error);
    return failure(res, '生成建议失败: ' + error.message, 500);
  }
});

router.post('/suggestions', async (req, res) => {
  const { clientId, guardianId = null, content, nextStep = '' } = req.body;
  if (!clientId || !content) return failure(res, '缺少被服务人或内容');
  const insertNotification = async (payload) => {
    await db.run(
      `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
       VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'suggestion', 'info')`,
      payload
    );
  };
  await insertNotification({
    user_id: clientId,
    role: 'client',
    title: '重点关注建议',
    content: content + (nextStep ? `；下一步：${nextStep}` : '')
  });
  if (guardianId) {
    await insertNotification({
      user_id: guardianId,
      role: 'guardian',
      title: '被监护人健康提醒',
      content
    });
  }
  return success(res, { pushed: true }, '已推送到销售端和监护人端');
});

router.get('/reports/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // 获取政府用户的社区权限
    const communityIds = await getGovCommunityIds(req.user.id);
    const { filter: communityFilter, params: communityParams } = buildCommunityFilter(communityIds);
    
    const params = { today, ...communityParams };
    
    const totalClients = await db.get(
      `SELECT COUNT(*) as c FROM users u WHERE u.role = 'client'${communityFilter}`,
      params
    );
    const highRisk = await db.get(
      `SELECT COUNT(*) as c FROM users u
       JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.role = 'client' AND cp.risk_flags IS NOT NULL AND cp.risk_flags != ''${communityFilter}`,
      params
    );
    
    // 获取今日订单数
    const todayOrdersQuery = communityIds 
      ? `SELECT COUNT(*) as c FROM orders o
         JOIN users u ON u.id = o.client_id
         WHERE date(o.created_at) = :today${communityFilter}`
      : `SELECT COUNT(*) as c FROM orders o
         WHERE date(o.created_at) = :today`;
    
    const todayOrders = await db.get(todayOrdersQuery, params);
    
    return success(res, {
      summary: {
        totalClients: totalClients?.c || 0,
        highRisk: highRisk?.c || 0,
        todayOrders: todayOrders?.c || 0
      }
    });
  } catch (err) {
    console.error('获取汇总报告失败:', err);
    return failure(res, '获取汇总报告失败', 500);
  }
});

// 获取用户设置
router.get('/settings', async (req, res) => {
  try {
    const user = await db.get(
      'SELECT preferences FROM users WHERE id = :user_id',
      { user_id: req.user.id }
    );
    
    const preferences = user?.preferences ? JSON.parse(user.preferences) : {};
    const settings = {
      ws_url: preferences.ws_url || '',
      ...preferences
    };
    
    return success(res, { settings });
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return failure(res, '获取设置失败');
  }
});

// 更新用户设置
router.put('/settings', async (req, res) => {
  try {
    const { ws_url, ...otherSettings } = req.body;
    
    // 获取现有设置
    const user = await db.get(
      'SELECT preferences FROM users WHERE id = :user_id',
      { user_id: req.user.id }
    );
    
    const preferences = user?.preferences ? JSON.parse(user.preferences) : {};
    
    // 更新设置
    if (ws_url !== undefined) {
      preferences.ws_url = ws_url;
    }
    
    // 合并其他设置
    Object.assign(preferences, otherSettings);
    
    // 保存到数据库
    await db.run(
      'UPDATE users SET preferences = :preferences, updated_at = CURRENT_TIMESTAMP WHERE id = :user_id',
      { 
        preferences: JSON.stringify(preferences), 
        user_id: req.user.id 
      }
    );
    
    return success(res, { settings: preferences }, '设置已保存');
  } catch (error) {
    console.error('更新用户设置失败:', error);
    return failure(res, '保存设置失败');
  }
});

module.exports = router;
