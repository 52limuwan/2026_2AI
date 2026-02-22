import http from './http';

/**
 * 获取技能列表
 */
export function getSkillsList() {
  console.log('[API] 调用 getSkillsList');
  return http.get('/skills/list').then(res => {
    console.log('[API] getSkillsList 响应:', res);
    return res.data;
  });
}

/**
 * 获取技能详情
 * @param {string} skillId - 技能ID
 */
export function getSkillDetail(skillId) {
  console.log('[API] 调用 getSkillDetail:', skillId);
  return http.get(`/skills/${skillId}`).then(res => {
    console.log('[API] getSkillDetail 响应:', res);
    return res.data;
  });
}

/**
 * 创建自定义技能
 * @param {Object} data - {name, content}
 */
export function createSkill(data) {
  console.log('[API] 调用 createSkill, 数据:', data);
  console.log('[API] 数据类型:', typeof data);
  console.log('[API] 数据键:', Object.keys(data));
  console.log('[API] name值:', data.name);
  console.log('[API] content长度:', data.content?.length);
  return http.post('/skills/create', data).then(res => {
    console.log('[API] createSkill 响应:', res);
    return res.data;
  }).catch(err => {
    console.error('[API] createSkill 错误:', err);
    console.error('[API] 错误响应:', err.response);
    console.error('[API] 错误数据:', err.response?.data);
    throw err;
  });
}

/**
 * 更新自定义技能
 * @param {string} skillId - 技能ID
 * @param {Object} data - {content}
 */
export function updateSkill(skillId, data) {
  console.log('[API] 调用 updateSkill:', skillId, data);
  return http.put(`/skills/${skillId}`, data).then(res => {
    console.log('[API] updateSkill 响应:', res);
    return res.data;
  });
}

/**
 * 删除自定义技能
 * @param {string} skillId - 技能ID
 */
export function deleteSkill(skillId) {
  console.log('[API] 调用 deleteSkill:', skillId);
  return http.delete(`/skills/${skillId}`).then(res => {
    console.log('[API] deleteSkill 响应:', res);
    return res.data;
  });
}
