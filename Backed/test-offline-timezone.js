/**
 * 内网环境时区测试脚本
 * 模拟不同时区环境，验证时间处理是否正确
 */

const { 
  getBeijingTime,
  getLocalDateString,
  getLocalDateTimeString,
  getToday,
  getCurrentHour,
  utcToBeijing
} = require('./src/utils/dateHelper');

console.log('=== 内网环境时区测试 ===\n');

// 1. 测试当前环境
console.log('1. 当前环境测试:');
const systemOffset = new Date().getTimezoneOffset();
const systemTimezone = systemOffset === -480 ? 'UTC+8 (北京时间)' : 
                       systemOffset === 0 ? 'UTC+0 (格林威治时间)' :
                       systemOffset === -60 ? 'UTC+1' :
                       systemOffset === 480 ? 'UTC-8 (美国西海岸)' :
                       `UTC${systemOffset > 0 ? '-' : '+'}${Math.abs(systemOffset / 60)}`;
console.log(`   系统时区: ${systemTimezone}`);
console.log(`   时区偏移: ${systemOffset} 分钟`);
console.log('');

// 2. 测试北京时间计算
console.log('2. 北京时间计算测试:');
const beijingTime = getBeijingTime();
const systemTime = new Date();
console.log(`   系统本地时间: ${systemTime.toLocaleString()}`);
console.log(`   计算的北京时间: ${getLocalDateTimeString()}`);
console.log(`   北京时间小时: ${getCurrentHour()}时`);
console.log('');

// 3. 模拟不同时区环境
console.log('3. 模拟不同时区环境:');
console.log('   假设系统时间是准确的，但时区设置不同：');

// 模拟UTC+0环境（如果当前是UTC+8，系统时间会显示为UTC时间）
const utcNow = new Date();
const utcOffset = utcNow.getTimezoneOffset();
console.log(`   - 当前系统偏移: ${utcOffset}分钟`);

// 计算UTC时间
const utcTime = utcNow.getTime() + (utcOffset * 60000);
const utcDate = new Date(utcTime);
console.log(`   - UTC时间: ${utcDate.toISOString()}`);

// 从UTC计算北京时间
const beijingFromUtc = new Date(utcTime + (8 * 3600000));
console.log(`   - 从UTC计算的北京时间: ${beijingFromUtc.toLocaleString()}`);
console.log(`   - 我们的函数返回: ${getLocalDateTimeString()}`);
console.log('');

// 4. 测试UTC转北京时间
console.log('4. UTC转北京时间测试:');
const testUtcStrings = [
  '2026-01-27T12:50:00.000Z',  // UTC 12:50 应该是北京 20:50
  '2026-01-27T00:00:00.000Z',  // UTC 00:00 应该是北京 08:00
  '2026-01-27T16:00:00.000Z',  // UTC 16:00 应该是北京 00:00(次日)
];

testUtcStrings.forEach(utcStr => {
  const beijingStr = utcToBeijing(utcStr);
  console.log(`   UTC: ${utcStr}`);
  console.log(`   北京: ${beijingStr}`);
  console.log('');
});

// 5. 验证时间一致性
console.log('5. 时间一致性验证:');
const time1 = getLocalDateTimeString();
// 等待1秒
const start = Date.now();
while (Date.now() - start < 1000) {
  // 忙等待
}
const time2 = getLocalDateTimeString();
console.log(`   第一次获取: ${time1}`);
console.log(`   1秒后获取: ${time2}`);
console.log(`   时间递增: ${time1 < time2 ? '✅ 正常' : '❌ 异常'}`);
console.log('');

// 6. 内网环境说明
console.log('6. 内网环境使用说明:');
console.log('   ✅ 不需要网络连接');
console.log('   ✅ 不依赖NTP时间同步');
console.log('   ✅ 不依赖系统时区设置');
console.log('   ⚠️  需要确保系统时间准确（可手动设置）');
console.log('');

// 7. 关键原理说明
console.log('7. 工作原理:');
console.log('   1. 获取系统当前时间（Date对象）');
console.log('   2. 获取系统时区偏移量（getTimezoneOffset）');
console.log('   3. 计算UTC时间 = 系统时间 + 时区偏移');
console.log('   4. 计算北京时间 = UTC时间 + 8小时');
console.log('   5. 无论系统在什么时区，只要系统时间准确，计算结果就准确');
console.log('');

// 8. 内网部署建议
console.log('8. 内网部署建议:');
console.log('   1. 确保服务器系统时间准确（可手动设置为北京时间）');
console.log('   2. 如果系统时区不是UTC+8，代码会自动转换');
console.log('   3. 建议在部署时验证一次时间是否正确');
console.log('   4. 可以使用本脚本进行验证');
console.log('');

console.log('=== 测试完成 ===');
console.log(`\n当前计算的北京时间: ${getLocalDateTimeString()}`);
console.log(`预期北京时间: 2026年1月27日 星期二 晚上20:50左右`);
console.log(`\n如果时间相差较大，请检查系统时间设置！`);
