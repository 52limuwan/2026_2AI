const fs = require('fs').promises;
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '../../Skills');

/**
 * 加载技能文件内容
 * @param {string} skillId - 技能ID
 * @returns {Promise<string|null>} - 技能内容
 */
async function loadSkillContent(skillId) {
  try {
    const filePath = path.join(SKILLS_DIR, `${skillId}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`[SKILL] 加载技能失败: ${skillId}`, error.message);
    return null;
  }
}

/**
 * 从技能文件中提取系统提示词
 * @param {string} content - 技能文件内容
 * @returns {string} - 系统提示词
 */
function extractSystemPrompt(content) {
  // 提取"角色定位"部分
  const roleMatch = content.match(/##\s+角色定位\s+([\s\S]*?)(?=##|$)/);
  if (roleMatch) {
    return roleMatch[1].trim();
  }
  return '';
}

/**
 * 从技能文件中提取用户提示词模板
 * @param {string} content - 技能文件内容
 * @returns {string} - 用户提示词模板
 */
function extractUserPromptTemplate(content) {
  // 提取"分析要求"或"任务要求"部分
  const taskMatch = content.match(/##\s+(分析要求|任务要求)\s+([\s\S]*?)(?=##|$)/);
  if (taskMatch) {
    return taskMatch[2].trim();
  }
  return '';
}

/**
 * 替换提示词中的变量
 * @param {string} template - 提示词模板
 * @param {Object} variables - 变量对象
 * @returns {string} - 替换后的提示词
 */
function replaceVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * 加载并处理技能提示词
 * @param {string} skillId - 技能ID
 * @param {Object} variables - 变量对象
 * @returns {Promise<Object>} - {systemPrompt, userPrompt}
 */
async function loadSkillPrompts(skillId, variables = {}) {
  const content = await loadSkillContent(skillId);
  
  if (!content) {
    return {
      systemPrompt: '',
      userPrompt: ''
    };
  }
  
  const systemPrompt = extractSystemPrompt(content);
  const userPromptTemplate = extractUserPromptTemplate(content);
  const userPrompt = replaceVariables(userPromptTemplate, variables);
  
  return {
    systemPrompt,
    userPrompt
  };
}

module.exports = {
  loadSkillContent,
  extractSystemPrompt,
  extractUserPromptTemplate,
  replaceVariables,
  loadSkillPrompts
};
