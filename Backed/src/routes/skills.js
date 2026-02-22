const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { authRequired } = require('../middleware/auth');
const { success, failure } = require('../utils/respond');

const router = express.Router();
const SKILLS_DIR = path.join(__dirname, '../../Skills');

// 系统默认技能列表
const SYSTEM_SKILLS = {
  client: [
    'client-weekly', 
    'client-monthly',
    'client-nutritionist',
    'client-tcm-health',
    'client-chronic-disease',
    'client-exercise-rehab',
    'client-psychology',
    'client-meal-planning',
    'client-medication',
    'client-seasonal-care',
    'client-home-care',
    'client-health-record'
  ],
  guardian: [
    'guardian-weekly', 
    'guardian-monthly',
    'guardian-nutrition-analyst',
    'guardian-health-monitor',
    'guardian-chronic-care',
    'guardian-mental-care',
    'guardian-home-safety',
    'guardian-care-training',
    'guardian-medical-guide',
    'guardian-rehab-planner',
    'guardian-elderly-resource',
    'guardian-family-coordinator'
  ],
  merchant: [
    'merchant-seasonal', 
    'merchant-purchase'
  ],
  gov: [
    'gov-health-suggestion',
    'gov-community-health',
    'gov-chronic-prevention',
    'gov-nutrition-policy',
    'gov-health-education',
    'gov-service-supervision',
    'gov-emergency-response',
    'gov-data-analyst',
    'gov-resource-optimizer',
    'gov-policy-consultant',
    'gov-collaboration-facilitator'
  ]
};

/**
 * 获取所有技能列表
 */
router.get('/list', authRequired, async (req, res) => {
  try {
    const userRole = req.user.role;
    
    console.log('\n[SKILLS] 获取技能列表请求');
    console.log(`  用户角色: ${userRole}`);
    console.log(`  Skills目录: ${SKILLS_DIR}`);
    
    // 读取Skills目录下的所有md文件
    const files = await fs.readdir(SKILLS_DIR);
    console.log(`  找到文件: ${files.length}个`, files);
    
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'README.md');
    console.log(`  Markdown文件: ${mdFiles.length}个`, mdFiles);
    
    const skills = [];
    
    for (const file of mdFiles) {
      const fileName = file.replace('.md', '');
      const filePath = path.join(SKILLS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // 提取标题
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName;
      
      // 判断是否为系统默认技能
      const isSystem = Object.values(SYSTEM_SKILLS).flat().includes(fileName);
      
      // 判断是否属于当前用户角色
      const roleMatch = fileName.match(/^(client|guardian|merchant|gov|custom-\w+)-/);
      const skillRole = roleMatch ? roleMatch[1].replace('custom-', '') : 'all';
      
      console.log(`  处理文件: ${file}`);
      console.log(`    - 文件名: ${fileName}`);
      console.log(`    - 标题: ${title}`);
      console.log(`    - 是否系统技能: ${isSystem}`);
      console.log(`    - 技能角色: ${skillRole}`);
      console.log(`    - 是否匹配当前角色: ${skillRole === 'all' || skillRole === userRole || fileName.startsWith(`custom-${userRole}-`)}`);
      
      // 只返回属于当前角色的技能
      if (skillRole === 'all' || skillRole === userRole || fileName.startsWith(`custom-${userRole}-`)) {
        skills.push({
          id: fileName,
          name: title,
          fileName: file,
          isSystem,
          role: skillRole,
          enabled: true // 默认启用，后续可以从数据库读取用户配置
        });
      }
    }
    
    console.log(`  返回技能数量: ${skills.length}个`);
    console.log('========================================\n');
    
    return success(res, { skills });
  } catch (error) {
    console.error('[SKILLS] 获取技能列表失败:', error);
    return failure(res, '获取技能列表失败', 500);
  }
});

/**
 * 获取单个技能详情
 */
