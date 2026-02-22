# AI Skill功能优化整改总结

## 项目需求
1. 将后端的AI提示词从env文件迁移到独立的Skill文件夹，每个角色作为一个md文件存在
2. 前端在顶部栏的历史对话按钮左边添加skill按钮，用于管理skill
3. 用户可以开启或关闭skill，管理系统默认skill和自定义skill
4. 用户添加自定义skill后会在后端生成对应的md文件

## 已完成的工作

### 后端改造

#### 1. Skills文件夹结构
```
Backed/Skills/
├── README.md                    # 说明文档
├── client-weekly.md             # 用户周报分析
├── client-monthly.md            # 用户月报分析
├── guardian-weekly.md           # 家属周报分析
├── guardian-monthly.md          # 家属月报分析
├── merchant-seasonal.md         # 节气菜品生成
├── merchant-purchase.md         # 智能采购计划
├── gov-health-suggestion.md     # 健康建议生成
└── custom-{role}-{name}.md      # 用户自定义技能
```

#### 2. 新增文件
- `Backed/src/routes/skills.js` - Skill管理API路由
  - GET `/api/skills/list` - 获取技能列表
  - GET `/api/skills/:skillId` - 获取技能详情
  - POST `/api/skills/create` - 创建自定义技能
  - PUT `/api/skills/:skillId` - 更新自定义技能
  - DELETE `/api/skills/:skillId` - 删除自定义技能

- `Backed/src/services/skillLoader.js` - Skill加载服务
  - `loadSkillContent()` - 加载技能文件内容
  - `extractSystemPrompt()` - 提取系统提示词
  - `extractUserPromptTemplate()` - 提取用户提示词模板
  - `replaceVariables()` - 替换提示词变量
  - `loadSkillPrompts()` - 加载并处理技能提示词

#### 3. 修改文件
- `Backed/src/server.js` - 注册skills路由
- `Backed/src/services/aiService.js` - 更新为使用Skills文件夹中的提示词

### 前端改造

#### 1. 新增文件
- `Unified/src/api/skills.js` - Skill API接口封装
- `Unified/src/components/SkillManager.vue` - Skill管理组件
  - 技能列表展示
  - 创建自定义技能
  - 查看技能详情
  - 编辑自定义技能
  - 删除自定义技能
  - 系统技能与自定义技能区分

#### 2. 修改文件
- `Unified/src/components/AppHeader.vue` - 添加Skill按钮（盾牌图标）
- `Unified/src/modules/client/Layout.vue` - 添加skills事件处理
- `Unified/src/modules/guardian/Layout.vue` - 添加skills事件处理
- `Unified/src/modules/gov/Layout.vue` - 添加skills事件处理

### 文档

#### 1. 集成指南
- `Unified/SKILL_INTEGRATION_GUIDE.md` - 详细的集成步骤说明
  - 如何在AI助手页面中集成SkillManager
  - API接口说明
  - 技能文件格式说明
  - 测试和故障排除

#### 2. 功能总结
- `SKILL_FEATURE_SUMMARY.md` - 本文档

## 技术实现

### 技能文件格式
每个技能文件采用Markdown格式，包含以下部分：
```markdown
# Skill Name

## 角色定位
描述AI的角色和职责

## 分析要求/任务要求
具体的任务描述和输入数据格式

## 输出内容/输出格式
期望的输出内容和格式

## 语气要求
对AI回复语气的要求
```

### 变量替换机制
技能文件中可以使用 `{variableName}` 格式的变量，系统会自动替换：
- 营养数据：`{calories}`, `{protein}`, `{fat}`, `{carbs}`, `{fiber}`, `{calcium}`, `{vitaminC}`, `{iron}`
- 目标数据：`{dailyTarget}`, `{achievement}`, `{newDishes}`
- 用户信息：`{clientName}`, `{age}`, `{gender}`, `{chronicConditions}`
- 其他：`{solarTerm}`, `{period}` 等

### 权限控制
- 系统默认技能：所有用户可查看，不可编辑或删除
- 自定义技能：只能由创建者管理（编辑、删除）
- 角色隔离：用户只能看到和管理自己角色的技能

