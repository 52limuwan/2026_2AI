/**
 * 时区测试脚本
 * 验证时间处理是否正确
 */

const { 
  getBeijingTime,
  getLocalDateString,
  getLocalDateTimeString,
  getToday,
  getCurrentHour,
  getPastDays,
  utcToBeijing
} = require('./src/utils/dateHelper');

console.log('=== 时区测试 ===\n');

// 1. 测试北京时间获取
console.log('1. 北京时间测试:');
const beijingTime = getBeijingTime();
console.log(`   当前北京时间对象: ${beijingTime}`);
console.log(`   格式化: ${getLocalDateTimeString()}`);
console.log(`   当前小时: ${getCurrentHour()}时`);
console.log('');

// 2. 测试日期格式化
console.log('2. 日期格式化测试:');
console.log(`   今天日期: ${getToday()}`);
console.log(`   日期字符串: ${getLocalDateString()}`);
console.log(`   日期时间字符串: ${getLocalDateTimeString()}`);
console.log('');

// 3. 测试过去N天
console.log('3. 过去7天日期:');
const past7Days = getPastDays(7);
past7Days.forEach((date, index) => {
  console.log(`   ${index + 1}. ${date}`);
});
console.log('');

// 4. 测试UTC转北京时间
console.log('4. UTC转北京时间测试:');
const utcString = '2026-01-27T12:50:00.000Z'; // UTC时间
const beijingString = utcToBeijing(utcString);
console.log(`   UTC时间: ${utcString}`);
console.log(`   北京时间: ${beijingString}`);
console.log('');

// 5. 测试用餐时间判断
console.log('5. 用餐时间判断:');
const hour = getCurrentHour();
let mealTime = '非用餐时间';
if (hour >= 7 && hour < 9) {
  mealTime = '早餐时间 (7:00-9:00)';
} else if (hour >= 11 && hour < 13) {
  mealTime = '午餐时间 (11:00-13:00)';
} else if (hour >= 17 && hour < 19) {
  mealTime = '晚餐时间 (17:00-19:00)';
}
console.log(`   当前时间段: ${mealTime}`);
console.log('');

// 6. 对比系统时间
console.log('6. 系统时间对比:');
const systemTime = new Date();
console.log(`   系统本地时间: ${systemTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
console.log(`   系统UTC时间: ${systemTime.toISOString()}`);
console.log(`   我们的北京时间: ${getLocalDateTimeString()}`);
console.log('');

// 7. 验证时区偏移
console.log('7. 时区偏移验证:');
const offset = systemTime.getTimezoneOffset();
console.log(`   系统时区偏移: ${offset} 分钟`);
console.log(`   预期偏移（北京UTC+8）: -480 分钟`);
console.log(`   时区是否正确: ${offset === -480 ? '✅ 是' : '⚠️ 否（需要调整）'}`);
console.log('');

console.log('=== 测试完成 ===');
console.log(`\n当前标准时间: 2026年1月27日 星期二 晚上20:50 (北京时间)`);
console.log(`系统显示时间: ${getLocalDateTimeString()}`);
