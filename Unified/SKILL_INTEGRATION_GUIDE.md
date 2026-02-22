# Skill功能集成指南

## 概述
本指南说明如何在各端的AI助手页面中集成SkillManager组件。

## 已完成的工作

### 后端
1. ✅ 创建了 `Backed/Skills/` 文件夹，存储所有技能提示词
2. ✅ 创建了系统默认技能文件：
   - `client-weekly.md` - 用户周报分析
   - `client-monthly.md` - 用户月报分析
   - `guardian-weekly.md` - 家属周报分析
   - `guardian-monthly.md` - 家属月报分析
   - `merchant-seasonal.md` - 节气菜品生成
   - `merchant-purchase.md` - 智能采购计划
   - `gov-health-suggestion.md` - 健康建议生成
3. ✅ 创建了 `Backed/src/routes/skills.js` - Skill管理API路由
4. ✅ 创建了 `Backed/src/services/skillLoader.js` - Skill加载服务
5. ✅ 更新了 `Backed/src/services/aiService.js` - 使用Skills文件夹中的提示词
6. ✅ 在 `Backed/src/server.js` 中注册了skills路由

### 前端
1. ✅ 创建了 `Unified/src/api/skills.js` - Skill API接口
2. ✅ 创建了 `Unified/src/components/SkillManager.vue` - Skill管理组件
3. ✅ 更新了 `Unified/src/components/AppHeader.vue` - 添加了Skill按钮
4. ✅ 更新了所有Layout组件（client/guardian/gov）- 添加了skills事件处理

## 需要在AI助手页面中完成的集成

### 步骤1：导入SkillManager组件

在 `AIAssistant.vue` 的 `<script setup>` 部分添加：

```javascript
import SkillManager from '../../components/SkillManager.vue'
```

### 步骤2：添加状态变量

```javascript
const showSkillManager = ref(false)
```

### 步骤3：添加事件监听

在 `onMounted` 中添加：

```javascript
// 监听来自Layout的技能管理事件
window.addEventListener('ai-open-skills', handleSkillsEvent)
```

在 `onUnmounted` 中添加：

```javascript
window.removeEventListener('ai-open-skills', handleSkillsEvent)
```

### 步骤4：添加事件处理函数

```javascript
const handleSkillsEvent = () => {
  showSkillManager.value = true
}
```

### 步骤5：在模板中添加SkillManager组件

在 `<template>` 的底部（在 `</Teleport>` 之前）添加：

```vue
<!-- Skill管理器 -->
<SkillManager v-model="showSkillManager" />
```

## 完整示例

### client/AIAssistant.vue

```vue
<template>
  <div class="ai-chat-container">
    <!-- 现有的聊天界面代码 -->
    ...
    
    <!-- Skill管理器 -->
    <SkillManager v-model="showSkillManager" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SkillManager from '../../components/SkillManager.vue'

// 现有的状态变量
...

// 添加Skill管理器状态
const showSkillManager = ref(false)

// 事件处理函数
const handleSkillsEvent = () => {
  showSkillManager.value = true
}

onMounted(async () => {
  // 现有的初始化代码
  ...
  
  // 监听技能管理事件
  window.addEventListener('ai-open-skills', handleSkillsEvent)
})

onUnmounted(() => {
  // 现有的清理代码
  ...
  
  // 移除技能管理事件监听
  window.removeEventListener('ai-open-skills', handleSkillsEvent)
})
</script>
```

## API接口说明

### 获取技能列表
```javascript
GET /api/skills/list
```

### 获取技能详情
```javascript
GET /api/skills/:skillId
```

### 创建自定义技能
```javascript
POST /api/skills/create
Body: {
  name: "技能名称",
  content: "技能内容（Markdown格式）"
}
```

### 更新自定义技能
```javascript
PUT /api/skills/:skillId
Body: {
  content: "更新后的技能内容"
}
```

### 删除自定义技能
```javascript
DELETE /api/skills/:skillId
```

## 技能文件格式

每个技能文件应包含以下部分：

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

## 变量替换

技能文件中可以使用 `{variableName}` 格式的变量，系统会自动替换为实际数据。

例如：
- `{calories}` - 热量
- `{protein}` - 蛋白质
- `{solarTerm}` - 节气
- `{clientName}` - 用户姓名

## 注意事项

1. 系统默认技能不能被编辑或删除
2. 用户只能管理自己角色的自定义技能
3. 自定义技能文件命名格式：`custom-{role}-{name}.md`
4. 技能内容支持Markdown格式
5. 技能提示词会在AI服务调用时自动加载和应用

## 测试

1. 启动后端服务：`cd Backed && npm run dev`
2. 启动前端服务：`cd Unified && npm run dev`
3. 登录任意角色账号
4. 进入AI助手页面
5. 点击顶部的技能管理按钮（盾牌图标）
6. 测试创建、查看、编辑、删除自定义技能

## 故障排除

### 技能列表加载失败
- 检查后端Skills文件夹是否存在
- 检查API路由是否正确注册
- 查看浏览器控制台和后端日志

### 技能内容不生效
- 检查技能文件格式是否正确
- 确认变量名称是否匹配
- 查看aiService.js中的日志输出

### 按钮不显示
- 确认在AI助手页面（路径匹配）
- 检查Layout中的isAIPage计算属性
- 确认AppHeader的showAIButtons属性传递正确
