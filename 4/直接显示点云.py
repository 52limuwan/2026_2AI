"""
直接显示点云 - 最简单可靠的方法
1. 用SDK保存点云到文件
2. 用Open3D加载并显示
"""

import sys
import os
import numpy as np
import cv2
import time

# SDK路径
sdk_path = os.path.join(os.path.dirname(__file__), 
                        'OrbbecSDK_Python_v1.1.4_win_x64_release',
                        'OrbbecSDK_Python_v1.1.4_win_x64_release',
                        'python3.9', 'Samples')
sys.path.insert(0, sdk_path)

from ObTypes import *
import Pipeline
import Filter
from Error import ObException

# 检查Open3D
try:
    import open3d as o3d
    HAS_OPEN3D = True
except ImportError:
    print("错误: 需要安装 Open3D")
    print("pip install open3d")
    input("按回车退出...")
    sys.exit(1)


def save_pointcloud_ply(frame, depth_scale, filename):
    """保存点云到PLY文件"""
    points = frame.getPointCloudData()
    points_size = len(points)
    
    with open(filename, "w") as fo:
        # 写入PLY头
        fo.write("ply\n")
        fo.write("format ascii 1.0\n")
        fo.write(f"element vertex {points_size}\n")
        fo.write("property float x\n")
        fo.write("property float y\n")
        fo.write("property float z\n")
        fo.write("property uchar red\n")
        fo.write("property uchar green\n")
        fo.write("property uchar blue\n")
        fo.write("end_header\n")
        
        # 写入点云数据
        for p in points:
            x = p.get('x', 0) * depth_scale
            y = p.get('y', 0) * depth_scale
            z = p.get('z', 0) * depth_scale
            r = int(p.get('r', 128))
            g = int(p.get('g', 128))
            b = int(p.get('b', 128))
            fo.write(f"{x} {y} {z} {r} {g} {b}\n")
    
    print(f"✓ 点云已保存: {filename} ({points_size} 个点)")


def main():
    print("\n" + "="*60)
    print("奥比相机点云显示")
    print("="*60)
    
    try:
        # 创建Pipeline
        pipe = Pipeline.Pipeline(None, None)
        config = Pipeline.Config()
        
        # 配置深度流
        print("配置深度流...")
        depth_profiles = pipe.getStreamProfileList(OB_PY_SENSOR_DEPTH)
        depth_profile = depth_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
        config.enableStream(depth_profile)
        depth_width = depth_profile.width()
        depth_height = depth_profile.height()
        print(f"✓ 深度: {depth_width}x{depth_height}")
        
        # 配置彩色流
        try:
            print("配置彩色流...")
            color_profiles = pipe.getStreamProfileList(OB_PY_SENSOR_COLOR)
            color_profile = color_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
            config.enableStream(color_profile)
            print("✓ 彩色流已启用")
        except:
            print("⚠ 彩色流不可用")
        
        # 设置对齐
        config.setAlignMode(OB_PY_ALIGN_D2C_HW_MODE)
        
        # 启动
        print("启动相机...")
        pipe.start(config, None)
        print("✓ 相机已启动")
        
        # 创建点云滤波器
        print("创建点云滤波器...")
        pointCloud = Filter.PointCloudFilter()
        camera_param = pipe.getCameraParam()
        pointCloud.setCameraParam(camera_param)
        pointCloud.setCreatePointFormat(OB_PY_FORMAT_RGB_POINT)
        print("✓ 点云滤波器已创建")
        
        print("\n" + "="*60)
        print("程序说明:")
        print("  深度窗口会实时显示")
        print("  按 空格键 生成并显示3D点云")
        print("  按 ESC/Q 退出")
        print("="*60 + "\n")
        
        # 创建深度窗口
        cv2.namedWindow("Depth", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Depth", 640, 480)
        
        frame_count = 0
        pointcloud_shown = False
        
        print("✓ 开始运行...\n")
        print("提示: 按 空格键 生成并显示3D点云\n")
        
        while True:
            # 获取帧
            frameset = pipe.waitForFrames(100)
            if frameset is None:
                continue
            
            frame_count += 1
            
            depth_frame = frameset.depthFrame()
            if not depth_frame:
                continue
            
            # 显示深度图
            depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((depth_height, depth_width))
            depth_display = (depth_data / depth_data.max() * 255).astype(np.uint8) if depth_data.max() > 0 else depth_data.astype(np.uint8)
            depth_colormap = cv2.applyColorMap(depth_display, cv2.COLORMAP_JET)
            
            # 添加提示文字
            cv2.putText(depth_colormap, f"Depth - Frame: {frame_count}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(depth_colormap, "Press SPACE to show 3D point cloud", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            cv2.imshow("Depth", depth_colormap)
            
            # 检查按键
            key = cv2.waitKey(1) & 0xFF
            
            if key == 27 or key == ord('q') or key == ord('Q'):  # ESC or Q
                print("\n退出程序...")
                break
            
            elif key == 32:  # 空格键
                print("\n[空格] 生成点云...")
                
                # 获取几帧确保数据稳定
                for _ in range(5):
                    frameset = pipe.waitForFrames(100)
                
                if frameset and frameset.depthFrame():
                    try:
                        print("正在生成点云数据...")
                        point_frame = pointCloud.process(frameset)
                        
                        if point_frame:
                            depth_frame = frameset.depthFrame()
                            depth_scale = depth_frame.getValueScale()
                            
                            # 保存到临时文件
                            temp_file = "temp_pointcloud.ply"
                            save_pointcloud_ply(point_frame, depth_scale, temp_file)
                            
                            # 用Open3D加载并显示
                            print("正在加载点云...")
                            pcd = o3d.io.read_point_cloud(temp_file)
                            
                            if len(pcd.points) > 0:
                                print(f"✓ 点云加载成功: {len(pcd.points)} 个点")
                                print("\n打开3D点云窗口...")
                                print("  鼠标左键拖动 - 旋转")
                                print("  鼠标滚轮     - 缩放")
                                print("  鼠标右键拖动 - 平移")
                                print("  按 Q 关闭点云窗口\n")
                                
                                # 显示点云
                                o3d.visualization.draw_geometries(
                                    [pcd],
                                    window_name="3D Point Cloud - 点云",
                                    width=1024,
                                    height=768,
                                    left=50,
                                    top=50
                                )
                                
                                print("点云窗口已关闭")
                                print("按 空格键 可以再次生成点云\n")
                                pointcloud_shown = True
                            else:
                                print("✗ 点云为空")
                        else:
                            print("✗ 点云生成失败")
                    
                    except Exception as e:
                        print(f"✗ 错误: {e}")
                        import traceback
                        traceback.print_exc()
            
            if frame_count % 30 == 0:
                status = "已显示过点云" if pointcloud_shown else "等待按空格键"
                print(f"运行中... 帧数: {frame_count} | 状态: {status}", end='\r')
        
        # 清理
        print("\n清理资源...")
        pipe.stop()
        cv2.destroyAllWindows()
        print("✓ 完成")
    
    except ObException as e:
        print(f"\nSDK错误: {e.getMessage()}")
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
