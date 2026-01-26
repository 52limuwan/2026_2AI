const db = require('../db');
const axios = require('axios');

/**
 * 风险检测定时任务服务
 * 自动检测营养异常、饮食多样性等问题，并生成预警
 */

// 获取或创建风险规则
async function getOrCreateRule(code, name, severity, condition) {
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
}

// 发送风险通知
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
  
  // 发送给社工端（如果有管辖该用户的社工）
  const client = await db.get('SELECT community_id FROM users WHERE id = :id', { id: clientId });
  if (client?.community_id) {
    const govUsers = await db.all(
      `SELECT DISTINCT gs.gov_user_id 
       FROM gov_scopes gs 
       WHERE gs.community_id = :community_id`,
      { community_id: client.community_id }
    );
    
    for (const gov of govUsers) {
      await db.run(
        `INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
         VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'risk_warning', 'high')`,
        { 
          user_id: gov.gov_user_id, 
          role: 'gov', 
          title: `管辖用户风险预警：${title}`, 
          content: content 
        }
      );
    }
  }
}

/**
 * 执行风险检测任务
 * @param {Object} options - 检测选项
 * @param {Number} options.community_id - 社区ID（可选）
 * @param {Date} options.targetDate - 目标日期（默认今天）
 */
async function runRiskDetection(options = {}) {
  const { community_id = null, targetDate = new Date() } = options;
  const today = targetDate.toISOString().slice(0, 10);
  
  let communityFilter = '';
  const params = {};
  
  if (community_id) {
    communityFilter = ' AND u.community_id = :community_id';
    params.community_id = community_id;
  }
  
  const warnings = [];
  
  try {
    // 1. 检测营养摄入异常（今日摄入量超过正常范围）
    const nutritionAbnormal = await db.all(
      `SELECT nid.client_id, u.name, u.community_id, nid.totals
       FROM nutrition_intake_daily nid
       JOIN users u ON u.id = nid.client_id
       WHERE nid.date = :today AND u.role = 'client'${communityFilter}`,
      { ...params, today }
    );
    
    for (const record of nutritionAbnormal) {
      const totals = record.totals ? JSON.parse(record.totals) : {};
      const calories = Number(totals.calories || 0);
      const protein = Number(totals.protein || 0);
      const fat = Number(totals.fat || 0);
      const carbs = Number(totals.carbs || 0);
      
      // 检测卡路里异常（正常范围：1500-2500）
      if (calories > 0) {
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
            await db.run(
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
            
            await sendRiskNotification(
              record.client_id, 
              '营养摄入不足', 
              `您今日摄入热量仅 ${calories.toFixed(0)} 卡路里，低于正常范围（1500-2500卡路里），建议增加营养摄入。`
            );
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
            
            await sendRiskNotification(
              record.client_id, 
              '营养摄入过量', 
              `您今日摄入热量 ${calories.toFixed(0)} 卡路里，超过正常范围（1500-2500卡路里），建议适当控制饮食。`
            );
          }
        }
      }
      
      // 检测蛋白质摄入不足（正常范围：50-80g）
      if (protein < 30 && calories > 500) { // 只在有摄入的情况下检测
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
          
          await sendRiskNotification(
            record.client_id, 
            '蛋白质摄入不足', 
            `您今日蛋白质摄入仅 ${protein.toFixed(1)}g，低于正常范围（50-80g），建议增加优质蛋白质摄入。`
          );
        }
      }
      
      // 检测营养元素失衡（脂肪/碳水比例异常）
      const totalMacros = fat * 9 + carbs * 4; // 卡路里来自脂肪和碳水
      if (totalMacros > 0 && calories > 500) {
        const fatPercent = (fat * 9 / totalMacros) * 100;
        const carbsPercent = (carbs * 4 / totalMacros) * 100;
        
        // 脂肪占比过高（>40%）或过低（<15%）
        if (fatPercent > 40 || fatPercent < 15) {
          const ruleId = await getOrCreateRule(
            'nutrition_imbalanced_macros',
            '营养元素失衡',
            'low',
            { fat_percent: fatPercent, carbs_percent: carbsPercent }
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
                data_snapshot: JSON.stringify({ fat_percent: fatPercent, carbs_percent: carbsPercent, reason: '营养元素失衡' })
              }
            );
            
            warnings.push({
              type: 'nutrition_imbalanced_macros',
              client_id: record.client_id,
              client_name: record.name,
              message: `用户 ${record.name} 营养元素失衡，脂肪占比 ${fatPercent.toFixed(1)}%`
            });
          }
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
       AND o.status IN ('placed', 'preparing', 'delivering', 'delivered')
       AND u.role = 'client'${communityFilter}
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
        
        await sendRiskNotification(
          record.client_id, 
          '饮食多样性不足', 
          `您近7天仅尝试了 ${record.dish_count} 种不同菜品，建议增加饮食多样性，尝试更多种类的食物。`
        );
      }
    }
    
    // 3. 检测长期营养异常（连续3天以上摄入异常）
    const longTermAbnormal = await db.all(
      `SELECT nid.client_id, u.name, u.community_id, COUNT(*) as abnormal_days
       FROM nutrition_intake_daily nid
       JOIN users u ON u.id = nid.client_id
       WHERE nid.date >= date('now', '-7 days')
       AND u.role = 'client'${communityFilter}
       AND (
         CAST(JSON_EXTRACT(nid.totals, '$.calories') AS REAL) < 1000 
         OR CAST(JSON_EXTRACT(nid.totals, '$.calories') AS REAL) > 3000
       )
       GROUP BY nid.client_id, u.name, u.community_id
       HAVING abnormal_days >= 3`,
      params
    );
    
    for (const record of longTermAbnormal) {
      const ruleId = await getOrCreateRule(
        'nutrition_long_term_abnormal',
        '长期营养异常',
        'high',
        { min_days: 3, actual: record.abnormal_days }
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
            data_snapshot: JSON.stringify({ abnormal_days: record.abnormal_days, reason: '长期营养异常' })
          }
        );
        
        warnings.push({
          type: 'nutrition_long_term_abnormal',
          client_id: record.client_id,
          client_name: record.name,
          message: `用户 ${record.name} 近7天有 ${record.abnormal_days} 天营养摄入异常，需要重点关注`
        });
        
        await sendRiskNotification(
          record.client_id, 
          '长期营养异常预警', 
          `您近7天有 ${record.abnormal_days} 天营养摄入异常，建议及时调整饮食结构，如有需要请联系营养师。`
        );
      }
    }
    
    console.log(`[风险检测] 完成检测，发现 ${warnings.length} 个预警`);
    return { warnings, total: warnings.length, timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('[风险检测] 执行失败:', err);
    throw err;
  }
}

/**
 * 启动定时任务
 * 每天定时执行风险检测（建议在晚上22:00执行）
 */
function startScheduler() {
  // 使用简单的setInterval实现定时任务
  // 实际生产环境建议使用node-cron或类似的库
  
  const SCHEDULE_INTERVAL = 60 * 60 * 1000; // 每小时执行一次（开发环境）
  // const SCHEDULE_INTERVAL = 24 * 60 * 60 * 1000; // 每天执行一次（生产环境）
  
  console.log('[风险检测调度器] 已启动，将每小时执行一次风险检测');
  
  // 立即执行一次
  runRiskDetection().catch(err => {
    console.error('[风险检测调度器] 首次执行失败:', err);
  });
  
  // 设置定时任务
  setInterval(() => {
    runRiskDetection().catch(err => {
      console.error('[风险检测调度器] 定时执行失败:', err);
    });
  }, SCHEDULE_INTERVAL);
}

module.exports = {
  runRiskDetection,
  startScheduler,
  sendRiskNotification
};
