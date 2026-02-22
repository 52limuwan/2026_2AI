# AI助手配置检查清单

## ✅ 配置步骤

### 1. 环境变量配置
- [ ] 在 `Backed/.env` 中添加 `DIFY_API_KEY`
- [ ] 在 `Backed/.env` 中添加 `DIFY_API_URL`（可选）
- [ ] 确认 API Key 格式正确（`app-` 开头）

### 2. 服务启动
- [ ] 重启后端服务
- [ ] 检查后端日志，确认没有配置错误

### 3. 功能测试

#### Client 端
- [ ] 登录 client 账号
- [ ] 打开 AI 助手
- [ ] 发送文字消息，验证 dify API 回复
- [ ] 点击电话按钮，验证语音通话（xiaozhi WebSocket）

#### Guardian 端
- [ ] 登录 guardian 账号
- [ ] 打开 AI 助手
- [ ] 发送文字消息，验证 dify API 回复
- [ ] 点击电话按钮，验证语音通话（xiaozhi WebSocket）

#### Gov 端
- [ ] 登录 gov 账号
- [ ] 打开 AI 助手
- [ ] 发送文字消息，验证 dify API 回复
- [ ] 点击电话按钮，验证语音通话（xiaozhi WebSocket）

### 4. 对话管理测试
- [ ] 创建新对话
- [ ] 切换对话
- [ ] 查看历史对话列表
- [ ] 验证消息保存到数据库

### 5. 错误处理测试
- [ ] 测试无效的 API Key（应显示错误提示）
- [ ] 测试网络超时（应显示超时提示）
- [ ] 测试空消息发送（应被阻止）

## 📝 配置文件

```
Backed/
  ├── .env                    # 需要配置
  ├── .env.example            # ✅ 已更新
  └── src/
      └── routes/
          └── ai.js           # ✅ 已更新

Unified/
  └── src/
      ├── api/
      │   └── ai.js           # ✅ 已更新
      └── modules/
          ├── client/
          │   └── AIAssistant.vue    # ✅ 已更新
          ├── guardian/
          │   └── AIAssistant.vue    # ✅ 已更新
          └── gov/
              └── AIAssistant.vue    # ✅ 已更新
```

## 🔧 环境变量示例

```env
# Dify API Configuration
DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxxxx
DIFY_API_URL=https://api.dify.ai/v1
```

## 📚 相关文档

- [DIFY_CONFIG_GUIDE.md](./DIFY_CONFIG_GUIDE.md) - Dify 配置指南
- [AI_UNIFIED_CONFIG_SUMMARY.md](./AI_UNIFIED_CONFIG_SUMMARY.md) - 配置总结
- [AI_ASSISTANT_API_CHANGES.md](./AI_ASSISTANT_API_CHANGES.md) - 详细修改说明

## ⚠️ 注意事项

1. 所有端共用同一个 `DIFY_API_KEY`
2. 不要将 `.env` 文件提交到版本控制
3. 语音通话使用 xiaozhi WebSocket，文字聊天使用 dify API
4. 用户ID会自动添加角色前缀（user_/guardian_/gov_）

## 🎉 完成

全部勾选后，配置完成！
