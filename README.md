# 智膳伙伴 - 社区养老助餐服务平台

> 2026人工智能省赛项目 | 基于AI的智能营养管理系统

## � 项目简介

智膳伙伴是一个面向社区养老服务的智能助餐平台，通过AI技术为老年人提供个性化营养管理、健康监测和智能点餐服务。系统采用四端分离架构，包含销售端、监护人端、商户端和政府端，实现了从点餐、配送到营养分析的全流程数字化管理。

### 核心特色

- 🤖 **AI智能分析** - DeepSeek-V3驱动的营养分析和健康建议
- 🏥 **健康风险监测** - 自动检测营养异常并实时预警
- 📊 **多维度报告** - 周报/月报自动生成，可视化展示
- 🎯 **个性化推荐** - 基于健康状况的智能菜品推荐
- 🌿 **节气养生** - 24节气智能菜品生成
- 👨‍👩‍👧 **多角色协同** - 销售端、监护人、商户、政府四端联动
- 🔒 **数据安全** - JWT认证、速率限制、输入验证
- ⏰ **时区统一** - 完全离线的北京时间处理，适配内网环境

## 🏗️ 技术架构

### 后端技术栈
- **运行环境**: Node.js 18+
- **Web框架**: Express.js 4.18
- **数据库**: SQLite 3 (sql.js)
- **认证**: JWT (jsonwebtoken)
- **安全**: Helmet, bcryptjs, express-rate-limit
- **AI服务**: OpenAI API (DeepSeek-V3)
- **日志**: Winston
- **文件上传**: Multer
- **定时任务**: node-cron

### 前端技术栈
- **框架**: Vue 3.5 (Composition API)
- **构建工具**: Vite 5.4
- **状态管理**: Pinia 2.2
- **路由**: Vue Router 4.5
- **UI组件**: Element Plus 2.8
- **样式**: Tailwind CSS 3.4
- **图表**: ECharts 5.5
- **Markdown**: Marked 16.4
- **HTTP**: Axios 1.7

### 开发工具
- **包管理**: npm / pnpm
- **代码规范**: ESLint
- **版本控制**: Git

## 📁 项目结构

```
2026_AI2/
├── Backed/                          # 后端服务
│   ├── data/                        # 数据库文件
│   │   └── app.db                   # SQLite数据库
│   ├── docs/                        # 后端文档
│   │   ├── AI_PURCHASE_PLAN.md      # AI采购计划文档
│   │   └── TIMEZONE_GUIDE.md        # 时区处理指南
│   ├── logs/                        # 日志文件
│   │   ├── app.log                  # 应用日志
│   │   └── error.log                # 错误日志
│   ├── src/                         # 源代码
│   │   ├── config/                  # 配置管理
│   │   │   └── index.js             # 统一配置入口
│   │   ├── db/                      # 数据库
│   │   │   ├── index.js             # 数据库连接
│   │   │   ├── pool.js              # 连接池管理
│   │   │   ├── schema.js            # 数据库模式定义
│   │   │   └── add-indexes.js       # 索引优化
│   │   ├── middleware/              # 中间件
│   │   │   ├── auth.js              # JWT认证中间件
│   │   │   ├── errorHandler.js      # 错误处理中间件
│   │   │   ├── rateLimiter.js       # 速率限制中间件
│   │   │   └── validator.js         # 输入验证中间件
│   │   ├── routes/                  # API路由
│   │   │   ├── auth.js              # 认证路由
│   │   │   ├── client.js            # 销售端路由
│   │   │   ├── guardian.js          # 监护人路由
│   │   │   ├── merchant.js          # 商户路由
│   │   │   ├── gov.js               # 政府端路由
│   │   │   ├── notifications.js     # 通知路由
│   │   │   ├── reports.js           # 报告路由
│   │   │   └── ai.js                # AI服务路由
│   │   ├── services/                # 业务服务
│   │   │   ├── aiService.js         # AI服务(营养分析/采购计划/节气菜品)
│   │   │   ├── orders.js            # 订单服务
│   │   │   ├── riskDetectionScheduler.js  # 风险检测定时任务
│   │   │   └── scheduler.js         # 通知定时任务
│   │   ├── utils/                   # 工具函数
│   │   │   ├── dateHelper.js        # 时间处理工具(北京时间)
│   │   │   ├── logger.js            # 日志工具
│   │   │   ├── respond.js           # 响应格式化
│   │   │   ├── security.js          # 安全工具(JWT/密码)
│   │   │   ├── query-profiler.js    # SQL性能分析
│   │   │   └── image-optimizer.js   # 图片优化
│   │   └── server.js                # 服务器入口
│   ├── scripts/                     # 脚本工具
│   │   ├── addDishesFromList.js     # 批量添加菜品
│   │   ├── addStoresForMerchant01.js # 添加店面
│   │   ├── checkDishes.js           # 检查菜品数据
│   │   ├── debugNutrition.js        # 调试营养数据
│   │   ├── deltoday.js              # 删除今日数据
│   │   ├── generateHistoryOrders.js # 生成历史订单
│   │   └── migrateFromMongo.js      # MongoDB迁移
│   ├── uploads/                     # 上传文件目录
│   ├── .env                         # 环境变量配置
│   ├── .env.example                 # 环境变量示例
│   ├── .gitignore                   # Git忽略文件
│   ├── .dockerignore                # Docker忽略文件
│   ├── package.json                 # 依赖配置
│   ├── test-timezone.js             # 时区测试脚本
│   └── test-offline-timezone.js     # 离线时区测试
│
├── Unified/                         # 前端应用
│   ├── docs/                        # 前端文档
│   │   ├── design-system.md         # 设计系统
│   │   ├── image-optimization.md    # 图片优化
│   │   └── nutrition-score-algorithm.md  # 营养评分算法
│   ├── public/                      # 静态资源
│   │   ├── audio-processor.js       # 音频处理
│   │   └── libopus.js               # Opus编解码
│   ├── src/                         # 源代码
│   │   ├── api/                     # API接口
│   │   │   ├── client.js            # HTTP客户端
│   │   │   ├── http.js              # HTTP封装
│   │   │   ├── auth.js              # 认证API
│   │   │   ├── ai.js                # AI API
│   │   │   ├── merchant.js          # 商户API
│   │   │   ├── guardian.js          # 监护人API
│   │   │   ├── gov.js               # 政府API
│   │   │   └── notifications.js     # 通知API
│   │   ├── components/              # 公共组件
│   │   │   ├── AppHeader.vue        # 应用头部
│   │   │   ├── BottomSheet.vue      # 底部弹窗
│   │   │   ├── BottomTabBar.vue     # 底部导航栏
│   │   │   ├── StickyActionBar.vue  # 粘性操作栏
│   │   │   └── VirtualList.vue      # 虚拟列表
│   │   ├── config/                  # 配置
│   │   │   └── index.js             # 统一配置
│   │   ├── modules/                 # 功能模块
│   │   │   ├── client/              # 销售端模块
│   │   │   │   ├── Layout.vue       # 布局组件
│   │   │   │   ├── Home.vue         # 首页
│   │   │   │   ├── Menu.vue         # 点餐页
│   │   │   │   ├── Orders.vue       # 订单列表
│   │   │   │   ├── OrderStatus.vue  # 订单状态
│   │   │   │   ├── AIAssistant.vue  # AI助手
│   │   │   │   ├── Reports.vue      # 营养报告
│   │   │   │   ├── AiReports.vue    # AI报告列表
│   │   │   │   ├── AiReportDetail.vue # AI报告详情
│   │   │   │   ├── Notifications.vue # 通知中心
│   │   │   │   └── Profile.vue      # 个人中心
│   │   │   ├── guardian/            # 监护人端模块
│   │   │   │   ├── Layout.vue
│   │   │   │   ├── Home.vue         # 首页(守护对象列表)
│   │   │   │   ├── Orders.vue       # 订单管理
│   │   │   │   ├── Reports.vue      # 营养报告
│   │   │   │   ├── AiReports.vue    # AI报告列表
│   │   │   │   ├── AiReportDetail.vue
│   │   │   │   ├── AIAssistant.vue  # AI助手
│   │   │   │   ├── ClientProfile.vue # 守护对象档案
│   │   │   │   ├── Notifications.vue
│   │   │   │   └── Profile.vue
│   │   │   ├── merchant/            # 商户端模块
│   │   │   │   ├── Layout.vue
│   │   │   │   ├── Dashboard.vue    # 数据看板
│   │   │   │   ├── Dishes.vue       # 菜品管理
│   │   │   │   ├── Orders.vue       # 订单管理
│   │   │   │   ├── PurchasePlan.vue # 采购计划
│   │   │   │   ├── SolarTips.vue    # 节气建议
│   │   │   │   ├── Notifications.vue
│   │   │   │   └── Profile.vue      # 店铺中心
│   │   │   └── gov/                 # 政府端模块
│   │   │       ├── Layout.vue
│   │   │       ├── Residents.vue    # 居民列表
│   │   │       ├── ClientDetail.vue # 居民详情
│   │   │       ├── Summary.vue      # 数据汇总
│   │   │       ├── Suggest.vue      # 健康建议
│   │   │       ├── AIAssistant.vue  # AI助手
│   │   │       ├── Notifications.vue
│   │   │       └── Profile.vue
│   │   ├── router/                  # 路由配置
│   │   │   └── index.js             # 路由定义
│   │   ├── stores/                  # 状态管理
│   │   │   ├── user.js              # 用户状态
│   │   │   ├── ui.js                # UI状态
│   │   │   └── notifications.js     # 通知状态
│   │   ├── utils/                   # 工具函数
│   │   │   ├── dateHelper.js        # 时间处理(北京时间)
│   │   │   ├── cache.js             # 缓存管理
│   │   │   ├── performance.js       # 性能监控
│   │   │   ├── request.js           # 请求封装
│   │   │   ├── toast.js             # 提示工具
│   │   │   ├── opus-encoder.js      # 音频编码
│   │   │   └── xiaozhi-websocket.js # WebSocket
│   │   ├── views/                   # 视图页面
│   │   │   └── Login.vue            # 登录页
│   │   ├── App.vue                  # 根组件
│   │   ├── main.js                  # 应用入口
│   │   ├── style.css                # 全局样式
│   │   ├── auto-imports.d.ts        # 自动导入类型
│   │   └── components.d.ts          # 组件类型
│   ├── .env                         # 环境变量
│   ├── .env.example                 # 环境变量示例
│   ├── .env.production.example      # 生产环境示例
│   ├── .gitignore
│   ├── index.html                   # HTML入口
│   ├── package.json
│   ├── postcss.config.js            # PostCSS配置
│   ├── tailwind.config.js           # Tailwind配置
│   ├── vite.config.js               # Vite配置
│   ├── pnpm-lock.yaml
│   └── SKILL_IMPLEMENTATION_GUIDE.md # 技能实现指南
│
└── README.md                        # 项目说明文档
```

