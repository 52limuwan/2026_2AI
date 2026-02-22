# AI Skills 管理

本目录存储所有AI助手的技能提示词文件。

## 系统默认技能

### Client端
- `client-weekly.md` - 用户周报分析
- `client-monthly.md` - 用户月报分析

### Guardian端
- `guardian-weekly.md` - 家属周报分析
- `guardian-monthly.md` - 家属月报分析

### Merchant端
- `merchant-seasonal.md` - 节气菜品生成
- `merchant-purchase.md` - 智能采购计划

### Government端
- `gov-health-suggestion.md` - 健康建议生成

## 自定义技能

用户可以通过前端界面添加自定义技能，文件命名格式：
- `custom-{role}-{name}.md`

例如：`custom-client-fitness.md`

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
