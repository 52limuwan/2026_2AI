/**
 * SQL查询性能分析工具
 * 用于识别慢查询和优化机会
 */

const logger = require('./logger');

class QueryProfiler {
  constructor() {
    this.queries = [];
    this.slowQueryThreshold = 100; // 慢查询阈值（毫秒）
    this.enabled = process.env.NODE_ENV !== 'production'; // 生产环境默认关闭
  }

  /**
   * 分析查询性能
   */
  async profile(sql, params, executor) {
    if (!this.enabled) {
      return await executor();
    }

    const startTime = Date.now();
    let result;
    let error = null;

    try {
      result = await executor();
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      this.recordQuery({
        sql,
        params,
        duration,
        error: error?.message,
        timestamp: new Date().toISOString()
      });

      // 慢查询警告
      if (duration > this.slowQueryThreshold) {
        logger.warn('慢查询检测', {
          sql: sql.substring(0, 200),
          duration: `${duration}ms`,
          params: JSON.stringify(params).substring(0, 100)
        });
      }
    }

    return result;
  }

  /**
   * 记录查询
   */
  recordQuery(queryInfo) {
    this.queries.push(queryInfo);
    
    // 只保留最近1000条查询
    if (this.queries.length > 1000) {
      this.queries.shift();
    }
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit = 10) {
    return this.queries
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * 获取查询统计
   */
  getStatistics() {
    if (this.queries.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        slowQueries: 0,
        errors: 0
      };
    }

    const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = this.queries.filter(q => q.duration > this.slowQueryThreshold).length;
    const errors = this.queries.filter(q => q.error).length;

    return {
      total: this.queries.length,
      avgDuration: Math.round(totalDuration / this.queries.length),
      slowQueries,
      slowQueryRate: ((slowQueries / this.queries.length) * 100).toFixed(2) + '%',
      errors,
      errorRate: ((errors / this.queries.length) * 100).toFixed(2) + '%'
    };
  }

  /**
   * 分析查询计划
   */
  async explainQuery(db, sql, params) {
    try {
      const plan = await db.all(`EXPLAIN QUERY PLAN ${sql}`, params);
      
      logger.info('查询计划', {
        sql: sql.substring(0, 200),
        plan: plan.map(p => ({
          detail: p.detail,
          notindexed: p.notindexed
        }))
      });

      // 检查是否使用了索引
      const usesIndex = plan.some(p => 
        p.detail && p.detail.toLowerCase().includes('using index')
      );

      if (!usesIndex) {
        logger.warn('查询未使用索引', {
          sql: sql.substring(0, 200)
        });
      }

      return plan;
    } catch (error) {
      logger.error('分析查询计划失败', { error: error.message });
      return null;
    }
  }

  /**
   * 识别N+1查询模式
   */
  detectN1Queries() {
    const patterns = {};
    
    this.queries.forEach(q => {
      // 提取SQL模式（去除参数）
      const pattern = q.sql.replace(/\d+/g, '?').replace(/'[^']*'/g, '?');
      
      if (!patterns[pattern]) {
        patterns[pattern] = {
          count: 0,
          totalDuration: 0,
          examples: []
        };
      }
      
      patterns[pattern].count++;
      patterns[pattern].totalDuration += q.duration;
      
      if (patterns[pattern].examples.length < 3) {
        patterns[pattern].examples.push({
          sql: q.sql.substring(0, 100),
          duration: q.duration
        });
      }
    });

    // 找出重复执行的查询（可能是N+1）
    const suspiciousPatterns = Object.entries(patterns)
      .filter(([_, info]) => info.count > 5)
      .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
      .slice(0, 10);

    if (suspiciousPatterns.length > 0) {
      logger.warn('检测到可能的N+1查询', {
        patterns: suspiciousPatterns.map(([pattern, info]) => ({
          pattern: pattern.substring(0, 100),
          count: info.count,
          totalDuration: `${info.totalDuration}ms`,
          avgDuration: `${Math.round(info.totalDuration / info.count)}ms`
        }))
      });
    }

    return suspiciousPatterns;
  }

  /**
   * 生成性能报告
   */
  generateReport() {
    const stats = this.getStatistics();
    const slowQueries = this.getSlowQueries(5);
    const n1Patterns = this.detectN1Queries();

    const report = {
      summary: stats,
      slowQueries: slowQueries.map(q => ({
        sql: q.sql.substring(0, 150),
        duration: `${q.duration}ms`,
        timestamp: q.timestamp
      })),
      n1Patterns: n1Patterns.map(([pattern, info]) => ({
        pattern: pattern.substring(0, 150),
        count: info.count,
        totalDuration: `${info.totalDuration}ms`
      }))
    };

    logger.info('查询性能报告', report);
    return report;
  }

  /**
   * 清除查询历史
   */
  clear() {
    this.queries = [];
    logger.info('查询历史已清除');
  }

  /**
   * 启用/禁用分析器
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    logger.info(`查询分析器已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(threshold) {
    this.slowQueryThreshold = threshold;
    logger.info(`慢查询阈值设置为 ${threshold}ms`);
  }
}

// 单例模式
const profiler = new QueryProfiler();

module.exports = profiler;
