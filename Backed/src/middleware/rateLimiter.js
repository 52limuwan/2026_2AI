/**
 * 速率限制中间件
 * 防止暴力攻击和API滥用
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

// 通用速率限制
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  // 开发环境下跳过速率限制
  skip: (req) => config.server.isDevelopment,
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl
    });
    res.status(429).json({
      code: 429,
      message: '请求过于频繁，请稍后再试'
    });
  }
});

// 严格的登录速率限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  skipSuccessfulRequests: true,
  message: {
    code: 429,
    message: '登录尝试次数过多，请15分钟后再试'
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      identifier: req.body?.identifier
    });
    res.status(429).json({
      code: 429,
      message: '登录尝试次数过多，请15分钟后再试'
    });
  }
});

// 文件上传速率限制
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 最多20次上传
  message: {
    code: 429,
    message: '上传次数过多，请稍后再试'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter
};
