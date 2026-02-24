const axios = require('axios');
const { loadSkillPrompts } = require('./skillLoader');

/**
 * 调用 OpenAI API 生成饮食分析报告
 * @param {Object} nutritionData - 营养数据
 * @param {string} period - 时间范围（'本周' 或 '本月'）
 * @param {string} role - 用户角色（'client' 或 'guardian'）
 * @returns {Promise<Object>} - 返回 AI 分析结果和使用的 token 数
 */
async function generateDietAnalysis(nutritionData, period = '本周', role = 'client') {
  console.log('\n========================================');
  console.log(`[AI 饮食分析请求] ${role.toUpperCase()} - ${period}`);
  console.log('========================================');
  console.log('请求时间:', new Date().toLocaleString('zh-CN'));
  
  // 根据角色选择不同的配置
  const prefix = role === 'guardian' ? 'GUARDIAN_' : 'CLIENT_';
  
  const apiKey = process.env[`${prefix}OPENAI_API_KEY`];
  const baseUrl = process.env[`${prefix}OPENAI_API_URL`] || 'https://api.openai.com/v1';
  // 确保 URL 以 /chat/completions 结尾
  const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const model = process.env[`${prefix}OPENAI_MODEL`] || 'gpt-3.5-turbo';
  
  console.log('配置信息:');
  console.log(`  - API URL: ${apiUrl}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '未配置'}`);
  
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('_here')) {
    throw new Error(`请在 .env 文件中配置有效的 ${prefix}OPENAI_API_KEY`);
  }

  // 从Skills文件夹加载提示词
  const reportType = period === '本周' ? 'weekly' : 'monthly';
  const skillId = `${role}-${reportType}`;
  
  console.log(`  - 使用技能: ${skillId}`);
  
  // 准备变量
  const variables = {
    calories: Math.round(nutritionData.calories || 0),
    protein: Math.round((nutritionData.protein || 0) * 10) / 10,
    fat: Math.round((nutritionData.fat || 0) * 10) / 10,
    carbs: Math.round((nutritionData.carbs || 0) * 10) / 10,
    fiber: Math.round((nutritionData.fiber || 0) * 10) / 10,
    calcium: Math.round((nutritionData.calcium || 0) * 10) / 10,
    vitaminC: Math.round((nutritionData.vitaminC || 0) * 10) / 10,
    iron: Math.round((nutritionData.iron || 0) * 10) / 10,
    dailyTarget: nutritionData.dailyTarget || 2000,
    achievement: nutritionData.achievement || 0,
    newDishes: nutritionData.newDishes || 0
  };
  
  // 加载技能提示词
  const { systemPrompt, userPrompt } = await loadSkillPrompts(skillId, variables);
  
  // 如果技能文件不存在，使用默认提示词
  const finalSystemPrompt = systemPrompt || 
    (role === 'guardian' 
      ? '你是一位专业的营养师和健康顾问，专门为家属提供关于老年人饮食健康的专业分析。'
      : '你是一位专业的营养师和健康顾问。你的任务是根据用户的饮食数据，提供科学、实用的营养分析和健康建议。');
  
  const finalUserPrompt = userPrompt || `请根据以下饮食数据进行分析并提供建议：

时间范围：${period}
总热量：${variables.calories} kcal
蛋白质：${variables.protein} g
脂肪：${variables.fat} g
碳水化合物：${variables.carbs} g
膳食纤维：${variables.fiber} g
钙：${variables.calcium} mg
维生素C：${variables.vitaminC} mg
铁：${variables.iron} mg

每日热量目标：${variables.dailyTarget} kcal
目标达成率：${variables.achievement}%
饮食多样性：尝试了 ${variables.newDishes} 种不同菜品

请提供：
1. 营养摄入评估（是否均衡、是否达标）
2. 具体的改善建议（3-5条）
3. 推荐的食物类型
4. 生活方式建议

请用温和、鼓励的语气，建议要具体可行。`;

  console.log('\n营养数据:');
  console.log(`  - 总热量: ${variables.calories} kcal`);
  console.log(`  - 蛋白质: ${variables.protein} g`);
  console.log(`  - 脂肪: ${variables.fat} g`);
  console.log(`  - 碳水化合物: ${variables.carbs} g`);
  console.log(`  - 膳食纤维: ${variables.fiber} g`);
  console.log(`  - 钙: ${variables.calcium} mg`);
  console.log(`  - 维生素C: ${variables.vitaminC} mg`);
  console.log(`  - 铁: ${variables.iron} mg`);
  console.log(`  - 每日目标: ${variables.dailyTarget} kcal`);
  console.log(`  - 目标达成率: ${variables.achievement}%`);
  console.log(`  - 尝试菜品数: ${variables.newDishes} 种`);

  console.log('\n提示词信息:');
  console.log(`  - 系统提示词长度: ${finalSystemPrompt.length} 字符`);
  console.log(`  - 用户提示词长度: ${finalUserPrompt.length} 字符`);
  console.log(`  - 系统提示词: ${finalSystemPrompt.substring(0, 100)}...`);
  console.log(`  - 用户提示词: ${finalUserPrompt.substring(0, 150)}...`);
  
  console.log('\n发送 API 请求...');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: finalUserPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000 // 60秒超时
      }
    );

    const duration = Date.now() - startTime;
    const analysis = response.data.choices[0].message.content;
    const tokensUsed = response.data.usage?.total_tokens || 0;

    console.log(`\n[成功] API 请求成功 (耗时: ${duration}ms)`);
    console.log(`Token 使用情况:`);
    console.log(`  - Prompt Tokens: ${response.data.usage?.prompt_tokens || 0}`);
    console.log(`  - Completion Tokens: ${response.data.usage?.completion_tokens || 0}`);
    console.log(`  - Total Tokens: ${tokensUsed}`);
    console.log(`\n生成内容预览:`);
    console.log(`  ${analysis.substring(0, 200)}...`);
    console.log('========================================\n');

    return {
      analysis,
      tokensUsed,
      model
    };
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`\n[失败] API 请求失败 (${role}):`);
    console.error(`  错误类型: ${error.response ? 'API Error' : 'Network Error'}`);
    console.error(`  错误信息: ${JSON.stringify(errorMsg, null, 2)}`);
    console.log('========================================\n');
    
    // 如果 API 调用失败，返回一个基础的分析
    const fallbackAnalysis = generateFallbackAnalysis(nutritionData, period, role);
    console.log('[警告] 使用备用分析方案\n');
    return {
      analysis: fallbackAnalysis,
      tokensUsed: 0,
      model: 'fallback'
    };
  }
}

