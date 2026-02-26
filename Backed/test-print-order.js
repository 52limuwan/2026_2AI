/**
 * 测试打印订单功能
 */

// 确保环境变量已加载
require('dotenv').config();

// 强制启用打印功能（用于测试）
process.env.PRINTER_ENABLED = 'true';
process.env.PRINTER_NAME = 'Gprinter GP-1324D';
process.env.PYTHON_PATH = 'python';

const { printOrder, testPrinter } = require('./src/services/printerService');

async function testPrintFunction() {
  console.log('='.repeat(50));
  console.log('测试打印机功能');
  console.log('='.repeat(50));
  
  // 1. 测试打印机连接
  console.log('\n1. 测试打印机连接...');
  const testResult = await testPrinter();
  console.log('结果:', testResult);
  
  if (!testResult.success) {
    console.error('打印机连接失败，停止测试');
    return;
  }
  
  // 2. 测试打印订单
  console.log('\n2. 测试打印订单...');
  const mockOrder = {
    order_number: 'TEST-' + Date.now(),
    client_name: '张三',
    store: { name: '美食餐厅' },
    community_name: '阳光社区',
    window_name: '1号窗口',
    total_amount: 68.50,
    items: [
      { dish_name: '宫保鸡丁', quantity: 1, price: 28.00 },
      { dish_name: '麻婆豆腐', quantity: 1, price: 18.00 },
      { dish_name: '米饭', quantity: 2, price: 2.00 }
    ],
    address: '阳光社区1号楼301',
    contact: '13800138000',
    remark: '少辣，多加米饭',
    created_at: new Date().toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      hour12: false 
    })
  };
  
  const printResult = await printOrder(mockOrder);
  
  if (printResult) {
    console.log('✓ 订单打印成功！');
  } else {
    console.log('✗ 订单打印失败');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('测试完成');
  console.log('='.repeat(50));
}

testPrintFunction().catch(console.error);
