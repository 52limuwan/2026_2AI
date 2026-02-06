# 奥比相机点云与红外可视化程序

## 功能特性

✨ **实时显示**
- 红外图像实时预览
- 深度图像实时预览（彩色映射）
- 双窗口同步显示

✨ **点云生成**
- 彩色点云（RGB Point Cloud）- 融合深度和彩色数据
- 深度点云（Depth Point Cloud）- 纯深度数据
- 自动保存为PLY格式文件

✨ **图像保存**
- 一键保存当前红外图像
- 自动添加时间戳命名

## 环境要求

### 必需软件
- Python 3.9（推荐）或 3.7/3.8
- numpy >= 1.21.0
- opencv-python >= 4.2.0

### 安装依赖
```bash
pip install numpy opencv-python
```

### SDK配置
确保已正确配置奥比相机SDK v1.1.4，本程序会自动从以下路径加载SDK：
```
OrbbecSDK_Python_v1.1.4_win_x64_release/
  OrbbecSDK_Python_v1.1.4_win_x64_release/
    python3.9/
      Samples/
```

## 硬件连接

1. 使用 **USB 3.0** 数据线连接奥比相机
2. 如果使用虚拟机，需要同时连接：
   - "Orbbec 3D USB Camera"
   - "Depth Sensor"

## 使用方法

### 启动程序
```bash
python orbbec_viewer.py
```

### 操作说明

程序启动后会显示两个窗口：
- **Infrared Viewer** - 红外图像窗口
- **Depth Viewer** - 深度图像窗口

#### 键盘控制

| 按键 | 功能 |
|------|------|
| **ESC** 或 **Q** | 退出程序 |
| **R** | 生成并保存彩色点云（RGB Point Cloud） |
| **D** | 生成并保存深度点云（Depth Point Cloud） |
| **S** | 保存当前红外图像 |

### 输出文件

程序会在当前目录生成以下文件：

1. **彩色点云文件**
   - 格式：`RGBPoints_YYYYMMDD_HHMMSS.ply`
   - 包含：XYZ坐标 + RGB颜色信息

2. **深度点云文件**
   - 格式：`DepthPoints_YYYYMMDD_HHMMSS.ply`
   - 包含：XYZ坐标

3. **红外图像文件**
   - 格式：`IR_Image_YYYYMMDD_HHMMSS.png`
   - 包含：红外图像数据

## 查看点云文件

生成的PLY文件可以使用以下软件打开：

- **CloudCompare** (推荐) - 免费开源
- **MeshLab** - 免费开源
- **Blender** - 免费开源
- **MATLAB** - 商业软件

### CloudCompare 快速使用
1. 下载安装：https://www.cloudcompare.org/
2. 打开软件，拖拽PLY文件到窗口
3. 使用鼠标旋转、缩放查看点云

## 故障排除

### 问题1：找不到SDK模块
**错误信息**：`ModuleNotFoundError: No module named 'ObTypes'`

**解决方法**：
- 确认SDK文件夹结构正确
- 检查程序中的`sdk_path`路径是否正确
- 确保使用的Python版本与SDK匹配（3.7/3.8/3.9）

### 问题2：相机无法连接
**错误信息**：`Current device is not support depth sensor!`

**解决方法**：
1. 检查USB连接（必须使用USB 3.0接口）
2. 确认设备管理器中相机已识别
3. 重新插拔USB线
4. 如果使用虚拟机，确保USB设备已连接到虚拟机

### 问题3：红外图像不显示
**可能原因**：
- 相机不支持红外传感器
- 红外流配置失败

**解决方法**：
- 程序会继续运行，只显示深度图像
- 检查相机型号是否支持红外功能

### 问题4：点云生成失败
**可能原因**：
- 深度或彩色数据未就绪
- 相机参数获取失败

**解决方法**：
- 等待几秒后再次尝试
- 确保深度和彩色窗口都有图像显示
- 重启程序

## 程序架构

```
OrbbecViewer 类
├── initialize()          # 初始化相机和配置
├── run()                 # 主运行循环
├── display_ir_frame()    # 显示红外帧
├── display_depth_frame() # 显示深度帧
├── generate_rgb_pointcloud()   # 生成彩色点云
├── generate_depth_pointcloud() # 生成深度点云
└── cleanup()             # 清理资源
```

## 技术说明

### 数据流配置
- **深度流**：用于生成点云的深度信息
- **彩色流**：用于为点云添加颜色信息
- **红外流**：用于红外图像显示
- **对齐模式**：D2C硬件对齐（深度对齐到彩色）

### 图像处理
- 16位深度/红外数据自动转换为8位显示
- 深度图使用JET颜色映射增强可视化
- 红外图使用灰度到RGB转换

### 点云格式
生成的PLY文件采用ASCII格式，易于读取和处理：
```
ply
format ascii 1.0
element vertex [点数]
property float x
property float y
property float z
property uchar red    # 仅彩色点云
property uchar green  # 仅彩色点云
property uchar blue   # 仅彩色点云
end_header
[点云数据...]
```

## 性能优化建议

1. **降低分辨率**：如果帧率较低，可以在SDK配置中选择较低分辨率
2. **关闭不需要的流**：如果只需要点云，可以注释掉红外流配置
3. **减少点云密度**：修改点云滤波器参数

## 扩展功能建议

可以基于此程序扩展以下功能：
- [ ] 实时点云可视化（使用Open3D）
- [ ] 点云滤波和降噪
- [ ] 多相机同步采集
- [ ] 录制和回放功能
- [ ] 点云配准和拼接
- [ ] 物体识别和测量

## 参考资料

- 奥比相机SDK官方文档
- OpenCV Python文档：https://docs.opencv.org/
- PLY文件格式说明：http://paulbourke.net/dataformats/ply/

## 许可证

本程序基于奥比相机SDK开发，仅供学习和研究使用。

## 联系方式

如有问题或建议，请参考手册.txt或SDK官方文档。