/**
 * 生成备用分析（当 API 调用失败时使用）
 */
function generateFallbackAnalysis(nutritionData, period, role = 'client') {
  const days = period === '本周' ? 7 : 30;
  const avgCalories = Math.round((nutritionData.calories || 0) / days);
  const dailyTarget = nutritionData.dailyTarget || 2000;
  const achievement = nutritionData.achievement || 0;
  
  let analysis = `${period}营养分析报告\n\n`;
  
  // 热量评估
  if (achievement >= 80 && achievement <= 120) {
    analysis += `✓ 热量摄入：日均 ${avgCalories} kcal，基本符合推荐目标（${dailyTarget} kcal）。\n\n`;
  } else if (achievement < 80) {
    analysis += `⚠ 热量摄入：日均 ${avgCalories} kcal，略低于推荐目标（${dailyTarget} kcal）。建议适当增加主食和优质蛋白质的摄入。\n\n`;
  } else {
    analysis += `⚠ 热量摄入：日均 ${avgCalories} kcal，略高于推荐目标（${dailyTarget} kcal）。建议控制油脂和高热量食物的摄入。\n\n`;
  }
  
  // 根据角色提供不同的建议
  if (role === 'guardian') {
    analysis += `专业建议（供家属参考）：\n`;
    analysis += `1. 营养均衡：确保老人三餐规律，每餐营养搭配合理\n`;
    analysis += `2. 膳食纤维：每日至少500g蔬菜水果，预防便秘\n`;
    analysis += `3. 优质蛋白：适量摄入鱼类、禽肉、豆类，维持肌肉量\n`;
    analysis += `4. 钙质补充：注意补钙，预防骨质疏松\n`;
    analysis += `5. 低盐饮食：控制盐分摄入，每日不超过5g\n`;
    analysis += `6. 适量运动：鼓励老人进行适度运动，如散步、太极等\n`;
    analysis += `7. 定期体检：建议定期检查血压、血糖、血脂等指标\n\n`;
    analysis += `请持续关注老人的饮食健康，如有异常请及时就医。`;
  } else {
    analysis += `健康建议：\n`;
    analysis += `1. 保持三餐规律，避免暴饮暴食\n`;
    analysis += `2. 每日摄入500g蔬菜水果，增加膳食纤维\n`;
    analysis += `3. 适量摄入优质蛋白质（鱼类、禽肉、豆类）\n`;
    analysis += `4. 控制盐分摄入，每日不超过6g\n`;
    analysis += `5. 保持适量运动，每周至少150分钟中等强度运动\n\n`;
    analysis += `继续保持良好的饮食习惯，祝您健康！`;
  }
  
  return analysis;
}

module.exports = {
  generateDietAnalysis
};

/**
 * 获取当前节气
 */
function getCurrentSolarTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // 24节气对应的公历日期范围
  const solarTerms = [
    { name: '小寒', month: 1, startDay: 5, endDay: 19, season: '冬' },
    { name: '大寒', month: 1, startDay: 20, endDay: 31, season: '冬' },
    { name: '立春', month: 2, startDay: 3, endDay: 17, season: '春' },
    { name: '雨水', month: 2, startDay: 18, endDay: 29, season: '春' },
    { name: '惊蛰', month: 3, startDay: 5, endDay: 19, season: '春' },
    { name: '春分', month: 3, startDay: 20, endDay: 31, season: '春' },
    { name: '清明', month: 4, startDay: 4, endDay: 18, season: '春' },
    { name: '谷雨', month: 4, startDay: 19, endDay: 30, season: '春' },
    { name: '立夏', month: 5, startDay: 5, endDay: 19, season: '夏' },
    { name: '小满', month: 5, startDay: 20, endDay: 31, season: '夏' },
    { name: '芒种', month: 6, startDay: 5, endDay: 20, season: '夏' },
    { name: '夏至', month: 6, startDay: 21, endDay: 30, season: '夏' },
    { name: '小暑', month: 7, startDay: 6, endDay: 21, season: '夏' },
    { name: '大暑', month: 7, startDay: 22, endDay: 31, season: '夏' },
    { name: '立秋', month: 8, startDay: 7, endDay: 21, season: '秋' },
    { name: '处暑', month: 8, startDay: 22, endDay: 31, season: '秋' },
    { name: '白露', month: 9, startDay: 7, endDay: 21, season: '秋' },
    { name: '秋分', month: 9, startDay: 22, endDay: 30, season: '秋' },
    { name: '寒露', month: 10, startDay: 8, endDay: 22, season: '秋' },
    { name: '霜降', month: 10, startDay: 23, endDay: 31, season: '秋' },
    { name: '立冬', month: 11, startDay: 7, endDay: 21, season: '冬' },
    { name: '小雪', month: 11, startDay: 22, endDay: 30, season: '冬' },
    { name: '大雪', month: 12, startDay: 6, endDay: 20, season: '冬' },
    { name: '冬至', month: 12, startDay: 21, endDay: 31, season: '冬' },
    { name: '小寒', month: 1, startDay: 1, endDay: 4, season: '冬' } // 跨年的小寒前几天
  ];
  
  // 找到当前日期对应的节气
  for (const term of solarTerms) {
    if (month === term.month && day >= term.startDay && day <= term.endDay) {
      return term.name;
    }
  }
  
  // 默认返回立春
  return '立春';
}

/**
 * 调用 OpenAI API 生成节气菜品建议
 * @returns {Promise<Object>} - 返回菜品列表
 */
