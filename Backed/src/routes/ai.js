const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');
const { generateDietAnalysis, generateSmartRecommendation } = require('../services/aiService');
const { getPastDays } = require('../utils/dateHelper');

const router = express.Router();

// 技能关键词映射 - 与前端完全一致
const skillKeywords = {
  '营养师 - 基础营养咨询': {
    file: 'client-nutritionist.md',
    keywords: ['营养', '健康', '饮食', '菜品', '搭配', '均衡', '食物', '吃什么', '适合', '补充', '缺乏',
      '维生素', '蛋白质', '钙', '铁', '锌', '硒', '叶酸', '膳食纤维', '碳水', '脂肪', '热量', '卡路里',
      '营养不良', '怎么吃', '吃点啥', '补什么', '营养价值', '有营养', '没营养', '吃了好', '对身体好',
      '蔬菜', '水果', '肉类', '鱼', '蛋', '奶', '豆制品', '粗粮', '细粮', '主食', '零食',
      '消化', '吸收', '胃口', '食欲', '不想吃', '吃不下', '吃太多', '吃太少', '挑食', '偏食',
      '增重', '减重', '长胖', '瘦了', '体重', '贫血', '骨质疏松', '便秘', '腹泻', '胀气']
  },
  '中医养生师 - 传统养生调理': {
    file: 'client-tcm-health.md',
    keywords: ['中医', '养生', '调理', '体质', '气血', '经络', '穴位', '食疗', '中药', '汤药',
      '阴虚', '阳虚', '气虚', '血虚', '痰湿', '湿热', '气郁', '血瘀', '特禀',
      '湿气', '上火', '寒凉', '温补', '滋补', '补气', '补血', '脾胃', '肝肾', '肺',
      '阴阳', '五行', '寒热', '虚实', '表里', '气机', '津液', '精气神',
      '艾灸', '拔罐', '刮痧', '推拿', '按摩', '泡脚', '药浴', '食补', '药膳',
      '体寒', '怕冷', '怕热', '出汗', '盗汗', '手脚冰凉', '口干', '口苦', '舌苔', '脉象']
  },
  '慢病管理师 - 慢性病管理': {
    file: 'client-chronic-disease.md',
    keywords: ['高血压', '糖尿病', '高血脂', '三高', '血糖', '血压', '血脂', '胆固醇', '甘油三酯',
      '心脏病', '冠心病', '心绞痛', '心梗', '脑梗', '中风', '动脉硬化', '心律不齐', '房颤',
      '慢性病', '痛风', '尿酸', '肾病', '肝病', '脂肪肝', '胆结石', '肾结石', '前列腺',
      '用药', '控制', '稳定', '降压', '降糖', '降脂', '并发症', '复查', '监测',
      '头晕', '头痛', '胸闷', '气短', '心慌', '乏力', '水肿', '尿频', '尿急',
      '血压高', '血糖高', '血脂高', '指标高', '超标', '不正常', '控制不住', '反复']
  },
  '运动康复师 - 适老运动指导': {
    file: 'client-exercise-rehab.md',
    keywords: ['运动', '锻炼', '康复', '健身', '太极', '散步', '活动', '走路', '慢跑', '游泳', '广场舞',
      '关节', '腿脚', '膝盖', '腰', '背', '颈椎', '肩膀', '手臂', '脚踝', '髋关节',
      '疼痛', '僵硬', '无力', '酸痛', '麻木', '肿胀', '抽筋', '扭伤', '拉伤',
      '跌倒', '摔倒', '平衡', '站不稳', '走不动', '爬楼', '上楼', '下楼', '蹲不下', '起不来',
      '骨质疏松', '关节炎', '风湿', '肌肉萎缩', '骨折', '骨裂', '腰椎间盘', '颈椎病',
      '康复训练', '理疗', '拉伸', '热敷', '冷敷', '按摩', '力量训练', '柔韧性',
      '怎么动', '能不能动', '动不了', '不敢动', '动了疼', '僵硬', '不灵活', '没劲']
  },
  '心理咨询师 - 心理健康关怀': {
    file: 'client-psychology.md',
    keywords: ['心理', '情绪', '焦虑', '抑郁', '孤独', '烦躁', '不开心', '想不开', '心情', '心烦', '郁闷', '寂寞',
      '睡眠', '失眠', '睡不着', '做梦', '噩梦', '早醒', '睡不好', '多梦', '浅睡', '打鼾',
      '压力', '担心', '害怕', '恐惧', '紧张', '不安', '烦恼', '委屈', '生气', '愤怒',
      '记忆力', '健忘', '记不住', '想不起来', '糊涂', '迷糊', '反应慢', '注意力',
      '孤单', '没人说话', '没朋友', '不想见人', '不想出门', '宅', '社交', '人际关系',
      '没意思', '没劲', '活着没意思', '没盼头', '没希望', '没用', '拖累', '负担',
      '子女', '儿女', '孙子', '老伴', '配偶', '家庭矛盾', '代沟', '不理解', '冷落',
      '心里难受', '想哭', '委屈', '憋屈', '想不通', '放不下', '看不开', '钻牛角尖']
  },
  '膳食搭配师 - 食谱与烹饪': {
    file: 'client-meal-planning.md',
    keywords: ['食谱', '菜谱', '一日三餐', '早餐', '午餐', '晚餐', '加餐', '夜宵', '点心', '零食',
      '做法', '烹饪', '怎么做', '做菜', '煮', '炒', '蒸', '炖', '煲', '烤', '煎', '炸', '凉拌',
      '搭配', '配菜', '主食', '副食', '荤素', '粗细', '干稀', '冷热',
      '怎么煮', '怎么炒', '怎么蒸', '煮多久', '火候', '调味', '放什么', '加什么',
      '咸淡', '甜', '酸', '辣', '苦', '鲜', '香', '清淡', '重口味', '口味',
      '汤', '粥', '面', '饭', '菜', '肉', '素菜', '荤菜', '凉菜', '热菜',
      '软烂', '好嚼', '好消化', '清淡', '少油', '少盐', '少糖', '无糖', '低脂',
      '吃什么好', '做什么菜', '今天吃啥', '换换口味', '吃腻了', '想吃', '不想吃']
  },
  '用药指导师 - 安全用药指导': {
    file: 'client-medication.md',
    keywords: ['药物', '吃药', '服药', '用药', '药品', '药', '西药', '中成药', '保健品',
      '什么时候吃', '饭前', '饭后', '空腹', '睡前', '早上', '晚上', '一天几次',
      '忘记吃药', '漏吃', '多吃', '少吃', '吃错', '吃重复', '停药', '换药', '减药', '加药',
      '药效', '有效', '没效', '不管用', '见效', '起效', '药量', '剂量', '疗程',
      '副作用', '不良反应', '过敏', '不舒服', '恶心', '呕吐', '头晕', '皮疹', '瘙痒',
      '能一起吃吗', '冲突', '相克', '禁忌', '不能吃', '能不能', '可以吗',
      '忌口', '不能吃什么', '能吃什么', '饮食禁忌', '喝酒', '喝茶', '喝咖啡',
      '药物反应', '吃了不舒服', '管用吗', '要吃多久', '能停吗', '必须吃吗', '依赖']
  },
  '季节养护师 - 四季养生': {
    file: 'client-seasonal-care.md',
    keywords: ['春季', '夏季', '秋季', '冬季', '春天', '夏天', '秋天', '冬天', '季节', '换季',
      '节气', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
      '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
      '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
      '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
      '时令', '当季', '应季', '时令菜', '时令水果', '节令',
      '天气', '气候', '温度', '气温', '冷', '热', '温差', '干燥', '潮湿', '闷热',
      '温度变化', '气候变化', '倒春寒', '秋燥', '冬藏', '春生', '夏长', '秋收',
      '感冒', '咳嗽', '过敏', '花粉', '皮肤干', '上火', '中暑', '着凉', '受寒',
      '穿什么', '怎么穿', '加衣服', '减衣服', '注意什么', '小心什么']
  },
  '居家护理师 - 日常护理指导': {
    file: 'client-home-care.md',
    keywords: ['护理', '照顾', '照料', '料理', '日常护理', '生活护理', '个人卫生',
      '洗澡', '擦身', '洗脸', '刷牙', '洗头', '剪指甲', '理发', '换衣', '穿衣',
      '卧床', '翻身', '拍背', '按摩', '活动', '褥疮', '压疮', '皮肤护理',
      '如厕', '上厕所', '大便', '小便', '大小便', '尿失禁', '便秘', '尿不出', '尿频',
      '伤口', '换药', '消毒', '清洁', '包扎', '结痂', '化脓', '感染', '愈合',
      '康复', '康复训练', '辅助', '搀扶', '轮椅', '拐杖', '助行器', '护理床',
      '跌倒', '摔倒', '防滑', '扶手', '夜灯', '安全', '意外', '急救',
      '鼻饲', '导尿', '吸痰', '吸氧', '雾化', '输液', '打针', '测血压', '测血糖',
      '怎么照顾', '怎么护理', '注意什么', '怎么办', '正常吗', '要紧吗', '严重吗']
  },
  '健康档案师 - 健康数据管理': {
    file: 'client-health-record.md',
    keywords: ['体检', '检查', '化验', '报告', '体检报告', '检查报告', '化验单', '结果',
      '指标', '数据', '正常吗', '偏高', '偏低', '超标', '异常', '不正常', '标准',
      '血常规', '尿常规', '便常规', '肝功能', '肾功能', '血脂', '血糖', '心电图',
      'B超', 'CT', '核磁', 'X光', '胃镜', '肠镜', '骨密度', '肺功能',
      '记录', '健康档案', '病历', '就诊记录', '用药记录', '过敏史', '既往史',
      '监测', '测量', '自测', '血压计', '血糖仪', '体温计', '体重秤',
      '趋势', '变化', '对比', '上升', '下降', '波动', '稳定', '控制',
      '风险', '危险', '预警', '注意', '警惕', '预防', '筛查', '早期',
      '看不懂', '什么意思', '严重吗', '要紧吗', '有问题吗', '需要治疗吗', '怎么办']
  },
  '数据分析师 - 用户月报分析': {
    file: 'client-monthly.md',
    keywords: ['月报', '月度', '本月', '上月', '这个月', '月度报告', '月度分析', '月度数据',
      '分析', '统计', '汇总', '总结', '报表', '数据', '趋势',
      '这个月怎么样', '月度情况', '月度总结', '月度健康']
  },
  '数据分析师 - 用户周报分析': {
    file: 'client-weekly.md',
    keywords: ['周报', '本周', '上周', '这周', '这一周', '周度报告', '周度分析', '周度数据',
      '分析', '统计', '汇总', '总结', '报表', '数据', '趋势',
      '这周怎么样', '周度情况', '周度总结', '周度健康']
  }
};

