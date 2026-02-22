# Dify API 配置指南

## 环境变量配置

在 `Backed/.env` 文件中添加以下配置：

```env
# Dify API Configuration (所有端统一使用)
DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxxxx
DIFY_API_URL=https://api.dify.ai/v1
```

## 配置说明

### DIFY_API_KEY
- **必填项**
- 从 Dify 平台获取的 API Key
- 格式：`app-` 开头的字符串
- 所有端（client、guardian、gov）共用此配置

### DIFY_API_URL
- **可选项**
- 默认值：`https://api.dify.ai/v1`
- 如果使用自部署的 Dify 服务，修改为对应的 URL

## 获取 API Key 步骤

1. 访问 [Dify 平台](https://dify.ai)
2. 登录或注册账号
3. 创建一个新的应用或选择现有应用
4. 在应用设置中找到 "API Access" 或"API 访问"
5. 复制 API Key（格式：`app-xxxxxxxxxx`）
6. 粘贴到 `.env` 文件中

## 验证配置

配置完成后，可以通过以下方式验证：

1. 重启后端服务
2. 登录任意端（client/guardian/gov）
3. 打开 AI 助手
4. 发送一条测试消息
5. 检查是否收到 AI 回复

## 常见问题

### Q: API Key 配置错误会怎样？
A: 后端会返回 "AI 服务配置错误" 的提示，前端会显示 "发送失败，请稍后重试"

### Q: 不同端需要配置不同的 API Key 吗？
A: 不需要，所有端共用同一个 `DIFY_API_KEY`，通过用户ID前缀区分不同端的用户

### Q: 如何区分不同端的用户？
A: 系统会自动在用户ID前添加前缀：
- client端：`user_123`
- guardian端：`guardian_123`
- gov端：`gov_123`

### Q: 可以使用自部署的 Dify 吗？
A: 可以，修改 `DIFY_API_URL` 为自部署服务的地址即可

### Q: API 调用超时时间是多少？
A: 默认 30 秒，可以在后端代码中修改

## 安全建议

1. ⚠️ 不要将 `.env` 文件提交到版本控制
2. ⚠️ 不要在前端代码中暴露 API Key
3. ⚠️ 定期更换 API Key
4. ⚠️ 使用环境变量管理敏感信息

## 示例配置

```env
# 开发环境
DIFY_API_KEY=app-dev1234567890abcdef
DIFY_API_URL=https://api.dify.ai/v1

# 生产环境
DIFY_API_KEY=app-prod1234567890abcdef
DIFY_API_URL=https://api.dify.ai/v1

# 自部署环境
DIFY_API_KEY=app-self1234567890abcdef
DIFY_API_URL=https://your-dify-domain.com/v1
```

## 相关文档

- [AI_ASSISTANT_API_CHANGES.md](./AI_ASSISTANT_API_CHANGES.md) - 详细的修改说明
- [AI_UNIFIED_CONFIG_SUMMARY.md](./AI_UNIFIED_CONFIG_SUMMARY.md) - 配置总结
- [Dify 官方文档](https://docs.dify.ai/)
