/**
 * 性能测试脚本
 * 用于测试API性能和数据库查询性能
 */

const http = require('http');
const https = require('https');

class PerformanceTester {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.results = [];
  }

  /**
   * 发送HTTP请求
   */
  async request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseURL);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const req = protocol.request(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  /**
   * 测试单个端点
   */
  async testEndpoint(name, path, options = {}) {
    const startTime = Date.now();
    
    try {
      const response = await this.request(path, options);
      const duration = Date.now() - startTime;
      
      const result = {
        name,
        path,
        duration,
        statusCode: response.statusCode,
        success: response.statusCode >= 200 && response.statusCode < 300
      };
      
      this.results.push(result);
      
      console.log(`✓ ${name}: ${duration}ms (${response.statusCode})`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result = {
        name,
        path,
        duration,
        success: false,
        error: error.message
      };
      
      this.results.push(result);
      
      console.log(`✗ ${name}: ${error.message}`);
      
      return result;
    }
  }

  /**
   * 并发测试
   */
  async concurrentTest(name, path, options = {}, concurrency = 10) {
    console.log(`\n并发测试: ${name} (并发数: ${concurrency})`);
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.testEndpoint(`${name} #${i + 1}`, path, options));
    }
    
    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;
    
    const successCount = results.filter(r => r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    const minDuration = Math.min(...results.map(r => r.duration));
    
    console.log(`\n并发测试结果:`);
    console.log(`  总耗时: ${totalDuration}ms`);
    console.log(`  成功率: ${successCount}/${concurrency} (${(successCount / concurrency * 100).toFixed(2)}%)`);
    console.log(`  平均响应: ${avgDuration.toFixed(2)}ms`);
    console.log(`  最快响应: ${minDuration}ms`);
    console.log(`  最慢响应: ${maxDuration}ms`);
    console.log(`  吞吐量: ${(concurrency / (totalDuration / 1000)).toFixed(2)} req/s`);
    
    return {
      name,
      concurrency,
      totalDuration,
      successCount,
      avgDuration,
      maxDuration,
      minDuration,
      throughput: concurrency / (totalDuration / 1000)
    };
  }

  /**
   * 压力测试
   */
  async stressTest(name, path, options = {}, duration = 30000, concurrency = 50) {
    console.log(`\n压力测试: ${name}`);
    console.log(`  持续时间: ${duration / 1000}秒`);
    console.log(`  并发数: ${concurrency}`);
    
    const startTime = Date.now();
    const results = [];
    let requestCount = 0;
    let errorCount = 0;
    
    const makeRequest = async () => {
      while (Date.now() - startTime < duration) {
        try {
          const reqStart = Date.now();
          await this.request(path, options);
          const reqDuration = Date.now() - reqStart;
          
          results.push(reqDuration);
          requestCount++;
        } catch (error) {
          errorCount++;
        }
      }
    };
    
    // 启动并发请求
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(makeRequest());
    }
    
    await Promise.all(workers);
    
    const totalDuration = Date.now() - startTime;
    const avgDuration = results.reduce((sum, d) => sum + d, 0) / results.length;
    const maxDuration = Math.max(...results);
    const minDuration = Math.min(...results);
    
    // 计算百分位数
    const sorted = results.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    console.log(`\n压力测试结果:`);
    console.log(`  总请求数: ${requestCount}`);
    console.log(`  成功请求: ${requestCount - errorCount}`);
    console.log(`  失败请求: ${errorCount}`);
    console.log(`  错误率: ${(errorCount / requestCount * 100).toFixed(2)}%`);
    console.log(`  平均响应: ${avgDuration.toFixed(2)}ms`);
    console.log(`  最快响应: ${minDuration}ms`);
    console.log(`  最慢响应: ${maxDuration}ms`);
    console.log(`  50%响应: ${p50}ms`);
    console.log(`  95%响应: ${p95}ms`);
    console.log(`  99%响应: ${p99}ms`);
    console.log(`  吞吐量: ${(requestCount / (totalDuration / 1000)).toFixed(2)} req/s`);
    
    return {
      name,
      requestCount,
      errorCount,
      avgDuration,
      maxDuration,
      minDuration,
      p50,
      p95,
      p99,
      throughput: requestCount / (totalDuration / 1000)
    };
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('性能测试报告');
    console.log('='.repeat(60));
    
    if (this.results.length === 0) {
      console.log('没有测试结果');
      return;
    }
    
    const successResults = this.results.filter(r => r.success);
    const failedResults = this.results.filter(r => !r.success);
    
    console.log(`\n总测试数: ${this.results.length}`);
    console.log(`成功: ${successResults.length}`);
    console.log(`失败: ${failedResults.length}`);
    console.log(`成功率: ${(successResults.length / this.results.length * 100).toFixed(2)}%`);
    
    if (successResults.length > 0) {
      const avgDuration = successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length;
      const maxDuration = Math.max(...successResults.map(r => r.duration));
      const minDuration = Math.min(...successResults.map(r => r.duration));
      
      console.log(`\n响应时间统计:`);
      console.log(`  平均: ${avgDuration.toFixed(2)}ms`);
      console.log(`  最快: ${minDuration}ms`);
      console.log(`  最慢: ${maxDuration}ms`);
    }
    
    if (failedResults.length > 0) {
      console.log(`\n失败的测试:`);
      failedResults.forEach(r => {
        console.log(`  - ${r.name}: ${r.error || '未知错误'}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * 清除结果
   */
  clear() {
    this.results = [];
  }
}

// 运行测试
async function runTests() {
  const tester = new PerformanceTester('http://localhost:8000');
  
  console.log('开始性能测试...\n');
  
  // 获取登录token（需要先登录）
  const token = process.env.TEST_TOKEN || '';
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  // 测试健康检查
  await tester.testEndpoint('健康检查', '/health');
  
  // 测试API端点
  if (token) {
    await tester.testEndpoint('获取社区列表', '/api/gov/communities', { headers });
    await tester.testEndpoint('获取居民列表', '/api/gov/clients', { headers });
    await tester.testEndpoint('获取首页概览', '/api/gov/dashboard', { headers });
    
    // 并发测试
    await tester.concurrentTest('获取社区列表', '/api/gov/communities', { headers }, 10);
    await tester.concurrentTest('获取居民列表', '/api/gov/clients', { headers }, 10);
    
    // 压力测试（可选，注释掉以避免过度测试）
    // await tester.stressTest('获取社区列表', '/api/gov/communities', { headers }, 10000, 20);
  } else {
    console.log('⚠️  未提供TEST_TOKEN，跳过需要认证的测试');
    console.log('   使用方法: TEST_TOKEN=your_token node test-performance.js');
  }
  
  // 生成报告
  tester.generateReport();
}

// 执行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTester;
