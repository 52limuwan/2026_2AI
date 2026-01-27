# 时区处理指南

## 概述

本项目统一使用**北京时间（UTC+8）**作为标准时区。所有时间相关的操作都应该基于北京时间进行处理。

## 当前时间

- **日期**: 2026年1月27日
- **时间**: 晚上20:50（北京时间）
- **星期**: 星期二

## 后端时间处理

### 1. 使用统一的时间工具函数

所有时间相关操作都应该使用 `Backed/src/utils/dateHelper.js` 中的工具函数：

```javascript
const { 
  getBeijingTime,           // 获取北京时间的Date对象
  getLocalDateString,       // 获取日期字符串 (YYYY-MM-DD)
  getLocalDateTimeString,   // 获取日期时间字符串 (YYYY-MM-DD HH:mm:ss)
  getToday,                 // 获取今天的日期
  getCurrentHour,           // 获取当前小时数
  getPastDays,              // 获取过去N天的日期数组
  utcToBeijing              // UTC时间转北京时间
} = require('../utils/dateHelper');
```

### 2. 数据库时间字段

SQLite的 `CURRENT_TIMESTAMP` 返回UTC时间，因此：

- ✅ **推荐**: 使用 `getLocalDateTimeString()` 生成北京时间字符串
- ❌ **避免**: 直接使用 `CURRENT_TIMESTAMP` 或 `new Date().toISOString()`

```javascript
// ✅ 正确做法
const localTime = getLocalDateTimeString();
await db.run(
  'INSERT INTO orders (created_at) VALUES (:created_at)',
  { created_at: localTime }
);

// ❌ 错误做法
await db.run(
  'INSERT INTO orders (created_at) VALUES (CURRENT_TIMESTAMP)'
);
```

### 3. 定时任务

定时任务应该基于北京时间触发：

```javascript
const { getCurrentHour } = require('../utils/dateHelper');

// 检查是否在用餐时间（北京时间）
const hour = getCurrentHour();
if (hour >= 7 && hour < 9) {
  // 早餐时间（7:00-9:00）
}
```

### 4. 日期比较

使用 `getToday()` 获取今天的日期进行比较：

```javascript
const today = getToday(); // 返回 "2026-01-27"
const records = await db.all(
  'SELECT * FROM orders WHERE DATE(created_at) = :today',
  { today }
);
```

## 前端时间处理

### 1. 使用统一的时间工具函数

前端也提供了对应的时间工具函数 `Unified/src/utils/dateHelper.js`：

```javascript
import { 
  getBeijingTime,      // 获取北京时间的Date对象
  getToday,            // 获取今天的日期
  formatDate,          // 格式化日期
  formatDateTime,      // 格式化日期时间
  formatTime,          // 格式化时间
  getRelativeTime,     // 获取相对时间（如"5分钟前"）
  getFriendlyDate,     // 获取友好日期（今天、明天或具体日期）
  isToday,             // 判断是否是今天
  isTomorrow           // 判断是否是明天
} from '@/utils/dateHelper';
```

### 2. 显示时间

```javascript
// 显示相对时间
const timeText = getRelativeTime(message.timestamp); // "5分钟前"

// 显示友好日期
const dateText = getFriendlyDate(order.created_at); // "今天"

// 显示完整时间
const fullTime = formatDateTime(order.created_at); // "2026-01-27 20:50:00"
```

### 3. 表单日期输入

```javascript
// 设置默认日期为今天
form.value.planDate = getToday(); // "2026-01-27"
```

## 常见场景

### 场景1: 创建订单

```javascript
// 后端
const { getLocalDateTimeString } = require('../utils/dateHelper');

const localTime = getLocalDateTimeString();
await db.run(
  'INSERT INTO orders (order_number, created_at) VALUES (:order_number, :created_at)',
  { order_number: orderNumber, created_at: localTime }
);
```

### 场景2: 查询今日数据

```javascript
// 后端
const { getToday } = require('../utils/dateHelper');

const today = getToday();
const orders = await db.all(
  'SELECT * FROM orders WHERE DATE(created_at) = :today',
  { today }
);
```

### 场景3: 定时任务触发

```javascript
// 后端
const { getCurrentHour, getLocalDateTimeString } = require('../utils/dateHelper');

function checkMealTime() {
  const hour = getCurrentHour();
  console.log(`当前北京时间：${getLocalDateTimeString()}`);
  
  if (hour >= 11 && hour < 13) {
    console.log('午餐时间，发送提醒');
  }
}
```

### 场景4: 前端显示时间

```javascript
// 前端
import { formatTime, getRelativeTime } from '@/utils/dateHelper';

// 显示消息时间
const messageTime = formatTime(message.timestamp); // "20:50"

// 显示相对时间
const relativeTime = getRelativeTime(notification.created_at); // "5分钟前"
```

## 注意事项

1. **统一使用工具函数**: 不要直接使用 `new Date()` 或 `Date.now()`，而是使用提供的工具函数
2. **避免使用 toISOString()**: ISO字符串是UTC时间，会导致时区混淆
3. **数据库查询**: 使用 `DATE()` 函数提取日期部分进行比较
4. **定时任务**: 确保定时任务基于北京时间触发
5. **前后端一致**: 前后端都使用相同的时区处理逻辑

## 测试验证

可以通过以下方式验证时间是否正确：

```javascript
// 后端
const { getBeijingTime, getLocalDateTimeString } = require('./utils/dateHelper');
console.log('当前北京时间:', getLocalDateTimeString());
console.log('当前小时:', getBeijingTime().getHours());

// 前端
import { getBeijingTime, formatDateTime } from '@/utils/dateHelper';
console.log('当前北京时间:', formatDateTime(getBeijingTime()));
```

## 更新日志

- 2026-01-27: 创建时区处理指南，统一使用北京时间（UTC+8）
