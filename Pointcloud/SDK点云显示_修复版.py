"""
修复版 - 确保获取有效的深度和彩色数据后再生成点云
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
    print("⚠ Open3D 未安装")

ESC = 27


def saveRGBPointsToPly(points_data, fileName):
    """保存彩色点云到PLY - 过滤掉无效点"""
    # 过滤掉坐标为(0,0,0)的无效点
    valid_points = []
    for p in points_data:
        x, y, z = p.get("x"), p.get("y"), p.get("z")
        if not (x == 0 and y == 0 and z == 0):
            valid_points.append(p)
    
    pointsSize = len(valid_points)
    print(f"总点数: {len(points_data)}, 有效点数: {pointsSize}")
    
    if pointsSize == 0:
        print("✗ 没有有效的点云数据!")
        return False
    
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
        
        for i in valid_points:
            x = i.get("x")
            y = i.get("y")
            z = i.get("z")
            r = int(i.get("r"))
            g = int(i.get("g"))
            b = int(i.get("b"))
            fo.write(f"{x} {y} {z} {r} {g} {b}\n")
    
    print(f"✓ 点云已保存: {fileName}")
    return True


def getRGBPointsAndShow(pipeline, pointCloud):
    """生成彩色点云并显示"""
    print("\n" + "="*60)
    print("[R] 正在生成彩色点云...")
    print("="*60)
    
    # 尝试多次获取有效的帧
    max_attempts = 20
    for attempt in range(max_attempts):
        frameset = pipeline.waitForFrames(100)
        
        if frameset is None:
            print(f"尝试 {attempt+1}/{max_attempts}: 未获取到帧")
            continue
            
        depth_frame = frameset.depthFrame()
        color_frame = frameset.colorFrame()
        
        if depth_frame is None:
            print(f"尝试 {attempt+1}/{max_attempts}: 深度帧为空")
            continue
            
        if color_frame is None:
            print(f"尝试 {attempt+1}/{max_attempts}: 彩色帧为空")
            continue
        
        # 检查深度数据是否有效
        depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16)
        valid_depth_count = np.count_nonzero(depth_data)
        
        print(f"尝试 {attempt+1}/{max_attempts}:")
        print(f"  深度帧大小: {depth_frame.dataSize()}")
        print(f"  彩色帧大小: {color_frame.dataSize()}")
        print(f"  有效深度点: {valid_depth_count}/{len(depth_data)}")
        
        if valid_depth_count < 1000:
            print(f"  ⚠ 有效深度点太少，继续尝试...")
            continue
        
        # 找到有效帧，生成点云
        try:
            print("\n✓ 获取到有效帧，正在生成点云...")
            
            # 不使用depth_scale，直接使用原始坐标
            pointCloud.setCreatePointFormat(OB_PY_FORMAT_RGB_POINT)
            frame = pointCloud.process(frameset)
            points_data = frame.getPointCloudData()
            
            print(f"SDK返回点数: {len(points_data)}")
            
            # 检查前几个点
            if len(points_data) > 0:
                print("\n前5个点的数据:")
                for i in range(min(5, len(points_data))):
                    p = points_data[i]
                    print(f"  点{i}: x={p.get('x'):.3f}, y={p.get('y'):.3f}, z={p.get('z'):.3f}, "
                          f"r={p.get('r')}, g={p.get('g')}, b={p.get('b')}")
            
            # 保存到文件
            fileName = "RGBPoints.ply"
            if not saveRGBPointsToPly(points_data, fileName):
                print("✗ 点云生成失败")
                return
            
            # 用Open3D显示
            if HAS_OPEN3D:
                print("\n正在加载点云...")
                pcd = o3d.io.read_point_cloud(fileName)
                
                if len(pcd.points) > 0:
                    print(f"✓ 加载成功: {len(pcd.points)} 个点")
                    
                    # 显示点云统计信息
                    points = np.asarray(pcd.points)
                    print(f"\n点云范围:")
                    print(f"  X: {points[:, 0].min():.3f} ~ {points[:, 0].max():.3f}")
                    print(f"  Y: {points[:, 1].min():.3f} ~ {points[:, 1].max():.3f}")
                    print(f"  Z: {points[:, 2].min():.3f} ~ {points[:, 2].max():.3f}")
                    
                    if pcd.has_colors():
                        colors = np.asarray(pcd.colors)
                        print(f"\n颜色范围:")
                        print(f"  R: {colors[:, 0].min():.3f} ~ {colors[:, 0].max():.3f}")
                        print(f"  G: {colors[:, 1].min():.3f} ~ {colors[:, 1].max():.3f}")
                        print(f"  B: {colors[:, 2].min():.3f} ~ {colors[:, 2].max():.3f}")
                    
                    print("\n打开3D点云窗口...")
                    print("  鼠标左键 - 旋转")
                    print("  滚轮     - 缩放")
                    print("  右键     - 平移")
                    print("  按 Q     - 关闭窗口\n")
                    
                    # 创建可视化窗口
                    vis = o3d.visualization.Visualizer()
                    vis.create_window(window_name="3D Point Cloud - 彩色点云", 
                                     width=1024, height=768)
                    vis.add_geometry(pcd)
                    
                    # 设置渲染选项
                    opt = vis.get_render_option()
                    opt.point_size = 2.0
                    opt.background_color = np.asarray([0.1, 0.1, 0.1])  # 深灰色背景
                    
                    # 重置视角
                    vis.reset_view_point(True)
                    
                    vis.run()
                    vis.destroy_window()
                    print("点云窗口已关闭\n")
                else:
                    print("✗ 点云为空")
            else:
                print("提示: 安装Open3D可以直接显示点云")
            
            return  # 成功生成并显示，退出
            
        except ObException as e:
            print(f"SDK错误: {e.getMessage()}")
            continue
        except Exception as e:
            print(f"错误: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\n✗ 尝试了{max_attempts}次，未能生成有效点云")


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
        print(f"✓ 深度流已配置: {depthProfile.width()}x{depthProfile.height()} @ {depthProfile.fps()}fps")
    except ObException as e:
        print(f"深度流配置失败: {e.getMessage()}")
        sys.exit()
    
    # 配置彩色流
    try:
        profiles = pipeline.getStreamProfileList(OB_PY_SENSOR_COLOR)
        videoProfile = profiles.getProfile(0)
        colorProfile = videoProfile.toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
        config.enableStream(colorProfile)
        print(f"✓ 彩色流已配置: {colorProfile.width()}x{colorProfile.height()} @ {colorProfile.fps()}fps")
    except ObException as e:
        print(f"彩色流配置失败: {e.getMessage()}")
        sys.exit()
    
    # 设置对齐模式
    config.setAlignMode(OB_PY_ALIGN_D2C_HW_MODE)
    print("✓ 对齐模式: D2C硬件对齐")
    
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
    print("提示: 等待几秒让相机稳定，然后按 R 键生成点云\n")
    
    frame_count = 0
    valid_frame_count = 0
    
    while True:
        frameset = pipeline.waitForFrames(100)
        
        if frameset:
            # 显示深度图
            depth_frame = frameset.depthFrame()
            if depth_frame:
                frame_count += 1
                depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((depth_height, depth_width))
                
                # 统计有效深度点
                valid_depth = np.count_nonzero(depth_data)
                if valid_depth > 1000:
                    valid_frame_count += 1
                
                # 显示深度图
                depth_display = (depth_data / depth_data.max() * 255).astype(np.uint8) if depth_data.max() > 0 else depth_data.astype(np.uint8)
                depth_colormap = cv2.applyColorMap(depth_display, cv2.COLORMAP_JET)
                
                # 添加提示文字
                cv2.putText(depth_colormap, f"Frame: {frame_count} (Valid: {valid_frame_count})", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(depth_colormap, f"Valid depth points: {valid_depth}", 
                           (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(depth_colormap, "Press R - Generate Point Cloud", 
                           (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.putText(depth_colormap, "Press ESC/Q - Exit", 
                           (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                
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
