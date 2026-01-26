# 综合营养评分算法文档

## 概述

综合营养评分算法是一个多维度的健康饮食评估系统，通过分析用户的营养摄入数据，从5个关键维度进行量化评分，最终生成0-100分的综合健康评分，并给出相应的健康等级评价。

## 评分维度

### 1. 热量适宜度 (25分)
评估每日热量摄入是否在推荐范围内，避免过量或不足。

**推荐标准：**
- 最小值：1800 kcal/天
- 最大值：2400 kcal/天
- 最优值：2100 kcal/天

**评分逻辑：**
- 在最优值±5%范围内（1995-2205 kcal）：满分25分
- 在推荐范围内（1800-2400 kcal）：根据偏离程度打分
- 低于最小值或高于最大值：按比例扣分

### 2. 营养均衡度 (25分)
评估三大营养素（蛋白质、脂肪、碳水化合物）的摄入比例是否合理。

**推荐标准：**
- 蛋白质：50-80g/天，最优65g（8分）
- 脂肪：40-70g/天，最优55g（8分）
- 碳水化合物：200-350g/天，最优275g（9分）

**评分逻辑：**
- 三项分数相加，总分25分
- 各项独立评分，确保营养素比例均衡

### 3. 微量元素 (20分)
评估钙、铁、维生素C等微量元素的摄入是否充足。

**推荐标准：**
- 钙：800-1200mg/天，最优1000mg（7分）
- 维生素C：80-120mg/天，最优100mg（7分）
- 铁：12-20mg/天，最优15mg（6分）

**评分逻辑：**
- 三项分数相加，总分20分
- 微量元素对健康至关重要，缺乏会影响整体评分

### 4. 膳食纤维 (15分)
评估膳食纤维摄入是否达标，促进肠道健康。

**推荐标准：**
- 最小值：20g/天
- 最大值：35g/天
- 最优值：25g/天

**评分逻辑：**
- 膳食纤维有助于消化和预防慢性疾病
- 摄入不足会显著影响评分

### 5. 饮食规律性 (15分)
评估每日热量摄入的稳定性，鼓励规律的饮食习惯。

**评分逻辑：**
- 基于每日热量的标准差计算
- 标准差在200以内：满分15分
- 标准差每增加100：扣除20%分数
- 波动越小，说明饮食越规律

## 评级标准

| 分数范围 | 等级 | 说明 |
|---------|------|------|
| 90-100分 | 优秀 | 营养摄入非常均衡，饮食习惯优秀 |
| 75-89分 | 优良 | 营养摄入较为均衡，略有改进空间 |
| 60-74分 | 良好 | 营养摄入基本合理，需要注意调整 |
| 0-59分 | 需改善 | 营养摄入不均衡，建议咨询营养师 |

## 技术要点

### 1. 范围评分算法

```javascript
/**
 * 计算范围评分
 * @param {number} value - 实际摄入值
 * @param {object} range - 推荐范围 { min, max, optimal }
 * @param {number} maxScore - 该项最高分
 * @returns {number} 得分
 */
const calculateRangeScore = (value, range, maxScore) => {
  const { min, max, optimal } = range
  
  if (value >= optimal * 0.95 && value <= optimal * 1.05) {
    // 在最优值±5%范围内，满分
    return maxScore
  } else if (value >= min && value <= max) {
    // 在推荐范围内，根据偏离程度打分
    const deviation = Math.abs(value - optimal) / optimal
    return maxScore * (1 - deviation * 0.5)
  } else if (value < min) {
    // 低于最小值
    const ratio = value / min
    return maxScore * ratio * 0.6
  } else {
    // 高于最大值
    const ratio = max / value
    return maxScore * ratio * 0.6
  }
}
```

**核心思想：**
- 最优值附近（±5%）给予满分，鼓励达到最佳状态
- 推荐范围内线性扣分，偏离越多扣分越多
- 超出范围按比例大幅扣分，警示不健康状态

### 2. 饮食规律性评分算法

