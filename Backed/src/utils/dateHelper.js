/**
 * 日期处理工具函数
 * 统一使用北京时间（UTC+8），避免时区问题
 */

/**
 * 获取北京时间的Date对象
 * @returns {Date} 北京时间的Date对象
 */
function getBeijingTime() {
  const now = new Date();
  // 获取UTC时间戳
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // 转换为北京时间（UTC+8）
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
 * @param {string} utcString - UTC时间字符串
 * @returns {string} 北京时间字符串
 */
function utcToBeijing(utcString) {
  if (!utcString) return '';
  const utcDate = new Date(utcString);
  // 直接使用本地时间（因为系统已经是北京时区）
  return getLocalDateTimeString(utcDate);
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
