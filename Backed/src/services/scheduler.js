const db = require('../db');
const { getToday, getBeijingTime, getCurrentHour } = require('../utils/dateHelper');

/**
 * 发送每日营养报告通知
 */
async function sendDailyReports() {
  console.log('[定时任务] 开始发送每日营养报告...');
  
  try {
    // 获取所有开启了每日报告的用户
    const users = await db.all(`
      SELECT u.id, u.name, cp.notification_settings
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.role = 'client'
    `);
    
    for (const user of users) {
      const settings = user.notification_settings ? JSON.parse(user.notification_settings) : [];
      
      if (!settings.includes('daily_report')) {
        continue;
      }
      
      // 获取今日营养数据（使用北京时间）
      const today = getToday();
      const nutrition = await db.get(`
        SELECT 
          SUM(JSON_EXTRACT(totals, '$.calories')) as total_calories,
          SUM(JSON_EXTRACT(totals, '$.protein')) as total_protein,
          SUM(JSON_EXTRACT(totals, '$.fat')) as total_fat,
          SUM(JSON_EXTRACT(totals, '$.carbs')) as total_carbs
        FROM nutrition_intake_daily
        WHERE client_id = :user_id AND DATE(date) = :date
      `, { user_id: user.id, date: today });
      
      if (!nutrition || !nutrition.total_calories) {
        continue;
      }
      
      const content = `今日营养摄入：热量 ${Math.round(nutrition.total_calories)}卡路里，蛋白质 ${Math.round(nutrition.total_protein)}g，脂肪 ${Math.round(nutrition.total_fat)}g，碳水化合物 ${Math.round(nutrition.total_carbs)}g`;
      
      await db.run(`
        INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
        VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'daily_report', 'info')
      `, {
        user_id: user.id,
        role: 'client',
        title: '每日营养报告',
        content
      });
    }
    
    console.log(`[定时任务] 每日报告发送完成，共发送 ${users.length} 条`);
  } catch (err) {
    console.error('[定时任务] 发送每日报告失败:', err);
  }
}

/**
 * 发送每周健康分析报告通知
 */
async function sendWeeklyReports() {
  console.log('[定时任务] 开始发送每周健康分析报告...');
  
  try {
    const users = await db.all(`
      SELECT u.id, u.name, cp.notification_settings
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.role = 'client'
    `);
    
    for (const user of users) {
      const settings = user.notification_settings ? JSON.parse(user.notification_settings) : [];
      
      if (!settings.includes('weekly_report')) {
        continue;
      }
      
      // 获取本周营养数据（使用北京时间）
      const now = getBeijingTime();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const year = weekAgo.getFullYear();
      const month = String(weekAgo.getMonth() + 1).padStart(2, '0');
      const day = String(weekAgo.getDate()).padStart(2, '0');
      const weekAgoStr = `${year}-${month}-${day}`;
      
      const nutrition = await db.get(`
        SELECT 
          AVG(JSON_EXTRACT(totals, '$.calories')) as avg_calories,
          AVG(JSON_EXTRACT(totals, '$.protein')) as avg_protein,
          COUNT(DISTINCT DATE(date)) as days_count
        FROM nutrition_intake_daily
        WHERE client_id = :user_id AND DATE(date) >= :date
      `, { user_id: user.id, date: weekAgoStr });
      
      if (!nutrition || !nutrition.avg_calories) {
        continue;
      }
      
      const content = `本周平均每日摄入：热量 ${Math.round(nutrition.avg_calories)}卡路里，蛋白质 ${Math.round(nutrition.avg_protein)}g。共记录 ${nutrition.days_count} 天饮食数据。`;
      
      await db.run(`
        INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
        VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'weekly_report', 'info')
      `, {
        user_id: user.id,
        role: 'client',
        title: '每周健康分析报告',
        content
      });
    }
    
    console.log('[定时任务] 每周报告发送完成');
  } catch (err) {
    console.error('[定时任务] 发送每周报告失败:', err);
  }
}

/**
 * 发送用餐时间提醒
 */
async function sendMealTimeReminders() {
  console.log('[定时任务] 开始发送用餐时间提醒...');
  
  try {
    const users = await db.all(`
      SELECT u.id, u.name, cp.notification_settings
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.role = 'client'
    `);
    
    // 使用北京时间判断用餐时间
    const hour = getCurrentHour();
    let mealType = '';
    let content = '';
    
    if (hour >= 7 && hour < 9) {
      mealType = '早餐';
      content = '早上好！记得吃早餐哦，营养的一天从早餐开始。';
    } else if (hour >= 11 && hour < 13) {
      mealType = '午餐';
      content = '该吃午餐啦！补充能量，下午更有精神。';
    } else if (hour >= 17 && hour < 19) {
      mealType = '晚餐';
      content = '晚餐时间到了，记得按时用餐，保持健康作息。';
    } else {
      console.log(`[定时任务] 当前北京时间 ${hour}:00 不在用餐时间范围内`);
      return; // 不在用餐时间
    }
    
    for (const user of users) {
      const settings = user.notification_settings ? JSON.parse(user.notification_settings) : [];
      
      if (!settings.includes('meal_time')) {
        continue;
      }
      
      await db.run(`
        INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
        VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'meal_time', 'info')
      `, {
        user_id: user.id,
        role: 'client',
        title: `${mealType}提醒`,
        content
      });
    }
    
    console.log('[定时任务] 用餐提醒发送完成');
  } catch (err) {
    console.error('[定时任务] 发送用餐提醒失败:', err);
  }
}

/**
 * 发送健康小贴士
 */
