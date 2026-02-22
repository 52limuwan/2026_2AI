// 测试Skills API的简单脚本
const fs = require('fs').promises;
const path = require('path');

const SKILLS_DIR = path.join(__dirname, 'Skills');

async function testSkillsDir() {
  console.log('测试Skills目录...');
  console.log('目录路径:', SKILLS_DIR);
  
  try {
    // 检查目录是否存在
    const exists = await fs.access(SKILLS_DIR).then(() => true).catch(() => false);
    console.log('目录存在:', exists);
    
    if (!exists) {
      console.error('Skills目录不存在！');
      return;
    }
    
    // 读取目录内容
    const files = await fs.readdir(SKILLS_DIR);
    console.log('\n找到的文件:', files);
    
    // 过滤md文件
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'README.md');
    console.log('\nMarkdown文件:', mdFiles);
    
    // 读取每个文件的标题
    console.log('\n文件详情:');
    for (const file of mdFiles) {
      const filePath = path.join(SKILLS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file;
      console.log(`  ${file} -> ${title}`);
    }
    
    console.log('\n测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testSkillsDir();