async function generateSeasonalDishes() {
  console.log('\n========================================');
  console.log('[AI 节气菜品生成请求]');
  console.log('========================================');
  console.log('请求时间:', new Date().toLocaleString('zh-CN'));
  
  const apiKey = process.env.MERCHANT_OPENAI_API_KEY || process.env.CLIENT_OPENAI_API_KEY;
  const baseUrl = process.env.MERCHANT_OPENAI_API_URL || process.env.CLIENT_OPENAI_API_URL || 'https://api.openai.com/v1';
  const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const model = process.env.MERCHANT_OPENAI_MODEL || process.env.CLIENT_OPENAI_MODEL || 'gpt-3.5-turbo';
  
  console.log('配置信息:');
  console.log(`  - API URL: ${apiUrl}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '未配置'}`);
  
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('_here')) {
    throw new Error('请在 .env 文件中配置有效的 OPENAI_API_KEY');
  }

  const currentSolarTerm = getCurrentSolarTerm();
  console.log(`  - 当前节气: ${currentSolarTerm}`);

  // 系统提示词
  const systemPrompt = process.env.MERCHANT_AI_SYSTEM_PROMPT || 
    '你是一位专业的中餐厨师和营养师，精通中国传统节气养生和老年人营养需求。你的任务是根据当前节气，推荐适合老年人的健康菜品。';

  // 用户提示词
  const userPrompt = process.env.MERCHANT_AI_SEASONAL_PROMPT?.replace('{solarTerm}', currentSolarTerm) ||
    `当前节气是"${currentSolarTerm}"，请为养老助餐服务推荐5道适合老年人的节气菜品。

要求：
1. 每道菜品必须符合当前节气的养生特点
2. 适合老年人食用（易消化、营养丰富、口味清淡）
3. 食材常见、制作简单、成本适中
4. 提供完整的营养信息

请严格按照以下JSON格式返回（不要添加任何其他文字说明）：
{
  "dishes": [
    {
      "name": "菜品名称",
      "description": "菜品描述（50字以内，说明节气特点和营养价值）",
      "price": 15,
      "nutrition": {
        "calories": 350,
        "protein": 18,
        "fat": 12,
        "carbs": 45,
        "fiber": 8,
        "calcium": 150,
        "vitaminC": 35,
        "iron": 3.5
      }
    }
  ]
}

注意：
- 价格范围：12-25元
- 热量范围：300-500 kcal
- 蛋白质：15-25g
- 脂肪：8-15g
- 碳水：40-60g
- 膳食纤维：5-12g
- 钙：100-300mg
- 维生素C：20-80mg
- 铁：2-5mg`;

  console.log('\n提示词信息:');
  console.log(`  - 系统提示词长度: ${systemPrompt.length} 字符`);
  console.log(`  - 用户提示词长度: ${userPrompt.length} 字符`);
  
  console.log('\n发送 API 请求...');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1500,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );

    const duration = Date.now() - startTime;
    const content = response.data.choices[0].message.content;
    const tokensUsed = response.data.usage?.total_tokens || 0;

    console.log(`\n[成功] API 请求成功 (耗时: ${duration}ms)`);
    console.log(`Token 使用情况:`);
    console.log(`  - Prompt Tokens: ${response.data.usage?.prompt_tokens || 0}`);
    console.log(`  - Completion Tokens: ${response.data.usage?.completion_tokens || 0}`);
    console.log(`  - Total Tokens: ${tokensUsed}`);
    console.log(`\n生成内容预览:`);
    console.log(`  ${content.substring(0, 200)}...`);

    // 解析 JSON 响应
    let result;
    try {
      // 尝试提取 JSON（可能被包裹在 markdown 代码块中）
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[警告] JSON 解析失败，使用备用方案');
      result = generateFallbackSeasonalDishes(currentSolarTerm);
    }

    console.log(`\n生成了 ${result.dishes?.length || 0} 道菜品`);
    console.log('========================================\n');

    return {
      dishes: result.dishes || [],
      solarTerm: currentSolarTerm,
      tokensUsed,
      model
    };
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`\n[失败] API 请求失败:`);
    console.error(`  错误类型: ${error.response ? 'API Error' : 'Network Error'}`);
    console.error(`  错误信息: ${JSON.stringify(errorMsg, null, 2)}`);
    console.log('========================================\n');
    
    // 使用备用方案
    console.log('[警告] 使用备用菜品方案\n');
    const fallbackDishes = generateFallbackSeasonalDishes(currentSolarTerm);
    return {
      dishes: fallbackDishes.dishes,
      solarTerm: currentSolarTerm,
      tokensUsed: 0,
      model: 'fallback'
    };
  }
}

/**
 * 生成备用节气菜品（当 API 调用失败时使用）
 */
