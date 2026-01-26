/**
 * 全局错误处理中间件
 * 统一处理所有错误，避免敏感信息泄露
 */

const logger = require('../utils/logger');
const config = require('../config');

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = '未授权，请先登录') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '无权访问此资源') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409);
  }
}

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  let error = err;

  // 如果不是 AppError，转换为 AppError
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || '服务器内部错误';
    error = new AppError(message, statusCode, false);
  }

  // 记录错误日志
  if (error.statusCode >= 500) {
    logger.error('Server Error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id
    });
  } else {
    logger.warn('Client Error', {
      error: error.message,
      url: req.originalUrl,
      method: req.method,
      statusCode: error.statusCode
    });
  }

  // 构建响应
  const response = {
    code: error.statusCode,
    message: error.message,
    timestamp: error.timestamp
  };

  // 开发环境返回详细错误信息
  if (config.server.isDevelopment) {
    response.stack = error.stack;
    if (error.errors) {
      response.errors = error.errors;
    }
  }

  // 生产环境隐藏敏感信息
  if (config.server.isProduction && !error.isOperational) {
    response.message = '服务器内部错误，请稍后重试';
  }

  res.status(error.statusCode).json(response);
};

// 404 处理
const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`路由不存在: ${req.originalUrl}`));
};

// 异步错误包装器
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
