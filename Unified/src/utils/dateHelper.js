/**
 * 前端日期时间处理工具
 * 统一处理时区和日期格式化
 */

/**
 * 获取当前北京时间的Date对象
 * @returns {Date} 北京时间的Date对象
 */
export function getBeijingTime() {
  const now = new Date();
  // 获取UTC时间戳
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // 转换为北京时间（UTC+8）
  return new Date(utcTime + (8 * 3600000));
}

/**
 * 获取今天的日期字符串（北京时间）
 * @returns {string} YYYY-MM-DD格式
 */
export function getToday() {
  const date = getBeijingTime();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string} date - 日期对象或字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 * @param {Date|string} date - 日期对象或字符串
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化时间为 HH:mm
 * @param {Date|string|number} time - 日期对象、字符串或时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(time) {
  if (!time) return '';
  const d = typeof time === 'number' ? new Date(time) : (typeof time === 'string' ? new Date(time) : time);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 获取相对时间描述（如"刚刚"、"5分钟前"等）
 * @param {Date|string|number} time - 日期对象、字符串或时间戳
 * @returns {string} 相对时间描述
 */
export function getRelativeTime(time) {
  if (!time) return '';
  const d = typeof time === 'number' ? new Date(time) : (typeof time === 'string' ? new Date(time) : time);
  const now = getBeijingTime();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDate(d);
}

/**
 * 判断是否是今天
 * @param {Date|string} date - 日期对象或字符串
 * @returns {boolean} 是否是今天
 */
export function isToday(date) {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = getBeijingTime();
  return d.toDateString() === today.toDateString();
}

/**
 * 判断是否是明天
 * @param {Date|string} date - 日期对象或字符串
 * @returns {boolean} 是否是明天
 */
export function isTomorrow(date) {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = getBeijingTime();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
}

/**
 * 获取友好的日期描述（今天、明天或具体日期）
 * @param {Date|string} date - 日期对象或字符串
 * @returns {string} 友好的日期描述
 */
export function getFriendlyDate(date) {
  if (!date) return '';
  if (isToday(date)) return '今天';
  if (isTomorrow(date)) return '明天';
  return formatDate(date);
}
