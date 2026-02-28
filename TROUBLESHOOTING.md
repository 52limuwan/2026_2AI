# 故障排除指南

## 当前问题

从错误日志看到两个主要问题：

### 1. 前端警告
```
[Vue warn]: Property "openSettings" was accessed during render but is not defined on instance.
```

### 2. API 404 错误
```
GET http://localhost:8888/api/client/settings 404 (Not Found)
PUT http://localhost:8888/api/client/settings 404 (Not Found)
```

## 解决步骤

### 步骤 1: 清除浏览器缓存并重新加载前端

前端代码已更新，但浏览器可能缓存了旧版本。

**方法 1: 硬刷新**
- Windows/Linux: `Ctrl + Shift + R` 或 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**方法 2: 清除缓存**
1. 打开浏览器开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

**方法 3: 重启前端开发服务器**
```bash
cd Unified
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 步骤 2: 重启后端服务器

后端路由已添加，但需要重启才能生效。

```bash
cd Backed
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 步骤 3: 验证功能

1. 完全关闭浏览器并重新打开
2. 登录到应用
3. 进入 AI 助手页面
4. 检查顶部是否有设置按钮（齿轮图标，在 skills 按钮左边）
5. 点击设置按钮
6. 应该打开设置对话框
7. 输入 WebSocket 地址（例如：`ws://localhost:8080`）
8. 点击保存

### 步骤 4: 检查控制台

打开浏览器开发者工具 (F12)，查看：

**应该看到：**
- 没有 Vue 警告
- API 请求成功 (200 OK)
- 保存成功的提示消息

**不应该看到：**
- `Property "openSettings" was accessed during render but is not defined`
- `404 (Not Found)` 错误

## 验证数据库

设置保存后，可以检查数据库：

```bash
cd Backed
sqlite3 data/app.db
```

```sql
-- 查看用户的 preferences
SELECT id, username, preferences FROM users WHERE role = 'client' LIMIT 1;
```

应该看到类似这样的输出：
```
1|client01|{"ws_url":"ws://localhost:8080"}
```

## 如果问题仍然存在

### 检查文件是否正确保存

1. **前端文件检查：**
   - `Unified/src/components/AppHeader.vue` - 应该有 `@settings` 事件
   - `Unified/src/components/SettingsDialog.vue` - 应该存在
   - `Unified/src/modules/client/Layout.vue` - 应该有 `openSettings` 函数
   - `Unified/src/modules/client/AIAssistant.vue` - 应该导入 `SettingsDialog`
   - `Unified/src/api/client.js` - 应该有 `getUserSettings` 和 `updateUserSettings`

2. **后端文件检查：**
   - `Backed/src/routes/client.js` - 应该有 `/settings` 路由

### 手动验证后端路由

```bash
cd Backed
grep -n "router.get('/settings'" src/routes/client.js
grep -n "router.put('/settings'" src/routes/client.js
```

应该看到行号输出，表示路由存在。

### 检查后端服务器日志

启动后端时，应该看到类似的输出：
```
Server running on port 8888
Database initialized
```

没有错误信息。

## 完整重启流程

如果以上都不行，执行完整重启：

```bash
# 1. 停止所有服务
# 前端: Ctrl+C
# 后端: Ctrl+C

# 2. 清理并重新安装依赖（如果需要）
cd Unified
rm -rf node_modules package-lock.json
npm install

cd ../Backed
rm -rf node_modules package-lock.json
npm install

# 3. 重新启动
cd Backed
npm run dev

# 在另一个终端
cd Unified
npm run dev

# 4. 完全关闭浏览器并重新打开
# 5. 清除浏览器缓存
# 6. 访问应用
```

## 联系支持

如果问题仍然存在，请提供：
1. 浏览器控制台的完整错误日志
2. 后端服务器的日志输出
3. 使用的浏览器和版本
4. Node.js 版本 (`node --version`)
