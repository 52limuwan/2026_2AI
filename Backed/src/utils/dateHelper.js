/**
 * 日期处理工具函数
 * 统一使用北京时间（UTC+8），避免时区问题
 * 
 * 注意：本工具函数不依赖网络，也不依赖系统时区设置
 * 只要系统时间准确，无论在什么时区环境下都能正确计算北京时间
 */

/**
 * 获取北京时间的Date对象
 * 不依赖系统时区设置，适用于内网环境
 * @returns {Date} 北京时间的Date对象
 */
function getBeijingTime() {
  const now = new Date();
  // 获取当前时间的UTC时间戳（毫秒）
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // 转换为北京时间（UTC+8 = +8小时 = +28800000毫秒）
  return new Date(utcTime + (8 * 3600000));
}

/**
 * 获取北京时间的日期字符串 (YYYY-MM-DD)
 * @param {Date} date - 日期对象，默认为当前北京时间
 * @returns {string} 格式化的日期字符串
 */
function getLocalDateString(date = null) {
  const d = date || getBeijingTime();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取北京时间的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 * @param {Date} date - 日期对象，默认为当前北京时间
 * @returns {string} 格式化的日期时间字符串
 */
function getLocalDateTimeString(date = null) {
  const d = date || getBeijingTime();
  // 如果传入的是已经计算好的北京时间Date对象，直接格式化
  // 如果传入的是其他时区的Date对象，需要先转换
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取过去 N 天的日期数组（包括今天）
 * @param {number} days - 天数
 * @returns {string[]} 日期字符串数组
 */
function getPastDays(days) {
  const result = [];
  const now = getBeijingTime();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(getLocalDateString(d));
  }
  return result;
}

/**
 * 获取今天的日期字符串（北京时间）
 * @returns {string} 今天的日期 (YYYY-MM-DD)
 */
function getToday() {
  return getLocalDateString();
}

/**
 * 获取当前北京时间的小时数（0-23）
 * @returns {number} 小时数
 */
function getCurrentHour() {
  return getBeijingTime().getHours();
}

/**
 * 将UTC时间字符串转换为北京时间字符串
 * 不依赖系统时区设置
 * @param {string} utcString - UTC时间字符串（如 "2026-01-27T12:50:00.000Z"）
 * @returns {string} 北京时间字符串（如 "2026-01-27 20:50:00"）
 */
function utcToBeijing(utcString) {
  if (!utcString) return '';
  
  // 解析UTC时间字符串
  const utcDate = new Date(utcString);
  
  // 使用UTC方法获取UTC时间的各个部分
  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = utcDate.getUTCMonth();
  const utcDay = utcDate.getUTCDate();
  const utcHours = utcDate.getUTCHours();
  const utcMinutes = utcDate.getUTCMinutes();
  const utcSeconds = utcDate.getUTCSeconds();
  
  // 创建UTC时间的Date对象（使用UTC构造函数）
  const utcTime = Date.UTC(utcYear, utcMonth, utcDay, utcHours, utcMinutes, utcSeconds);
  
  // 加8小时得到北京时间
  const beijingTime = new Date(utcTime + (8 * 3600000));
  
  // 格式化输出（使用UTC方法确保不受本地时区影响）
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  getBeijingTime,
  getLocalDateString,
  getLocalDateTimeString,
  getPastDays,
  getToday,
  getCurrentHour,
  utcToBeijing
};
