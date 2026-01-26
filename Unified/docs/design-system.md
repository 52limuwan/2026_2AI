# 设计系统规范

## 间距系统 (Spacing System)

基于 **8px 网格系统**，所有间距应该是 4px 或 8px 的倍数。

### 间距标准值

```css
/* 基础间距单位 */
--space-1: 4px;   /* 0.25rem */
--space-2: 8px;   /* 0.5rem */
--space-3: 12px;  /* 0.75rem */
--space-4: 16px;  /* 1rem */
--space-5: 20px;  /* 1.25rem */
--space-6: 24px;  /* 1.5rem */
--space-8: 32px;  /* 2rem */
--space-10: 40px; /* 2.5rem */
--space-12: 48px; /* 3rem */
```

### 使用场景

| 间距 | 使用场景 |
|------|---------|
| 4px  | 紧密元素间距（如标签内边距、小图标间距） |
| 8px  | 相关元素间距（如按钮组、表单字段） |
| 12px | 移动端内边距、小卡片内边距 |
| 16px | 标准内边距、卡片内边距、列表项内边距 |
| 24px | 区块间距、大卡片内边距 |
| 32px | 页面区域间距 |

## 字体系统 (Typography)

### 字号标准

```css
/* 字体大小 */
--text-xs: 12px;   /* 辅助文字、标签 */
--text-sm: 13px;   /* 次要文字、移动端正文 */
--text-base: 14px; /* 正文、表单 */
--text-lg: 16px;   /* 标题、重要文字 */
--text-xl: 18px;   /* 大标题 */
--text-2xl: 20px;  /* 页面标题 */
--text-3xl: 24px;  /* 主标题 */
```

### 行高标准

```css
--leading-tight: 1.25;  /* 标题 */
--leading-normal: 1.5;  /* 正文 */
--leading-relaxed: 1.75; /* 长文本 */
```

### 字重标准

```css
--fw-normal: 400;
--fw-medium: 500;
--fw-semibold: 600;
--fw-bold: 700;
```

### 使用场景

| 字号 | 字重 | 使用场景 |
|------|------|---------|
| 12px | medium | 标签、辅助信息、时间戳 |
| 13px | normal | 移动端正文、次要信息 |
| 14px | normal | 桌面端正文、表单输入、描述文字 |
| 14px | medium | 强调文字、数据值 |
| 16px | semibold | 列表项标题、卡片标题 |
| 18px | semibold | 区块标题 |
| 20px | bold | 页面标题 |

## 圆角系统 (Border Radius)

```css
--radius-sm: 4px;   /* 小元素：标签、徽章 */
--radius-md: 8px;   /* 标准元素：按钮、输入框、卡片 */
--radius-lg: 12px;  /* 大元素：模态框、大卡片 */
--radius-xl: 16px;  /* 特大元素：页面容器 */
--radius-full: 9999px; /* 圆形：头像、圆形按钮 */
```

## 颜色系统 (Colors)

### 语义颜色

```css
/* 主色调 */
--accent: #3b82f6;
--accent-strong: #2563eb;

/* 文字颜色 */
--text: #1f2937;
--text-secondary: #6b7280;
--muted: #9ca3af;

/* 背景颜色 */
--bg: #ffffff;
--card: #ffffff;
--ghost-bg: rgba(0, 0, 0, 0.04);
--ghost-bg-hover: rgba(0, 0, 0, 0.08);

/* 边框颜色 */
--border: #e5e7eb;
--border-strong: #d1d5db;

/* 状态颜色 */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### 风险标签颜色

```css
/* 高风险 */
.risk-high {
  background: #fff1f0;
  color: #cf1322;
}

/* 中风险 */
.risk-medium {
  background: #fff7e6;
  color: #d46b08;
}

/* 低风险 */
.risk-low {
  background: #e6f7ff;
  color: #0958d9;
}

/* 正常 */
.risk-normal {
  background: #f0f9ff;
  color: #0369a1;
}
```

## 组件规范

### 列表项 (List Item)

```css
.user-row {
  padding: 16px;           /* 标准内边距 */
  gap: 16px;               /* 元素间距 */
}

/* 移动端 */
@media (max-width: 640px) {
  .user-row {
    padding: 12px;         /* 移动端减小内边距 */
    gap: 12px;
  }
}
```

### 标签 (Tag/Badge)

```css
.tag {
  padding: 4px 8px;        /* 紧凑内边距 */
  border-radius: 4px;      /* 小圆角 */
  font-size: 12px;         /* 小字号 */
  font-weight: 500;        /* 中等字重 */
  line-height: 1.4;
}
```

### 按钮 (Button)

```css
.button {
  padding: 12px 16px;      /* 标准按钮内边距 */
  border-radius: 8px;      /* 标准圆角 */
  font-size: 14px;         /* 正文字号 */
  font-weight: 500;        /* 中等字重 */
  gap: 8px;                /* 图标与文字间距 */
}

/* 小按钮 */
.button-sm {
  padding: 8px 12px;
  font-size: 13px;
}

/* 大按钮 */
.button-lg {
  padding: 16px 24px;
  font-size: 16px;
}
```

### 卡片 (Card)

```css
.card {
  padding: 16px;           /* 标准内边距 */
  border-radius: 8px;      /* 标准圆角 */
  gap: 16px;               /* 内部元素间距 */
}

/* 大卡片 */
.card-lg {
  padding: 24px;
  border-radius: 12px;
}
```

### 表单 (Form)

```css
.form-group {
  gap: 8px;                /* 标签与输入框间距 */
  margin-bottom: 16px;     /* 表单组间距 */
}

.input {
  padding: 12px 16px;      /* 输入框内边距 */
  border-radius: 8px;      /* 标准圆角 */
  font-size: 14px;         /* 正文字号 */
}
```

## 响应式断点 (Breakpoints)

```css
/* 移动端 */
@media (max-width: 640px) { }

/* 平板 */
@media (max-width: 768px) { }

/* 桌面端 */
@media (max-width: 1024px) { }

/* 大屏 */
@media (max-width: 1280px) { }
```

## 动画规范 (Animation)

### 过渡时间

```css
--duration-fast: 0.15s;    /* 快速交互：hover */
--duration-base: 0.2s;     /* 标准交互：按钮、输入框 */
--duration-slow: 0.3s;     /* 慢速交互：展开/收起 */
--duration-slower: 0.4s;   /* 更慢：模态框、抽屉 */
```

### 缓动函数

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
```

## 阴影系统 (Shadows)

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
```

## 最佳实践

### ✅ 推荐做法

1. **使用 8px 网格系统**：所有间距使用 4px 或 8px 的倍数
2. **保持一致性**：相同类型的元素使用相同的间距和字号
3. **语义化命名**：使用有意义的 CSS 变量名
4. **响应式设计**：移动端适当减小间距和字号
5. **可访问性**：确保足够的点击区域（最小 44x44px）

### ❌ 避免做法

1. 不要使用奇数像素值（如 13px, 15px, 17px）
2. 不要混用不同的间距系统
3. 不要在同一页面使用过多字号变化
4. 不要忽略移动端适配
5. 不要使用过小的点击区域

## 检查清单

在实现新组件时，请检查：

- [ ] 所有间距是否符合 8px 网格系统
- [ ] 字号是否使用标准值（12/13/14/16/18/20px）
- [ ] 圆角是否使用标准值（4/8/12/16px）
- [ ] 颜色是否使用 CSS 变量
- [ ] 是否有移动端适配
- [ ] 点击区域是否足够大（≥44x44px）
- [ ] 动画时长是否合理（0.15-0.4s）
- [ ] 是否有 hover/active 状态
