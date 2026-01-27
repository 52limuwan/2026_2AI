require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const logger = require('./utils/logger');
const { getLocalDateTimeString } = require('./utils/dateHelper');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const db = require('./db');
const { initSchema } = require('./db/schema');

async function bootstrap() {
  try {
    // 初始化数据库
    await initSchema(db);
    logger.info('Database schema initialized');
    
    // 启动风险检测定时任务
    const { startScheduler } = require('./services/riskDetectionScheduler');
    startScheduler();
    logger.info('Risk detection scheduler started');

    const app = express();

    // 确保必要目录存在
    const uploadsDir = config.upload.uploadDir;
    const logsDir = path.dirname(config.logging.filePath);
    [uploadsDir, logsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // 安全中间件
    app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    }));

    // CORS配置 - 使用白名单
    const corsOptions = {
      origin: (origin, callback) => {
        const allowedOrigins = config.security.corsOrigin.split(',');
        if (!origin || allowedOrigins.includes(origin) || config.server.isDevelopment) {
          callback(null, true);
        } else {
          logger.warn('CORS blocked', { origin });
          callback(new Error('不允许的来源'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));

    // 请求体解析
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 压缩
    app.use(compression());

    // 请求日志
    app.use((req, res, next) => {
      logger.logRequest(req);
      next();
    });

    // 速率限制
    app.use('/api/', generalLimiter);

    // 静态文件服务
    app.use('/uploads', express.static(uploadsDir, {
      maxAge: '1d',
      etag: true
    }));

    // 健康检查（不需要认证）
    app.get('/health', (_req, res) => {
      res.json({
        code: 0,
        message: 'ok',
        timestamp: getLocalDateTimeString(),
        timezone: 'Asia/Shanghai (UTC+8)',
        env: config.server.env
      });
    });

    // API路由
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/client', require('./routes/client'));
    app.use('/api/guardian', require('./routes/guardian'));
    app.use('/api/merchant', require('./routes/merchant'));
    app.use('/api/gov', require('./routes/gov'));
    app.use('/api/notifications', require('./routes/notifications'));
    app.use('/api/reports', require('./routes/reports'));
    app.use('/api/ai', require('./routes/ai'));

    // 根路径
    app.get('/', (_req, res) => {
      res.json({
        code: 0,
        message: '智膳伙伴-API 已运行',
        data: {
          version: '1.0.0',
          roles: ['client', 'guardian', 'merchant', 'gov']
        }
      });
    });

    // 404处理
    app.use(notFoundHandler);

    // 全局错误处理
    app.use(errorHandler);

    // 启动服务器
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, {
        env: config.server.env,
        port: PORT,
        time: getLocalDateTimeString()
      });
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`⏰ 当前北京时间: ${getLocalDateTimeString()}`);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });

    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    module.exports = app;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

bootstrap();
