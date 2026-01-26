/**
 * 数据库索引优化脚本
 * 添加缺失的索引以提升查询性能
 */

// 设置默认环境变量（用于独立运行）
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'temp_secret_for_index_creation';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const db = require('./index');
const logger = require('../utils/logger');

async function addOptimizationIndexes() {
  logger.info('开始添加优化索引...');
  
  try {
    // 订单状态查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);
    logger.info('✅ 创建索引: idx_orders_status');
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status);
    `);
    logger.info('✅ 创建索引: idx_orders_client_status');
    
    // 订单日期查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `);
    logger.info('✅ 创建索引: idx_orders_created_at');
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(created_at, status);
    `);
    logger.info('✅ 创建索引: idx_orders_date_status');
    
    // 风险事件查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_risk_events_status ON risk_events(status);
    `);
    logger.info('✅ 创建索引: idx_risk_events_status');
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_risk_events_date_status ON risk_events(created_at, status);
    `);
    logger.info('✅ 创建索引: idx_risk_events_date_status');
    
    // 通知查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
    `);
    logger.info('✅ 创建索引: idx_notifications_user_status');
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `);
    logger.info('✅ 创建索引: idx_notifications_created_at');
    
    // 监护人关系查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_guardian_links_client ON guardian_client_links(client_id, status);
    `);
    logger.info('✅ 创建索引: idx_guardian_links_client');
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_guardian_links_guardian ON guardian_client_links(guardian_id, status);
    `);
    logger.info('✅ 创建索引: idx_guardian_links_guardian');
    
    // 菜品查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dishes_merchant_status ON dishes(merchant_id, status);
    `);
    logger.info('✅ 创建索引: idx_dishes_merchant_status');
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dishes_store_status ON dishes(store_id, status);
    `);
    logger.info('✅ 创建索引: idx_dishes_store_status');
    
    // 用户角色查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
    logger.info('✅ 创建索引: idx_users_role');
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_role_community ON users(role, community_id);
    `);
    logger.info('✅ 创建索引: idx_users_role_community');
    
    // 营养摄入日期优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_intake_daily(date);
    `);
    logger.info('✅ 创建索引: idx_nutrition_date');
    
    // AI报告查询优化
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_reports_client_type ON ai_diet_reports(client_id, report_type);
    `);
    logger.info('✅ 创建索引: idx_ai_reports_client_type');
    
    logger.info('✅ 所有优化索引创建完成！');
    
    // 分析索引使用情况
    await analyzeIndexUsage();
    
  } catch (error) {
    logger.error('创建索引失败', { error: error.message });
    throw error;
  }
}

async function analyzeIndexUsage() {
  logger.info('分析索引使用情况...');
  
  try {
    // 获取所有索引
    const indexes = await db.all(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `);
    
    logger.info(`数据库中共有 ${indexes.length} 个索引`);
    
    // 按表分组
    const indexesByTable = {};
    indexes.forEach(idx => {
      if (!indexesByTable[idx.tbl_name]) {
        indexesByTable[idx.tbl_name] = [];
      }
      indexesByTable[idx.tbl_name].push(idx.name);
    });
    
    logger.info('索引分布:', indexesByTable);
    
  } catch (error) {
    logger.error('分析索引失败', { error: error.message });
  }
}

async function removeUnusedIndexes() {
  logger.info('检查未使用的索引...');
  
  // 这里可以添加逻辑来检测和删除未使用的索引
  // 需要分析查询日志来确定哪些索引未被使用
  
  logger.info('未使用索引检查完成');
}

// 如果直接运行此脚本
if (require.main === module) {
  addOptimizationIndexes()
    .then(() => {
      logger.info('索引优化完成');
      process.exit(0);
    })
    .catch(error => {
      logger.error('索引优化失败', { error: error.message });
      process.exit(1);
    });
}

module.exports = {
  addOptimizationIndexes,
  analyzeIndexUsage,
  removeUnusedIndexes
};
