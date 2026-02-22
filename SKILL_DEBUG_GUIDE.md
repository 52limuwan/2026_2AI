# Skill创建功能调试指南

## 问题描述
创建自定义技能时返回 400 Bad Request 错误。

## 调试步骤

### 1. 检查前端发送的数据
打开浏览器控制台，尝试创建一个技能，查看以下日志：

```
[SkillManager] 准备创建技能, formData: {name: "...", content: "..."}
[API] 调用 createSkill, 数据: {name: "...", content: "..."}
[API] 数据类型: object
[API] 数据键: ["name", "content"]
[API] name值: "测试技能"
[API] content长度: 123
```

**检查点：**
- formData 是否包含 name 和 content
- name 是否为空字符串
- content 是否为空字符串

### 2. 检查后端接收的数据
查看后端控制台日志：

```
[SKILLS] 创建技能请求
  用户角色: client
  请求体: { name: '...', content: '...' }
  技能名称: 测试技能
  内容长度: 123字符
```

**检查点：**
- 请求体是否正确解析
- name 和 content 是否都存在
- 如果显示"错误: 缺少必要参数"，检查哪个参数缺失

### 3. 常见问题排查

#### 问题A: name 或 content 为空
**症状：** 后端日志显示 `name存在: false` 或 `content存在: false`

**原因：**
- 前端表单验证未通过但仍然提交
- formData 初始化错误
- 表单字段绑定错误

**解决方案：**
检查 SkillManager.vue 中的 formData 初始化：
```javascript
const formData = ref({
  name: '',
  content: ''
})
```

#### 问题B: 请求体未正确解析
**症状：** 后端日志显示 `请求体: {}`

**原因：**
- express.json() 中间件未正确配置
- Content-Type 头未设置为 application/json

**解决方案：**
检查 server.js 中的中间件配置：
```javascript
app.use(express.json({ limit: '10mb' }));
```

#### 问题C: 技能名称已存在
**症状：** 后端返回 "该技能名称已存在"

**原因：**
- 之前创建过同名技能
- 文件名冲突

**解决方案：**
1. 检查 `Backed/Skills/` 文件夹
2. 删除或重命名冲突的文件
3. 使用不同的技能名称

#### 问题D: 权限问题
**症状：** 文件写入失败

**原因：**
- Skills 文件夹权限不足
- 磁盘空间不足

**解决方案：**
```bash
# Windows
icacls "Backed\Skills" /grant Users:F

# Linux/Mac
chmod 755 Backed/Skills
```

### 4. 手动测试API

使用 curl 或 Postman 测试 API：

```bash
# 获取 token（先登录）
# 然后测试创建技能

curl -X POST http://localhost:8002/api/skills/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "测试技能",
    "content": "# 测试技能\n\n## 角色定位\n测试内容"
  }'
```

**预期响应（成功）：**
```json
{
  "code": 0,
  "message": "技能创建成功",
  "data": {
    "id": "custom-client-测试技能",
    "name": "测试技能",
    "fileName": "custom-client-测试技能.md"
  }
}
```

**预期响应（失败）：**
```json
{
  "code": 400,
  "message": "缺少必要参数"
}
```

### 5. 检查网络请求

在浏览器开发者工具的 Network 标签中：

1. 找到 `/api/skills/create` 请求
2. 查看 Request Headers：
   - Content-Type: application/json
   - Authorization: Bearer ...
3. 查看 Request Payload：
   ```json
   {
     "name": "技能名称",
     "content": "技能内容..."
   }
   ```
4. 查看 Response：
   - Status Code: 400
   - Response Body: 错误信息

### 6. 完整的调试日志示例

**成功的情况：**
```
前端:
[SkillManager] 准备创建技能, formData: {name: "测试", content: "# 测试\n..."}
[API] 调用 createSkill, 数据: {name: "测试", content: "# 测试\n..."}
[API] createSkill 响应: {data: {code: 0, message: "技能创建成功", ...}}

后端:
[SKILLS] 创建技能请求
  用户角色: client
  请求体: { name: '测试', content: '# 测试\n...' }
  技能名称: 测试
  内容长度: 50字符
  创建成功: custom-client-测试.md
```

**失败的情况：**
```
前端:
[SkillManager] 准备创建技能, formData: {name: "", content: "# 测试\n..."}
[API] 调用 createSkill, 数据: {name: "", content: "# 测试\n..."}
[API] createSkill 错误: AxiosError {...}
[API] 错误数据: {code: 400, message: "缺少必要参数"}

后端:
[SKILLS] 创建技能请求
  用户角色: client
  请求体: { name: '', content: '# 测试\n...' }
  技能名称: 
  内容长度: 50字符
  错误: 缺少必要参数
  name存在: false, content存在: true
```

## 快速修复建议

### 修复1: 确保表单数据正确
在 SkillManager.vue 的 showCreateDialog 函数中：

```javascript
const showCreateDialog = () => {
  dialogMode.value = 'create';
  currentSkill.value = null;
  formData.value = {
    name: '',  // 确保是空字符串，不是 undefined
    content: `# 技能名称

## 角色定位
描述AI的角色和职责

## 任务要求
具体的任务描述

## 输出内容
期望的输出内容

## 语气要求
对AI回复语气的要求`
  };
  dialogVisible.value = true;
};
```

### 修复2: 添加表单验证
确保表单规则正确：

```javascript
const formRules = {
  name: [
    { required: true, message: '请输入技能名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入技能内容', trigger: 'blur' },
    { min: 10, message: '内容至少10个字符', trigger: 'blur' }
  ]
};
```

### 修复3: 检查后端中间件顺序
在 server.js 中确保中间件顺序正确：

```javascript
// 1. 首先配置 body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. 然后配置其他中间件
app.use(cors());

// 3. 最后注册路由
app.use('/api/skills', require('./routes/skills'));
```

## 测试清单

- [ ] 前端日志显示 formData 包含 name 和 content
- [ ] name 不为空字符串
- [ ] content 不为空字符串
- [ ] 后端日志显示正确接收到请求体
- [ ] 后端日志显示 name 和 content 都存在
- [ ] Skills 文件夹有写入权限
- [ ] 没有同名技能文件存在
- [ ] 网络请求的 Content-Type 是 application/json
- [ ] Authorization token 正确

## 下一步

如果以上步骤都检查过了还是有问题，请提供：
1. 完整的前端控制台日志
2. 完整的后端控制台日志
3. Network 标签中的请求详情截图

---

更新时间: 2026-02-22