## 🗄️ 数据库设计

### 核心数据表

#### 1. 用户相关表

**users** - 用户基础表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,        -- 用户名
  password TEXT NOT NULL,                -- 密码(bcrypt加密)
  name TEXT NOT NULL,                    -- 姓名
  role TEXT NOT NULL,                    -- 角色: client/guardian/merchant/gov
  email TEXT,                            -- 邮箱
  phone TEXT,                            -- 手机号
  id_card TEXT,                          -- 身份证号
  id_verified INTEGER DEFAULT 1,        -- 身份认证状态
  community_id INTEGER,                  -- 所属社区ID
  community_code TEXT,                   -- 社区编码
  avatar TEXT,                           -- 头像URL
  locale TEXT DEFAULT 'zh-CN',          -- 语言
  preferences TEXT,                      -- 偏好设置(JSON)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**client_profiles** - 销售端用户档案
```sql
CREATE TABLE client_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,      -- 关联users.id
  age INTEGER,                           -- 年龄
  gender TEXT,                           -- 性别: male/female
  address TEXT,                          -- 地址
  chronic_conditions TEXT,               -- 慢性病
  taste_preferences TEXT,                -- 口味偏好
  restrictions TEXT,                     -- 饮食限制(JSON)
  elder_mode INTEGER DEFAULT 0,         -- 长辈模式
  guardian_contact TEXT,                 -- 监护人联系方式
  risk_flags TEXT,                       -- 风险标记
  is_member INTEGER DEFAULT 0,          -- 会员状态
  health_conditions TEXT,                -- 健康状况
  diet_preferences TEXT,                 -- 饮食偏好(JSON)
  notification_settings TEXT,            -- 通知设置(JSON)
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**guardian_profiles** - 监护人档案
```sql
CREATE TABLE guardian_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  relationship TEXT,                     -- 关系
  address TEXT,                          -- 地址
  notification_channel TEXT,             -- 通知渠道
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**guardian_client_links** - 监护关系表
```sql
CREATE TABLE guardian_client_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guardian_id INTEGER NOT NULL,         -- 监护人ID
  client_id INTEGER NOT NULL,           -- 被监护人ID
  relation TEXT,                         -- 关系描述
  bind_id_card TEXT,                     -- 绑定身份证
  bind_phone TEXT,                       -- 绑定手机号
  status TEXT DEFAULT 'active',         -- 状态: active/inactive
  verified_at TEXT,                      -- 验证时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guardian_id, client_id)
);
```

**merchant_profiles** - 商户档案
```sql
CREATE TABLE merchant_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  merchant_name TEXT NOT NULL,          -- 商户名称
  community TEXT,                        -- 服务社区
  contact TEXT,                          -- 联系方式
  current_store_id INTEGER,             -- 当前选择的店面ID
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**gov_profiles** - 政府端用户档案
```sql
CREATE TABLE gov_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  region TEXT,                           -- 管辖区域
  department TEXT,                       -- 部门
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. 社区与店面

