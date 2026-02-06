"""
基于SDK的PointCloud.py，添加Open3D实时显示功能
按R键生成彩色点云并立即显示
"""

import sys
import os

# SDK路径
sdk_path = os.path.join(os.path.dirname(__file__), 
                        'OrbbecSDK_Python_v1.1.4_win_x64_release',
                        'OrbbecSDK_Python_v1.1.4_win_x64_release',
                        'python3.9', 'Samples')
sys.path.insert(0, sdk_path)

from ObTypes import *
from Property import *
import Context
import Pipeline
import StreamProfile
import Device
import Filter
from Error import ObException
import cv2
import numpy as np
import platform

# 检查Open3D
try:
    import open3d as o3d
    HAS_OPEN3D = True
    print("✓ Open3D 可用")
except ImportError:
    HAS_OPEN3D = False
    print("⚠ Open3D 未安装，只能保存文件")

plat = platform.system().lower()
if plat == 'windows':
    import msvcrt

ESC = 27
r = 114
R = 82
d = 100
D = 68


def saveRGBPointsToPly(frame, depth_scale, fileName):
    """保存彩色点云到PLY"""
    points = frame.getPointCloudData()
    pointsSize = len(points)
    print(f"点云大小: {pointsSize} 个点")
    
    with open(fileName, "w") as fo:
        fo.write("ply\n")
        fo.write("format ascii 1.0\n")
        fo.write(f"element vertex {pointsSize}\n")
        fo.write("property float x\n")
        fo.write("property float y\n")
        fo.write("property float z\n")
        fo.write("property uchar red\n")
        fo.write("property uchar green\n")
        fo.write("property uchar blue\n")
        fo.write("end_header\n")
        
        for i in points:
            x = i.get("x") * depth_scale
            y = i.get("y") * depth_scale
            z = i.get("z") * depth_scale
            r = int(i.get("r"))
            g = int(i.get("g"))
            b = int(i.get("b"))
            fo.write(f"{x} {y} {z} {r} {g} {b}\n")
    
    print(f"✓ 点云已保存: {fileName}")


def getRGBPointsAndShow(pipeline, pointCloud):
    """生成彩色点云并显示"""
    count = 0
    while count < 10:
        count += 1
        frameset = pipeline.waitForFrames(100)
        if frameset != None and frameset.depthFrame() != None and frameset.colorFrame() != None:
            try:
                print("\n[R] 生成彩色点云...")
                depth_frame = frameset.depthFrame()
                depth_scale = depth_frame.getValueScale()
                pointCloud.setCreatePointFormat(OB_PY_FORMAT_RGB_POINT)
                frame = pointCloud.process(frameset)
                
                # 保存到文件
                fileName = "RGBPoints.ply"
                saveRGBPointsToPly(frame, depth_scale, fileName)
                
                # 用Open3D显示
                if HAS_OPEN3D:
                    print("正在加载点云...")
                    pcd = o3d.io.read_point_cloud(fileName)
                    if len(pcd.points) > 0:
                        print(f"✓ 加载成功: {len(pcd.points)} 个点")
                        print("\n打开3D点云窗口...")
                        print("  鼠标左键 - 旋转")
                        print("  滚轮     - 缩放")
                        print("  右键     - 平移")
                        print("  按 Q     - 关闭窗口\n")
                        
                        o3d.visualization.draw_geometries(
                            [pcd],
                            window_name="3D Point Cloud - 彩色点云",
                            width=1024,
                            height=768
                        )
                        print("点云窗口已关闭\n")
                    else:
                        print("✗ 点云为空")
                else:
                    print("提示: 安装Open3D可以直接显示点云")
                    print("  pip install open3d")
                
            except ObException as e:
                print(f"错误: {e.getMessage()}")
            break


try:
    ctx = Context.Context(None)
    ctx.setLoggerSeverity(OB_PY_LOG_SEVERITY_ERROR)
    
    # 创建pipeline
    pipeline = Pipeline.Pipeline(None, None)
    config = Pipeline.Config()
    
    # 配置深度流
    try:
        profiles = pipeline.getStreamProfileList(OB_PY_SENSOR_DEPTH)
        videoProfile = profiles.getProfile(0)
        depthProfile = videoProfile.toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
        config.enableStream(depthProfile)
        print("✓ 深度流已配置")
    except ObException as e:
        print(f"深度流配置失败: {e.getMessage()}")
        sys.exit()
    
    # 配置彩色流
    try:
        profiles = pipeline.getStreamProfileList(OB_PY_SENSOR_COLOR)
        videoProfile = profiles.getProfile(0)
        colorProfile = videoProfile.toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
        config.enableStream(colorProfile)
        print("✓ 彩色流已配置")
    except ObException as e:
        print(f"彩色流配置失败: {e.getMessage()}")
        sys.exit()
    
    # 设置对齐
    config.setAlignMode(OB_PY_ALIGN_D2C_HW_MODE)
    pipeline.start(config, None)
    print("✓ Pipeline已启动")
    
    # 创建点云滤波器
    pointCloud = Filter.PointCloudFilter()
    cameraParam = pipeline.getCameraParam()
    pointCloud.setCameraParam(cameraParam)
    print("✓ 点云滤波器已创建")
    
    print("\n" + "="*60)
    print("程序已启动")
    print("="*60)
    print("操作说明:")
    print("  在深度窗口按 R 键 - 生成彩色点云并显示")
    print("  按 ESC 或 Q  - 退出程序")
    print("="*60 + "\n")
    
    # 创建OpenCV窗口显示深度图
    cv2.namedWindow("Depth - Press R to generate point cloud", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Depth - Press R to generate point cloud", 640, 480)
    
    depth_width = depthProfile.width()
    depth_height = depthProfile.height()
    
    print("✓ 深度窗口已打开")
    print("提示: 在深度窗口中按 R 键生成点云\n")
    
    frame_count = 0
    
    while True:
        frameset = pipeline.waitForFrames(100)
        
        if frameset:
            # 显示深度图
            depth_frame = frameset.depthFrame()
            if depth_frame:
                frame_count += 1
                depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((depth_height, depth_width))
                depth_display = (depth_data / depth_data.max() * 255).astype(np.uint8) if depth_data.max() > 0 else depth_data.astype(np.uint8)
                depth_colormap = cv2.applyColorMap(depth_display, cv2.COLORMAP_JET)
                
                # 添加提示文字
                cv2.putText(depth_colormap, f"Frame: {frame_count}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.putText(depth_colormap, "Press R - Generate Point Cloud", 
                           (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(depth_colormap, "Press ESC/Q - Exit", 
                           (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                
                cv2.imshow("Depth - Press R to generate point cloud", depth_colormap)
            
            # 检查按键
            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord('q') or key == ord('Q'):  # ESC or Q
                print("\n退出程序...")
                break
            elif key == ord('r') or key == ord('R'):  # R
                getRGBPointsAndShow(pipeline, pointCloud)
    
    pipeline.stop()
    cv2.destroyAllWindows()
    print("✓ 程序已退出")

except ObException as e:
    print(f"SDK错误: {e.getMessage()}")
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