function generateFallbackSeasonalDishes(solarTerm) {
  // 根据节气提供不同的备用菜品
  const seasonalDishes = {
    '立春': [
      { name: '韭菜炒鸡蛋', description: '立春时节，韭菜鲜嫩，富含维生素和膳食纤维，有助于春季养肝。', price: 15, nutrition: { calories: 320, protein: 16, fat: 12, carbs: 38, fiber: 6, calcium: 120, vitaminC: 25, iron: 3 } },
      { name: '春笋炖鸡', description: '春笋清脆爽口，鸡肉补充优质蛋白，适合春季进补。', price: 22, nutrition: { calories: 380, protein: 24, fat: 10, carbs: 42, fiber: 8, calcium: 150, vitaminC: 30, iron: 3.5 } },
      { name: '菠菜豆腐汤', description: '菠菜补铁，豆腐补钙，清淡营养，适合老年人。', price: 12, nutrition: { calories: 280, protein: 15, fat: 8, carbs: 35, fiber: 7, calcium: 200, vitaminC: 40, iron: 4 } },
      { name: '香椿拌豆腐', description: '香椿是春季时令菜，富含维生素C，清香开胃。', price: 14, nutrition: { calories: 260, protein: 14, fat: 9, carbs: 32, fiber: 6, calcium: 180, vitaminC: 50, iron: 2.5 } },
      { name: '清炒豌豆苗', description: '豌豆苗鲜嫩，富含维生素和矿物质，清淡爽口。', price: 13, nutrition: { calories: 240, protein: 12, fat: 7, carbs: 36, fiber: 8, calcium: 140, vitaminC: 45, iron: 2.8 } }
    ],
    '夏至': [
      { name: '苦瓜炒蛋', description: '夏至时节，苦瓜清热解暑，适合消暑养生。', price: 14, nutrition: { calories: 300, protein: 15, fat: 11, carbs: 36, fiber: 7, calcium: 130, vitaminC: 60, iron: 2.5 } },
      { name: '冬瓜排骨汤', description: '冬瓜利水消肿，排骨补钙，清淡营养。', price: 20, nutrition: { calories: 350, protein: 22, fat: 9, carbs: 40, fiber: 6, calcium: 180, vitaminC: 25, iron: 3.2 } },
      { name: '凉拌黄瓜', description: '黄瓜清脆爽口，清热解暑，开胃消食。', price: 10, nutrition: { calories: 220, protein: 10, fat: 6, carbs: 32, fiber: 5, calcium: 100, vitaminC: 35, iron: 2 } },
      { name: '丝瓜炒虾仁', description: '丝瓜清热化痰，虾仁补充优质蛋白。', price: 24, nutrition: { calories: 340, protein: 20, fat: 10, carbs: 38, fiber: 6, calcium: 160, vitaminC: 30, iron: 3 } },
      { name: '绿豆百合粥', description: '绿豆清热解毒，百合润肺安神，适合夏季食用。', price: 12, nutrition: { calories: 280, protein: 12, fat: 5, carbs: 50, fiber: 8, calcium: 120, vitaminC: 20, iron: 2.5 } }
    ],
    '秋分': [
      { name: '莲藕排骨汤', description: '秋季养肺，莲藕清热润燥，排骨补钙。', price: 22, nutrition: { calories: 360, protein: 23, fat: 10, carbs: 42, fiber: 7, calcium: 190, vitaminC: 28, iron: 3.5 } },
      { name: '栗子烧鸡', description: '栗子补肾健脾，鸡肉温补，适合秋季进补。', price: 25, nutrition: { calories: 420, protein: 25, fat: 12, carbs: 48, fiber: 6, calcium: 140, vitaminC: 22, iron: 3.8 } },
      { name: '银耳雪梨汤', description: '银耳润肺，雪梨清热，秋季养生佳品。', price: 15, nutrition: { calories: 260, protein: 11, fat: 6, carbs: 45, fiber: 9, calcium: 110, vitaminC: 35, iron: 2.2 } },
      { name: '南瓜蒸肉', description: '南瓜补中益气，猪肉补充蛋白质，营养丰富。', price: 20, nutrition: { calories: 380, protein: 21, fat: 11, carbs: 44, fiber: 7, calcium: 150, vitaminC: 25, iron: 3.3 } },
      { name: '山药炖排骨', description: '山药健脾养胃，排骨补钙，适合秋季滋补。', price: 23, nutrition: { calories: 370, protein: 22, fat: 10, carbs: 43, fiber: 6, calcium: 180, vitaminC: 20, iron: 3.4 } }
    ],
    '冬至': [
      { name: '羊肉萝卜汤', description: '冬至进补，羊肉温补，萝卜顺气，营养丰富。', price: 25, nutrition: { calories: 400, protein: 24, fat: 13, carbs: 42, fiber: 7, calcium: 160, vitaminC: 30, iron: 4 } },
      { name: '红烧牛肉', description: '牛肉补气血，冬季进补佳品。', price: 28, nutrition: { calories: 450, protein: 28, fat: 14, carbs: 40, fiber: 5, calcium: 140, vitaminC: 18, iron: 4.5 } },
      { name: '白菜炖豆腐', description: '白菜清淡，豆腐补钙，适合冬季养生。', price: 14, nutrition: { calories: 290, protein: 16, fat: 9, carbs: 36, fiber: 8, calcium: 220, vitaminC: 35, iron: 2.8 } },
      { name: '香菇炖鸡', description: '香菇增强免疫力，鸡肉温补，冬季滋补佳品。', price: 24, nutrition: { calories: 390, protein: 25, fat: 11, carbs: 41, fiber: 6, calcium: 150, vitaminC: 22, iron: 3.6 } },
      { name: '红枣桂圆粥', description: '红枣补血，桂圆安神，温暖滋补。', price: 13, nutrition: { calories: 310, protein: 13, fat: 6, carbs: 52, fiber: 7, calcium: 130, vitaminC: 25, iron: 3.2 } }
    ]
  };

  // 如果没有匹配的节气，使用通用菜品
  const dishes = seasonalDishes[solarTerm] || seasonalDishes['立春'];
  
  return { dishes };
}

module.exports = {
  generateDietAnalysis,
  generateSeasonalDishes
};

/**
 * 调用文生图 API 生成菜品图片
 * @param {string} dishName - 菜品名称
 * @param {string} dishDescription - 菜品描述
 * @returns {Promise<Buffer>} - 返回图片 Buffer
 */
