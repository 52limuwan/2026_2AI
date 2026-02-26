/**
 * 测试打印带图片的订单
 */

// 确保环境变量已加载
require('dotenv').config();

// 强制启用打印功能
process.env.PRINTER_ENABLED = 'true';
process.env.PRINTER_NAME = 'Gprinter GP-1324D';
process.env.PYTHON_PATH = 'python';

const { printOrder } = require('./src/services/printerService');
const path = require('path');

async function testPrintWithImage() {
  console.log('='.repeat(50));
  console.log('测试打印带图片的订单');
  console.log('='.repeat(50));
  
  // 使用实际的图片路径
  const imagePath = path.resolve(__dirname, '../c/ScreenShot_2026-02-26_044423_181.png');
  
  console.log(`\n图片路径: ${imagePath}`);
  
  const mockOrder = {
    order_number: 'IMG-TEST-' + Date.now(),
    client_name: '张三',
    store: { name: '美食餐厅' },
    community_name: '阳光社区',
    window_name: '1号窗口',
    total_amount: 68.50,
    items: [
      { 
        dish_name: '宫保鸡丁', 
        quantity: 1, 
        price: 28.00,
        image_url: imagePath  // 使用本地图片路径
      },
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
  
  console.log('\n开始打印...');
  const printResult = await printOrder(mockOrder);
  
  if (printResult) {
    console.log('✓ 订单打印成功！（包含菜品图片）');
  } else {
    console.log('✗ 订单打印失败');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('测试完成');
  console.log('='.repeat(50));
}

testPrintWithImage().catch(console.error);
