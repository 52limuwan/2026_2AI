# 2026_AI2

2026人工智能省赛

修改自 桂教通 比赛

## 📅 时间处理说明

本项目统一使用**北京时间（UTC+8）**作为标准时区。

### ✅ 内网环境完全支持

**重要**: 本系统的时间处理**完全不依赖网络**，完美适配内网环境！

#### 核心特性
- ✅ **零网络依赖** - 所有时间计算都在本地完成
- ✅ **无需NTP同步** - 不需要联网校时
- ✅ **自动时区适配** - 无论系统设置什么时区都能正确计算
- ⚠️ **仅需系统时间准确** - 可以手动设置

#### 工作原理
```
系统时间 → 计算UTC时间 → 加8小时 → 北京时间
```

无论服务器在UTC+8、UTC+0还是UTC-8时区，只要系统时间准确，都能正确计算北京时间！

#### 快速验证
```bash
# 运行内网环境测试（推荐）
node Backed/test-offline-timezone.js

# 预期结果：UTC 12:50 → 北京 20:50 ✅
```

### 当前时间
- **日期**: 2026年1月27日 星期二
- **时间**: 晚上21:00 (北京时间)

### 快速开始

#### 后端时间处理
```javascript
const { getLocalDateTimeString, getToday, getCurrentHour } = require('./src/utils/dateHelper');

// 获取当前北京时间
const now = getLocalDateTimeString();  // "2026-01-27 20:50:00"

// 获取今天日期
const today = getToday();  // "2026-01-27"

// 获取当前小时
const hour = getCurrentHour();  // 20
```

#### 前端时间处理
```javascript
import { formatDateTime, getRelativeTime, getFriendlyDate } from '@/utils/dateHelper';

// 格式化时间
const time = formatDateTime(order.created_at);  // "2026-01-27 20:50:00"

// 相对时间
const relative = getRelativeTime(message.timestamp);  // "5分钟前"

// 友好日期
const friendly = getFriendlyDate(plan.date);  // "今天" / "明天"
```

### 测试验证
```bash
# 运行时间测试
node Backed/test-timezone.js

# 运行内网环境测试
node Backed/test-offline-timezone.js

# 检查服务器健康状态
curl http://localhost:8000/health
```

### 📚 详细文档

#### 内网部署（必读）
- [内网部署指南](OFFLINE_DEPLOYMENT_GUIDE.md) - **内网环境完整部署说明**
- [快速检查卡](OFFLINE_QUICK_CHECK.md) - **5分钟快速验证**
- [内网就绪总结](OFFLINE_READY_SUMMARY.md) - 内网优化说明

#### 开发参考
- [时区处理指南](Backed/docs/TIMEZONE_GUIDE.md) - 完整的时区处理规范
- [快速参考](QUICK_TIME_REFERENCE.md) - 常用操作快速查询
- [修复总结](TIME_SYNC_SUMMARY.md) - 时间同步修复详情
- [检查清单](TIME_FIX_CHECKLIST.md) - 修复完成情况

---

## 项目结构

```
2026_AI2/
├── Backed/                 # 后端服务
│   ├── src/
│   │   ├── utils/
│   │   │   └── dateHelper.js    # 时间工具函数
│   │   ├── services/            # 业务服务
│   │   └── routes/              # API路由
│   ├── docs/
│   │   └── TIMEZONE_GUIDE.md    # 时区处理指南
│   └── test-timezone.js         # 时间测试脚本
│
├── Unified/                # 前端应用
│   └── src/
│       └── utils/
│           └── dateHelper.js    # 前端时间工具
│
└── 文档/
    ├── TIME_SYNC_SUMMARY.md     # 修复总结
    ├── QUICK_TIME_REFERENCE.md  # 快速参考
    └── TIME_FIX_CHECKLIST.md    # 检查清单
```