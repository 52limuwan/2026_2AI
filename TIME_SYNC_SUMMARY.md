# 时间同步修复总结

## 修复时间
2026年1月27日 星期二 晚上20:50 (北京时间 UTC+8)

## 修复内容

### 1. 后端时间处理统一

#### 创建统一的时间工具函数 (`Backed/src/utils/dateHelper.js`)
- ✅ `getBeijingTime()` - 获取北京时间的Date对象
- ✅ `getLocalDateString()` - 获取日期字符串 (YYYY-MM-DD)
- ✅ `getLocalDateTimeString()` - 获取日期时间字符串 (YYYY-MM-DD HH:mm:ss)
- ✅ `getToday()` - 获取今天的日期
- ✅ `getCurrentHour()` - 获取当前小时数（0-23）
- ✅ `getPastDays(n)` - 获取过去N天的日期数组
- ✅ `utcToBeijing()` - UTC时间转北京时间

#### 修复的文件

1. **订单服务** (`Backed/src/services/orders.js`)
   - 使用 `getLocalDateTimeString()` 替代手动构建时间字符串
   - 确保订单创建时间使用北京时间

2. **定时任务调度器** (`Backed/src/services/scheduler.js`)
   - 导入时间工具函数
   - 使用 `getToday()` 获取今日日期
   - 使用 `getCurrentHour()` 判断用餐时间
   - 修复每周报告的日期计算

3. **风险检测调度器** (`Backed/src/services/riskDetectionScheduler.js`)
   - 所有 `new Date().toISOString()` 替换为 `getLocalDateTimeString()`
   - 添加北京时间日志输出
   - 确保风险事件触发时间使用北京时间

4. **服务器启动** (`Backed/src/server.js`)
   - 健康检查接口返回北京时间
   - 服务器启动日志显示北京时间
   - 添加时区标识 (Asia/Shanghai UTC+8)

### 2. 前端时间处理统一

#### 创建前端时间工具函数 (`Unified/src/utils/dateHelper.js`)
- ✅ `getBeijingTime()` - 获取北京时间的Date对象
- ✅ `getToday()` - 获取今天的日期
- ✅ `formatDate()` - 格式化日期
- ✅ `formatDateTime()` - 格式化日期时间
- ✅ `formatTime()` - 格式化时间
- ✅ `getRelativeTime()` - 获取相对时间（如"5分钟前"）
- ✅ `getFriendlyDate()` - 获取友好日期（今天、明天或具体日期）
- ✅ `isToday()` - 判断是否是今天
- ✅ `isTomorrow()` - 判断是否是明天

### 3. 文档和测试

1. **时区处理指南** (`Backed/docs/TIMEZONE_GUIDE.md`)
   - 详细说明时区处理规范
   - 提供常见场景示例
   - 前后端使用指南

2. **时区测试脚本** (`Backed/test-timezone.js`)
   - 验证时间处理是否正确
   - 测试各种时间函数
   - 对比系统时间

## 测试结果

```
=== 时区测试 ===

1. 北京时间测试:
   当前北京时间对象: Tue Jan 27 2026 20:55:02 GMT+0800 (中国标准时间)
   格式化: 2026-01-27 20:55:02
   当前小时: 20时

2. 日期格式化测试:
   今天日期: 2026-01-27
   日期字符串: 2026-01-27
   日期时间字符串: 2026-01-27 20:55:02

3. 过去7天日期:
   1. 2026-01-21
   2. 2026-01-22
   3. 2026-01-23
   4. 2026-01-24
   5. 2026-01-25
   6. 2026-01-26
   7. 2026-01-27

4. UTC转北京时间测试:
   UTC时间: 2026-01-27T12:50:00.000Z
   北京时间: 2026-01-27 20:50:00 ✅

5. 用餐时间判断:
   当前时间段: 非用餐时间 ✅

6. 系统时间对比:
   系统本地时间: 2026/1/27 20:55:02
   系统UTC时间: 2026-01-27T12:55:02.480Z
   我们的北京时间: 2026-01-27 20:55:02 ✅

7. 时区偏移验证:
   系统时区偏移: -480 分钟
   预期偏移（北京UTC+8）: -480 分钟
   时区是否正确: ✅ 是
```

## 关键改进

### 1. 统一时间源
- 所有时间操作都基于北京时间（UTC+8）
- 避免使用 `new Date().toISOString()`（返回UTC时间）
- 避免使用 SQLite 的 `CURRENT_TIMESTAMP`（返回UTC时间）

### 2. 定时任务准确性
- 用餐时间提醒基于北京时间判断
  - 早餐: 7:00-9:00
  - 午餐: 11:00-13:00
  - 晚餐: 17:00-19:00
- 风险检测任务每小时执行，日志显示北京时间

### 3. 数据一致性
- 订单创建时间使用北京时间
- 营养摄入记录使用北京时间
- 风险事件触发时间使用北京时间
- 通知创建时间使用北京时间

### 4. 前端显示友好
- 提供相对时间显示（"刚刚"、"5分钟前"）
- 提供友好日期显示（"今天"、"明天"）
- 统一的时间格式化

## 使用建议

### 后端开发
```javascript
// ✅ 推荐
const { getLocalDateTimeString, getToday, getCurrentHour } = require('../utils/dateHelper');
const now = getLocalDateTimeString();
const today = getToday();
const hour = getCurrentHour();

// ❌ 避免
const now = new Date().toISOString();
const today = new Date().toISOString().split('T')[0];
const hour = new Date().getHours();
```

### 前端开发
```javascript
// ✅ 推荐
import { formatDateTime, getRelativeTime, getFriendlyDate } from '@/utils/dateHelper';
const timeText = formatDateTime(order.created_at);
const relativeTime = getRelativeTime(message.timestamp);
const dateText = getFriendlyDate(plan.planDate);

// ❌ 避免
const timeText = new Date(order.created_at).toLocaleString();
```

## 验证方法

运行测试脚本验证时间处理：
```bash
node Backed/test-timezone.js
```

检查服务器健康状态：
```bash
curl http://localhost:8000/health
```

预期返回：
```json
{
  "code": 0,
  "message": "ok",
  "timestamp": "2026-01-27 20:50:00",
  "timezone": "Asia/Shanghai (UTC+8)",
  "env": "development"
}
```

## 注意事项

1. **系统时区**: 确保服务器系统时区设置为 Asia/Shanghai (UTC+8)
2. **数据库迁移**: 现有数据库中的UTC时间数据需要在读取时转换
3. **API响应**: 所有API返回的时间字段都是北京时间字符串
4. **日志记录**: 所有日志时间戳都使用北京时间

## 后续工作

- [ ] 考虑是否需要支持其他时区（如果有国际化需求）
- [ ] 添加时区配置选项（如果需要灵活切换）
- [ ] 完善前端所有页面的时间显示
- [ ] 添加更多时间相关的单元测试

## 相关文档

- [时区处理指南](Backed/docs/TIMEZONE_GUIDE.md)
- [时区测试脚本](Backed/test-timezone.js)
- [后端时间工具](Backed/src/utils/dateHelper.js)
- [前端时间工具](Unified/src/utils/dateHelper.js)
