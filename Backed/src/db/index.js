const path = require('path');
const fs = require('fs');
const pool = require('./pool');
const logger = require('../utils/logger');

// 参数标准化
function normalizeParams(params) {
  if (Array.isArray(params)) return params;
  const normalized = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[`:${key}`] = value;
    normalized[`@${key}`] = value;
    normalized[`${key}`] = value;
  }
  return normalized;
}

// 执行SQL（无返回值）
async function exec(sql) {
  try {
    await pool.initialize();
    const database = pool.getDatabase();
    database.exec(sql);
    pool.markDirty();
    pool.save(); // 立即保存
  } catch (error) {
    logger.error('Database exec error', { sql, error: error.message });
    throw error;
  }
}

// 执行SQL（返回影响行数和插入ID）
async function run(sql, params = {}) {
  try {
    await pool.initialize();
    const database = pool.getDatabase();
    
    const stmt = database.prepare(sql);
    stmt.bind(normalizeParams(params));
    stmt.step();
    
    const lastInsertRowid = database.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0] || null;
    const changes = database.getRowsModified();
    
    stmt.free();
    pool.markDirty();
    
    return { lastInsertRowid, changes };
  } catch (error) {
    logger.error('Database run error', { sql, params, error: error.message });
    throw error;
  }
}

// 查询单行
async function get(sql, params = {}) {
  try {
    await pool.initialize();
    const database = pool.getDatabase();
    
    const stmt = database.prepare(sql);
    stmt.bind(normalizeParams(params));
    
    const hasRow = stmt.step();
    if (!hasRow) {
      stmt.free();
      return null;
    }
    
    const row = stmt.getAsObject();
    stmt.free();
    
    return row;
  } catch (error) {
    logger.error('Database get error', { sql, params, error: error.message });
    throw error;
  }
}

// 查询多行
async function all(sql, params = {}) {
  try {
    await pool.initialize();
    const database = pool.getDatabase();
    
    const stmt = database.prepare(sql);
    stmt.bind(normalizeParams(params));
    
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    
    stmt.free();
    return rows;
  } catch (error) {
    logger.error('Database all error', { sql, params, error: error.message });
    throw error;
  }
}

// 事务支持
async function transaction(callback) {
  try {
    await pool.initialize();
    await exec('BEGIN TRANSACTION');
    
    const result = await callback();
    
    await exec('COMMIT');
    pool.save(); // 事务提交后立即保存
    
    return result;
  } catch (error) {
    await exec('ROLLBACK');
    logger.error('Transaction error', { error: error.message });
    throw error;
  }
}

module.exports = {
  exec,
  run,
  get,
  all,
  transaction,
  pool
};