async function generateDishImage(dishName, dishDescription) {
  console.log('\n========================================');
  console.log('[AI 菜品图片生成请求]');
  console.log('========================================');
  console.log('请求时间:', new Date().toLocaleString('zh-CN'));
  console.log(`菜品名称: ${dishName}`);
  console.log(`菜品描述: ${dishDescription}`);
  
  const apiKey = process.env.IMAGE_OPENAI_API_KEY || process.env.MERCHANT_OPENAI_API_KEY || process.env.CLIENT_OPENAI_API_KEY;
  const baseUrl = process.env.IMAGE_OPENAI_API_URL || process.env.MERCHANT_OPENAI_API_URL || 'https://api.siliconflow.cn/v1';
  const apiUrl = baseUrl.endsWith('/images/generations') ? baseUrl : `${baseUrl}/images/generations`;
  const model = process.env.IMAGE_OPENAI_MODEL || 'Kwai-Kolors/Kolors';
  
  console.log('配置信息:');
  console.log(`  - API URL: ${apiUrl}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '未配置'}`);
  
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('_here')) {
    throw new Error('请在 .env 文件中配置有效的 IMAGE_OPENAI_API_KEY');
  }

  // 构建图片生成提示词
  const imagePrompt = process.env.IMAGE_PROMPT_TEMPLATE?.replace('{dishName}', dishName).replace('{dishDescription}', dishDescription) ||
    `A professional food photography of ${dishName}, Chinese cuisine, ${dishDescription}, appetizing presentation, natural lighting, high quality, detailed, realistic, on a white plate, top view, 4k`;

  console.log(`\n图片提示词: ${imagePrompt}`);
  console.log('\n发送 API 请求...');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      apiUrl,
      {
        model,
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 120000 // 120秒超时（图片生成较慢）
      }
    );

    const duration = Date.now() - startTime;
    const imageUrl = response.data.data[0].url;

    console.log(`\n[成功] 图片生成成功 (耗时: ${duration}ms)`);
    console.log(`图片 URL: ${imageUrl}`);

    // 下载图片
    console.log('\n下载图片...');
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });

    const imageBuffer = Buffer.from(imageResponse.data);
    console.log(`图片大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    console.log('========================================\n');

    return imageBuffer;
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`\n[失败] 图片生成失败:`);
    console.error(`  错误类型: ${error.response ? 'API Error' : 'Network Error'}`);
    console.error(`  错误信息: ${JSON.stringify(errorMsg, null, 2)}`);
    console.log('========================================\n');
    
    // 图片生成失败不影响菜品创建，返回 null
    return null;
  }
}

/**
 * 为政府端生成健康建议
 * @param {Object} clientData - 用户数据
 * @returns {Promise<Object>} - 返回建议内容
 */
async function generateHealthSuggestion(clientData) {
  console.log('\n========================================');
  console.log('[AI 健康建议生成请求] GOV');
  console.log('========================================');
  console.log('请求时间:', new Date().toLocaleString('zh-CN'));
  console.log(`用户ID: ${clientData.clientId}`);
  console.log(`用户姓名: ${clientData.clientName}`);
  
  const apiKey = process.env.GOV_OPENAI_API_KEY || process.env.CLIENT_OPENAI_API_KEY;
  const baseUrl = process.env.GOV_OPENAI_API_URL || process.env.CLIENT_OPENAI_API_URL || 'https://api.siliconflow.cn/v1';
  const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const model = process.env.GOV_OPENAI_MODEL || process.env.CLIENT_OPENAI_MODEL || 'deepseek-ai/DeepSeek-V3';
  
  console.log('配置信息:');
  console.log(`  - API URL: ${apiUrl}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '未配置'}`);
  
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('_here')) {
    throw new Error('请在 .env 文件中配置有效的 GOV_OPENAI_API_KEY');
  }

  // 系统提示词
  const systemPrompt = process.env.GOV_AI_SYSTEM_PROMPT || 
    '你是一位专业的公共卫生专家和营养师，负责为社区居民提供健康管理建议。你需要根据居民的健康数据和饮食情况，提供专业、实用的健康建议和下一步行动计划。';

  // 用户提示词模板
  const userPromptTemplate = process.env.GOV_AI_SUGGESTION_PROMPT ||
    `请为以下社区居民生成健康管理建议：

居民信息：
- 姓名：{clientName}
- 年龄：{age}岁
- 性别：{gender}
- 慢性病：{chronicConditions}
- 口味偏好：{tastePreferences}

近期营养数据（过去7天）：
- 平均每日热量：{avgCalories} kcal
- 平均蛋白质：{avgProtein} g
- 平均脂肪：{avgFat} g
- 平均碳水：{avgCarbs} g
- 平均膳食纤维：{avgFiber} g

风险标记：{riskFlags}

请提供：
1. 风险提醒/优化建议（150字以内，针对性强，语言通俗易懂）
2. 下一步健康管理建议（100字以内，具体可操作）

格式要求：
第一段：风险提醒/优化建议
第二段：下一步健康管理建议