router.get('/:skillId', authRequired, async (req, res) => {
  try {
    const { skillId } = req.params;
    const filePath = path.join(SKILLS_DIR, `${skillId}.md`);
    
    console.log('\n[SKILLS] 获取技能详情请求');
    console.log(`  技能ID: ${skillId}`);
    console.log(`  文件路径: ${filePath}`);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
      console.log('  文件存在: 是');
    } catch {
      console.log('  文件存在: 否');
      return failure(res, '技能不存在', 404);
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`  文件内容长度: ${content.length}字符`);
    
    // 提取标题
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : skillId;
    console.log(`  提取标题: ${title}`);
    
    const isSystem = Object.values(SYSTEM_SKILLS).flat().includes(skillId);
    console.log(`  是否系统技能: ${isSystem}`);
    
    const result = {
      id: skillId,
      name: title,
      content,
      isSystem
    };
    
    console.log('  返回数据结构:', Object.keys(result));
    console.log('========================================\n');
    
    return success(res, result);
  } catch (error) {
    console.error('[SKILLS] 获取技能详情失败:', error);
    return failure(res, '获取技能详情失败', 500);
  }
});

/**
 * 创建自定义技能
 */
router.post('/create', authRequired, async (req, res) => {
  try {
    const { name, content } = req.body;
    const userRole = req.user.role;
    
    console.log('\n[SKILLS] 创建技能请求');
    console.log(`  用户角色: ${userRole}`);
    console.log(`  请求体:`, req.body);
    console.log(`  技能名称: ${name}`);
    console.log(`  内容长度: ${content ? content.length : 0}字符`);
    
    if (!name || !content) {
      console.log('  错误: 缺少必要参数');
      console.log(`  name存在: ${!!name}, content存在: ${!!content}`);
      return failure(res, '缺少必要参数', 400);
    }
    
    // 生成文件名
    const fileName = `custom-${userRole}-${name.toLowerCase().replace(/\s+/g, '-')}`;
    const filePath = path.join(SKILLS_DIR, `${fileName}.md`);
    
    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      return failure(res, '该技能名称已存在', 400);
    } catch {
      // 文件不存在，可以创建
    }
    
    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');
    
    console.log(`  创建成功: ${fileName}.md`);
    console.log('========================================\n');
    
    return success(res, {
      id: fileName,
      name,
      fileName: `${fileName}.md`
    }, '技能创建成功');
  } catch (error) {
    console.error('创建技能失败:', error);
    return failure(res, '创建技能失败', 500);
  }
});

/**
 * 更新自定义技能
 */
router.put('/:skillId', authRequired, async (req, res) => {
  try {
    const { skillId } = req.params;
    const { content } = req.body;
    const userRole = req.user.role;
    
    if (!content) {
      return failure(res, '缺少必要参数', 400);
    }
    
    // 只能更新自定义技能
    if (!skillId.startsWith(`custom-${userRole}-`)) {
      return failure(res, '只能更新自定义技能', 403);
    }
    
    const filePath = path.join(SKILLS_DIR, `${skillId}.md`);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return failure(res, '技能不存在', 404);
    }
    
    // 更新文件
    await fs.writeFile(filePath, content, 'utf-8');
    
    console.log(`[SKILL] 更新自定义技能: ${skillId}`);
    
    return success(res, null, '技能更新成功');
  } catch (error) {
    console.error('更新技能失败:', error);
    return failure(res, '更新技能失败', 500);
  }
});

/**
 * 删除自定义技能
 */
router.delete('/:skillId', authRequired, async (req, res) => {
  try {
    const { skillId } = req.params;
    const userRole = req.user.role;
    
    // 只能删除自定义技能
    if (!skillId.startsWith(`custom-${userRole}-`)) {
      return failure(res, '只能删除自定义技能', 403);
    }
    
    const filePath = path.join(SKILLS_DIR, `${skillId}.md`);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return failure(res, '技能不存在', 404);
    }
    
    // 删除文件
    await fs.unlink(filePath);
    
    console.log(`[SKILL] 删除自定义技能: ${skillId}`);
    
    return success(res, null, '技能删除成功');
  } catch (error) {
    console.error('删除技能失败:', error);
    return failure(res, '删除技能失败', 500);
  }
});

/**
 * 读取技能内容（用于AI服务）
 */
async function loadSkillContent(skillId) {
  try {
    const filePath = path.join(SKILLS_DIR, `${skillId}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`加载技能失败: ${skillId}`, error);
    return null;
  }
}

module.exports = router;
module.exports.loadSkillContent = loadSkillContent;
