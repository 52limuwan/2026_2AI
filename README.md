# 2026_AI2

2026人工智能省赛

修改自 桂教通 比赛

## 📅 时间处理说明

本项目统一使用**北京时间（UTC+8）**作为标准时区。

### 当前时间
- **日期**: 2026年1月27日 星期二
- **时间**: 晚上20:50 (北京时间)

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

# 检查服务器健康状态
curl http://localhost:8000/health
```

### 📚 详细文档
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