**communities** - 社区表
```sql
CREATE TABLE communities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,            -- 社区编码
  name TEXT NOT NULL,                    -- 社区名称
  region TEXT,                           -- 所属区域
  status TEXT DEFAULT 'active',         -- 状态
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**stores** - 店面表
```sql
CREATE TABLE stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,         -- 商户ID
  community_id INTEGER,                  -- 所属社区ID
  name TEXT NOT NULL,                    -- 店面名称
  location TEXT,                         -- 位置
  description TEXT,                      -- 描述
  distance TEXT,                         -- 距离
  tags TEXT,                             -- 标签(逗号分隔)
  status TEXT DEFAULT 'active',         -- 状态
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**gov_scopes** - 政府管辖范围
```sql
CREATE TABLE gov_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gov_user_id INTEGER NOT NULL,        -- 政府用户ID
  community_id INTEGER NOT NULL,        -- 社区ID
  role_in_scope TEXT,                   -- 角色
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gov_user_id, community_id)
);
```

#### 3. 菜品与订单

**dishes** - 菜品表
```sql
CREATE TABLE dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,                   -- 商户ID
  store_id INTEGER,                      -- 店面ID
  name TEXT NOT NULL,                    -- 菜品名称
  category TEXT,                         -- 分类
  price REAL NOT NULL,                   -- 价格
  member_price REAL,                     -- 会员价
  cost REAL DEFAULT 0,                   -- 成本
  status TEXT DEFAULT 'available',      -- 状态: available/offline
  stock INTEGER DEFAULT 0,               -- 库存
  image TEXT,                            -- 图片URL
  tags TEXT,                             -- 标签(逗号分隔)
  nutrition TEXT,                        -- 营养信息(JSON)
  description TEXT,                      -- 描述
  seasonal_tip TEXT,                     -- 节气提示
  monthly_sales INTEGER DEFAULT 0,      -- 月销量
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**orders** - 订单表
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,    -- 订单号
  client_id INTEGER,                     -- 客户ID
  guardian_id INTEGER,                   -- 监护人ID
  merchant_id INTEGER,                   -- 商户ID
  store_id INTEGER,                      -- 店面ID
  community_id INTEGER,                  -- 社区ID
  community_code TEXT,                   -- 社区编码
  community_name TEXT,                   -- 社区名称
  window_name TEXT,                      -- 窗口名称
  total_amount REAL DEFAULT 0,          -- 总金额
  status TEXT DEFAULT 'placed',         -- 状态: placed/preparing/delivering/delivered/cancelled
  payment_status TEXT DEFAULT 'pending', -- 支付状态
  payment_method TEXT,                   -- 支付方式
  scheduled_at TEXT,                     -- 预约时间
  delivered_at TEXT,                     -- 送达时间
  address TEXT,                          -- 配送地址
  contact TEXT,                          -- 联系方式
  remark TEXT,                           -- 备注
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**order_items** - 订单项表
```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,            -- 订单ID
  dish_id INTEGER,                       -- 菜品ID
  dish_name TEXT,                        -- 菜品名称
  quantity INTEGER NOT NULL,             -- 数量
  price REAL NOT NULL,                   -- 单价
  nutrition TEXT                         -- 营养信息(JSON)
);
```

#### 4. 营养与报告

**nutrition_intake_daily** - 每日营养摄入记录
```sql
CREATE TABLE nutrition_intake_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,           -- 客户ID
  date TEXT NOT NULL,                    -- 日期(YYYY-MM-DD)
  totals TEXT,                           -- 营养总计(JSON)
  source TEXT,                           -- 数据来源: order/manual
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, date)
);
```

**nutrition_reports** - 营养报告表
```sql
CREATE TABLE nutrition_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,                     -- 客户ID
  type TEXT NOT NULL,                    -- 类型: week/month
  period_start TEXT,                     -- 周期开始
  period_end TEXT,                       -- 周期结束
  summary TEXT,                          -- 摘要(JSON)
  recommendations TEXT,                  -- 建议
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**ai_diet_reports** - AI饮食报告表
```sql
CREATE TABLE ai_diet_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,           -- 客户ID
  report_type TEXT NOT NULL,            -- 类型: weekly/monthly
  period_start TEXT NOT NULL,           -- 周期开始
  period_end TEXT NOT NULL,             -- 周期结束
  nutrition_data TEXT NOT NULL,         -- 营养数据(JSON)
  ai_analysis TEXT NOT NULL,            -- AI分析内容
  model_used TEXT,                       -- 使用的模型
  tokens_used INTEGER,                   -- Token消耗
  generated_by_role TEXT DEFAULT 'client', -- 生成角色
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**dietary_records** - 饮食记录表
```sql
CREATE TABLE dietary_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,           -- 客户ID
  food_name TEXT NOT NULL,              -- 食物名称
  meal_type TEXT,                        -- 餐次: breakfast/lunch/dinner/snack
  record_date TEXT NOT NULL,            -- 记录日期
  quantity REAL DEFAULT 1,              -- 数量
  unit TEXT DEFAULT '份',               -- 单位
  nutrition TEXT,                        -- 营养信息(JSON)
  notes TEXT,                            -- 备注
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. 风险监测

**risk_rules** - 风险规则表
```sql
CREATE TABLE risk_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,            -- 规则代码
  name TEXT NOT NULL,                    -- 规则名称
  severity TEXT DEFAULT 'medium',       -- 严重程度: low/medium/high
  condition_json TEXT,                   -- 条件(JSON)
  enabled INTEGER DEFAULT 1,            -- 是否启用
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**risk_events** - 风险事件表
```sql
CREATE TABLE risk_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,           -- 客户ID
  community_id INTEGER,                  -- 社区ID
  rule_id INTEGER,                       -- 规则ID
  status TEXT DEFAULT 'open',           -- 状态: open/handled/closed
  triggered_at TEXT NOT NULL,           -- 触发时间
  data_snapshot TEXT,                    -- 数据快照(JSON)
  assigned_gov_user_id INTEGER,        -- 分配的政府用户ID
  handled_at TEXT,                       -- 处理时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**interventions** - 干预记录表
```sql
CREATE TABLE interventions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_event_id INTEGER NOT NULL,       -- 风险事件ID
  gov_user_id INTEGER,                   -- 政府用户ID
  suggestion TEXT,                       -- 建议
  action_plan TEXT,                      -- 行动计划
  status TEXT DEFAULT 'sent',           -- 状态: sent/ack/done
  notified_at TEXT,                      -- 通知时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. 通知与消息

**notifications** - 通知表
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                       -- 用户ID
  role TEXT,                             -- 角色
  title TEXT NOT NULL,                   -- 标题
  content TEXT NOT NULL,                 -- 内容
  event_type TEXT,                       -- 事件类型
  related_id INTEGER,                    -- 关联ID
  severity TEXT,                         -- 严重程度
  channel TEXT DEFAULT 'in_app',        -- 渠道: in_app/sms/email
  status TEXT DEFAULT 'unread',         -- 状态: unread/read
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**ai_chat_messages** - AI聊天消息表
```sql
CREATE TABLE ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,             -- 用户ID
  target_client_id INTEGER,             -- 目标客户ID(监护人/政府端使用)
  conversation_id TEXT,                  -- 会话ID
  role TEXT NOT NULL,                    -- 角色: user/ai
  content TEXT NOT NULL,                 -- 内容
  context TEXT,                          -- 上下文(JSON)
  timestamp INTEGER NOT NULL,            -- 时间戳
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. 其他功能表

