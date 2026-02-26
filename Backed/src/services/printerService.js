/**
 * 打印服务
 * 使用TSCLIB.DLL打印外卖单
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 打印机配置
const PRINTER_CONFIG = {
  enabled: process.env.PRINTER_ENABLED === 'true',
  printerName: process.env.PRINTER_NAME || 'Gprinter GP-1324D',
  pythonPath: process.env.PYTHON_PATH || 'python',
  scriptPath: path.join(__dirname, '../../printer/print_order.py')
};

/**
 * 打印外卖单
 * @param {Object} order - 订单对象
 * @returns {Promise<boolean>} - 打印是否成功
 */
async function printOrder(order) {
  // 如果打印功能未启用，直接返回成功
  if (!PRINTER_CONFIG.enabled) {
    console.log('打印功能未启用，跳过打印');
    return true;
  }

  // 检查Python脚本是否存在
  if (!fs.existsSync(PRINTER_CONFIG.scriptPath)) {
    console.error(`打印脚本不存在: ${PRINTER_CONFIG.scriptPath}`);
    return false;
  }

  return new Promise((resolve) => {
    try {
      // 准备订单数据
      const orderData = {
        order_number: order.order_number,
        client_name: order.client_name || '顾客',
        store_name: order.store?.name || '店铺',
        community_name: order.community?.name || order.community_name || '',
        window_name: order.window_name || '',
        total_amount: order.total_amount,
        items: (order.items || []).map(item => ({
          dish_name: item.dish_name,
          quantity: item.quantity,
          price: item.price,
          image_url: item.image_url || null,
          image_path: item.image_path || null
        })),
        address: order.address || '',
        contact: order.contact || '',
        remark: order.remark || '',
        created_at: order.created_at
      };

      // 调用Python打印脚本
      const pythonProcess = spawn(PRINTER_CONFIG.pythonPath, [
        PRINTER_CONFIG.scriptPath,
        JSON.stringify(orderData)
      ], {
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutHandle); // 清除超时定时器
        if (code === 0) {
          console.log(`订单 ${order.order_number} 打印成功`);
          console.log('打印输出:', output);
          resolve(true);
        } else {
          console.error(`订单 ${order.order_number} 打印失败，退出码: ${code}`);
          console.error('错误输出:', errorOutput);
          resolve(false);
        }
      });

      // 设置超时（10秒）
      const timeoutHandle = setTimeout(() => {
        pythonProcess.kill();
        console.error(`订单 ${order.order_number} 打印超时`);
        resolve(false);
      }, 10000);

    } catch (error) {
      console.error('打印订单时发生错误:', error);
      resolve(false);
    }
  });
}

/**
 * 测试打印机连接
 * @returns {Promise<boolean>} - 连接是否成功
 */
async function testPrinter() {
  if (!PRINTER_CONFIG.enabled) {
    return { success: false, message: '打印功能未启用' };
  }

  const testScriptPath = path.join(__dirname, '../../printer/test_printer.py');
  
  if (!fs.existsSync(testScriptPath)) {
    return { success: false, message: '测试脚本不存在' };
  }

  return new Promise((resolve) => {
    const pythonProcess = spawn(PRINTER_CONFIG.pythonPath, [testScriptPath], {
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutHandle); // 清除超时定时器
      if (code === 0) {
        resolve({ success: true, message: '打印机连接正常', output });
      } else {
        resolve({ success: false, message: '打印机连接失败', error: errorOutput });
      }
    });

    const timeoutHandle = setTimeout(() => {
      pythonProcess.kill();
      resolve({ success: false, message: '测试超时' });
    }, 5000);
  });
}

module.exports = {
  printOrder,
  testPrinter,
  PRINTER_CONFIG
};