注意：语言要专业但通俗，建议要具体可行，考虑老年人特点。`;

  // 替换模板变量
  const userPrompt = userPromptTemplate
    .replace('{clientName}', clientData.clientName || '居民')
    .replace('{age}', clientData.age || '未知')
    .replace('{gender}', clientData.gender === 'male' ? '男' : clientData.gender === 'female' ? '女' : '未知')
    .replace('{chronicConditions}', clientData.chronicConditions || '无')
    .replace('{tastePreferences}', clientData.tastePreferences || '无特殊偏好')
    .replace('{avgCalories}', Math.round(clientData.avgCalories || 0))
    .replace('{avgProtein}', Math.round((clientData.avgProtein || 0) * 10) / 10)
    .replace('{avgFat}', Math.round((clientData.avgFat || 0) * 10) / 10)
    .replace('{avgCarbs}', Math.round((clientData.avgCarbs || 0) * 10) / 10)
    .replace('{avgFiber}', Math.round((clientData.avgFiber || 0) * 10) / 10)
    .replace('{riskFlags}', clientData.riskFlags || '无');

  console.log('\n用户数据:');
  console.log(`  - 姓名: ${clientData.clientName}`);
  console.log(`  - 年龄: ${clientData.age}`);
  console.log(`  - 慢性病: ${clientData.chronicConditions || '无'}`);
  console.log(`  - 平均热量: ${Math.round(clientData.avgCalories || 0)} kcal`);
  console.log(`  - 风险标记: ${clientData.riskFlags || '无'}`);

  console.log('\n发送 API 请求...');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 600,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );

    const duration = Date.now() - startTime;
    const suggestion = response.data.choices[0].message.content;
    const tokensUsed = response.data.usage?.total_tokens || 0;

    console.log(`\n[成功] API 请求成功 (耗时: ${duration}ms)`);
    console.log(`Token 使用情况:`);
    console.log(`  - Total Tokens: ${tokensUsed}`);
    console.log(`\n生成内容预览:`);
    console.log(`  ${suggestion.substring(0, 150)}...`);
    console.log('========================================\n');

    // 尝试分割建议内容
    const parts = suggestion.split('\n\n').filter(p => p.trim());
    let content = '';
    let nextStep = '';

    if (parts.length >= 2) {
      content = parts[0].trim();
      nextStep = parts.slice(1).join('\n\n').trim();
    } else {
      content = suggestion.trim();
      nextStep = '请根据以上建议调整饮食，保持健康生活方式，如有不适请及时就医。';
    }

    return {
      content,
      nextStep,
      tokensUsed,
      model
    };
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`\n[失败] API 请求失败:`);
    console.error(`  错误信息: ${JSON.stringify(errorMsg, null, 2)}`);
    console.log('========================================\n');
    
    // 返回备用建议
    return generateFallbackSuggestion(clientData);
  }
}

/**
 * 生成备用健康建议
 */
function generateFallbackSuggestion(clientData) {
  const avgCalories = clientData.avgCalories || 0;
  const hasChronicConditions = clientData.chronicConditions && clientData.chronicConditions !== '无';
  const hasRiskFlags = clientData.riskFlags && clientData.riskFlags !== '无';

  let content = '';
  let nextStep = '';

  if (hasRiskFlags) {
    content = `根据近期数据分析，发现以下风险：${clientData.riskFlags}。建议及时调整饮食结构，增加蔬菜水果摄入，控制油盐用量，保持营养均衡。`;
  } else if (avgCalories < 1500) {
    content = `近期热量摄入偏低（日均${Math.round(avgCalories)}kcal），可能影响身体机能。建议适当增加主食和优质蛋白质摄入，保证营养充足。`;
  } else if (avgCalories > 2500) {
    content = `近期热量摄入偏高（日均${Math.round(avgCalories)}kcal），建议控制油脂和高热量食物，增加运动量，保持健康体重。`;
  } else {
    content = `近期饮食基本均衡，建议继续保持。注意多样化饮食，每日摄入500g蔬菜水果，适量运动，保持良好生活习惯。`;
  }

  if (hasChronicConditions) {
    nextStep = `鉴于您有${clientData.chronicConditions}，建议定期体检，监测相关指标，遵医嘱用药，保持低盐低脂饮食，适度运动。如有不适请及时就医。`;
  } else {
    nextStep = `建议每周至少运动3次，每次30分钟以上；保持规律作息，充足睡眠；定期体检，关注血压、血糖、血脂等指标。`;
  }

  return {
    content,
    nextStep,
    tokensUsed: 0,
    model: 'fallback'
  };
}

/**
 * 为商家生成智能采购计划
 * @param {Object} orderData - 订单数据统计
 * @param {Array} dishes - 菜品列表
 * @returns {Promise<Object>} - 返回采购计划
 */
async function generatePurchasePlan(orderData, dishes) {
  console.log('\n========================================');
  console.log('[AI 采购计划生成请求] MERCHANT');
  console.log('========================================');
  console.log('请求时间:', new Date().toLocaleString('zh-CN'));
  console.log(`订单数据: 近7天订单${orderData.totalOrders}笔`);
  console.log(`菜品数量: ${dishes.length}道`);
  
  const apiKey = process.env.MERCHANT_OPENAI_API_KEY || process.env.CLIENT_OPENAI_API_KEY;
  const baseUrl = process.env.MERCHANT_OPENAI_API_URL || process.env.CLIENT_OPENAI_API_URL || 'https://api.siliconflow.cn/v1';
  const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const model = process.env.MERCHANT_OPENAI_MODEL || process.env.CLIENT_OPENAI_MODEL || 'deepseek-ai/DeepSeek-V3';
  
  console.log('配置信息:');
  console.log(`  - API URL: ${apiUrl}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '未配置'}`);
  
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('_here')) {
    throw new Error('请在 .env 文件中配置有效的 OPENAI_API_KEY');
  }

  // 系统提示词
  const systemPrompt = process.env.MERCHANT_AI_PURCHASE_SYSTEM_PROMPT || 
    '你是一位专业的餐饮采购顾问，精通食材采购和库存管理。你的任务是根据订单数据和菜品信息，生成合理的采购计划。';

  // 构建菜品销售数据
  const dishSalesData = dishes
    .filter(d => d.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 15) // 只取前15道热销菜品
    .map(d => `${d.name} - 近7天销量:${d.sales}份 库存:${d.stock}份`)
    .join('\n');

  // 用户提示词模板
  const userPromptTemplate = process.env.MERCHANT_AI_PURCHASE_PROMPT ||
    `请根据以下数据生成明天的采购计划：

订单统计（近7天）：
- 总订单数：{totalOrders}笔
- 日均订单：{avgOrders}笔
- 热销菜品数：{hotDishes}道

热销菜品及库存：
{dishSalesData}

请生成采购计划，要求：
1. 根据销量预测明天需求
2. 考虑现有库存情况
3. 适当预留安全库存
4. 优先采购热销菜品食材
5. 数量要合理（避免浪费）

请严格按照以下JSON格式返回（不要添加任何其他文字）：
{
  "items": [
    {
      "name": "食材名称",
      "quantity": "数量",
      "unit": "单位",
      "reason": "采购原因（简短说明）"
    }
  ],
  "notes": "采购备注（供应商建议、注意事项等）"
}

