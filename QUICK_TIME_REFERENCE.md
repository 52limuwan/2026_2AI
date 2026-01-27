# 时间处理快速参考

## 当前时间
📅 **2026年1月27日 星期二**  
🕐 **晚上20:50** (北京时间 UTC+8)

---

## 后端 (Node.js)

### 导入
```javascript
const { 
  getBeijingTime,           // 获取北京时间Date对象
  getLocalDateString,       // 获取日期 YYYY-MM-DD
  getLocalDateTimeString,   // 获取日期时间 YYYY-MM-DD HH:mm:ss
  getToday,                 // 获取今天日期
  getCurrentHour,           // 获取当前小时(0-23)
  getPastDays,              // 获取过去N天
  utcToBeijing              // UTC转北京时间
} = require('./src/utils/dateHelper');
```

### 常用操作
```javascript
// 获取当前时间
const now = getLocalDateTimeString();  // "2026-01-27 20:50:00"

// 获取今天日期
const today = getToday();  // "2026-01-27"

// 获取当前小时
const hour = getCurrentHour();  // 20

// 获取过去7天
const dates = getPastDays(7);  // ["2026-01-21", ..., "2026-01-27"]

// 数据库插入
await db.run(
  'INSERT INTO orders (created_at) VALUES (:time)',
  { time: getLocalDateTimeString() }
);

// 查询今日数据
await db.all(
  'SELECT * FROM orders WHERE DATE(created_at) = :today',
  { today: getToday() }
);
```

---

## 前端 (Vue.js)

### 导入
```javascript
import { 
  getBeijingTime,      // 获取北京时间Date对象
  getToday,            // 获取今天日期
  formatDate,          // 格式化日期
  formatDateTime,      // 格式化日期时间
  formatTime,          // 格式化时间 HH:mm
  getRelativeTime,     // 相对时间 "5分钟前"
  getFriendlyDate,     // 友好日期 "今天"/"明天"
  isToday,             // 判断是否今天
  isTomorrow           // 判断是否明天
} from '@/utils/dateHelper';
```

### 常用操作
```javascript
// 显示时间
const time = formatTime(message.timestamp);  // "20:50"

// 显示日期时间
const datetime = formatDateTime(order.created_at);  // "2026-01-27 20:50:00"

// 显示相对时间
const relative = getRelativeTime(notification.created_at);  // "5分钟前"

// 显示友好日期
const friendly = getFriendlyDate(plan.planDate);  // "今天" / "明天" / "2026-01-27"

// 表单默认值
form.value.date = getToday();  // "2026-01-27"

// 判断日期
if (isToday(order.created_at)) {
  console.log('今天的订单');
}
```

---

## 定时任务时间段

### 用餐时间
- 🌅 **早餐**: 7:00 - 9:00
- 🌞 **午餐**: 11:00 - 13:00
- 🌙 **晚餐**: 17:00 - 19:00

### 判断代码
```javascript
const hour = getCurrentHour();
if (hour >= 7 && hour < 9) {
  // 早餐时间
} else if (hour >= 11 && hour < 13) {
  // 午餐时间
} else if (hour >= 17 && hour < 19) {
  // 晚餐时间
}
```

---

## ⚠️ 避免使用

### ❌ 不要用
```javascript
// 后端
new Date().toISOString()           // 返回UTC时间
new Date().getHours()              // 可能不是北京时间
CURRENT_TIMESTAMP                  // SQLite返回UTC时间

// 前端
new Date().toLocaleString()        // 格式不统一
Date.now()                         // 时间戳不直观
```

### ✅ 应该用
```javascript
// 后端
getLocalDateTimeString()           // 北京时间字符串
getCurrentHour()                   // 北京时间小时数
getToday()                         // 北京时间日期

// 前端
formatDateTime(date)               // 统一格式
getRelativeTime(timestamp)         // 友好显示
getFriendlyDate(date)              // 友好日期
```

---

## 测试验证

### 运行测试
```bash
node Backed/test-timezone.js
```

### 检查健康状态
```bash
curl http://localhost:8000/health
```

### 预期输出
```json
{
  "code": 0,
  "message": "ok",
  "timestamp": "2026-01-27 20:50:00",
  "timezone": "Asia/Shanghai (UTC+8)",
  "env": "development"
}
```

---

## 📚 详细文档

- [完整时区处理指南](Backed/docs/TIMEZONE_GUIDE.md)
- [修复总结](TIME_SYNC_SUMMARY.md)
- [后端工具源码](Backed/src/utils/dateHelper.js)
- [前端工具源码](Unified/src/utils/dateHelper.js)
