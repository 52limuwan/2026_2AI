/**
 * 打印机管理路由
 */
const express = require('express');
const router = express.Router();
const { authRequired, requireRole } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');
const { testPrinter, printOrder, PRINTER_CONFIG } = require('../services/printerService');
const { getOrderById } = require('../services/orders');

/**
 * 获取打印机配置
 */
router.get('/config', authRequired, requireRole(['merchant', 'admin']), async (req, res) => {
  success(res, {
    enabled: PRINTER_CONFIG.enabled,
    printerName: PRINTER_CONFIG.printerName
  });
});

/**
 * 测试打印机连接
 */
router.post('/test', authRequired, requireRole(['merchant', 'admin']), async (req, res) => {
  try {
    const result = await testPrinter();
    
    if (result.success) {
      success(res, result, '打印机测试成功');
    } else {
      failure(res, result.message || '打印机测试失败', 400);
    }
  } catch (error) {
    console.error('测试打印机失败:', error);
    failure(res, '测试打印机时发生错误', 500);
  }
});

/**
 * 手动打印订单
 */
router.post('/print-order/:orderId', authRequired, requireRole(['merchant', 'admin']), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (!orderId) {
      return failure(res, '订单ID无效', 400);
    }
    
    // 获取订单
    const order = await getOrderById(orderId);
    
    if (!order) {
      return failure(res, '订单不存在', 404);
    }
    
    // 打印订单
    const printSuccess = await printOrder(order);
    
    if (printSuccess) {
      success(res, null, '订单打印成功');
    } else {
      failure(res, '订单打印失败', 500);
    }
  } catch (error) {
    console.error('打印订单失败:', error);
    failure(res, '打印订单时发生错误', 500);
  }
});

module.exports = router;