// 识别用户消息中的技能
const detectSkill = (message) => {
  let bestSkill = null;
  let maxScore = 0;
  
  for (const [skillName, skillData] of Object.entries(skillKeywords)) {
    let score = 0;
    
    for (const keyword of skillData.keywords) {
      if (message.includes(keyword)) {
        score++;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestSkill = { name: skillName, file: skillData.file };
    }
  }
  
  return maxScore > 0 ? bestSkill : null;
};

// 读取技能文件内容
const readSkillFile = async (filename) => {
  try {
    const skillPath = path.join(__dirname, '../../Skills', filename);
    console.log(`  读取技能文件路径: ${skillPath}`);
    const content = await fs.readFile(skillPath, 'utf-8');
    console.log(`  文件实际字符数: ${content.length}`);
    console.log(`  文件内容预览: ${content.substring(0, 150)}...`);
    return content;
  } catch (error) {
    console.error(`读取技能文件失败: ${filename}`, error);
    return null;
  }
};

// 生成周报 AI 分析
router.post('/diet-analysis/weekly', authRequired, requireRole('client'), async (req, res) => {
  try {
    const clientId = req.user.id;
    
    console.log('\n[CLIENT] 周报 AI 分析请求');
    console.log(`  用户 ID: ${clientId}`);
    console.log(`  请求时间: ${new Date().toLocaleString('zh-CN')}`);
    
    const days = getPastDays(7);
    const periodStart = days[0];
    const periodEnd = days[days.length - 1];

    console.log(`  时间范围: ${periodStart} ~ ${periodEnd}`);

    // 获取周报营养数据
    const calories = [];
    const protein = [];
    const fat = [];
    const carbs = [];
    const fiber = [];
    const calcium = [];
    const vitaminC = [];
    const iron = [];

    for (const date of days) {
      const intakeRecord = await db.get(
        `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: clientId, date }
      );

      if (intakeRecord && intakeRecord.totals) {
        const totals = JSON.parse(intakeRecord.totals);
        calories.push(Number(totals.calories || 0));
        protein.push(Number(totals.protein || 0));
        fat.push(Number(totals.fat || 0));
        carbs.push(Number(totals.carbs || 0));
        fiber.push(Number(totals.fiber || 0));
        calcium.push(Number(totals.calcium || 0));
        vitaminC.push(Number(totals.vitaminC || totals.vitamin_c || 0));
        iron.push(Number(totals.iron || 0));
      } else {
        calories.push(0);
        protein.push(0);
        fat.push(0);
        carbs.push(0);
        fiber.push(0);
        calcium.push(0);
        vitaminC.push(0);
        iron.push(0);
      }
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

    // 统计新尝试的菜品数
    const uniqueDishes = await db.all(
      `SELECT COUNT(DISTINCT oi.dish_id) as count
       FROM order_items oi
       JOIN orders ord ON ord.id = oi.order_id
       WHERE ord.client_id = :client_id 
       AND date(ord.created_at) >= :start_date
       AND ord.status IN ('placed','preparing','delivering','delivered')`,
      { client_id: clientId, start_date: periodStart }
    );
    const newDishes = uniqueDishes[0]?.count || 0;

    // 计算目标达成率
    const dailyTarget = 2000;
    const avgCalories = totalCalories / 7;
    const achievement = dailyTarget > 0 ? Math.round((avgCalories / dailyTarget) * 100) : 0;

    // 准备营养数据
    const nutritionData = {
      calories: totalCalories,
      protein: totalProtein,
      fat: totalFat,
      carbs: totalCarbs,
      fiber: totalFiber,
      calcium: totalCalcium,
      vitaminC: totalVitaminC,
      iron: totalIron,
      dailyTarget,
      achievement,
      newDishes
    };

    // 调用 AI 服务生成分析
    const { analysis, tokensUsed, model } = await generateDietAnalysis(nutritionData, '本周', 'client');

    // 保存到数据库
    const result = await db.run(
      `INSERT INTO ai_diet_reports 
       (client_id, report_type, period_start, period_end, nutrition_data, ai_analysis, model_used, tokens_used, generated_by_role)
       VALUES (:client_id, :report_type, :period_start, :period_end, :nutrition_data, :ai_analysis, :model_used, :tokens_used, :generated_by_role)`,
      {
        client_id: clientId,
        report_type: 'weekly',
        period_start: periodStart,
        period_end: periodEnd,
        nutrition_data: JSON.stringify(nutritionData),
        ai_analysis: analysis,
        model_used: model,
        tokens_used: tokensUsed,
        generated_by_role: 'client'
      }
    );

    return success(res, {
      report_id: result.lastInsertRowid,
      analysis,
      nutrition_data: nutritionData
    }, 'AI 分析生成成功');
  } catch (error) {
    console.error('生成周报 AI 分析失败:', error);
    return failure(res, error.message || '生成 AI 分析失败', 500);
  }
});

// 生成月报 AI 分析
router.post('/diet-analysis/monthly', authRequired, requireRole('client'), async (req, res) => {
  try {
    const clientId = req.user.id;
    
    console.log('\n[CLIENT] 月报 AI 分析请求');
    console.log(`  用户 ID: ${clientId}`);
    console.log(`  请求时间: ${new Date().toLocaleString('zh-CN')}`);
    
    const days = getPastDays(30);
    const periodStart = days[0];
    const periodEnd = days[days.length - 1];

    console.log(`  时间范围: ${periodStart} ~ ${periodEnd}`);

    // 获取月报营养数据
    const calories = [];
    const protein = [];
    const fat = [];
    const carbs = [];
    const fiber = [];
    const calcium = [];
    const vitaminC = [];
    const iron = [];

    for (const date of days) {
      const intakeRecord = await db.get(
        `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: clientId, date }
      );

      if (intakeRecord && intakeRecord.totals) {
        const totals = JSON.parse(intakeRecord.totals);
        calories.push(Number(totals.calories || 0));
        protein.push(Number(totals.protein || 0));
        fat.push(Number(totals.fat || 0));
        carbs.push(Number(totals.carbs || 0));
        fiber.push(Number(totals.fiber || 0));
        calcium.push(Number(totals.calcium || 0));
        vitaminC.push(Number(totals.vitaminC || totals.vitamin_c || 0));
        iron.push(Number(totals.iron || 0));
      } else {
        calories.push(0);
        protein.push(0);
        fat.push(0);
        carbs.push(0);
        fiber.push(0);
        calcium.push(0);
        vitaminC.push(0);
        iron.push(0);
      }
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

    // 统计新尝试的菜品数
    const uniqueDishes = await db.all(
      `SELECT COUNT(DISTINCT oi.dish_id) as count
       FROM order_items oi
       JOIN orders ord ON ord.id = oi.order_id
       WHERE ord.client_id = :client_id 
       AND date(ord.created_at) >= :start_date
       AND ord.status IN ('placed','preparing','delivering','delivered')`,
      { client_id: clientId, start_date: periodStart }
    );
    const newDishes = uniqueDishes[0]?.count || 0;

    // 计算目标达成率
    const dailyTarget = 2000;
    const avgCalories = totalCalories / 30;
    const achievement = dailyTarget > 0 ? Math.round((avgCalories / dailyTarget) * 100) : 0;

    // 准备营养数据
    const nutritionData = {
      calories: totalCalories,
      protein: totalProtein,
      fat: totalFat,
      carbs: totalCarbs,
      fiber: totalFiber,
      calcium: totalCalcium,
      vitaminC: totalVitaminC,
      iron: totalIron,
      dailyTarget,
      achievement,
      newDishes
    };

    // 调用 AI 服务生成分析
    const { analysis, tokensUsed, model } = await generateDietAnalysis(nutritionData, '本月', 'client');

    // 保存到数据库
    const result = await db.run(
      `INSERT INTO ai_diet_reports 
       (client_id, report_type, period_start, period_end, nutrition_data, ai_analysis, model_used, tokens_used, generated_by_role)
       VALUES (:client_id, :report_type, :period_start, :period_end, :nutrition_data, :ai_analysis, :model_used, :tokens_used, :generated_by_role)`,
      {
        client_id: clientId,
        report_type: 'monthly',
        period_start: periodStart,
        period_end: periodEnd,
        nutrition_data: JSON.stringify(nutritionData),
        ai_analysis: analysis,
        model_used: model,
        tokens_used: tokensUsed,
        generated_by_role: 'client'
      }
    );

    return success(res, {
      report_id: result.lastInsertRowid,
      analysis,
      nutrition_data: nutritionData
    }, 'AI 分析生成成功');
  } catch (error) {
    console.error('生成月报 AI 分析失败:', error);
    return failure(res, error.message || '生成 AI 分析失败', 500);
  }
});

// 获取历史 AI 报告列表
router.get('/diet-reports', authRequired, requireRole('client'), async (req, res) => {
  try {
    const { report_type, limit = 20 } = req.query;
    const clientId = req.user.id;

    let query = `
      SELECT id, report_type, period_start, period_end, ai_analysis, model_used, tokens_used, created_at
      FROM ai_diet_reports
      WHERE client_id = :client_id AND generated_by_role = 'client'
    `;
    const params = { client_id: clientId };

    if (report_type && ['weekly', 'monthly'].includes(report_type)) {
      query += ' AND report_type = :report_type';
      params.report_type = report_type;
    }

    query += ' ORDER BY created_at DESC LIMIT :limit';
    params.limit = parseInt(limit);

    const reports = await db.all(query, params);

    return success(res, { reports });
  } catch (error) {
    console.error('获取历史报告失败:', error);
    return failure(res, '获取历史报告失败', 500);
  }
});

// 获取单个 AI 报告详情
router.get('/diet-reports/:id', authRequired, requireRole('client'), async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;

    const report = await db.get(
      `SELECT * FROM ai_diet_reports WHERE id = :id AND client_id = :client_id AND generated_by_role = 'client'`,
      { id, client_id: clientId }
    );

    if (!report) {
      return failure(res, '报告不存在', 404);
    }

    // 解析 nutrition_data
    if (report.nutrition_data) {
      report.nutrition_data = JSON.parse(report.nutrition_data);
    }

    return success(res, { report });
  } catch (error) {
    console.error('获取报告详情失败:', error);
    return failure(res, '获取报告详情失败', 500);
  }
});

