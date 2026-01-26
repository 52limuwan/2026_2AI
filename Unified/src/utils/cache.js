/**
 * 前端缓存管理
 * 实现内存缓存和持久化缓存
 */

import config from '../config';

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheTimers = new Map();
  }

  /**
   * 生成缓存键
   */
  generateKey(prefix, params) {
    return `${prefix}_${JSON.stringify(params)}`;
  }

  /**
   * 设置缓存
   */
  set(key, value, ttl = config.cache.ttl) {
    // 内存缓存
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // 设置过期定时器
    if (this.cacheTimers.has(key)) {
      clearTimeout(this.cacheTimers.get(key));
    }

    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.cacheTimers.set(key, timer);
  }

  /**
   * 获取缓存
   */
  get(key) {
    const cached = this.memoryCache.get(key);
    
    if (!cached) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * 删除缓存
   */
  delete(key) {
    this.memoryCache.delete(key);
    
    if (this.cacheTimers.has(key)) {
      clearTimeout(this.cacheTimers.get(key));
      this.cacheTimers.delete(key);
    }
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.memoryCache.clear();
    
    this.cacheTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.cacheTimers.clear();
  }

  /**
   * 获取缓存大小
   */
  size() {
    return this.memoryCache.size;
  }

  /**
   * 缓存装饰器（用于API请求）
   */
  cached(key, fetcher, ttl) {
    const cachedData = this.get(key);
    
    if (cachedData) {
      return Promise.resolve(cachedData);
    }

    return fetcher().then((data) => {
      this.set(key, data, ttl);
      return data;
    });
  }
}

// 单例模式
const cacheManager = new CacheManager();

export default cacheManager;