**purchase_plans** - 采购计划表
```sql
CREATE TABLE purchase_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,                   -- 商户ID
  plan_date TEXT NOT NULL,              -- 计划日期
  items TEXT,                            -- 采购项目(JSON)
  notes TEXT,                            -- 备注
  status TEXT DEFAULT 'pending',        -- 状态: pending/completed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**solar_terms_tips** - 节气提示表
```sql
CREATE TABLE solar_terms_tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,                    -- 节气名称
  tip TEXT NOT NULL,                     -- 提示内容
  actions TEXT,                          -- 行动建议(JSON)
  applicable_roles TEXT,                 -- 适用角色
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 数据库索引

为提升查询性能，系统创建了以下索引：

```sql
-- 用户相关索引
CREATE INDEX idx_users_community_id ON users(community_id);
CREATE INDEX idx_gov_scopes_gov_user_id ON gov_scopes(gov_user_id);
CREATE INDEX idx_gov_scopes_community_id ON gov_scopes(community_id);

-- 订单相关索引
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_community_id ON orders(community_id);
CREATE INDEX idx_stores_merchant_id ON stores(merchant_id);
CREATE INDEX idx_dishes_store_id ON dishes(store_id);

-- 营养相关索引
CREATE INDEX idx_nutrition_intake_daily_client_date ON nutrition_intake_daily(client_id, date);
CREATE INDEX idx_dietary_records_client_id ON dietary_records(client_id);
CREATE INDEX idx_dietary_records_date ON dietary_records(record_date);
CREATE INDEX idx_ai_diet_reports_client_id ON ai_diet_reports(client_id);
CREATE INDEX idx_ai_diet_reports_type_date ON ai_diet_reports(report_type, created_at);

-- 风险监测索引
CREATE INDEX idx_risk_events_client_id ON risk_events(client_id);
CREATE INDEX idx_risk_events_community_id ON risk_events(community_id);

-- AI聊天索引
CREATE INDEX idx_ai_chat_user_id ON ai_chat_messages(user_id);
CREATE INDEX idx_ai_chat_target_client_id ON ai_chat_messages(target_client_id);
CREATE INDEX idx_ai_chat_conversation_id ON ai_chat_messages(conversation_id);
CREATE INDEX idx_ai_chat_timestamp ON ai_chat_messages(timestamp);
```

## 🔌 API接口文档

### 认证接口 (`/api/auth`)

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "identifier": "user001",
  "password": "Password123",
  "role": "client",
  "idCard": "110101199001011234",
  "communityId": 1
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "user001",
  "password": "Password123",
  "rememberMe": true
}
```

#### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 销售端接口 (`/api/client`)

#### 获取推荐菜单
```http
GET /api/client/recommendations/menu?store_id=1
Authorization: Bearer <token>
```

#### 创建订单
```http
POST /api/client/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "dish_id": 1,
      "dish_name": "宫保鸡丁",
      "quantity": 2,
      "price": 18.00,
      "nutrition": {...}
    }
  ],
  "store_id": 1,
  "address": "XX社区XX号楼XX室",
  "contact": "13800138000",
  "remark": "少辣"
}
```

#### 获取今日营养摄入
```http
GET /api/client/nutrition/today
Authorization: Bearer <token>
```

#### 获取周报
```http
GET /api/client/reports/weekly
Authorization: Bearer <token>
```

#### 获取月报
```http
GET /api/client/reports/monthly
Authorization: Bearer <token>
```

### 监护人接口 (`/api/guardian`)

#### 获取守护对象列表
```http
GET /api/guardian/clients
Authorization: Bearer <token>
```

#### 绑定守护对象
```http
POST /api/guardian/bind-client
Authorization: Bearer <token>
Content-Type: application/json

{
  "idCard": "110101199001011234",
  "phone": "13800138000",
  "relation": "子女"
}
```

#### 获取守护对象订单
```http
GET /api/guardian/clients/:clientId/orders
Authorization: Bearer <token>
```

#### 获取守护对象营养报告
```http
GET /api/guardian/clients/:clientId/reports/weekly
Authorization: Bearer <token>
```

### 商户接口 (`/api/merchant`)

#### 获取数据看板
```http
GET /api/merchant/dashboard
Authorization: Bearer <token>
```

#### 菜品管理
```http
# 获取菜品列表
GET /api/merchant/dishes
Authorization: Bearer <token>

# 创建菜品
POST /api/merchant/dishes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "宫保鸡丁",
  "price": 18.00,
  "member_price": 16.00,
  "stock": 50,
  "category": "荤菜",
  "description": "经典川菜",
  "nutrition": {
    "calories": 350,
    "protein": 20,
    "fat": 12,
    "carbs": 45,
    "fiber": 5
  },
  "image": "/uploads/dish-xxx.jpg"
}

# 更新菜品
PUT /api/merchant/dishes/:id
Authorization: Bearer <token>

# 删除菜品
DELETE /api/merchant/dishes/:id
Authorization: Bearer <token>
```

#### 订单管理
```http
# 获取订单列表
GET /api/merchant/orders?page=1&page_size=50&status=placed
Authorization: Bearer <token>

# 更新订单状态
PATCH /api/merchant/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "preparing"
}
```

#### AI生成采购计划
```http
POST /api/merchant/purchase-plan/generate
Authorization: Bearer <token>
```

#### AI生成节气菜品
```http
POST /api/merchant/dishes/generate-seasonal
Authorization: Bearer <token>
```

#### 店面管理
```http
# 获取店面列表
GET /api/merchant/stores
Authorization: Bearer <token>

# 创建店面
POST /api/merchant/stores
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "XX社区店",
  "location": "XX路XX号",
  "description": "社区便民店",
  "community_id": 1
}

# 切换当前店面
PATCH /api/merchant/stores/:id/switch
Authorization: Bearer <token>
```

### 政府端接口 (`/api/gov`)

#### 获取首页概览
```http
GET /api/gov/dashboard?community_id=1
Authorization: Bearer <token>
```

#### 获取居民列表
```http
GET /api/gov/clients?keyword=张三
Authorization: Bearer <token>
```

#### 获取居民详情
```http
GET /api/gov/clients/:id?days=7
Authorization: Bearer <token>
```

#### 更新居民档案
```http
PUT /api/gov/clients/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "XX社区XX号楼",
  "chronic_conditions": "高血压",
  "risk_flags": "营养摄入不足"
}
```

#### 处理风险事件
```http
PATCH /api/gov/risk-events/:id/resolve
Authorization: Bearer <token>
```

#### 人工风险干预
```http
POST /api/gov/risk-intervention
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": 1,
  "content": "您近期营养摄入不足，建议增加蛋白质摄入",
  "actionPlan": "每日增加一份鱼肉或豆制品",
  "severity": "medium"
}
```

#### 获取数据统计
```http
GET /api/gov/data/statistics?community_id=1&type=overview
Authorization: Bearer <token>
```

### AI服务接口 (`/api/ai`)

#### AI聊天
```http
POST /api/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "我今天吃什么比较健康？",
  "conversationId": "conv-xxx",
  "targetClientId": 1  // 可选，监护人/政府端使用
}
```

#### 生成AI饮食报告
```http
POST /api/ai/generate-diet-report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "weekly",  // weekly/monthly
  "targetClientId": 1      // 可选，监护人/政府端使用
}
```

#### 获取AI报告列表
```http
GET /api/ai/diet-reports?targetClientId=1
Authorization: Bearer <token>
```

#### 获取AI报告详情
```http
GET /api/ai/diet-reports/:id
Authorization: Bearer <token>
```

### 通知接口 (`/api/notifications`)

#### 获取通知列表
```http
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>
```

#### 标记通知已读
```http
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