// ==================== Guardian 端 AI 分析接口 ====================

// 生成 Guardian 周报 AI 分析
router.post('/diet-analysis/guardian/weekly/:clientId', authRequired, requireRole('guardian'), async (req, res) => {
  try {
    const guardianId = req.user.id;
    const clientId = parseInt(req.params.clientId);

    console.log('\n[GUARDIAN] 周报 AI 分析请求');
    console.log(`  Guardian ID: ${guardianId}`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  请求时间: ${new Date().toLocaleString('zh-CN')}`);

    // 验证 guardian 权限
    const link = await db.get(
      `SELECT id FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = 'active'`,
      { guardian_id: guardianId, client_id: clientId }
    );

    if (!link) {
      return failure(res, '无权访问该用户的数据', 403);
    }

    const days = getPastDays(7);
    const periodStart = days[0];
    const periodEnd = days[days.length - 1];

    // 获取周报营养数据
    const calories = [];
    const protein = [];
    const fat = [];
    const carbs = [];
    const fiber = [];
    const calcium = [];
    const vitaminC = [];
    const iron = [];

    for (const date of days) {
      const intakeRecord = await db.get(
        `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: clientId, date }
      );

      if (intakeRecord && intakeRecord.totals) {
        const totals = JSON.parse(intakeRecord.totals);
        calories.push(Number(totals.calories || 0));
        protein.push(Number(totals.protein || 0));
        fat.push(Number(totals.fat || 0));
        carbs.push(Number(totals.carbs || 0));
        fiber.push(Number(totals.fiber || 0));
        calcium.push(Number(totals.calcium || 0));
        vitaminC.push(Number(totals.vitaminC || totals.vitamin_c || 0));
        iron.push(Number(totals.iron || 0));
      } else {
        calories.push(0);
        protein.push(0);
        fat.push(0);
        carbs.push(0);
        fiber.push(0);
        calcium.push(0);
        vitaminC.push(0);
        iron.push(0);
      }
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

    // 统计新尝试的菜品数
    const uniqueDishes = await db.all(
      `SELECT COUNT(DISTINCT oi.dish_id) as count
       FROM order_items oi
       JOIN orders ord ON ord.id = oi.order_id
       WHERE ord.client_id = :client_id 
       AND date(ord.created_at) >= :start_date
       AND ord.status IN ('placed','preparing','delivering','delivered')`,
      { client_id: clientId, start_date: periodStart }
    );
    const newDishes = uniqueDishes[0]?.count || 0;

    // 计算目标达成率
    const dailyTarget = 2000;
    const avgCalories = totalCalories / 7;
    const achievement = dailyTarget > 0 ? Math.round((avgCalories / dailyTarget) * 100) : 0;

    // 准备营养数据
    const nutritionData = {
      calories: totalCalories,
      protein: totalProtein,
      fat: totalFat,
      carbs: totalCarbs,
      fiber: totalFiber,
      calcium: totalCalcium,
      vitaminC: totalVitaminC,
      iron: totalIron,
      dailyTarget,
      achievement,
      newDishes
    };

    // 调用 AI 服务生成分析（使用 guardian 角色）
    const { analysis, tokensUsed, model } = await generateDietAnalysis(nutritionData, '本周', 'guardian');

    // 保存到数据库
    const result = await db.run(
      `INSERT INTO ai_diet_reports 
       (client_id, report_type, period_start, period_end, nutrition_data, ai_analysis, model_used, tokens_used, generated_by_role)
       VALUES (:client_id, :report_type, :period_start, :period_end, :nutrition_data, :ai_analysis, :model_used, :tokens_used, :generated_by_role)`,
      {
        client_id: clientId,
        report_type: 'weekly',
        period_start: periodStart,
        period_end: periodEnd,
        nutrition_data: JSON.stringify(nutritionData),
        ai_analysis: analysis,
        model_used: model,
        tokens_used: tokensUsed,
        generated_by_role: 'guardian'
      }
    );

    return success(res, {
      report_id: result.lastInsertRowid,
      analysis,
      nutrition_data: nutritionData
    }, 'AI 分析生成成功');
  } catch (error) {
    console.error('生成 Guardian 周报 AI 分析失败:', error);
    return failure(res, error.message || '生成 AI 分析失败', 500);
  }
});

