/**
 * 性能优化工具
 * 包含：防抖、节流、懒加载等
 */

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间（毫秒）
 * @param {boolean} immediate 是否立即执行
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {number} limit 时间限制（毫秒）
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 延迟执行
 * @param {number} ms 延迟时间（毫秒）
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn 要执行的函数
 * @param {number} retries 重试次数
 * @param {number} delay 重试延迟（毫秒）
 */
export async function retry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    await sleep(delay);
    return retry(fn, retries - 1, delay);
  }
}

/**
 * 批量处理
 * @param {Array} items 要处理的项目数组
 * @param {Function} handler 处理函数
 * @param {number} batchSize 批次大小
 */
export async function batchProcess(items, handler, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(handler));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 图片懒加载
 * @param {HTMLImageElement} img 图片元素
 * @param {string} src 图片地址
 */
export function lazyLoadImage(img, src) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    
    observer.observe(img);
  } else {
    // 降级方案
    img.src = src;
  }
}

/**
 * 性能监控
 */
export class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
  }

  /**
   * 开始计时
   */
  start(name) {
    this.marks.set(name, performance.now());
  }

  /**
   * 结束计时并返回耗时
   */
  end(name) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark "${name}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);
    
    return duration;
  }

  /**
   * 记录并打印耗时
   */
  measure(name) {
    const duration = this.end(name);
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}

export const performanceMonitor = new PerformanceMonitor();