#### 标记全部已读
```http
POST /api/notifications/read-all
Authorization: Bearer <token>
```

### 健康检查
```http
GET /health

Response:
{
  "code": 0,
  "message": "ok",
  "timestamp": "2026-01-27 20:50:00",
  "timezone": "Asia/Shanghai (UTC+8)",
  "env": "development"
}
```

## 🤖 AI核心功能

### 1. AI营养分析报告

系统使用 DeepSeek-V3 模型为用户生成个性化的营养分析报告。

**功能特点**:
- 支持周报和月报两种类型
- 基于实际营养摄入数据分析
- 提供具体可行的改善建议
- 支持不同角色(销售端/监护人端)的差异化提示词

**实现流程**:
1. 收集用户指定周期内的营养数据
2. 计算各营养素的平均值和总量
3. 调用AI服务生成分析报告
4. 保存报告到数据库
5. 返回报告内容和Token消耗统计

**核心代码** (`Backed/src/services/aiService.js`):
```javascript
async function generateDietAnalysis(nutritionData, period = '本周', role = 'client') {
  // 根据角色选择不同的API配置
  const prefix = role === 'guardian' ? 'GUARDIAN_' : 'CLIENT_';
  const apiKey = process.env[`${prefix}OPENAI_API_KEY`];
  const model = process.env[`${prefix}OPENAI_MODEL`] || 'deepseek-ai/DeepSeek-V3';
  
  // 构建提示词
  const systemPrompt = process.env[`${prefix}AI_SYSTEM_PROMPT`];
  const userPrompt = buildUserPrompt(nutritionData, period);
  
  // 调用AI API
  const response = await axios.post(apiUrl, {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 800
  });
  
  return {
    analysis: response.data.choices[0].message.content,
    tokensUsed: response.data.usage.total_tokens,
    model
  };
}
```

**备用方案**:
当AI API调用失败时，系统会自动使用基于规则的备用分析算法，确保服务可用性。

### 2. AI智能采购计划

商户可以使用AI自动生成采购计划，系统会分析近7天的订单数据和菜品销量。

**功能特点**:
- 分析订单趋势和菜品销量
- 考虑现有库存情况
- 预测明天需求量
- 自动预留20%安全库存
- 优先采购热销菜品食材

**生成逻辑**:
1. 统计近7天订单总数和日均订单
2. 获取所有菜品及其销量数据
3. 识别热销菜品(销量>0)
4. 调用AI分析并生成采购清单
5. 每项包含: 食材名称、数量、单位、采购原因

**核心代码**:
```javascript
async function generatePurchasePlan(orderData, dishes) {
  // 构建菜品销售数据
  const dishSalesData = dishes
    .filter(d => d.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 15)
    .map(d => `${d.name} - 近7天销量:${d.sales}份 库存:${d.stock}份`)
    .join('\n');
  
  // 调用AI生成采购计划
  const response = await callAI({
    orderStats: orderData,
    dishSalesData
  });
  
  return {
    items: response.items,  // 采购项目列表
    notes: response.notes,  // 采购备注
    tokensUsed: response.tokensUsed
  };
}
```

**备用算法**:
```javascript
function generateFallbackPurchasePlan(dishes) {
  const items = [];
  
  // 根据热销菜品提取食材
  for (const dish of dishes.filter(d => d.sales > 0)) {
    const ingredients = extractIngredients(dish.name);
    const quantity = Math.ceil(dish.sales * 1.2 * 2); // 销量 × 1.2 × 2天
    
    items.push({
      name: ingredients[0],
      quantity: quantity.toString(),
      unit: '斤',
      reason: `${dish.name}主料，近7天销量${dish.sales}份`
    });
  }
  
  return { items };
}
```

### 3. AI节气菜品生成

系统可以根据当前节气自动生成适合老年人的养生菜品。

**功能特点**:
- 自动识别当前节气(24节气)
- 生成符合节气特点的菜品
- 适合老年人食用(易消化、营养丰富)
- 提供完整的营养信息
- 可选生成菜品图片(文生图)

**节气识别算法**:
```javascript
function getCurrentSolarTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // 24节气对应的公历日期范围
  const solarTerms = [
    { name: '小寒', month: 1, startDay: 5, endDay: 19, season: '冬' },
    { name: '大寒', month: 1, startDay: 20, endDay: 31, season: '冬' },
    { name: '立春', month: 2, startDay: 3, endDay: 17, season: '春' },
    // ... 其他节气
  ];
  
  for (const term of solarTerms) {
    if (month === term.month && day >= term.startDay && day <= term.endDay) {
      return term.name;
    }
  }
  
  return '立春';
}
```

**生成流程**:
1. 识别当前节气
2. 构建节气特点提示词
3. 调用AI生成5道菜品
4. 解析JSON响应
5. 可选: 为每道菜品生成图片
6. 返回菜品列表

### 4. AI健康建议(政府端)

政府端可以为居民生成个性化的健康管理建议。

**功能特点**:
- 分析居民健康数据和饮食情况
- 识别风险因素
- 提供专业的健康建议
- 制定下一步行动计划

**分析维度**:
- 年龄、性别、慢性病情况
- 近期营养摄入数据(7天平均)
- 风险标记
- 口味偏好

**生成内容**:
1. 风险提醒/优化建议(150字以内)
2. 下一步健康管理建议(100字以内)

### 5. AI聊天助手

四端都配备了AI聊天助手，可以回答用户的健康和营养问题。

**功能特点**:
- 支持多轮对话
- 上下文记忆
- 角色差异化(销售端/监护人/商户/政府)
- 实时流式响应(SSE)

**实现方式**:
```javascript
// 前端使用SSE接收流式响应
const eventSource = new EventSource(`/api/ai/chat-stream?message=${message}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'content') {
    // 追加内容
    aiResponse += data.content;
  } else if (data.type === 'done') {
    // 完成
    eventSource.close();
  }
};
```

## 🔐 安全机制

### 1. 认证与授权

**JWT认证**:
- 使用bcrypt加密密码(10轮)
- JWT Token有效期7天
- 支持记住我功能(30天)
- Token包含用户ID和角色信息

**角色权限**:
```javascript
// 角色枚举
const ROLES = ['client', 'guardian', 'merchant', 'gov'];

