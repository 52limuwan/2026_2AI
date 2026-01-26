# 图片加载优化说明

## 客户端菜单页面图片优化

### 实现的优化功能

#### 1. 懒加载（Lazy Loading）
- 使用 `IntersectionObserver` API 实现图片懒加载
- 图片只在进入视口时才开始加载，减少初始加载时间
- 提前 100px 开始预加载，确保用户滚动时图片已准备好
- **移除了原生 `loading="lazy"` 属性，避免与自定义懒加载冲突**

#### 2. 渐进式加载
- 先显示占位图（placeholder），再加载实际图片
- 加载过程中使用模糊效果（blur），加载完成后平滑过渡
- 使用 `requestAnimationFrame` 确保图片切换的平滑性
- 提升用户体验，避免空白闪烁

#### 3. 性能优化
- 使用 `requestIdleCallback` 在浏览器空闲时观察图片，不阻塞主线程
- 图片加载完成后自动取消观察，释放资源
- 组件卸载时清理观察器，防止内存泄漏
- 避免重复观察已加载或失败的图片

#### 4. 错误处理
- 图片加载失败时自动显示占位图
- 添加 `.error` 类标记失败的图片
- 防止重复尝试加载失败的图片

### 优化效果

- **减少初始加载时间**：只加载可见区域的图片
- **降低带宽消耗**：用户不滚动就不加载下方图片
- **提升用户体验**：平滑的加载动画，无闪烁
- **更好的性能**：减少同时加载的图片数量，不阻塞主线程
- **无浏览器警告**：避免原生懒加载与自定义实现的冲突

### 技术细节

```javascript
// 观察器配置
{
  rootMargin: '100px',  // 提前100px开始加载
  threshold: 0.01       // 图片1%可见时触发
}

// 使用 requestIdleCallback 优化性能
if ('requestIdleCallback' in window) {
  requestIdleCallback(observeTask, { timeout: 200 })
} else {
  setTimeout(observeTask, 0)
}

// 使用 requestAnimationFrame 确保平滑过渡
requestAnimationFrame(() => {
  img.src = src
  img.classList.add('loaded')
})
```

### 浏览器兼容性

- 现代浏览器：完整支持 IntersectionObserver + requestIdleCallback
- 旧版浏览器：降级使用 setTimeout
- 最差情况：直接加载所有图片（原有行为）

### 应用位置

- ✅ 推荐菜品卡片图片
- ✅ 菜品列表图片
- ✅ 购物车图片

### 已解决的问题

- ✅ 移除了浏览器警告：`[Intervention] Images loaded lazily and replaced with placeholders`
- ✅ 避免了原生 `loading="lazy"` 与自定义 IntersectionObserver 的冲突
- ✅ 优化了性能，使用 requestIdleCallback 不阻塞主线程

### 未来改进方向

1. 添加图片尺寸优化（响应式图片）
2. 实现图片预加载策略（预测用户滚动方向）
3. 添加图片缓存策略
4. 支持 WebP 格式自动检测
