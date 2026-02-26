/**
 * 测试打印固定图片标签（a1.png 和 a2.png）
 */

// 确保环境变量已加载
require('dotenv').config();

// 强制启用打印功能
process.env.PRINTER_ENABLED = 'true';
process.env.PRINTER_NAME = 'Gprinter GP-1324D';
process.env.PYTHON_PATH = 'python';

const { printOrder } = require('./src/services/printerService');

async function testPrintLabels() {
  console.log('='.repeat(60));
  console.log('测试打印固定图片标签');
  console.log('='.repeat(60));
  
  console.log('\n配置信息:');
  console.log('- 标签尺寸: 50x50mm');
  console.log('- 打印图片: a1.png, a2.png');
  console.log('- 图片目录: Backed/images/');
  
  // 模拟订单数据（实际内容不重要，只是触发打印）
  const mockOrder = {
    order_number: 'TEST-' + Date.now(),
    client_name: '测试顾客',
    total_amount: 0,
    items: [],
    created_at: new Date().toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      hour12: false 
    })
  };
  
  console.log('\n开始打印...');
  console.log('订单号:', mockOrder.order_number);
  
  const printResult = await printOrder(mockOrder);
  
  console.log('\n' + '='.repeat(60));
  if (printResult) {
    console.log('✓ 打印成功！');
    console.log('已打印 2 张标签:');
    console.log('  1. a1.png');
    console.log('  2. a2.png');
  } else {
    console.log('✗ 打印失败');
    console.log('\n可能的原因:');
    console.log('  1. 打印机未连接或未开机');
    console.log('  2. 图片文件不存在（Backed/images/a1.png, a2.png）');
    console.log('  3. Python环境或依赖库问题');
  }
  console.log('='.repeat(60));
}

testPrintLabels().catch(err => {
  console.error('\n发生错误:', err);
  process.exit(1);
});