注意：
- 食材名称要具体（如：鸡胸肉、西兰花、胡萝卜）
- 数量要合理（根据销量和库存计算）
- 单位要明确（斤、公斤、个、根等）
- 采购原因要简洁（如：热销菜品主料、库存不足等）`;

  // 替换模板变量
  const userPrompt = userPromptTemplate
    .replace('{totalOrders}', orderData.totalOrders || 0)
    .replace('{avgOrders}', Math.round((orderData.totalOrders || 0) / 7))
    .replace('{hotDishes}', dishes.filter(d => d.sales > 0).length)
    .replace('{dishSalesData}', dishSalesData || '暂无销售数据');

  console.log('\n订单数据:');
  console.log(`  - 总订单数: ${orderData.totalOrders || 0}`);
  console.log(`  - 日均订单: ${Math.round((orderData.totalOrders || 0) / 7)}`);
  console.log(`  - 热销菜品: ${dishes.filter(d => d.sales > 0).length}道`);

  console.log('\n发送 API 请求...');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );

    const duration = Date.now() - startTime;
    const content = response.data.choices[0].message.content;
    const tokensUsed = response.data.usage?.total_tokens || 0;

    console.log(`\n[成功] API 请求成功 (耗时: ${duration}ms)`);
    console.log(`Token 使用情况: ${tokensUsed}`);
    console.log(`\n生成内容预览:`);
    console.log(`  ${content.substring(0, 200)}...`);

    // 解析 JSON 响应
    let result;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[警告] JSON 解析失败，使用备用方案');
      result = generateFallbackPurchasePlan(dishes);
    }

    console.log(`\n生成了 ${result.items?.length || 0} 项采购项目`);
    console.log('========================================\n');

    return {
      items: result.items || [],
      notes: result.notes || '',
      tokensUsed,
      model
    };
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`\n[失败] API 请求失败:`);
    console.error(`  错误信息: ${JSON.stringify(errorMsg, null, 2)}`);
    console.log('========================================\n');
    
    // 返回备用采购计划
    return generateFallbackPurchasePlan(dishes);
  }
}

/**
 * 生成备用采购计划（当 API 调用失败时使用）
 */
function generateFallbackPurchasePlan(dishes) {
  const items = [];
  
  // 按销量排序，取前5道热销菜品
  const hotDishes = [...dishes]
    .filter(d => d.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  // 为每道热销菜品生成采购项
  hotDishes.forEach(dish => {
    // 根据菜品名称推测主要食材
    const ingredients = extractIngredients(dish.name);
    ingredients.forEach(ingredient => {
      // 计算采购量：销量 * 1.2（预留20%安全库存）
      const quantity = Math.ceil(dish.sales * 1.2 / 7 * 2); // 预估2天用量
      items.push({
        name: ingredient.name,
        quantity: quantity.toString(),
        unit: ingredient.unit,
        reason: `${dish.name}主料，近7天销量${dish.sales}份`
      });
    });
  });

  // 去重合并相同食材
  const mergedItems = [];
  const itemMap = new Map();
  
  items.forEach(item => {
    const key = `${item.name}_${item.unit}`;
    if (itemMap.has(key)) {
      const existing = itemMap.get(key);
      existing.quantity = (parseInt(existing.quantity) + parseInt(item.quantity)).toString();
    } else {
      itemMap.set(key, { ...item });
    }
  });
  
  itemMap.forEach(item => mergedItems.push(item));

  return {
    items: mergedItems.slice(0, 10), // 最多10项
    notes: '根据近期销售数据自动生成，请根据实际情况调整采购量。建议提前联系供应商确认食材新鲜度和价格。',
    tokensUsed: 0,
    model: 'fallback'
  };
}

/**
 * 从菜品名称中提取可能的食材
 */
function extractIngredients(dishName) {
  const ingredientMap = {
    '鸡': [{ name: '鸡肉', unit: '斤' }],
    '牛': [{ name: '牛肉', unit: '斤' }],
    '猪': [{ name: '猪肉', unit: '斤' }],
    '鱼': [{ name: '鱼', unit: '条' }],
    '虾': [{ name: '虾仁', unit: '斤' }],
    '豆腐': [{ name: '豆腐', unit: '块' }],
    '白菜': [{ name: '白菜', unit: '斤' }],
    '萝卜': [{ name: '萝卜', unit: '斤' }],
    '土豆': [{ name: '土豆', unit: '斤' }],
    '西红柿': [{ name: '西红柿', unit: '斤' }],
    '番茄': [{ name: '番茄', unit: '斤' }],
    '茄子': [{ name: '茄子', unit: '斤' }],
    '青椒': [{ name: '青椒', unit: '斤' }],
    '胡萝卜': [{ name: '胡萝卜', unit: '斤' }],
    '菠菜': [{ name: '菠菜', unit: '斤' }],
    '芹菜': [{ name: '芹菜', unit: '斤' }],
    '蘑菇': [{ name: '蘑菇', unit: '斤' }],
    '香菇': [{ name: '香菇', unit: '斤' }],
    '木耳': [{ name: '木耳', unit: '斤' }],
    '鸡蛋': [{ name: '鸡蛋', unit: '个' }],
    '蛋': [{ name: '鸡蛋', unit: '个' }]
  };

  const ingredients = [];
  for (const [key, value] of Object.entries(ingredientMap)) {
    if (dishName.includes(key)) {
      ingredients.push(...value);
    }
  }

  // 如果没有匹配到，返回通用食材
  if (ingredients.length === 0) {
    ingredients.push({ name: '食材', unit: '份' });
  }

  return ingredients;
}

module.exports = {
  generateDietAnalysis,
  generateSeasonalDishes,
  generateDishImage,
  generateHealthSuggestion,
  generateSmartRecommendation,
  generatePurchasePlan
};

/**
 * 为客户端生成智能菜品推荐
 * @param {Object} userData - 用户健康数据
 * @param {Array} dishes - 可选菜品列表
 * @returns {Promise<Object>} - 返回推荐结果
 */
async function generateSmartRecommendation(userData, dishes, excludeDishIds = [], userSeed = 0) {
  console.log('\n========================================');
  console.log('[AI 智能推荐请求] CLIENT');
  console.log('========================================');
  console.log('请求时间:', new Date().toLocaleString('zh-CN'));
  console.log(`用户ID: ${userData.clientId} (种子: ${userSeed})`);
  console.log(`可选菜品数: ${dishes.length}`);
  if (excludeDishIds.length > 0) {
    console.log(`排除菜品: ${excludeDishIds.join(', ')}`);
  }

  const apiKey = process.env.CLIENT_OPENAI_API_KEY;
  const baseUrl = process.env.CLIENT_OPENAI_API_URL || 'https://api.siliconflow.cn/v1';
  const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const model = process.env.CLIENT_OPENAI_MODEL || 'deepseek-ai/DeepSeek-V3';

  console.log('配置信息:');
  console.log(`  - API URL: ${apiUrl}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '未配置'}`);

  if (!apiKey || apiKey.includes('your_') || apiKey.includes('_here')) {
    throw new Error('请在 .env 文件中配置有效的 CLIENT_OPENAI_API_KEY');
  }

  // 系统提示词 - 强调多样性
  const systemPrompt = process.env.CLIENT_AI_RECOMMEND_SYSTEM_PROMPT ||
    `你是一位专业的营养师，精通老年人营养需求和健康饮食搭配。你的任务是根据用户的健康状况和可选菜单，推荐3道最适合的菜品。

