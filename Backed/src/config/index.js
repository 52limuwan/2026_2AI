/**
 * 应用配置管理
 * 集中管理所有环境变量和配置项
 */

const path = require('path');

// 验证必需的环境变量
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  throw new Error(`缺少必需的环境变量: ${missingEnvVars.join(', ')}`);
}

// JWT_SECRET 强度验证
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  警告: JWT_SECRET 长度应至少为32字符以确保安全性');
}

const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // 数据库配置
  database: {
    path: process.env.SQLITE_PATH || path.join(__dirname, '../../data/app.db')
  },

  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    bcryptRounds: 10,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8888',
    // 密码强度要求
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: false
  },

  // 速率限制
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  // 文件上传
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(','),
    uploadDir: path.join(__dirname, '../../uploads')
  },

  // OpenAI配置
  openai: {
    apiKey: process.env.CLIENT_OPENAI_API_KEY,
    apiUrl: process.env.CLIENT_OPENAI_API_URL || 'https://api.siliconflow.cn/v1',
    model: process.env.CLIENT_OPENAI_MODEL || 'deepseek-ai/DeepSeek-V3'
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs/app.log')
  }
};

module.exports = config;
