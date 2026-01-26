const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authRequired, requireRole('gov'));

// 辅助函数：获取政府用户的社区ID列表
async function getGovCommunityIds(govUserId) {
  const scopes = await db.all(
    `SELECT community_id FROM gov_scopes WHERE gov_user_id = :gov_user_id`,
    { gov_user_id: govUserId }
  );
  
  if (scopes.length === 0) {
    return null;
  }
  
  return scopes.map(s => s.community_id);
}

// 辅助函数：构建社区筛选SQL
function buildCommunityFilter(communityIds, tableAlias = 'u') {
  if (!communityIds) {
    return { filter: '', params: {} };
  }
  
  if (communityIds.length === 0) {
    return { filter: ` AND 1=0`, params: {} };
  }
  
  if (communityIds.length === 1) {
    return { 
      filter: ` AND ${tableAlias}.community_id = :community_id`, 
      params: { community_id: communityIds[0] } 
    };
  }
  
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

// ✅ 优化：获取政府用户可管理的社区列表 - 使用JOIN一次性获取用户数量
router.get('/communities', async (req, res) => {
  try {
    const scopes = await db.all(
      `SELECT c.id, c.code, c.name, c.region, gs.role_in_scope
       FROM gov_scopes gs
       JOIN communities c ON c.id = gs.community_id
       WHERE gs.gov_user_id = :gov_user_id AND c.status = 'active'
       ORDER BY c.name`,
      { gov_user_id: req.user.id }
    );
    
    let communities = [];
    if (scopes.length === 0) {
      communities = await db.all(
        `SELECT id, code, name, region FROM communities WHERE status = 'active' ORDER BY name`
      );
    } else {
      communities = scopes;
    }
    
    // ✅ 优化：使用单个查询获取所有社区的用户数量（避免N+1）
    const communityIds = communities.map(c => c.id);
    if (communityIds.length > 0) {
      const placeholders = communityIds.map((_, i) => `?`).join(',');
      const counts = await db.all(
        `SELECT community_id, COUNT(*) as count 
         FROM users 
         WHERE community_id IN (${placeholders}) AND role = 'client'
         GROUP BY community_id`,
        communityIds
      );
      
      // 创建映射表
      const countMap = {};
      counts.forEach(c => {
        countMap[c.community_id] = c.count;
      });
      
      // 添加计数到社区对象
      communities.forEach(community => {
        community.client_count = countMap[community.id] || 0;
      });
    }
    
    logger.info('获取社区列表成功', { userId: req.user.id, count: communities.length });
    return success(res, { communities });
  } catch (err) {
    logger.error('获取社区列表失败', { error: err.message, userId: req.user.id });
    return failure(res, '获取社区列表失败', 500);
  }
});

// 切换当前社区
router.post('/switch-community', async (req, res) => {
  try {
    const { community_id } = req.body;
    if (!community_id) return failure(res, '缺少社区ID');
    
    const scope = await db.get(
      `SELECT 1 FROM gov_scopes WHERE gov_user_id = :gov_user_id AND community_id = :community_id`,
      { gov_user_id: req.user.id, community_id }
    );
    
    if (!scope) {
      const exists = await db.get('SELECT 1 FROM communities WHERE id = :community_id', { community_id });
      if (!exists) return failure(res, '社区不存在', 404);
    }
    
    const preferences = req.user.preferences ? JSON.parse(req.user.preferences) : {};
    preferences.current_community_id = community_id;
    
    await db.run(
      'UPDATE users SET preferences = :preferences WHERE id = :user_id',
      { preferences: JSON.stringify(preferences), user_id: req.user.id }
    );
    
    logger.info('切换社区成功', { userId: req.user.id, communityId: community_id });
    return success(res, { community_id }, '已切换社区');
  } catch (err) {
    logger.error('切换社区失败', { error: err.message, userId: req.user.id });
    return failure(res, '切换社区失败', 500);
  }
});

// 获取首页概览（重要信息、统计数据）
router.get('/dashboard', async (req, res) => {
  try {
    const { community_id } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    
    let communityFilter = '';
    const params = {};
    
    if (community_id) {
      communityFilter = ' AND u.community_id = :community_id';
      params.community_id = community_id;
    } else {
      const user = await db.get('SELECT preferences FROM users WHERE id = :user_id', { user_id: req.user.id });
      if (user?.preferences) {
        const prefs = JSON.parse(user.preferences);
        if (prefs.current_community_id) {
          communityFilter = ' AND u.community_id = :community_id';
          params.community_id = prefs.current_community_id;
        }
      }
    }
    
    const totalClients = await db.get(
      `SELECT COUNT(*) as count FROM users u WHERE u.role = 'client'${communityFilter}`,
      params
    );
    
    const highRisk = await db.get(
      `SELECT COUNT(*) as count FROM users u
       JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.role = 'client' AND cp.risk_flags IS NOT NULL AND cp.risk_flags != ''${communityFilter}`,
      params
    );
    
    const todayOrders = await db.get(
      `SELECT COUNT(*) as count FROM orders o
       JOIN users u ON u.id = o.client_id
       WHERE date(o.created_at) = :today${community_id ? ' AND o.community_id = :community_id' : ''}`,
      { ...params, today }
    );
    
    const todayWarnings = await db.get(
      `SELECT COUNT(*) as count FROM risk_events re
       JOIN users u ON u.id = re.client_id
       WHERE date(re.created_at) = :today AND re.status = 'open'${communityFilter}`,
      { ...params, today }
    );
    
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
    
    logger.info('获取首页概览成功', { userId: req.user.id, communityId: community_id });
    return success(res, { dashboard });
  } catch (err) {
    logger.error('获取首页概览失败', { error: err.message, userId: req.user.id });
    return failure(res, '获取首页概览失败: ' + err.message, 500);
  }
});

// 获取当前社区的用户列表（支持筛选）
router.get('/clients', async (req, res) => {
  try {
    const { keyword } = req.query;
    
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
    
    logger.info('获取用户列表成功', { userId: req.user.id, count: rows.length });
    return success(res, { clients: rows });
  } catch (err) {
    logger.error('获取用户列表失败', { error: err.message, userId: req.user.id });
    return failure(res, '获取用户列表失败', 500);
  }
});

module.exports = router;