重要原则：
1. 不同用户ID必须得到不同的推荐组合
2. 即使健康状况相似，也要提供差异化的选择
3. 不要总是推荐"最安全"的菜品，要在适合范围内提供多样性`;

  // 根据用户种子对菜品进行分组排序，确保不同用户看到不同顺序
  const seededDishes = [...dishes].sort((a, b) => {
    const scoreA = (a.id * 31 + userSeed * 17) % 100;
    const scoreB = (b.id * 31 + userSeed * 17) % 100;
    return scoreB - scoreA;
  });

  // 过滤掉排除的菜品
  let availableDishes = seededDishes.filter(d => !excludeDishIds.includes(d.id));
  
  // 【强制多样性】根据用户ID强制排除某些"过度安全"的菜品
  const overusedDishes = [112, 125]; // 清蒸鲈鱼、香菇炒青菜
  const userExclude = overusedDishes[userSeed % overusedDishes.length];
  availableDishes = availableDishes.filter(d => d.id !== userExclude);

  console.log(`可推荐菜品数: ${availableDishes.length}`);
  console.log(`强制排除菜品ID: ${userExclude}`);
  console.log(`菜品顺序(前5): ${availableDishes.slice(0, 5).map(d => `${d.id}:${d.name}`).join(', ')}`);

  // 构建菜单列表
  const dishesMenu = availableDishes.map(d =>
    `ID:${d.id} ${d.name} ￥${d.price} - ${d.description || '无描述'} [热量:${d.nutrition?.calories || 0}kcal 蛋白质:${d.nutrition?.protein || 0}g]`
  ).join('\n');

  // 用户提示词模板
  const userPromptTemplate = process.env.CLIENT_AI_RECOMMEND_PROMPT ||
    `请根据以下信息，从菜单中推荐3道最适合的菜品：

用户健康信息：
- 用户ID：{clientId}
- 年龄：{age}岁
- 性别：{gender}
- 慢性病：{chronicConditions}
- 口味偏好：{tastePreferences}

近期营养摄入（过去7天平均）：
- 每日热量：{avgCalories} kcal
- 蛋白质：{avgProtein} g
- 脂肪：{avgFat} g
- 碳水：{avgCarbs} g

可选菜单：
{dishesMenu}

请严格按照以下JSON格式返回（只返回JSON，不要其他文字）：
{
  "recommendations": [
    {
      "dish_id": 菜品ID,
      "reason": "推荐理由（30字以内）"
    }
  ]
}

【重要规则】：
1. 必须从可选菜单中选择3道菜品
2. 考虑营养均衡（蛋白质、蔬菜、主食搭配）
3. 根据用户的具体慢性病情况提供针对性推荐
4. 【强制要求】不同用户ID必须推荐不同的菜品组合
5. 【强制要求】优先从菜单列表的前10道菜中选择（它们已经根据用户特征优化排序）
6. 【强制要求】如果用户ID是偶数，避免推荐ID为112的菜品；如果用户ID是奇数，避免推荐ID为125的菜品
7. 在满足健康要求的前提下，提供多样化的选择
8. 推荐理由要简洁明了`;

  // 替换模板变量
  const userPrompt = userPromptTemplate
    .replace('{clientId}', userData.clientId || '未知')
    .replace('{age}', userData.age || '未知')
    .replace('{gender}', userData.gender === 'male' ? '男' : userData.gender === 'female' ? '女' : '未知')
    .replace('{chronicConditions}', userData.chronicConditions || '无')
    .replace('{tastePreferences}', userData.tastePreferences || '无特殊偏好')
    .replace('{avgCalories}', Math.round(userData.avgCalories || 0))
    .replace('{avgProtein}', Math.round((userData.avgProtein || 0) * 10) / 10)
    .replace('{avgFat}', Math.round((userData.avgFat || 0) * 10) / 10)
    .replace('{avgCarbs}', Math.round((userData.avgCarbs || 0) * 10) / 10)
    .replace('{dishesMenu}', dishesMenu);

  console.log('\n用户数据:');
  console.log(`  - 年龄: ${userData.age}`);
  console.log(`  - 慢性病: ${userData.chronicConditions || '无'}`);
  console.log(`  - 平均热量: ${Math.round(userData.avgCalories || 0)} kcal`);
  
  console.log('\n菜单列表预览(前3道):');
  const menuLines = dishesMenu.split('\n');
  menuLines.slice(0, 3).forEach(line => console.log(`  ${line}`));
  console.log(`  ... 共 ${menuLines.length} 道菜品`);

  console.log('\n发送 API 请求...');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,
        max_tokens: 500,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );

    const duration = Date.now() - startTime;
    const content = response.data.choices[0].message.content;
    const tokensUsed = response.data.usage?.total_tokens || 0;

    console.log(`\n[成功] API 请求成功 (耗时: ${duration}ms)`);
    console.log(`Token 使用情况: ${tokensUsed}`);
    console.log(`\n生成内容预览:`);
    console.log(`  ${content.substring(0, 150)}...`);

    // 解析 JSON 响应
    let result;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[警告] JSON 解析失败，使用备用方案');
      result = generateFallbackRecommendation(availableDishes);
    }

    console.log(`\n推荐了 ${result.recommendations?.length || 0} 道菜品`);
    console.log('========================================\n');

    return {
      recommendations: result.recommendations || [],
      tokensUsed,
      model
    };
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`\n[失败] API 请求失败:`);
    console.error(`  错误信息: ${JSON.stringify(errorMsg, null, 2)}`);
    console.log('========================================\n');

    // 返回备用推荐
    return generateFallbackRecommendation(availableDishes);
  }
}


/**
 * 生成备用推荐（当 API 调用失败时使用）
 */
function generateFallbackRecommendation(dishes) {
  // 按热量排序，选择中等热量的菜品
  const sorted = [...dishes].sort((a, b) => (a.nutrition?.calories || 0) - (b.nutrition?.calories || 0));
  const midIndex = Math.floor(sorted.length / 2);
  
  // 选择3道菜品：低热量、中热量、高蛋白
  const recommendations = [];
  
  if (sorted.length >= 3) {
    // 低热量菜品
    recommendations.push({
      dish_id: sorted[0].id,
      reason: '热量适中，适合日常食用'
    });
    
    // 中热量菜品
    recommendations.push({
      dish_id: sorted[midIndex].id,
      reason: '营养均衡，口味适宜'
    });
    
    // 高蛋白菜品
    const proteinSorted = [...dishes].sort((a, b) => (b.nutrition?.protein || 0) - (a.nutrition?.protein || 0));
    recommendations.push({
      dish_id: proteinSorted[0].id,
      reason: '富含蛋白质，增强体质'
    });
  } else {
    // 菜品不足3道，全部推荐
    dishes.forEach(d => {
      recommendations.push({
        dish_id: d.id,
        reason: '营养丰富，推荐食用'
      });
    });
  }

  return {
    recommendations,
    tokensUsed: 0,
    model: 'fallback'
  };
}
