/**
 * 日期处理工具函数
 * 统一使用本地时区的日期，避免 UTC 时区问题
 */

/**
 * 获取本地日期字符串 (YYYY-MM-DD)
 * @param {Date} date - 日期对象，默认为当前时间
 * @returns {string} 格式化的日期字符串
 */
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取过去 N 天的日期数组（包括今天）
 * @param {number} days - 天数
 * @returns {string[]} 日期字符串数组
 */
function getPastDays(days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(getLocalDateString(d));
  }
  return result;
}

/**
 * 获取今天的日期字符串
 * @returns {string} 今天的日期 (YYYY-MM-DD)
 */
function getToday() {
  return getLocalDateString();
}

module.exports = {
  getLocalDateString,
  getPastDays,
  getToday
};