// 生成 Guardian 月报 AI 分析
router.post('/diet-analysis/guardian/monthly/:clientId', authRequired, requireRole('guardian'), async (req, res) => {
  try {
    const guardianId = req.user.id;
    const clientId = parseInt(req.params.clientId);

    console.log('\n[GUARDIAN] 月报 AI 分析请求');
    console.log(`  Guardian ID: ${guardianId}`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  请求时间: ${new Date().toLocaleString('zh-CN')}`);

    // 验证 guardian 权限
    const link = await db.get(
      `SELECT id FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = 'active'`,
      { guardian_id: guardianId, client_id: clientId }
    );

    if (!link) {
      return failure(res, '无权访问该用户的数据', 403);
    }

    const days = getPastDays(30);
    const periodStart = days[0];
    const periodEnd = days[days.length - 1];

    // 获取月报营养数据
    const calories = [];
    const protein = [];
    const fat = [];
    const carbs = [];
    const fiber = [];
    const calcium = [];
    const vitaminC = [];
    const iron = [];

    for (const date of days) {
      const intakeRecord = await db.get(
        `SELECT totals FROM nutrition_intake_daily WHERE client_id = :client_id AND date = :date`,
        { client_id: clientId, date }
      );

      if (intakeRecord && intakeRecord.totals) {
        const totals = JSON.parse(intakeRecord.totals);
        calories.push(Number(totals.calories || 0));
        protein.push(Number(totals.protein || 0));
        fat.push(Number(totals.fat || 0));
        carbs.push(Number(totals.carbs || 0));
        fiber.push(Number(totals.fiber || 0));
        calcium.push(Number(totals.calcium || 0));
        vitaminC.push(Number(totals.vitaminC || totals.vitamin_c || 0));
        iron.push(Number(totals.iron || 0));
      } else {
        calories.push(0);
        protein.push(0);
        fat.push(0);
        carbs.push(0);
        fiber.push(0);
        calcium.push(0);
        vitaminC.push(0);
        iron.push(0);
      }
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

    // 统计新尝试的菜品数
    const uniqueDishes = await db.all(
      `SELECT COUNT(DISTINCT oi.dish_id) as count
       FROM order_items oi
       JOIN orders ord ON ord.id = oi.order_id
       WHERE ord.client_id = :client_id 
       AND date(ord.created_at) >= :start_date
       AND ord.status IN ('placed','preparing','delivering','delivered')`,
      { client_id: clientId, start_date: periodStart }
    );
    const newDishes = uniqueDishes[0]?.count || 0;

    // 计算目标达成率
    const dailyTarget = 2000;
    const avgCalories = totalCalories / 30;
    const achievement = dailyTarget > 0 ? Math.round((avgCalories / dailyTarget) * 100) : 0;

    // 准备营养数据
    const nutritionData = {
      calories: totalCalories,
      protein: totalProtein,
      fat: totalFat,
      carbs: totalCarbs,
      fiber: totalFiber,
      calcium: totalCalcium,
      vitaminC: totalVitaminC,
      iron: totalIron,
      dailyTarget,
      achievement,
      newDishes
    };

    // 调用 AI 服务生成分析（使用 guardian 角色）
    const { analysis, tokensUsed, model } = await generateDietAnalysis(nutritionData, '本月', 'guardian');

    // 保存到数据库
    const result = await db.run(
      `INSERT INTO ai_diet_reports 
       (client_id, report_type, period_start, period_end, nutrition_data, ai_analysis, model_used, tokens_used, generated_by_role)
       VALUES (:client_id, :report_type, :period_start, :period_end, :nutrition_data, :ai_analysis, :model_used, :tokens_used, :generated_by_role)`,
      {
        client_id: clientId,
        report_type: 'monthly',
        period_start: periodStart,
        period_end: periodEnd,
        nutrition_data: JSON.stringify(nutritionData),
        ai_analysis: analysis,
        model_used: model,
        tokens_used: tokensUsed,
        generated_by_role: 'guardian'
      }
    );

    return success(res, {
      report_id: result.lastInsertRowid,
      analysis,
      nutrition_data: nutritionData
    }, 'AI 分析生成成功');
  } catch (error) {
    console.error('生成 Guardian 月报 AI 分析失败:', error);
    return failure(res, error.message || '生成 AI 分析失败', 500);
  }
});

// 获取 Guardian 的历史 AI 报告列表（针对某个 client）
router.get('/guardian/diet-reports/:clientId', authRequired, requireRole('guardian'), async (req, res) => {
  try {
    const guardianId = req.user.id;
    const clientId = parseInt(req.params.clientId);
    const { report_type, limit = 20 } = req.query;

    // 验证 guardian 权限
    const link = await db.get(
      `SELECT id FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = 'active'`,
      { guardian_id: guardianId, client_id: clientId }
    );

    if (!link) {
      return failure(res, '无权访问该用户的数据', 403);
    }

    let query = `
      SELECT id, report_type, period_start, period_end, ai_analysis, model_used, tokens_used, created_at
      FROM ai_diet_reports
      WHERE client_id = :client_id AND generated_by_role = 'guardian'
    `;
    const params = { client_id: clientId };

    if (report_type && ['weekly', 'monthly'].includes(report_type)) {
      query += ' AND report_type = :report_type';
      params.report_type = report_type;
    }

    query += ' ORDER BY created_at DESC LIMIT :limit';
    params.limit = parseInt(limit);

    const reports = await db.all(query, params);

    return success(res, { reports });
  } catch (error) {
    console.error('获取 Guardian 历史报告失败:', error);
    return failure(res, '获取历史报告失败', 500);
  }
});

// 获取 Guardian 的单个 AI 报告详情
router.get('/guardian/diet-reports/:clientId/:reportId', authRequired, requireRole('guardian'), async (req, res) => {
  try {
    const guardianId = req.user.id;
    const clientId = parseInt(req.params.clientId);
    const reportId = parseInt(req.params.reportId);

    // 验证 guardian 权限
    const link = await db.get(
      `SELECT id FROM guardian_client_links WHERE guardian_id = :guardian_id AND client_id = :client_id AND status = 'active'`,
      { guardian_id: guardianId, client_id: clientId }
    );

    if (!link) {
      return failure(res, '无权访问该用户的数据', 403);
    }

    const report = await db.get(
      `SELECT * FROM ai_diet_reports WHERE id = :id AND client_id = :client_id AND generated_by_role = 'guardian'`,
      { id: reportId, client_id: clientId }
    );

    if (!report) {
      return failure(res, '报告不存在', 404);
    }

    // 解析 nutrition_data
    if (report.nutrition_data) {
      report.nutrition_data = JSON.parse(report.nutrition_data);
    }

    return success(res, { report });
  } catch (error) {
    console.error('获取 Guardian 报告详情失败:', error);
    return failure(res, '获取报告详情失败', 500);
  }
});

// ==================== AI 助手对话接口 ====================

// 保存 WebSocket 消息到数据库
router.post('/messages/save', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, role, content, timestamp, targetClientId, context } = req.body;

    if (!conversationId || !role || !content || !timestamp) {
      return failure(res, '缺少必要参数', 400);
    }

    if (!['user', 'ai'].includes(role)) {
      return failure(res, '无效的角色类型', 400);
    }

    console.log('\n[AI] 保存消息');
    console.log(`  用户 ID: ${userId}`);
    console.log(`  会话 ID: ${conversationId}`);
    console.log(`  角色: ${role}`);
    console.log(`  内容长度: ${content.length}`);
    if (context) {
      console.log(`  包含上下文信息: ${context.substring(0, 100)}...`);
    }

    const result = await db.run(
      `INSERT INTO ai_chat_messages 
       (user_id, target_client_id, conversation_id, role, content, context, timestamp)
       VALUES (:user_id, :target_client_id, :conversation_id, :role, :content, :context, :timestamp)`,
      {
        user_id: userId,
        target_client_id: targetClientId || null,
        conversation_id: conversationId,
        role,
        content,
        context: context || null,
        timestamp
      }
    );

    return success(res, {
      messageId: result.lastInsertRowid
    }, '消息保存成功');
  } catch (error) {
    console.error('保存消息失败:', error);
    return failure(res, error.message || '保存消息失败', 500);
  }
});

// 获取对话列表
router.get('/conversations', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    console.log('\n[AI] 获取对话列表');
    console.log(`  用户 ID: ${userId}`);

    // 获取用户的所有对话，按最后消息时间排序
    const conversations = await db.all(
      `SELECT 
        conversation_id,
        MAX(timestamp) as last_message_time,
        COUNT(*) as message_count,
        (SELECT content FROM ai_chat_messages 
         WHERE conversation_id = m.conversation_id 
         ORDER BY timestamp DESC LIMIT 1) as last_message
       FROM ai_chat_messages m
       WHERE user_id = :user_id
       GROUP BY conversation_id
       ORDER BY last_message_time DESC
       LIMIT :limit`,
      { user_id: userId, limit: parseInt(limit) }
    );

    return success(res, { conversations });
  } catch (error) {
    console.error('获取对话列表失败:', error);
    return failure(res, error.message || '获取对话列表失败', 500);
  }
});

// 创建新对话
router.post('/conversations/new', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 生成新的对话 ID（使用 UUID v4 格式）
    const conversationId = crypto.randomUUID();

    console.log('\n[AI] 创建新对话');
    console.log(`  用户 ID: ${userId}`);
    console.log(`  会话 ID: ${conversationId}`);

    return success(res, { conversationId }, '创建对话成功');
  } catch (error) {
    console.error('创建对话失败:', error);
    return failure(res, error.message || '创建对话失败', 500);
  }
});

// 获取聊天记录
router.get('/messages', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, limit = 100 } = req.query;

    if (!conversationId) {
      return failure(res, '缺少会话ID', 400);
    }

    console.log('\n[AI] 获取聊天记录');
    console.log(`  用户 ID: ${userId}`);
    console.log(`  会话 ID: ${conversationId}`);

    const messages = await db.all(
      `SELECT id, role, content, context, timestamp
       FROM ai_chat_messages
       WHERE user_id = :user_id AND conversation_id = :conversation_id
       ORDER BY timestamp ASC
       LIMIT :limit`,
      { user_id: userId, conversation_id: conversationId, limit: parseInt(limit) }
    );

    // 解析 context 字段中的技能卡片信息
    const parsedMessages = messages.map(msg => {
      const message = { ...msg };
      if (msg.context) {
        try {
          const contextData = JSON.parse(msg.context);
          message.skillSteps = contextData.skillSteps || null;
        } catch (e) {
          console.error('解析 context 失败:', e);
          message.skillSteps = null;
        }
      } else {
        message.skillSteps = null;
      }
      delete message.context; // 不返回原始 context 字段
      return message;
    });

    return success(res, { messages: parsedMessages });
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    return failure(res, error.message || '获取聊天记录失败', 500);
  }
});

// 删除当前用户的所有聊天记录
router.delete('/messages', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('\n[AI] 删除聊天记录');
    console.log(`  用户 ID: ${userId}`);

    await db.run(
      `DELETE FROM ai_chat_messages WHERE user_id = :user_id`,
      { user_id: userId }
    );

    return success(res, null, '删除成功');
  } catch (error) {
    console.error('删除聊天记录失败:', error);
    return failure(res, error.message || '删除聊天记录失败', 500);
  }
});

// AI 智能推荐菜品
router.post('/smart-recommend', authRequired, requireRole('client'), async (req, res) => {
  try {
    const clientId = req.user.id;
    const { store_id } = req.body;
    
    console.log('\n[CLIENT] AI 智能推荐请求');
    console.log(`  用户 ID: ${clientId}`);
    console.log(`  店面 ID: ${store_id || '全部'}`);
    console.log(`  请求时间: ${new Date().toLocaleString('zh-CN')}`);
    
    // 获取用户信息
    const user = await db.get(
      `SELECT cp.age, cp.gender, cp.chronic_conditions, cp.taste_preferences 
       FROM users u
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.id = :id`,
      { id: clientId }
    );

    if (!user) {
      return failure(res, '用户不存在', 404);
    }

    // 获取近7天的营养数据
    const days = getPastDays(7);
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

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
      }
    }

    // 计算平均值
    const userData = {
      clientId,
      age: user.age,
      gender: user.gender,
      chronicConditions: user.chronic_conditions,
      tastePreferences: user.taste_preferences,
      avgCalories: totalCalories / 7,
      avgProtein: totalProtein / 7,
      avgFat: totalFat / 7,
      avgCarbs: totalCarbs / 7
    };

    // 获取可选菜品列表
    let dishQuery = `
      SELECT d.id, d.name, d.description, d.price, d.nutrition, d.stock, d.image
      FROM dishes d
      WHERE d.stock > 0
    `;
    const dishParams = {};

    if (store_id) {
      dishQuery += ' AND d.store_id = :store_id';
      dishParams.store_id = store_id;
    }

    dishQuery += ' ORDER BY d.monthly_sales DESC LIMIT 20';

    const dishes = await db.all(dishQuery, dishParams);

    if (dishes.length === 0) {
      return failure(res, '暂无可推荐的菜品', 404);
    }

    // 解析营养信息
    dishes.forEach(d => {
      if (d.nutrition) {
        d.nutrition = JSON.parse(d.nutrition);
      }
    });

    // 调用 AI 服务生成推荐
    const { recommendations, tokensUsed, model } = await generateSmartRecommendation(userData, dishes);

    // 获取推荐的菜品详情
    const recommendedDishes = [];
    for (const rec of recommendations) {
      const dish = dishes.find(d => d.id === rec.dish_id);
      if (dish) {
        recommendedDishes.push({
          ...dish,
          reason: rec.reason
        });
      }
    }

    console.log(`\n推荐成功: ${recommendedDishes.length} 道菜品`);

    return success(res, {
      recommendations: recommendedDishes,
      tokensUsed,
      model
    }, 'AI 推荐成功');
  } catch (error) {
    console.error('AI 智能推荐失败:', error);
    return failure(res, error.message || 'AI 推荐失败', 500);
  }
});

// ==================== AI顾问 AI 聊天接口（使用 dify API） ====================

// 会话技能缓存 - 用于上下文共享优化
const conversationSkillCache = new Map();

// 定期清理过期缓存（30分钟未使用）
setInterval(() => {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30分钟
  for (const [key, value] of conversationSkillCache.entries()) {
    if (now - value.timestamp > expireTime) {
      conversationSkillCache.delete(key);
      console.log(`[缓存清理] 删除过期会话技能: ${key}`);
    }
  }
}, 10 * 60 * 1000); // 每10分钟检查一次

// AI顾问聊天 - 客户端（使用 dify API）
router.post('/chat/client', authRequired, requireRole('client'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, message } = req.body;

    if (!message || !message.trim()) {
      return failure(res, '消息内容不能为空', 400);
    }

    console.log(`\n[AI顾问聊天-客户端-dify] 用户 ${userId} 发送消息`);
    console.log(`  对话ID: ${conversationId || '新对话'}`);
    console.log(`  消息: ${message}`);

    // 识别技能
    const detectedSkill = detectSkill(message);
    let skillContent = '';
    let shouldUpdateSkill = false;
    let cachedSkill = null;
    
    // 如果有会话ID，检查缓存的技能
    if (conversationId && conversationId.trim()) {
      cachedSkill = conversationSkillCache.get(conversationId);
      if (cachedSkill) {
        console.log(`  缓存的技能: ${cachedSkill.name}`);
      }
    }
    
    // 决定是否需要更新技能
    if (detectedSkill) {
      // 检测到新技能
      if (!cachedSkill || cachedSkill.name !== detectedSkill.name) {
        // 新对话或技能切换
        shouldUpdateSkill = true;
        console.log(`  检测到技能: ${detectedSkill.name} (${shouldUpdateSkill ? '新技能/切换' : '已缓存'})`);
        console.log(`  技能文件: ${detectedSkill.file}`);
        
        // 读取技能文件内容
        skillContent = await readSkillFile(detectedSkill.file);
        
        if (skillContent) {
          console.log(`  ✓ 技能内容读取成功`);
          console.log(`  技能内容长度: ${skillContent.length} 字符`);
          console.log(`  技能内容前200字: ${skillContent.substring(0, 200)}`);
          // 更新缓存
          if (conversationId && conversationId.trim()) {
            conversationSkillCache.set(conversationId, {
              name: detectedSkill.name,
              file: detectedSkill.file,
              content: skillContent,
              timestamp: Date.now()
            });
          }
        } else {
          console.log(`  ✗ 技能文件读取失败`);
        }
      } else {
        // 使用缓存的技能
        console.log(`  使用缓存的技能: ${cachedSkill.name}`);
        console.log(`  缓存内容长度: ${cachedSkill.content.length} 字符`);
        skillContent = cachedSkill.content;
        // 更新时间戳
        cachedSkill.timestamp = Date.now();
      }
    } else if (cachedSkill) {
      // 没有检测到新技能，但有缓存的技能，继续使用
      console.log(`  继续使用缓存的技能: ${cachedSkill.name}`);
      console.log(`  缓存内容长度: ${cachedSkill.content.length} 字符`);
      skillContent = cachedSkill.content;
      // 更新时间戳
      cachedSkill.timestamp = Date.now();
    } else {
      console.log(`  未检测到技能，使用通用对话模式`);
    }

    // 调用 dify API
    const difyApiKey = process.env.DIFY_API_KEY;
    const difyApiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    
    console.log(`  Dify API URL: ${difyApiUrl}`);
    console.log(`  Dify API Key: ${difyApiKey ? difyApiKey.substring(0, 10) + '...' : '未配置'}`);
    
    if (!difyApiKey || difyApiKey.includes('your_')) {
      console.error('dify API Key 未配置');
      return failure(res, 'AI 服务配置错误', 500);
    }
    
    // 构建 dify API 请求体 - 使用新的方式通过 inputs.systemprompt 传递技能提示词
    const requestBody = {
      files: [],
      inputs: {
        systemprompt: skillContent || '' // 将技能内容放入 inputs.systemprompt
      },
      query: message, // 用户问题保持原样，不拼接技能内容
      response_mode: 'blocking',
      user: `user_${userId}`
    };
    
    // 只有当 conversationId 存在且有效时才添加
    if (conversationId && conversationId.trim()) {
      requestBody.conversation_id = conversationId;
    }
    
    console.log(`  请求体结构:`);
    console.log(`    - query: ${message}`);
    console.log(`    - systemprompt 长度: ${skillContent.length} 字符`);
    if (skillContent) {
      console.log(`    - systemprompt 预览: ${skillContent.substring(0, 200)}...`);
    }
    console.log(`    - conversation_id: ${conversationId || '(新对话)'}`);
    console.log(`    - 技能状态: ${shouldUpdateSkill ? '新技能/切换' : cachedSkill ? '使用缓存' : '无技能'}`);
    
    console.log(`  请求 URL: ${difyApiUrl}/chat-messages`);
    
    const startTime = Date.now();
    
    // 使用阻塞模式 - 移除超时限制，让大模型有足够时间思考
    const difyResponse = await axios.post(
      `${difyApiUrl}/chat-messages`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 0 // 移除超时限制
      }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`  Dify 响应时间: ${duration} 秒`);

    const reply = difyResponse.data.answer || '抱歉，我现在无法回答。';
    const newConversationId = difyResponse.data.conversation_id;

    console.log(`  回复长度: ${reply.length}`);
    console.log(`  新对话ID: ${newConversationId}`);
    
    // 如果是新对话，更新缓存的会话ID
    if (newConversationId && (!conversationId || conversationId !== newConversationId)) {
      if (skillContent && detectedSkill) {
        conversationSkillCache.set(newConversationId, {
          name: detectedSkill.name,
          file: detectedSkill.file,
          content: skillContent,
          timestamp: Date.now()
        });
        console.log(`  已缓存技能到新会话: ${newConversationId}`);
      }
    }

    return success(res, {
      reply,
      conversationId: newConversationId,
      timestamp: Date.now(),
      skillUsed: detectedSkill ? detectedSkill.name : (cachedSkill ? cachedSkill.name : null),
      skillStatus: shouldUpdateSkill ? 'new' : (cachedSkill ? 'cached' : 'none')
    }, '消息发送成功');
  } catch (error) {
    console.error('AI顾问聊天失败:', error);
    console.error('错误详情:', error.response?.data || error.message);
    return failure(res, error.message || '聊天失败', 500);
  }
});

// AI顾问聊天 - 监护人端（使用 dify API）
router.post('/chat/guardian', authRequired, requireRole('guardian'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, message } = req.body;

    if (!message || !message.trim()) {
      return failure(res, '消息内容不能为空', 400);
    }

    console.log(`\n[AI顾问聊天-监护人-dify] 用户 ${userId} 发送消息`);
    console.log(`  对话ID: ${conversationId || '新对话'}`);
    console.log(`  消息: ${message}`);

    // 调用 dify API（使用统一配置）
    const difyApiKey = process.env.DIFY_API_KEY;
    const difyApiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    
    if (!difyApiKey || difyApiKey.includes('your_')) {
      console.error('dify API Key 未配置');
      return failure(res, 'AI 服务配置错误', 500);
    }
    
    // 构建 dify API 请求体
    const requestBody = {
      inputs: {},
      query: message,
      response_mode: 'blocking',
      user: `guardian_${userId}`
    };
    
    // 只有当 conversationId 存在且有效时才添加
    if (conversationId && conversationId.trim()) {
      requestBody.conversation_id = conversationId;
    }
    
    const difyResponse = await axios.post(
      `${difyApiUrl}/chat-messages`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const reply = difyResponse.data.answer || '抱歉，我现在无法回答。';
    const newConversationId = difyResponse.data.conversation_id;

    console.log(`  回复长度: ${reply.length}`);
    console.log(`  新对话ID: ${newConversationId}`);

    return success(res, {
      reply,
      conversationId: newConversationId,
      timestamp: Date.now()
    }, '消息发送成功');
  } catch (error) {
    console.error('AI顾问聊天失败:', error);
    console.error('错误详情:', error.response?.data || error.message);
    return failure(res, error.message || '聊天失败', 500);
  }
});

// AI顾问聊天 - 政府端（使用 dify API）
router.post('/chat/gov', authRequired, requireRole('gov'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, message } = req.body;

    if (!message || !message.trim()) {
      return failure(res, '消息内容不能为空', 400);
    }

    console.log(`\n[AI顾问聊天-政府-dify] 用户 ${userId} 发送消息`);
    console.log(`  对话ID: ${conversationId || '新对话'}`);
    console.log(`  消息: ${message}`);

    // 调用 dify API（使用统一配置）
    const difyApiKey = process.env.DIFY_API_KEY;
    const difyApiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    
    if (!difyApiKey || difyApiKey.includes('your_')) {
      console.error('dify API Key 未配置');
      return failure(res, 'AI 服务配置错误', 500);
    }
    
    // 构建 dify API 请求体
    const requestBody = {
      inputs: {},
      query: message,
      response_mode: 'blocking',
      user: `gov_${userId}`
    };
    
    // 只有当 conversationId 存在且有效时才添加
    if (conversationId && conversationId.trim()) {
      requestBody.conversation_id = conversationId;
    }
    
    const difyResponse = await axios.post(
      `${difyApiUrl}/chat-messages`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const reply = difyResponse.data.answer || '抱歉，我现在无法回答。';
    const newConversationId = difyResponse.data.conversation_id;

    console.log(`  回复长度: ${reply.length}`);
    console.log(`  新对话ID: ${newConversationId}`);

    return success(res, {
      reply,
      conversationId: newConversationId,
      timestamp: Date.now()
    }, '消息发送成功');
  } catch (error) {
    console.error('AI顾问聊天失败:', error);
    console.error('错误详情:', error.response?.data || error.message);
    return failure(res, error.message || '聊天失败', 500);
  }
});

// 通用聊天端点（兼容旧版本，根据用户角色自动路由）
router.post('/chat', authRequired, async (req, res) => {
  const role = req.user.role;
  
  // 根据角色转发到对应的端点
  if (role === 'client') {
    return router.handle(Object.assign({}, req, { url: '/chat/client' }), res);
  } else if (role === 'guardian') {
    return router.handle(Object.assign({}, req, { url: '/chat/guardian' }), res);
  } else if (role === 'gov') {
    return router.handle(Object.assign({}, req, { url: '/chat/gov' }), res);
  } else {
    return failure(res, '不支持的用户角色', 403);
  }
});

module.exports = router;