async function sendHealthTips() {
  console.log('[定时任务] 开始发送健康小贴士...');
  
  const tips = [
    '多喝水有助于新陈代谢，建议每天饮水1500-2000ml。',
    '适量运动能增强体质，每天步行30分钟对健康很有益。',
    '保持良好的睡眠习惯，每晚7-8小时睡眠最佳。',
    '多吃新鲜蔬菜水果，补充维生素和膳食纤维。',
    '少油少盐少糖，清淡饮食更健康。',
    '保持心情愉悦，良好的心态有助于身体健康。',
    '定期体检，及时了解身体状况。',
    '饭后散步有助于消化，但不宜剧烈运动。',
    '早餐要吃好，午餐要吃饱，晚餐要吃少。',
    '多晒太阳有助于钙质吸收，增强骨骼健康。'
  ];
  
  try {
    const users = await db.all(`
      SELECT u.id, u.name, cp.notification_settings
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.role = 'client'
    `);
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    for (const user of users) {
      const settings = user.notification_settings ? JSON.parse(user.notification_settings) : [];
      
      if (!settings.includes('health_tips')) {
        continue;
      }
      
      await db.run(`
        INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
        VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'health_tips', 'info')
      `, {
        user_id: user.id,
        role: 'client',
        title: '健康小贴士',
        content: randomTip
      });
    }
    
    console.log('[定时任务] 健康小贴士发送完成');
  } catch (err) {
    console.error('[定时任务] 发送健康小贴士失败:', err);
  }
}

/**
 * 发送节气养生建议
 */
async function sendSeasonalTips() {
  console.log('[定时任务] 开始发送节气养生建议...');
  
  const seasonalTips = {
    '立春': '立春时节，万物复苏。宜多吃韭菜、春笋等时令蔬菜，注意保暖防寒。',
    '雨水': '雨水时节，气温回升。宜健脾祛湿，可多食山药、薏米等食物。',
    '惊蛰': '惊蛰时节，春雷始鸣。宜养肝护肝，多吃绿色蔬菜，保持心情舒畅。',
    '春分': '春分时节，昼夜平分。宜平衡饮食，多吃新鲜蔬果，适量运动。',
    '清明': '清明时节，气候温和。宜清淡饮食，多吃菠菜、芹菜等时令蔬菜。',
    '谷雨': '谷雨时节，雨水增多。宜健脾除湿，可食用赤小豆、冬瓜等食物。',
    '立夏': '立夏时节，天气渐热。宜清热养心，多吃苦瓜、绿豆等清凉食物。',
    '小满': '小满时节，湿热加重。宜清热利湿，可食用薏米、冬瓜等食物。',
    '芒种': '芒种时节，气温升高。宜清补为主，多吃西瓜、黄瓜等消暑食物。',
    '夏至': '夏至时节，阳气最盛。宜清淡饮食，多喝水，避免过度劳累。',
    '小暑': '小暑时节，天气炎热。宜清热解暑，可食用绿豆汤、酸梅汤等。',
    '大暑': '大暑时节，最热时期。宜防暑降温，多吃西瓜、苦瓜等清凉食物。',
    '立秋': '立秋时节，暑去凉来。宜润肺养阴，多吃梨、百合等滋润食物。',
    '处暑': '处暑时节，暑气渐消。宜滋阴润燥，可食用银耳、蜂蜜等食物。',
    '白露': '白露时节，秋意渐浓。宜养肺润燥，多吃莲藕、山药等食物。',
    '秋分': '秋分时节，昼夜平分。宜平补润燥，多吃芝麻、核桃等坚果。',
    '寒露': '寒露时节，气温下降。宜温补养胃，可食用南瓜、红薯等食物。',
    '霜降': '霜降时节，天气转冷。宜温补脾胃，多吃牛肉、羊肉等温性食物。',
    '立冬': '立冬时节，冬季开始。宜温补养肾，可食用黑豆、黑芝麻等食物。',
    '小雪': '小雪时节，气温更低。宜温补御寒，多吃羊肉、核桃等温热食物。',
    '大雪': '大雪时节，天寒地冻。宜温补助阳，可食用牛肉、桂圆等食物。',
    '冬至': '冬至时节，阴气最盛。宜温补养阳，多吃羊肉、生姜等温性食物。',
    '小寒': '小寒时节，最冷时期。宜温补驱寒，可食用红枣、桂圆等食物。',
    '大寒': '大寒时节，寒冷至极。宜温补养生，多吃温热食物，注意保暖。'
  };
  
  // 这里简化处理，实际应该根据当前日期计算节气
  // 暂时随机选择一个节气提示
  const seasons = Object.keys(seasonalTips);
  const randomSeason = seasons[Math.floor(Math.random() * seasons.length)];
  const content = seasonalTips[randomSeason];
  
  try {
    const users = await db.all(`
      SELECT u.id, u.name, cp.notification_settings
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.role = 'client'
    `);
    
    for (const user of users) {
      const settings = user.notification_settings ? JSON.parse(user.notification_settings) : [];
      
      if (!settings.includes('seasonal_tips')) {
        continue;
      }
      
      await db.run(`
        INSERT INTO notifications (user_id, role, title, content, channel, status, event_type, severity)
        VALUES (:user_id, :role, :title, :content, 'in_app', 'unread', 'seasonal_tips', 'info')
      `, {
        user_id: user.id,
        role: 'client',
        title: `${randomSeason}养生`,
        content
      });
    }
    
    console.log('[定时任务] 节气养生建议发送完成');
  } catch (err) {
    console.error('[定时任务] 发送节气养生建议失败:', err);
  }
}

module.exports = {
  sendDailyReports,
  sendWeeklyReports,
  sendMealTimeReminders,
  sendHealthTips,
  sendSeasonalTips
};
