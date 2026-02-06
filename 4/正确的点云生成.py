"""
基于C++ SDK GeneratePointCloud.cpp 的Python实现
使用正确的相机内参和深度到点云的转换
"""

import sys
import os
import numpy as np
import cv2

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

# 检查Open3D
try:
    import open3d as o3d
    HAS_OPEN3D = True
    print("✓ Open3D 可用")
except ImportError:
    HAS_OPEN3D = False
    print("⚠ Open3D 未安装")

# 深度范围 (单位: mm)
MIN_DISTANCE = 20
MAX_DISTANCE = 4000

# 默认分辨率
RESOLUTION_X = 640.0
RESOLUTION_Y = 480.0

ESC = 27


class CameraIntrinsics:
    """相机内参"""
    def __init__(self, fx=480.0, fy=480.0, cx=320.0, cy=240.0):
        self.fx = fx  # 焦距 x
        self.fy = fy  # 焦距 y
        self.cx = cx  # 光心 x
        self.cy = cy  # 光心 y
    
    def __str__(self):
        return f"fx={self.fx:.2f}, fy={self.fy:.2f}, cx={self.cx:.2f}, cy={self.cy:.2f}"


def get_camera_intrinsics(pipeline):
    """从Pipeline获取相机内参"""
    try:
        camera_param = pipeline.getCameraParam()
        
        # 深度相机内参
        intrinsics = CameraIntrinsics(
            fx=camera_param.depthIntrinsic.fx,
            fy=camera_param.depthIntrinsic.fy,
            cx=camera_param.depthIntrinsic.cx,
            cy=camera_param.depthIntrinsic.cy
        )
        
        print(f"\n相机内参: {intrinsics}")
        return intrinsics
        
    except Exception as e:
        print(f"⚠ 无法获取相机内参，使用默认值: {e}")
        return CameraIntrinsics()


def depth_to_pointcloud(depth_data, width, height, intrinsics):
    """
    将深度图转换为点云
    参考 C++ SDK 的 convertDepthToPointCloud 函数
    """
    points = []
    colors = []
    
    # 根据实际分辨率调整内参
    scale_x = width / RESOLUTION_X
    scale_y = height / RESOLUTION_Y
    
    fx = intrinsics.fx * scale_x
    fy = intrinsics.fy * scale_y
    cx = intrinsics.cx * scale_x
    cy = intrinsics.cy * scale_y
    
    valid_count = 0
    
    for v in range(height):
        for u in range(width):
            depth = depth_data[v, u]
            
            # 过滤无效深度
            if depth <= 0 or depth < MIN_DISTANCE or depth > MAX_DISTANCE:
                continue
            
            # 深度转世界坐标
            tx = (u - cx) / fx
            ty = (v - cy) / fy
            
            world_x = depth * tx
            world_y = depth * ty
            world_z = depth
            
            points.append([world_x, world_y, world_z])
            colors.append([255, 255, 255])  # 白色
            
            valid_count += 1
    
    return np.array(points), np.array(colors), valid_count


def save_pointcloud_ply(points, colors, filename):
    """保存点云到PLY文件"""
    if len(points) == 0:
        print("✗ 没有有效点")
        return False
    
    with open(filename, 'w') as f:
        f.write("ply\n")
        f.write("format ascii 1.0\n")
        f.write(f"element vertex {len(points)}\n")
        f.write("property float x\n")
        f.write("property float y\n")
        f.write("property float z\n")
        f.write("property uchar red\n")
        f.write("property uchar green\n")
        f.write("property uchar blue\n")
        f.write("end_header\n")
        
        for i in range(len(points)):
            x, y, z = points[i]
            r, g, b = colors[i]
            f.write(f"{x} {y} {z} {int(r)} {int(g)} {int(b)}\n")
    
    print(f"✓ 点云已保存: {filename}")
    return True


