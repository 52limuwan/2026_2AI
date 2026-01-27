# 内网部署快速检查卡

## 🚀 5分钟快速验证

### 步骤1: 检查系统时间 (1分钟)

```bash
# Windows
Get-Date

# Linux
date
```

**检查项**:
- [ ] 日期正确（2026年1月27日）
- [ ] 时间准确（误差不超过1分钟）

如果时间不对：
```bash
# Windows
Set-Date -Date "2026-01-27 21:00:00"

# Linux
sudo date -s "2026-01-27 21:00:00"
```

---

### 步骤2: 运行测试脚本 (2分钟)

```bash
cd Backed
node test-offline-timezone.js
```

**检查项**:
- [ ] "北京时间计算测试" 显示正确时间
- [ ] "UTC转北京时间测试" 显示 `UTC 12:50 → 北京 20:50`
- [ ] "时间一致性验证" 显示 `✅ 正常`

---

### 步骤3: 启动服务 (1分钟)

```bash
# 后端
cd Backed
npm start

# 前端（新终端）
cd Unified
npm run dev
```

---

### 步骤4: 验证健康检查 (1分钟)

```bash
curl http://localhost:8000/health
```

**预期返回**:
```json
{
  "code": 0,
  "message": "ok",
  "timestamp": "2026-01-27 21:00:00",  ← 检查这个时间
  "timezone": "Asia/Shanghai (UTC+8)",
  "env": "development"
}
```

**检查项**:
- [ ] `timestamp` 与当前北京时间一致（误差不超过1分钟）
- [ ] `timezone` 显示 `Asia/Shanghai (UTC+8)`

---

## ✅ 全部通过？

恭喜！您的系统已经可以在内网环境正常运行了。

时间处理功能：
- ✅ 不需要网络连接
- ✅ 不需要NTP时间同步
- ✅ 自动适应任何时区设置
- ✅ 定时任务会在正确的北京时间触发

---

## ❌ 有问题？

### 问题1: 测试脚本显示时间不对

**原因**: 系统时间设置不正确

**解决**: 
```bash
# 手动设置正确的时间
Set-Date -Date "2026-01-27 21:00:00"  # Windows
sudo date -s "2026-01-27 21:00:00"    # Linux
```

### 问题2: 健康检查返回的时间不对

**原因**: 服务启动时系统时间不对，或代码有问题

**解决**:
1. 检查系统时间
2. 重启服务
3. 再次运行测试脚本

### 问题3: UTC转北京时间测试失败

**原因**: 代码版本不对

**解决**:
1. 确保使用最新版本的 `dateHelper.js`
2. 检查 `utcToBeijing` 函数是否正确

---

## 📞 需要帮助？

查看详细文档：
- [内网部署指南](OFFLINE_DEPLOYMENT_GUIDE.md) - 完整部署说明
- [时区处理指南](Backed/docs/TIMEZONE_GUIDE.md) - 技术细节
- [常见问题](OFFLINE_DEPLOYMENT_GUIDE.md#常见问题) - 问题排查

---

## 🔄 定期维护

建议每周检查一次：

```bash
# 1. 检查系统时间
date

# 2. 运行测试脚本
node Backed/test-offline-timezone.js

# 3. 检查健康接口
curl http://localhost:8000/health
```

如果发现时间偏差，及时调整系统时间。

---

*快速检查卡 v1.0 - 2026-01-27*