// 权限中间件
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return failure(res, '无权限访问', 403);
    }
    next();
  };
}
```

### 2. 速率限制

**全局限制**:
- 时间窗口: 15分钟
- 最大请求数: 100次
- 超出限制返回429状态码

**实现**:
```javascript
const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 100,                   // 最多100次请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', generalLimiter);
```

### 3. 输入验证

使用 `express-validator` 进行系统的输入验证:

```javascript
// 注册验证
const registerValidation = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('账号不能为空')
    .isLength({ min: 3, max: 50 }),
  
  body('password')
    .notEmpty()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  
  body('idCard')
    .optional()
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
    .withMessage('身份证号格式不正确')
];
```

### 4. 安全头部

使用 Helmet 设置安全HTTP头:

```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
```

### 5. CORS配置

使用白名单机制:

```javascript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = config.security.corsOrigin.split(',');
    if (!origin || allowedOrigins.includes(origin) || config.server.isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('不允许的来源'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
```

### 6. 文件上传安全

**限制**:
- 最大文件大小: 5MB
- 允许的文件类型: image/jpeg, image/png, image/jpg
- 文件名随机化

**实现**:
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `dish-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只能上传图片文件'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});
```

## ⏰ 时区处理机制

### 核心原理

本项目统一使用**北京时间(UTC+8)**，并实现了**完全离线**的时区处理机制，适配内网环境。

**工作原理**:
```
系统时间 → 计算UTC时间 → 加8小时 → 北京时间
```

无论服务器在什么时区，只要系统时间准确，都能正确计算北京时间！

### 后端时间处理

**核心工具函数** (`Backed/src/utils/dateHelper.js`):

```javascript
/**
 * 获取北京时间的Date对象
 * 不依赖系统时区设置，适用于内网环境
 */
function getBeijingTime() {
  const now = new Date();
  // 获取当前时间的UTC时间戳(毫秒)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // 转换为北京时间(UTC+8 = +8小时 = +28800000毫秒)
  return new Date(utcTime + (8 * 3600000));
}

/**
 * 获取北京时间的日期字符串 (YYYY-MM-DD)
 */
function getLocalDateString(date = null) {
  const d = date || getBeijingTime();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取北京时间的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
function getLocalDateTimeString(date = null) {
  const d = date || getBeijingTime();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取今天的日期字符串(北京时间)
 */
function getToday() {
  return getLocalDateString();
}

/**
 * 获取当前北京时间的小时数(0-23)
 */
function getCurrentHour() {
  return getBeijingTime().getHours();
}

/**
 * 获取过去N天的日期数组(包括今天)
 */
function getPastDays(days) {
  const result = [];
  const now = getBeijingTime();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(getLocalDateString(d));
  }
  return result;
}
```

### 前端时间处理

**核心工具函数** (`Unified/src/utils/dateHelper.js`):

```javascript
/**
 * 获取当前北京时间的Date对象
 */
export function getBeijingTime() {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (8 * 3600000));
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取相对时间描述(如"刚刚"、"5分钟前"等)
 */
export function getRelativeTime(time) {
  if (!time) return '';
  const d = typeof time === 'number' ? new Date(time) : (typeof time === 'string' ? new Date(time) : time);
  const now = getBeijingTime();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDate(d);
}

/**
 * 获取友好的日期描述(今天、明天或具体日期)
 */
export function getFriendlyDate(date) {
  if (!date) return '';
  if (isToday(date)) return '今天';
  if (isTomorrow(date)) return '明天';
  return formatDate(date);
}
```

### 使用示例

**后端**:
```javascript
const { getLocalDateTimeString, getToday, getCurrentHour } = require('./src/utils/dateHelper');

// 创建订单时使用北京时间
const localTime = getLocalDateTimeString();
await db.run(
  'INSERT INTO orders (created_at) VALUES (:created_at)',
  { created_at: localTime }
);

// 查询今日数据
const today = getToday();
const orders = await db.all(
  'SELECT * FROM orders WHERE DATE(created_at) = :today',
  { today }
);

// 定时任务判断时间
const hour = getCurrentHour();
if (hour >= 11 && hour < 13) {
  console.log('午餐时间，发送提醒');
}
```

**前端**:
```javascript
import { formatDateTime, getRelativeTime, getFriendlyDate } from '@/utils/dateHelper';

// 显示订单时间
const orderTime = formatDateTime(order.created_at);  // "2026-01-27 20:50:00"

// 显示消息相对时间
const messageTime = getRelativeTime(message.timestamp);  // "5分钟前"

// 显示友好日期
const planDate = getFriendlyDate(plan.date);  // "今天" / "明天"
```

### 测试验证

**运行测试脚本**:
```bash
# 基础时区测试
node Backed/test-timezone.js

# 离线环境测试(推荐)
node Backed/test-offline-timezone.js

# 预期输出:
# 系统时间: 2026-01-27T12:50:00.000Z (UTC)
# 北京时间: 2026-01-27 20:50:00 (UTC+8)
# ✅ 时区处理正确
```

**健康检查**:
```bash
curl http://localhost:8000/health

# 响应:
{
  "code": 0,
  "message": "ok",
  "timestamp": "2026-01-27 20:50:00",
  "timezone": "Asia/Shanghai (UTC+8)",
  "env": "development"
}
```

### 注意事项

1. ✅ **统一使用工具函数** - 不要直接使用 `new Date()` 或 `Date.now()`
2. ❌ **避免使用 toISOString()** - ISO字符串是UTC时间，会导致时区混淆
3. ✅ **数据库查询** - 使用 `DATE()` 函数提取日期部分进行比较
4. ✅ **定时任务** - 确保定时任务基于北京时间触发
5. ✅ **前后端一致** - 前后端都使用相同的时区处理逻辑

## 🚨 风险监测系统

### 自动风险检测

系统每小时自动执行风险检测任务，监测以下风险:

#### 1. 营养摄入异常

**检测规则**:
- 热量过低: < 1000 kcal/天 (高风险)
- 热量过高: > 3000 kcal/天 (中风险)
- 蛋白质不足: < 30g/天 (中风险)
- 营养元素失衡: 脂肪占比 > 40% 或 < 15% (低风险)

**处理流程**:
1. 从 `nutrition_intake_daily` 表读取今日数据
2. 计算各营养素摄入量
3. 与正常范围对比
4. 创建风险事件记录
5. 发送通知给用户、监护人和社工

#### 2. 饮食多样性不足

**检测规则**:
- 近7天尝试的菜品种类 < 5种 (低风险)

**计算方法**:
```sql
SELECT o.client_id, COUNT(DISTINCT oi.dish_id) as dish_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE date(o.created_at) >= date('now', '-7 days')
AND o.status IN ('placed', 'preparing', 'delivering', 'delivered')
GROUP BY o.client_id
HAVING dish_count < 5
```

#### 3. 长期营养异常

**检测规则**:
- 近7天有3天以上营养摄入异常 (高风险)

**判断逻辑**:
```sql
SELECT nid.client_id, COUNT(*) as abnormal_days
FROM nutrition_intake_daily nid
WHERE nid.date >= date('now', '-7 days')
AND (
  CAST(JSON_EXTRACT(nid.totals, '$.calories') AS REAL) < 1000 
  OR CAST(JSON_EXTRACT(nid.totals, '$.calories') AS REAL) > 3000
)
GROUP BY nid.client_id
HAVING abnormal_days >= 3
```

### 风险事件处理

**风险事件状态**:
- `open` - 待处理
- `handled` - 已处理
- `closed` - 已关闭

**处理流程**:
1. 政府端查看风险事件列表
2. 查看事件详情和数据快照
3. 制定干预措施
4. 发送健康建议给用户
5. 标记事件为已处理

### 人工干预

政府端可以主动发起人工干预:

```javascript
// 创建干预记录
POST /api/gov/risk-intervention
{
  "clientId": 1,
  "content": "您近期营养摄入不足，建议增加蛋白质摄入",
  "actionPlan": "每日增加一份鱼肉或豆制品",
  "severity": "medium"
}
```

**通知对象**:
- 销售端用户
- 所有关联的监护人
- 管辖该用户的社工

### 定时任务调度

**风险检测调度器** (`Backed/src/services/riskDetectionScheduler.js`):

```javascript
function startScheduler() {
  const SCHEDULE_INTERVAL = 60 * 60 * 1000; // 每小时执行一次
  
  console.log(`[风险检测调度器] 已启动，当前北京时间：${getLocalDateTimeString()}`);
  
  // 立即执行一次
  runRiskDetection().catch(err => {
    console.error('[风险检测调度器] 首次执行失败:', err);
  });
  
  // 设置定时任务
  setInterval(() => {
    const currentTime = getLocalDateTimeString();
    console.log(`[风险检测调度器] 定时执行风险检测，当前北京时间：${currentTime}`);
    runRiskDetection().catch(err => {
      console.error('[风险检测调度器] 定时执行失败:', err);
    });
  }, SCHEDULE_INTERVAL);
}
```

### 通知定时任务

**通知调度器** (`Backed/src/services/scheduler.js`):

支持以下定时通知:
- 每日营养报告 (晚上22:00)
- 每周健康分析报告 (周日晚上)
- 用餐时间提醒 (早7-9点、午11-13点、晚17-19点)
- 健康小贴士 (每天随机时间)
- 节气养生建议 (节气当天)

**实现示例**:
```javascript
async function sendMealTimeReminders() {
  const hour = getCurrentHour();  // 使用北京时间
  let mealType = '';
  let content = '';
  
  if (hour >= 7 && hour < 9) {
    mealType = '早餐';
    content = '早上好！记得吃早餐哦，营养的一天从早餐开始。';
  } else if (hour >= 11 && hour < 13) {
    mealType = '午餐';
    content = '该吃午餐啦！补充能量，下午更有精神。';
  } else if (hour >= 17 && hour < 19) {
    mealType = '晚餐';
    content = '晚餐时间到了，记得按时用餐，保持健康作息。';
  } else {
    return; // 不在用餐时间
  }
  
  // 发送通知给开启了用餐提醒的用户
  // ...
}
```

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (或 pnpm >= 8.0.0)
- **操作系统**: Windows / macOS / Linux
- **浏览器**: Chrome >= 90, Firefox >= 88, Safari >= 14

### 1. 克隆项目

```bash
git clone <repository-url>
cd 2026_AI2
```

### 2. 后端配置

#### 安装依赖
```bash
cd Backed
npm install
# 或使用 pnpm
pnpm install
```

#### 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，配置以下关键参数:
```

**.env 配置说明**:
```env
# 服务器配置
PORT=8000
NODE_ENV=development

# 数据库路径
SQLITE_PATH=./data/app.db

# JWT密钥(必须修改！使用以下命令生成)
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS配置
CORS_ORIGIN=http://localhost:8888

# OpenAI API配置(销售端)
CLIENT_OPENAI_API_KEY=your_api_key_here
CLIENT_OPENAI_API_URL=https://api.siliconflow.cn/v1
CLIENT_OPENAI_MODEL=deepseek-ai/DeepSeek-V3

# OpenAI API配置(监护人端) - 可选，不配置则使用销售端配置
GUARDIAN_OPENAI_API_KEY=your_api_key_here
GUARDIAN_OPENAI_API_URL=https://api.siliconflow.cn/v1
GUARDIAN_OPENAI_MODEL=deepseek-ai/DeepSeek-V3

# OpenAI API配置(商户端) - 可选
MERCHANT_OPENAI_API_KEY=your_api_key_here
MERCHANT_OPENAI_API_URL=https://api.siliconflow.cn/v1
MERCHANT_OPENAI_MODEL=deepseek-ai/DeepSeek-V3

# OpenAI API配置(政府端) - 可选
GOV_OPENAI_API_KEY=your_api_key_here
GOV_OPENAI_API_URL=https://api.siliconflow.cn/v1
GOV_OPENAI_MODEL=deepseek-ai/DeepSeek-V3

# 图片生成API配置 - 可选
IMAGE_OPENAI_API_KEY=your_api_key_here
IMAGE_OPENAI_API_URL=https://api.siliconflow.cn/v1
IMAGE_OPENAI_MODEL=Kwai-Kolors/Kolors

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 文件上传
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

#### 初始化数据库
```bash
# 数据库会在首次启动时自动创建
# 如果需要重新初始化，删除 data/app.db 文件即可
```

#### 启动后端服务
```bash
# 开发模式(自动重启)
npm run dev

# 生产模式
npm start

# 服务将在 http://localhost:8000 启动
```

### 3. 前端配置

#### 安装依赖
```bash
cd Unified
npm install
# 或使用 pnpm
pnpm install
```

#### 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件
```

**.env 配置说明**:
```env
# API配置
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=30000
VITE_API_RETRY_TIMES=3
VITE_API_RETRY_DELAY=1000

# 应用配置
VITE_APP_TITLE=智膳伙伴
VITE_APP_VERSION=1.0.0

# 功能开关
VITE_ENABLE_MOCK=false
VITE_ENABLE_DEBUG=false
```

#### 启动前端服务
```bash
# 开发模式
npm run dev

# 应用将在 http://localhost:8888 启动
```

#### 构建生产版本
```bash
npm run build

# 构建产物在 dist/ 目录
```

### 4. 访问应用

打开浏览器访问: http://localhost:8888

**测试账号**:
- 销售端: `client001` / `Password123`
- 监护人: `guardian001` / `Password123`
- 商户: `merchant001` / `Password123`
- 政府: `gov001` / `Password123`

## 📝 开发指南

### 代码规范

#### 后端规范

**文件命名**:
- 路由文件: `kebab-case.js` (如 `auth.js`, `client.js`)
- 服务文件: `camelCase.js` (如 `aiService.js`, `orders.js`)
- 工具文件: `camelCase.js` (如 `dateHelper.js`, `logger.js`)

**函数命名**:
- 使用 `camelCase`
- 动词开头 (如 `getUser`, `createOrder`, `updateStatus`)
- 异步函数使用 `async/await`

**错误处理**:
```javascript
try {
  const result = await someAsyncOperation();
  return success(res, result);
} catch (error) {
  console.error('操作失败:', error);
  return failure(res, '操作失败: ' + error.message, 500);
}
```

**数据库查询**:
```javascript
// ✅ 使用参数化查询
const user = await db.get(
  'SELECT * FROM users WHERE id = :id',
  { id: userId }
);

// ❌ 避免字符串拼接
const user = await db.get(`SELECT * FROM users WHERE id = ${userId}`);
```

#### 前端规范

**组件命名**:
- 使用 `PascalCase`
- 多单词组件名 (如 `UserProfile.vue`, `OrderList.vue`)

**变量命名**:
- 使用 `camelCase`
- 布尔值使用 `is/has/should` 前缀

**Composition API**:
```vue
<script setup>
import { ref, computed, onMounted } from 'vue'

// 响应式数据
const count = ref(0)
const doubleCount = computed(() => count.value * 2)

// 生命周期
onMounted(() => {
  console.log('组件已挂载')
})

// 方法
function increment() {
  count.value++
}
</script>
```

**API调用**:
```javascript
// ✅ 使用封装的API函数
import { getOrders } from '@/api/client'

const orders = await getOrders()

// ❌ 避免直接使用axios
const response = await axios.get('/api/client/orders')
```

### 添加新功能

#### 1. 添加新的API端点

**后端** (`Backed/src/routes/xxx.js`):
```javascript
// 1. 定义路由
router.get('/new-endpoint', async (req, res) => {
  try {
    // 业务逻辑
    const data = await someService();
    return success(res, data);
  } catch (error) {
    return failure(res, error.message, 500);
  }
});

// 2. 添加认证和权限检查
router.get('/protected-endpoint', 
  authRequired,  // 需要登录
  requireRole('client'),  // 需要特定角色
  async (req, res) => {
    // ...
  }
);

// 3. 添加输入验证
router.post('/validated-endpoint',
  [
    body('field').notEmpty().withMessage('字段不能为空'),
    handleValidationErrors
  ],
  async (req, res) => {
    // ...
  }
);
```

**前端** (`Unified/src/api/xxx.js`):
```javascript
// 1. 定义API函数
export async function getNewData(params) {
  return request({
    url: '/new-endpoint',
    method: 'get',
    params
  })
}

export async function createNewData(data) {
  return request({
    url: '/new-endpoint',
    method: 'post',
    data
  })
}
```

#### 2. 添加新的页面

**创建组件** (`Unified/src/modules/xxx/NewPage.vue`):
```vue
<template>
  <div class="new-page">
    <h1>{{ title }}</h1>
    <!-- 页面内容 -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getNewData } from '@/api/xxx'

const title = ref('新页面')
const data = ref([])

onMounted(async () => {
  data.value = await getNewData()
})
</script>

<style scoped>
.new-page {
  padding: 20px;
}
</style>
```

**添加路由** (`Unified/src/router/index.js`):
```javascript
{
  path: '/client',
  component: () => import('../modules/client/Layout.vue'),
  children: [
    {
      path: 'new-page',
      component: () => import('../modules/client/NewPage.vue'),
      meta: { title: '新页面' }
    }
  ]
}
```

#### 3. 添加新的数据表

**定义Schema** (`Backed/src/db/schema.js`):
```javascript
await db.exec(`
  CREATE TABLE IF NOT EXISTS new_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
`);
```

### 调试技巧

#### 后端调试

**日志输出**:
```javascript
const logger = require('./utils/logger');

logger.info('信息日志', { data: someData });
logger.warn('警告日志', { warning: someWarning });
logger.error('错误日志', { error: someError });
```

**SQL性能分析**:
```javascript
const { profileQuery } = require('./utils/query-profiler');

const result = await profileQuery(
  db,
  'SELECT * FROM orders WHERE client_id = :id',
  { id: clientId },
  'getClientOrders'
);
```

**时区测试**:
```bash
# 运行时区测试
node Backed/test-timezone.js

# 运行离线时区测试
node Backed/test-offline-timezone.js
```

#### 前端调试

**Vue Devtools**:
- 安装 Vue Devtools 浏览器扩展
- 查看组件树、状态、事件

**网络请求**:
```javascript
// 在浏览器控制台查看请求
console.log('API请求:', url, params)
```

**性能监控**:
```javascript
import { measurePerformance } from '@/utils/performance'

measurePerformance('operationName', async () => {
  // 需要测量的操作
})
```

### 常见问题

#### 1. 数据库锁定错误

**问题**: `database is locked`

**解决**:
```javascript
// 使用连接池
const db = require('./db/pool');

// 或增加超时时间
await db.configure('busyTimeout', 5000);
```

#### 2. CORS错误

**问题**: 跨域请求被阻止

**解决**:
```env
# 在 Backed/.env 中添加前端地址
CORS_ORIGIN=http://localhost:8888,http://192.168.1.100:8888
```

#### 3. JWT Token过期

**问题**: Token过期导致401错误

**解决**:
```javascript
// 前端自动刷新Token
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
await userStore.refreshProfile()
```

#### 4. 时区不一致

**问题**: 时间显示不正确

**解决**:
```javascript
// 后端: 统一使用dateHelper
const { getLocalDateTimeString } = require('./utils/dateHelper')
const time = getLocalDateTimeString()

// 前端: 统一使用dateHelper
import { formatDateTime } from '@/utils/dateHelper'
const time = formatDateTime(date)
```

## 📦 生产部署

### Docker部署

#### 1. 构建镜像

**后端Dockerfile** (`Backed/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8000

CMD ["node", "src/server.js"]
```

**前端Dockerfile** (`Unified/Dockerfile`):
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 2. Docker Compose

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  backend:
    build: ./Backed
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000
    volumes:
      - ./Backed/data:/app/data
      - ./Backed/logs:/app/logs
      - ./Backed/uploads:/app/uploads
    restart: unless-stopped

  frontend:
    build: ./Unified
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

**启动**:
```bash
docker-compose up -d
```

### 传统部署

#### 1. 后端部署

```bash
# 1. 安装依赖
cd Backed
npm ci --only=production

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，设置生产环境配置

# 3. 使用PM2管理进程
npm install -g pm2

# 4. 启动服务
pm2 start src/server.js --name "smart-canteen-backend"

# 5. 设置开机自启
pm2 startup
pm2 save

# 6. 查看日志
pm2 logs smart-canteen-backend
```

#### 2. 前端部署

```bash
# 1. 构建生产版本
cd Unified
npm run build

# 2. 部署到Nginx
# 将 dist/ 目录内容复制到 /var/www/html/

# 3. 配置Nginx
```

**Nginx配置** (`/etc/nginx/sites-available/smart-canteen`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源
    location /uploads/ {
        proxy_pass http://localhost:8000/uploads/;
    }
}
```

**启用配置**:
```bash
sudo ln -s /etc/nginx/sites-available/smart-canteen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 性能优化

#### 1. 数据库优化

```javascript
// 添加索引
await db.exec(`
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
`);

// 定期清理旧数据
await db.run(`
  DELETE FROM notifications 
  WHERE created_at < date('now', '-30 days')
`);
```

#### 2. 缓存策略

```javascript
// 使用内存缓存
const cache = new Map();

function getCachedData(key, ttl = 300000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < ttl) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, { data, time: Date.now() });
}
```

#### 3. 静态资源优化

```javascript
// 图片压缩
const sharp = require('sharp');

await sharp(inputPath)
  .resize(800, 600, { fit: 'inside' })
  .jpeg({ quality: 80 })
  .toFile(outputPath);
```

## 📄 许可证

MIT License

## 👥 贡献者

- 项目负责人: [Your Name]
- 后端开发: [Developer Name]
- 前端开发: [Developer Name]
- UI设计: [Designer Name]

## 📞 联系方式

- 项目地址: [GitHub Repository]
- 问题反馈: [Issues]
- 邮箱: [Email]

---

**最后更新**: 2026-01-27

**版本**: 1.0.0

**文档版本**: 详细版 v1.0
