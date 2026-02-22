# Skill功能测试指南

## 已完成的修复

### 1. 图标更改 ✅
- 将Skill按钮图标从盾牌改为书本图标
- 位置：AI助手页面顶部栏，历史对话按钮左边

### 2. 功能集成 ✅
- 在所有三个端的AIAssistant页面中集成了SkillManager组件
  - client/AIAssistant.vue
  - guardian/AIAssistant.vue
  - gov/AIAssistant.vue
- 添加了事件监听和处理函数
- 修复了SkillManager组件中缺少的watch导入

## 测试步骤

### 前置条件
1. 启动后端服务：
   ```bash
   cd Backed
   npm run dev
   ```

2. 启动前端服务：
   ```bash
   cd Unified
   npm run dev
   ```

### 测试流程

#### 1. 测试按钮显示
- [ ] 登录任意角色账号（client/guardian/gov）
- [ ] 进入AI助手页面
- [ ] 确认顶部栏显示三个按钮（从左到右）：
  - 书本图标（Skill管理）
  - 对话框图标（历史对话）
  - 加号图标（新对话）

#### 2. 测试Skill管理器打开
- [ ] 点击书本图标
- [ ] 确认右侧弹出Skill管理抽屉
- [ ] 移动端：确认全屏显示
- [ ] 桌面端：确认宽度为600px

#### 3. 测试技能列表加载
- [ ] 确认显示"我的技能"标题
- [ ] 确认显示"创建技能"按钮
- [ ] 确认加载系统默认技能：
  - Client端：client-weekly, client-monthly
  - Guardian端：guardian-weekly, guardian-monthly
  - Gov端：gov-health-suggestion
- [ ] 确认系统技能显示：
  - 星标图标
  - "系统"标签
  - 灰色渐变背景

#### 4. 测试查看技能
- [ ] 点击任意技能的"查看"按钮
- [ ] 确认弹出对话框显示技能内容
- [ ] 确认内容为Markdown格式
- [ ] 确认只有"关闭"按钮（无编辑功能）

#### 5. 测试创建自定义技能
- [ ] 点击"创建技能"按钮
- [ ] 输入技能名称（例如："健身建议"）
- [ ] 输入技能内容（可以使用默认模板）
- [ ] 点击"创建"按钮
- [ ] 确认显示"创建成功"提示
- [ ] 确认列表中出现新技能
- [ ] 确认新技能显示"自定义"标签

#### 6. 测试编辑自定义技能
- [ ] 找到刚创建的自定义技能
- [ ] 点击"编辑"按钮
- [ ] 修改技能内容
- [ ] 点击"保存"按钮
- [ ] 确认显示"保存成功"提示
- [ ] 重新查看技能，确认内容已更新

#### 7. 测试删除自定义技能
- [ ] 找到自定义技能
- [ ] 点击"删除"按钮
- [ ] 确认弹出确认对话框
- [ ] 点击"确定"
- [ ] 确认显示"删除成功"提示
- [ ] 确认技能从列表中消失

#### 8. 测试系统技能保护
- [ ] 尝试编辑系统技能
- [ ] 确认系统技能没有"编辑"按钮
- [ ] 确认系统技能没有"删除"按钮
- [ ] 只能查看系统技能

#### 9. 测试角色隔离
- [ ] 以client角色登录，创建自定义技能
- [ ] 退出登录
- [ ] 以guardian角色登录
- [ ] 进入AI助手的Skill管理
- [ ] 确认看不到client创建的自定义技能
- [ ] 确认只能看到guardian角色的系统技能

#### 10. 测试后端文件生成
- [ ] 创建一个自定义技能（例如："测试技能"）
- [ ] 检查后端 `Backed/Skills/` 文件夹
- [ ] 确认生成了对应的md文件：`custom-{role}-测试技能.md`
- [ ] 打开文件，确认内容正确

#### 11. 测试响应式布局
- [ ] 在桌面浏览器中测试（宽度 > 768px）
  - 确认抽屉宽度为600px
  - 确认技能卡片布局正常