### 文件命名规则
- 系统技能：`{role}-{type}.md`
  - 例如：`client-weekly.md`, `guardian-monthly.md`
- 自定义技能：`custom-{role}-{name}.md`
  - 例如：`custom-client-fitness.md`

## 用户界面

### Skill按钮位置
在AI助手页面顶部栏，历史对话按钮左边，显示为盾牌图标

### Skill管理界面
- 抽屉式侧边栏（移动端全屏）
- 技能卡片展示
  - 系统技能：带星标图标，灰色渐变背景
  - 自定义技能：绿色标签
- 操作按钮：
  - 查看：所有技能
  - 编辑：仅自定义技能
  - 删除：仅自定义技能
  - 创建：添加新的自定义技能

### 创建/编辑对话框
- 技能名称输入（仅创建时）
- 技能内容编辑（Markdown格式）
- 提示信息：说明技能文件格式和变量使用
- 保存/取消按钮

## 待完成工作

### AI助手页面集成
需要在以下页面中集成SkillManager组件：
1. `Unified/src/modules/client/AIAssistant.vue`
2. `Unified/src/modules/guardian/AIAssistant.vue`
3. `Unified/src/modules/gov/AIAssistant.vue`

集成步骤详见 `Unified/SKILL_INTEGRATION_GUIDE.md`

### 可选增强功能
1. 技能启用/禁用开关
2. 技能使用统计
3. 技能分享功能
4. 技能模板库
5. 技能版本管理

## 测试建议

### 后端测试
1. 测试Skills文件夹读取
2. 测试技能列表API
3. 测试自定义技能CRUD操作
4. 测试权限控制
5. 测试AI服务使用新的提示词

### 前端测试
1. 测试Skill按钮显示
2. 测试SkillManager组件打开/关闭
3. 测试技能列表加载
4. 测试创建自定义技能
5. 测试编辑/删除自定义技能
6. 测试系统技能只读限制
7. 测试移动端响应式布局

### 集成测试
1. 测试端到端的技能创建流程
2. 测试AI使用自定义技能生成内容
3. 测试多角色技能隔离
4. 测试并发操作

## 部署注意事项

1. 确保Skills文件夹有正确的读写权限
2. 备份现有的env配置（作为fallback）
3. 逐步迁移，先测试后上线
4. 监控AI服务的提示词加载性能
5. 准备回滚方案

## 优势

1. **易于维护**：提示词独立管理，不再混在env文件中
2. **版本控制**：Markdown文件可以纳入Git管理
3. **用户自定义**：用户可以创建符合自己需求的技能
4. **灵活扩展**：新增技能只需添加md文件
5. **可视化管理**：前端界面直观管理技能
6. **角色隔离**：不同角色的技能互不干扰

## 技术栈

- 后端：Node.js + Express + fs/promises
- 前端：Vue 3 + Element Plus
- 文件格式：Markdown
- 通信：RESTful API

## 相关文件清单

### 后端
- `Backed/Skills/` - 技能文件夹
- `Backed/src/routes/skills.js` - API路由
- `Backed/src/services/skillLoader.js` - 加载服务
- `Backed/src/services/aiService.js` - AI服务（已更新）
- `Backed/src/server.js` - 服务器配置（已更新）

### 前端
- `Unified/src/api/skills.js` - API接口
- `Unified/src/components/SkillManager.vue` - 管理组件
- `Unified/src/components/AppHeader.vue` - 头部组件（已更新）
- `Unified/src/modules/*/Layout.vue` - 布局组件（已更新）

### 文档
- `Backed/Skills/README.md` - Skills文件夹说明
- `Unified/SKILL_INTEGRATION_GUIDE.md` - 集成指南
- `SKILL_FEATURE_SUMMARY.md` - 本文档

## 联系与支持

如有问题，请参考：
1. `Unified/SKILL_INTEGRATION_GUIDE.md` - 详细集成步骤
2. `Backed/Skills/README.md` - 技能文件格式说明
3. 后端日志 - 查看技能加载和API调用情况
4. 浏览器控制台 - 查看前端错误信息
