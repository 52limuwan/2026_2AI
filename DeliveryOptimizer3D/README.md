# 🚁 小区送餐路径优化系统 - Python 3D版

使用 Python + Pygame + PyOpenGL 实现的专业3D可视化系统

## 功能特性

- ✅ 真实3D场景渲染
- ✅ 点云粒子系统（2000+粒子）
- ✅ 雷达扫描特效
- ✅ 路径优化算法
- ✅ 动态配送动画
- ✅ 自由相机控制
- ✅ 实时数据统计

## 快速开始

### 1. 安装依赖

```bash
cd DeliveryOptimizer3D
pip install -r requirements.txt
```

### 2. 运行程序

```bash
python main.py
```

## 控制说明

### 键盘控制
- **空格键** - 生成随机订单
- **回车键** - 优化配送路径
- **P键** - 播放/暂停动画
- **R键** - 重置场景
- **WASD** - 移动相机
- **Q/E** - 上升/下降
- **ESC** - 退出程序

### 鼠标控制
- **左键拖拽** - 旋转视角
- **滚轮** - 缩放

## 技术架构

```
main.py          - 主程序入口
optimizer.py     - 路径优化算法
renderer.py      - OpenGL渲染器
camera.py        - 相机控制系统
```

## 算法说明

### 优化策略
1. 按楼栋分组
2. 按单元分组
3. 按楼层排序（从低到高）

### 时间成本
- 上下一层楼：10秒
- 切换单元：15秒
- 切换楼栋：60秒

## 系统要求

- Python 3.8+
- 支持 OpenGL 2.0+ 的显卡
- Windows/Linux/macOS

## 故障排除

### 黑屏问题
确保显卡驱动已更新

### 性能问题
降低粒子数量（修改 renderer.py 中的 2000）

### 依赖安装失败
```bash
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```