- [ ] 在移动浏览器中测试（宽度 < 768px）
  - 确认抽屉全屏显示
  - 确认按钮布局自适应
  - 确认对话框宽度为95%

#### 12. 测试关闭功能
- [ ] 点击抽屉外部区域
- [ ] 确认抽屉关闭
- [ ] 点击对话框的"取消"或"关闭"按钮
- [ ] 确认对话框关闭

## 常见问题排查

### 问题1：点击按钮没反应
**可能原因：**
- 事件监听未正确添加
- Layout组件未正确触发事件

**排查步骤：**
1. 打开浏览器控制台
2. 点击Skill按钮
3. 检查是否有JavaScript错误
4. 确认Layout.vue中的openSkillsManager函数被调用
5. 确认AIAssistant.vue中的handleSkillsEvent函数被调用

### 问题2：技能列表加载失败
**可能原因：**
- 后端服务未启动
- Skills文件夹不存在
- API路由未正确注册

**排查步骤：**
1. 检查后端服务是否运行
2. 检查 `Backed/Skills/` 文件夹是否存在
3. 检查后端日志是否有错误
4. 测试API：`GET http://localhost:8000/api/skills/list`

### 问题3：创建技能失败
**可能原因：**
- 权限问题
- 文件写入失败
- 技能名称重复

**排查步骤：**
1. 检查后端日志
2. 确认Skills文件夹有写入权限
3. 尝试使用不同的技能名称
4. 检查网络请求响应

### 问题4：图标不显示
**可能原因：**
- SVG路径错误
- CSS样式问题

**排查步骤：**
1. 检查AppHeader.vue中的SVG代码
2. 检查浏览器开发者工具中的元素
3. 确认CSS样式正确应用

### 问题5：SkillManager组件报错
**可能原因：**
- 缺少依赖导入
- Element Plus未正确安装

**排查步骤：**
1. 检查浏览器控制台错误信息
2. 确认已导入所有必要的依赖
3. 检查Element Plus是否正确安装
4. 运行 `npm install` 重新安装依赖

## API测试

### 使用Postman或curl测试API

#### 1. 获取技能列表
```bash
curl -X GET http://localhost:8000/api/skills/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. 获取技能详情
```bash
curl -X GET http://localhost:8000/api/skills/client-weekly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. 创建自定义技能
```bash
curl -X POST http://localhost:8000/api/skills/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试技能",
    "content": "# 测试技能\n\n## 角色定位\n测试用"
  }'
```

#### 4. 更新自定义技能
```bash
curl -X PUT http://localhost:8000/api/skills/custom-client-测试技能 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 测试技能\n\n## 角色定位\n更新后的内容"
  }'
```

#### 5. 删除自定义技能
```bash
curl -X DELETE http://localhost:8000/api/skills/custom-client-测试技能 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 性能测试

### 1. 加载性能
- [ ] 测试技能列表加载时间（应 < 1秒）
- [ ] 测试技能详情加载时间（应 < 500ms）
- [ ] 测试大量技能时的滚动性能

### 2. 并发测试
- [ ] 多个用户同时创建技能
- [ ] 多个用户同时查看技能列表
- [ ] 测试文件系统并发写入

## 安全测试

### 1. 权限测试
- [ ] 尝试访问其他角色的技能
- [ ] 尝试编辑系统技能
- [ ] 尝试删除系统技能

### 2. 输入验证
- [ ] 输入超长技能名称
- [ ] 输入特殊字符
- [ ] 输入恶意代码（XSS测试）

## 浏览器兼容性测试

- [ ] Chrome（最新版本）
- [ ] Firefox（最新版本）
- [ ] Safari（最新版本）
- [ ] Edge（最新版本）
- [ ] 移动端Safari
- [ ] 移动端Chrome

## 测试完成标准

所有测试项目通过后，Skill功能即可上线使用。

## 报告问题

如发现问题，请记录：
1. 问题描述
2. 复现步骤
3. 预期结果
4. 实际结果
5. 浏览器和版本
6. 控制台错误信息
7. 后端日志（如适用）