def generate_and_show_pointcloud(pipeline, intrinsics):
    """生成并显示点云"""
    print("\n" + "="*60)
    print("[R] 正在生成点云...")
    print("="*60)
    
    # 尝试获取有效帧
    max_attempts = 20
    for attempt in range(max_attempts):
        frameset = pipeline.waitForFrames(100)
        
        if frameset is None:
            continue
        
        depth_frame = frameset.depthFrame()
        if depth_frame is None:
            continue
        
        # 获取深度数据
        width = depth_frame.width()
        height = depth_frame.height()
        depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((height, width))
        
        # 统计有效深度点
        valid_mask = (depth_data > MIN_DISTANCE) & (depth_data < MAX_DISTANCE)
        valid_count = np.count_nonzero(valid_mask)
        
        print(f"尝试 {attempt+1}/{max_attempts}: 有效深度点 {valid_count}/{width*height}")
        
        if valid_count < 1000:
            continue
        
        # 找到有效帧，转换为点云
        print(f"\n✓ 获取到有效帧")
        print(f"  分辨率: {width}x{height}")
        print(f"  有效点: {valid_count}")
        print(f"  深度范围: {depth_data[valid_mask].min()} - {depth_data[valid_mask].max()} mm")
        
        print("\n正在转换点云...")
        points, colors, point_count = depth_to_pointcloud(depth_data, width, height, intrinsics)
        
        print(f"✓ 转换完成: {point_count} 个有效点")
        
        if point_count == 0:
            print("✗ 没有有效点")
            continue
        
        # 显示点云统计
        print(f"\n点云范围:")
        print(f"  X: {points[:, 0].min():.1f} ~ {points[:, 0].max():.1f} mm")
        print(f"  Y: {points[:, 1].min():.1f} ~ {points[:, 1].max():.1f} mm")
        print(f"  Z: {points[:, 2].min():.1f} ~ {points[:, 2].max():.1f} mm")
        
        # 保存PLY文件
        filename = "PointCloud_Correct.ply"
        if not save_pointcloud_ply(points, colors, filename):
            continue
        
        # 用Open3D显示
        if HAS_OPEN3D:
            print("\n正在加载点云...")
            pcd = o3d.io.read_point_cloud(filename)
            
            if len(pcd.points) > 0:
                print(f"✓ 加载成功: {len(pcd.points)} 个点")
                
                print("\n打开3D点云窗口...")
                print("  鼠标左键 - 旋转")
                print("  滚轮     - 缩放")
                print("  右键     - 平移")
                print("  按 Q     - 关闭窗口\n")
                
                # 创建可视化窗口
                vis = o3d.visualization.Visualizer()
                vis.create_window(window_name="Point Cloud - 正确的转换", 
                                 width=1024, height=768)
                vis.add_geometry(pcd)
                
                # 设置渲染选项
                opt = vis.get_render_option()
                opt.point_size = 2.0
                opt.background_color = np.asarray([0.1, 0.1, 0.1])
                
                # 重置视角
                vis.reset_view_point(True)
                
                vis.run()
                vis.destroy_window()
                print("点云窗口已关闭\n")
            else:
                print("✗ 点云为空")
        
        return  # 成功
    
    print(f"\n✗ 尝试了{max_attempts}次，未能生成有效点云")


try:
    print("="*60)
    print("  基于C++ SDK逻辑的点云生成程序")
    print("="*60)
    
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
        print(f"✓ 深度流: {depthProfile.width()}x{depthProfile.height()} @ {depthProfile.fps()}fps")
    except ObException as e:
        print(f"✗ 深度流配置失败: {e.getMessage()}")
        sys.exit()
    
    # 启动pipeline
    pipeline.start(config, None)
    print("✓ Pipeline已启动")
    
    # 获取相机内参
    intrinsics = get_camera_intrinsics(pipeline)
    
    print("\n" + "="*60)
    print("操作说明:")
    print("  在深度窗口按 R 键 - 生成点云")
    print("  按 ESC 或 Q  - 退出")
    print("="*60 + "\n")
    
    # 创建深度显示窗口
    cv2.namedWindow("Depth - Press R", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Depth - Press R", 640, 480)
    
    depth_width = depthProfile.width()
    depth_height = depthProfile.height()
    
    frame_count = 0
    
    while True:
        frameset = pipeline.waitForFrames(100)
        
        if frameset:
            depth_frame = frameset.depthFrame()
            if depth_frame:
                frame_count += 1
                depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((depth_height, depth_width))
                
                # 统计有效点
                valid_mask = (depth_data > MIN_DISTANCE) & (depth_data < MAX_DISTANCE)
                valid_count = np.count_nonzero(valid_mask)
                
                # 显示深度图
                depth_display = np.zeros_like(depth_data, dtype=np.uint8)
                if depth_data.max() > 0:
                    depth_display = ((depth_data - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE) * 255).clip(0, 255).astype(np.uint8)
                
                depth_colormap = cv2.applyColorMap(depth_display, cv2.COLORMAP_JET)
                
                # 添加文字
                cv2.putText(depth_colormap, f"Frame: {frame_count}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(depth_colormap, f"Valid: {valid_count}/{depth_width*depth_height}", 
                           (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(depth_colormap, "Press R - Generate Point Cloud", 
                           (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                cv2.imshow("Depth - Press R", depth_colormap)
            
            # 检查按键
            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord('q') or key == ord('Q'):
                print("\n退出程序...")
                break
            elif key == ord('r') or key == ord('R'):
                generate_and_show_pointcloud(pipeline, intrinsics)
    
    pipeline.stop()
    cv2.destroyAllWindows()
    print("✓ 程序已退出")

except ObException as e:
    print(f"SDK错误: {e.getMessage()}")
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
