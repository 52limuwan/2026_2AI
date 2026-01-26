/**
 * 数据库连接池管理
 * 优化数据库连接性能，避免频繁打开/关闭
 */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const config = require('../config');
const logger = require('../utils/logger');

class DatabasePool {
  constructor() {
    this.sqlPromise = null;
    this.database = null;
    this.dbPath = config.database.path;
    this.saveTimer = null;
    this.isDirty = false;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 初始化 SQL.js
      if (!this.sqlPromise) {
        this.sqlPromise = initSqlJs({
          locateFile: (file) => path.join(__dirname, '../../node_modules/sql.js/dist/', file)
        });
      }

      const SQL = await this.sqlPromise;
      
      // 加载或创建数据库
      const fileBuffer = fs.existsSync(this.dbPath) ? fs.readFileSync(this.dbPath) : null;
      this.database = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

      this.isInitialized = true;
      logger.info('Database pool initialized', { path: this.dbPath });

      // 设置定期保存
      this.startAutoSave();
    } catch (error) {
      logger.error('Failed to initialize database pool', { error: error.message });
      throw error;
    }
  }

  startAutoSave() {
    // 每5秒自动保存一次（如果有变更）
    this.saveTimer = setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, 5000);
  }

  save() {
    if (!this.database) return;
    
    try {
      const data = this.database.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
      this.isDirty = false;
      logger.debug('Database saved');
    } catch (error) {
      logger.error('Failed to save database', { error: error.message });
    }
  }

  markDirty() {
    this.isDirty = true;
  }

  getDatabase() {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }
    return this.database;
  }

  async close() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    if (this.isDirty) {
      this.save();
    }

    if (this.database) {
      this.database.close();
      this.database = null;
    }

    this.isInitialized = false;
    logger.info('Database pool closed');
  }
}

// 单例模式
const pool = new DatabasePool();

module.exports = pool;