```javascript
/**
 * 计算饮食规律性评分
 * @param {array} calories - 每日热量数组
 * @param {number} maxScore - 该项最高分
 * @returns {number} 得分
 */
const calculateRegularityScore = (calories, maxScore) => {
  if (!calories || calories.length === 0) return 0
  
  // 计算平均值
  const avg = calories.reduce((sum, val) => sum + val, 0) / calories.length
  
  // 计算方差
  const variance = calories.reduce((sum, val) => 
    sum + Math.pow(val - avg, 2), 0
  ) / calories.length
  
  // 计算标准差
  const stdDev = Math.sqrt(variance)
  
  // 标准差越小，规律性越好
  // 标准差在200以内为满分，每增加100扣20%
  const deviationRatio = stdDev / 200
  const score = maxScore * Math.max(0, 1 - deviationRatio * 0.2)
  
  return score
}
```

**核心思想：**
- 使用统计学标准差衡量波动程度
- 标准差小表示饮食规律，有利于健康
- 设定基准值200，超出部分按比例扣分

### 3. 综合评分主函数

```javascript
/**
 * 计算营养评分
 * @param {object} data - 报告数据（包含summary和calories）
 * @param {number} days - 统计天数（周报7天，月报30天）
 * @returns {object} 评分结果
 */
const calculateNutritionScore = (data, days = 7) => {
  const summary = data.summary || {}
  const calories = data.calories || []
  
  // 推荐标准（每日）
  const dailyRecommended = {
    calories: { min: 1800, max: 2400, optimal: 2100 },
    protein: { min: 50, max: 80, optimal: 65 },
    fat: { min: 40, max: 70, optimal: 55 },
    carbs: { min: 200, max: 350, optimal: 275 },
    fiber: { min: 20, max: 35, optimal: 25 },
    calcium: { min: 800, max: 1200, optimal: 1000 },
    vitaminC: { min: 80, max: 120, optimal: 100 },
    iron: { min: 12, max: 20, optimal: 15 }
  }
  
  // 计算每日平均值
  const avgCalories = (summary.calories || 0) / days
  const avgProtein = (summary.protein || 0) / days
  const avgFat = (summary.fat || 0) / days
  const avgCarbs = (summary.carbs || 0) / days
  const avgFiber = (summary.fiber || 0) / days
  const avgCalcium = (summary.calcium || 0) / days
  const avgVitaminC = (summary.vitaminC || 0) / days
  const avgIron = (summary.iron || 0) / days
  
  // 1. 热量适宜度评分 (25分)
  const calorieScore = calculateRangeScore(
    avgCalories, 
    dailyRecommended.calories, 
    25
  )
  
  // 2. 营养均衡度评分 (25分)
  const proteinScore = calculateRangeScore(
    avgProtein, 
    dailyRecommended.protein, 
    8
  )
  const fatScore = calculateRangeScore(
    avgFat, 
    dailyRecommended.fat, 
    8
  )
  const carbsScore = calculateRangeScore(
    avgCarbs, 
    dailyRecommended.carbs, 
    9
  )
  const balanceScore = proteinScore + fatScore + carbsScore
  
  // 3. 微量元素评分 (20分)
  const calciumScore = calculateRangeScore(
    avgCalcium, 
    dailyRecommended.calcium, 
    7
  )
  const vitaminCScore = calculateRangeScore(
    avgVitaminC, 
    dailyRecommended.vitaminC, 
    7
  )
  const ironScore = calculateRangeScore(
    avgIron, 
    dailyRecommended.iron, 
    6
  )
  const micronutrientScore = calciumScore + vitaminCScore + ironScore
  
  // 4. 膳食纤维评分 (15分)
  const fiberScore = calculateRangeScore(
    avgFiber, 
    dailyRecommended.fiber, 
    15
  )
  
  // 5. 饮食规律性评分 (15分)
  const regularityScore = calculateRegularityScore(calories, 15)
  
  // 总分
  const totalScore = Math.round(
    calorieScore + 
    balanceScore + 
    micronutrientScore + 
    fiberScore + 
    regularityScore
  )
  
  // 评级
  let level = '优秀'
  let levelColor = '#22c55e'
  if (totalScore < 60) {
    level = '需改善'
    levelColor = '#ef4444'
  } else if (totalScore < 75) {
    level = '良好'
    levelColor = '#f59e0b'
  } else if (totalScore < 90) {
    level = '优良'
    levelColor = '#10b981'
  }
  
  return {
    total: totalScore,
    level,
    levelColor,
    breakdown: [
      { 
        name: '热量适宜度', 
        score: Math.round(calorieScore), 
        max: 25, 
        color: '#3b82f6' 
      },
      { 
        name: '营养均衡度', 
        score: Math.round(balanceScore), 
        max: 25, 
        color: '#8b5cf6' 
      },
      { 
        name: '微量元素', 
        score: Math.round(micronutrientScore), 
        max: 20, 
        color: '#ec4899' 
      },
      { 
        name: '膳食纤维', 
        score: Math.round(fiberScore), 
        max: 15, 
        color: '#f59e0b' 
      },
      { 
        name: '饮食规律性', 
        score: Math.round(regularityScore), 
        max: 15, 
        color: '#10b981' 
      }
    ]
  }
}
```

