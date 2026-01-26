const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');
const { generateDishImage } = require('../services/aiService');

/**
 * 调用AI生成菜品描述和营养信息
 */
async function generateDishInfo(dishName) {
  const apiKey = process.env.MERCHANT_OPENAI_API_KEY || process.env.CLIENT_OPENAI_API_KEY;
  const baseUrl = process.env.MERCHANT_OPENAI_API_URL || process.env.CLIENT_OPENAI_API_URL || 'https://api.openai.com/v1';
  const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const model = process.env.MERCHANT_OPENAI_MODEL || process.env.CLIENT_OPENAI_MODEL || 'gpt-3.5-turbo';
  
  if (!apiKey) {
    throw new Error('请在 .env 文件中配置有效的 OPENAI_API_KEY');
  }

  const systemPrompt = '你是一位专业的中餐厨师和营养师，精通各种中国菜品的制作和营养成分。';
  
  const userPrompt = `请为菜品"${dishName}"生成描述和营养信息。

要求：
1. 描述：50字以内，说明菜品特点、口味、适合人群（老年人）
2. 营养信息要真实合理，符合该菜品的实际情况

请严格按照以下JSON格式返回（不要添加任何其他文字）：
{
  "description": "菜品描述",
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

注意营养值范围：
- 热量(calories): 200-600 kcal
- 蛋白质(protein): 8-30g
- 脂肪(fat): 5-25g
- 碳水(carbs): 20-80g
- 膳食纤维(fiber): 2-15g
- 钙(calcium): 50-300mg
- 维生素C(vitaminC): 5-100mg
- 铁(iron): 1-8mg`;

  try {
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
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

    const content = response.data.choices[0].message.content;
    
    // 解析 JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const result = JSON.parse(jsonStr);
    
    return result;
  } catch (error) {
    console.error(`  AI生成失败，使用默认值:`, error.message);
    // 返回默认值
    return {
      description: `精选食材，传统工艺，美味可口，适合老年人食用`,
      nutrition: {
        calories: Math.floor(Math.random() * 200) + 300,
        protein: Math.floor(Math.random() * 10) + 12,
        fat: Math.floor(Math.random() * 10) + 8,
        carbs: Math.floor(Math.random() * 30) + 35,
        fiber: Math.floor(Math.random() * 6) + 4,
        calcium: Math.floor(Math.random() * 120) + 80,
        vitaminC: Math.floor(Math.random() * 40) + 15,
        iron: Math.round((Math.random() * 3 + 2) * 10) / 10
      }
    };
  }
}

/**
 * 从菜品列表文件添加菜品到数据库
 */
async function addDishesFromList() {
  console.log('\n========================================');
  console.log('[批量添加菜品]');
  console.log('========================================');
  console.log('开始时间:', new Date().toLocaleString('zh-CN'));
  
  let database, save;
  
  try {
    // 获取数据库实例
    const dbInstance = await db.getDatabase();
    database = dbInstance.database;
    save = dbInstance.save;
    
    console.log(`数据库文件路径: ${db.dbPath}`);
    
    // 读取菜品列表文件
    const listPath = path.join(__dirname, '../../../菜品列表.txt');
    const content = fs.readFileSync(listPath, 'utf-8');
    const dishNames = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`\n读取到 ${dishNames.length} 道菜品`);
    
    // 直接使用商户ID=3, 店面ID=1
    const merchantId = 3;
    const storeId = 1;
    
    console.log(`\n使用商户ID: ${merchantId}, 店面ID: ${storeId}`);
    
    // 上传目录
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // 批量插入菜品
    const insertedDishes = [];
    let successfulImages = 0;
    let failedImages = 0;
    
    for (let i = 0; i < dishNames.length; i++) {
      const dishName = dishNames[i];
      console.log(`\n[${i + 1}/${dishNames.length}] 处理菜品: ${dishName}`);
      
      // 生成随机价格（6-10元之间）
      const price = Math.floor(Math.random() * 5) + 6;
      const memberPrice = Math.round(price * 0.8 * 100) / 100;
      
      console.log(`  价格: ${price}元  会员价: ${memberPrice}元`);
      
      // 使用AI生成菜品描述和营养信息
      console.log(`  正在生成描述和营养信息...`);
      const dishInfo = await generateDishInfo(dishName);
      const description = dishInfo.description;
      const nutrition = dishInfo.nutrition;
      
      console.log(`  描述: ${description}`);
      console.log(`  营养: 热量${nutrition.calories}kcal 蛋白质${nutrition.protein}g`);
      
      // 尝试生成菜品图片（无限重试直到成功）
      let imageUrl = '';
      let imageGenerated = false;
      let retryCount = 0;
      
      while (!imageGenerated) {
        try {
          if (retryCount > 0) {
            console.log(`  重试生成图片 (第${retryCount}次)...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
          } else {
            console.log(`  正在生成图片...`);
          }
          
          const imageBuffer = await generateDishImage(dishName, description);
          
          if (imageBuffer) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = `dish-${uniqueSuffix}.jpg`;
            const filepath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filepath, imageBuffer);
            imageUrl = `/uploads/${filename}`;
            successfulImages++;
            imageGenerated = true;
            console.log(`  图片已保存: ${imageUrl}`);
          } else {
            retryCount++;
            console.log(`  图片生成返回空，5秒后重试...`);
          }
        } catch (imageError) {
          retryCount++;
          console.error(`  图片生成异常 (尝试${retryCount}次):`, imageError.message);
          console.log(`  5秒后重试...`);
        }
      }
      
      // 插入菜品到数据库（使用同一个database实例）
      const stmt = database.prepare(
        `INSERT INTO dishes (merchant_id, store_id, name, price, member_price, stock, description, nutrition, image, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`
      );
      
      stmt.bind([merchantId, storeId, dishName, price, memberPrice, 50, description, JSON.stringify(nutrition), imageUrl]);
      stmt.step();
      stmt.free();
      
      const lastId = database.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0];
      insertedDishes.push({ id: lastId, name: dishName, price, member_price: memberPrice });
      
      // 立即保存到文件
      save();
      console.log(`  菜品已添加并保存 (ID: ${lastId})`);
      
      // 每处理5道菜品暂停一下
      if ((i + 1) % 5 === 0 && i < dishNames.length - 1) {
        console.log(`\n  --- 已处理 ${i + 1} 道菜品，暂停2秒... ---`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n========================================');
    console.log('[批量添加完成]');
    console.log('========================================');
    console.log(`总计: ${insertedDishes.length} 道菜品`);
    console.log(`成功生成图片: ${successfulImages} 张`);
    console.log(`图片生成失败: ${failedImages} 张`);
    console.log('完成时间:', new Date().toLocaleString('zh-CN'));
    console.log('========================================\n');
    
    return {
      success: true,
      total: insertedDishes.length,
      imagesGenerated: successfulImages,
      imagesFailed: failedImages,
      dishes: insertedDishes
    };
  } catch (error) {
    console.error('\n[错误] 批量添加失败:', error);
    // 即使出错也要保存已插入的数据
    if (save) {
      console.log('尝试保存已插入的数据...');
      try {
        save();
        console.log('已保存');
      } catch (saveError) {
        console.error('保存失败:', saveError);
      }
    }
    throw error;
  } finally {
    // 最后确保保存并关闭数据库
    if (save) {
      try {
        save();
        console.log('\n最终保存完成');
      } catch (saveError) {
        console.error('最终保存失败:', saveError);
      }
    }
    if (database && typeof database.close === 'function') {
      database.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addDishesFromList()
    .then(result => {
      console.log('\n脚本执行成功');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addDishesFromList };
