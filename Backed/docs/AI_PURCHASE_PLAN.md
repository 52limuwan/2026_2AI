# AI 智能采购计划功能

## 功能概述

商家可以使用 AI 智能生成采购计划功能，系统会根据近 7 天的订单数据和菜品销量，自动生成明天的采购计划。

## 功能特点

1. **智能分析**：分析近 7 天订单数据和菜品销量
2. **自动生成**：AI 自动生成采购项目清单
3. **合理预测**：根据销量预测明天需求，避免浪费
4. **库存考虑**：考虑现有库存情况，优化采购量
5. **热销优先**：优先采购热销菜品的主要食材

## 使用方法

### 前端使用

1. 进入商家端 -> 采购计划页面
2. 点击 "✨ AI 生成采购计划" 按钮
3. 等待 AI 分析和生成（约 5-10 秒）
4. 查看生成的采购计划，可以手动调整
5. 点击"创建"保存采购计划

### API 接口

**请求**
```
POST /merchant/purchase-plan/generate
Authorization: Bearer <token>
```

**响应**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 123,
      "merchant_id": 1,
      "plan_date": "2026-01-28",
      "items": [
        {
          "name": "鸡胸肉",
          "quantity": "5",
          "unit": "斤",
          "reason": "热销菜品主料，近7天销量30份"
        }
      ],
      "notes": "建议提前联系供应商确认食材新鲜度和价格。",
      "status": "pending"
    },
    "tokensUsed": 850,
    "model": "deepseek-ai/DeepSeek-V3",
    "message": "已根据近7天订单数据（45笔）生成明天的采购计划"
  },
  "message": "AI采购计划已生成"
}
```

## 配置说明

在 `.env` 文件中配置以下参数：

```env
# Merchant 端采购计划生成系统提示词
MERCHANT_AI_PURCHASE_SYSTEM_PROMPT=你是一位专业的餐饮采购顾问...

# Merchant 端采购计划生成提示词模板
MERCHANT_AI_PURCHASE_PROMPT=请根据以下数据生成明天的采购计划...
```

## 生成逻辑

1. **数据收集**
   - 统计近 7 天订单总数
   - 获取所有菜品及其销量
   - 识别热销菜品（销量 > 0）

2. **AI 分析**
   - 分析订单趋势
   - 预测明天需求
   - 考虑库存情况
   - 计算采购量

3. **结果生成**
   - 生成采购项目清单
   - 每项包含：食材名称、数量、单位、采购原因
   - 提供采购备注和建议

4. **备用方案**
   - 如果 AI 调用失败，使用备用算法
   - 根据热销菜品名称提取食材
   - 按销量计算采购量（销量 × 1.2 × 2天）

## 注意事项

1. **数据准确性**：确保订单数据和菜品库存数据准确
2. **手动调整**：AI 生成的计划仅供参考，建议根据实际情况调整
3. **供应商确认**：采购前建议联系供应商确认食材可用性和价格
4. **安全库存**：系统会自动预留 20% 安全库存
5. **API 配置**：确保 `.env` 中配置了有效的 OpenAI API Key

## 技术实现

- **后端**：`Backed/src/services/aiService.js` - `generatePurchasePlan()`
- **路由**：`Backed/src/routes/merchant.js` - `POST /merchant/purchase-plan/generate`
- **前端**：`Unified/src/modules/merchant/PurchasePlan.vue`
- **API**：`Unified/src/api/merchant.js` - `generateAIPurchasePlan()`

## 示例输出

```json
{
  "items": [
    {
      "name": "鸡胸肉",
      "quantity": "5",
      "unit": "斤",
      "reason": "宫保鸡丁主料，近7天销量30份"
    },
    {
      "name": "西兰花",
      "quantity": "3",
      "unit": "斤",
      "reason": "西兰花炒虾仁主料，近7天销量25份"
    },
    {
      "name": "胡萝卜",
      "quantity": "4",
      "unit": "斤",
      "reason": "多道菜品配料，库存不足"
    }
  ],
  "notes": "建议提前联系供应商确认食材新鲜度和价格。注意检查食材质量，确保新鲜。"
}
```