## 使用示例

### Vue 组件中使用

```javascript
import { ref, computed } from 'vue'

// 周报评分
const weeklyScore = computed(() => {
  if (!weekly.value) {
    return {
      total: 0,
      level: '暂无数据',
      levelColor: '#9ca3af',
      breakdown: []
    }
  }
  return calculateNutritionScore(weekly.value, 7)
})

// 月报评分
const monthlyScore = computed(() => {
  if (!monthly.value) {
    return {
      total: 0,
      level: '暂无数据',
      levelColor: '#9ca3af',
      breakdown: []
    }
  }
  return calculateNutritionScore(monthly.value, 30)
})
```

### 模板中展示

```vue
<template>
  <div class="score-section">
    <h3 class="section-title">综合营养评分</h3>
    <div class="score-display">
      <!-- 圆形进度环 -->
      <div class="score-circle">
        <svg viewBox="0 0 200 200" class="score-svg">
          <circle cx="100" cy="100" r="85" class="score-bg-circle" />
          <circle 
            cx="100" 
            cy="100" 
            r="85" 
            class="score-progress-circle"
            :style="{ strokeDashoffset: scoreOffset }"
          />
        </svg>
        <div class="score-content">
          <div class="score-number">{{ weeklyScore.total }}</div>
          <div class="score-label">{{ weeklyScore.level }}</div>
        </div>
      </div>
      
      <!-- 评分明细 -->
      <div class="score-breakdown">
        <div 
          class="breakdown-item" 
          v-for="item in weeklyScore.breakdown" 
          :key="item.name"
        >
          <div class="breakdown-header">
            <span class="breakdown-name">{{ item.name }}</span>
            <span class="breakdown-score">
              {{ item.score }}/{{ item.max }}
            </span>
          </div>
          <div class="breakdown-bar">
            <div 
              class="breakdown-fill" 
              :style="{ 
                width: (item.score / item.max * 100) + '%', 
                background: item.color 
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

## 算法优势

### 1. 科学性
- 基于中国居民膳食营养素参考摄入量（DRIs）
- 多维度综合评估，避免单一指标的片面性
- 考虑营养素之间的协同作用

### 2. 灵活性
- 支持周报和月报不同时间跨度
- 可根据不同人群调整推荐标准
- 评分权重可根据需求调整

### 3. 可解释性
- 总分和各维度分数清晰展示
- 用户可以明确知道哪些方面需要改进
- 评级标准直观易懂

### 4. 激励性
- 最优值附近给予满分，鼓励达标
- 渐进式扣分机制，避免打击积极性
- 饮食规律性评分鼓励养成良好习惯

## 未来优化方向

### 1. 个性化推荐标准
- 根据用户年龄、性别、体重、活动量调整标准
- 考虑特殊人群（孕妇、老人、运动员）的特殊需求
- 结合健康目标（减重、增肌、维持）动态调整

### 2. 更多评分维度
- 添加糖分摄入评分
- 添加钠盐摄入评分
- 添加饮水量评分
- 添加用餐时间规律性评分

### 3. 机器学习优化
- 基于大量用户数据训练模型
- 自动发现最优营养配比
- 预测健康风险

### 4. 趋势分析
- 评分历史趋势图
- 对比同龄人平均水平
- 季节性饮食模式分析

## 参考文献

1. 中国营养学会. 中国居民膳食营养素参考摄入量（2013版）
2. WHO. Healthy diet fact sheet. 2020
3. 中国营养学会. 中国居民膳食指南（2022）
4. 国家卫生健康委员会. 成人肥胖食养指南（2023年版）

## 版本历史

- v1.0.0 (2026-01-27) - 初始版本，实现5维度评分系统
- 未来版本将根据用户反馈和数据分析持续优化

---

**文档维护者：** 智膳伙伴技术团队  
**最后更新：** 2026年1月27日
