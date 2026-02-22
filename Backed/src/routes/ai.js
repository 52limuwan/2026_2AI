const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');
const { generateDietAnalysis, generateSmartRecommendation } = require('../services/aiService');
const { getPastDays } = require('../utils/dateHelper');

const router = express.Router();

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
    const { conversationId, role, content, timestamp, targetClientId } = req.body;

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

    const result = await db.run(
      `INSERT INTO ai_chat_messages 
       (user_id, target_client_id, conversation_id, role, content, timestamp)
       VALUES (:user_id, :target_client_id, :conversation_id, :role, :content, :timestamp)`,
      {
        user_id: userId,
        target_client_id: targetClientId || null,
        conversation_id: conversationId,
        role,
        content,
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
      `SELECT id, role, content, timestamp
       FROM ai_chat_messages
       WHERE user_id = :user_id AND conversation_id = :conversation_id
       ORDER BY timestamp ASC
       LIMIT :limit`,
      { user_id: userId, conversation_id: conversationId, limit: parseInt(limit) }
    );

    return success(res, { messages });
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

    // 调用 dify API
    const difyApiKey = process.env.DIFY_API_KEY;
    const difyApiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    
    console.log(`  Dify API URL: ${difyApiUrl}`);
    console.log(`  Dify API Key: ${difyApiKey ? difyApiKey.substring(0, 10) + '...' : '未配置'}`);
    
    if (!difyApiKey || difyApiKey.includes('your_')) {
      console.error('dify API Key 未配置');
      return failure(res, 'AI 服务配置错误', 500);
    }
    
    // 构建 dify API 请求体
    const requestBody = {
      inputs: {},
      query: message,
      response_mode: 'blocking',
      user: `user_${userId}`
    };
    
    // 只有当 conversationId 存在且有效时才添加
    if (conversationId && conversationId.trim()) {
      requestBody.conversation_id = conversationId;
    }
    
    console.log(`  请求 URL: ${difyApiUrl}/chat-messages`);
    console.log(`  请求体:`, JSON.stringify(requestBody, null, 2));
    
    const startTime = Date.now();
    
    // 使用阻塞模式（先让功能正常工作）
    const difyResponse = await axios.post(
      `${difyApiUrl}/chat-messages`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`  Dify 响应时间: ${duration} 秒`);

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
