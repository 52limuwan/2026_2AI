"""
奥比相机实时点云显示 - 使用SDK的PointCloudFilter
显示：深度图 + 3D点云
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
import Pipeline
import Filter
from Error import ObException

# 检查Open3D
try:
    import open3d as o3d
    HAS_OPEN3D = True
    print("✓ Open3D 已安装")
except ImportError:
    print("="*60)
    print("错误: 必须安装 Open3D 才能显示3D点云")
    print("安装命令: pip install open3d")
    print("="*60)
    input("按回车退出...")
    sys.exit(1)


def main():
    print("\n" + "="*60)
    print("奥比相机实时点云显示")
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
        print(f"✓ 深度分辨率: {depth_width}x{depth_height}")
        
        # 配置彩色流
        try:
            print("配置彩色流...")
            color_profiles = pipe.getStreamProfileList(OB_PY_SENSOR_COLOR)
            color_profile = color_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
            config.enableStream(color_profile)
            print("✓ 彩色流已启用")
        except:
            print("⚠ 彩色流不可用，将生成无颜色点云")
        
        # 设置对齐模式
        config.setAlignMode(OB_PY_ALIGN_D2C_HW_MODE)
        
        # 启动Pipeline
        print("启动相机...")
        pipe.start(config, None)
        print("✓ 相机已启动")
        
        # 创建点云滤波器（SDK的PointCloudFilter）
        print("创建点云滤波器...")
        pointCloud = Filter.PointCloudFilter()
        camera_param = pipe.getCameraParam()
        pointCloud.setCameraParam(camera_param)
        pointCloud.setCreatePointFormat(OB_PY_FORMAT_RGB_POINT)  # 彩色点云
        print("✓ 点云滤波器已创建")
        
        print("\n" + "="*60)
        print("窗口说明:")
        print("  1. Depth - 深度图")
        print("  2. Point Cloud - 3D点云")
        print("\n操作:")
        print("  深度窗口: ESC/Q - 退出")
        print("  点云窗口: 鼠标拖动旋转, 滚轮缩放")
        print("="*60 + "\n")
        
        # 创建OpenCV窗口
        cv2.namedWindow("Depth", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Depth", 640, 480)
        
        # 创建Open3D可视化器
        vis = o3d.visualization.Visualizer()
        vis.create_window(window_name="Point Cloud - 3D点云", width=800, height=600)
        
        # 设置渲染选项
        opt = vis.get_render_option()
        opt.point_size = 2.0
        opt.background_color = np.asarray([0, 0, 0])
        
        # 初始化点云对象
        pcd = o3d.geometry.PointCloud()
        first_time = True
        
        frame_count = 0
        
        print("✓ 开始显示...\n")
        
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
            cv2.putText(depth_colormap, f"Depth - Frame: {frame_count}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.imshow("Depth", depth_colormap)
            
            # 使用SDK的PointCloudFilter生成点云（每10帧更新一次，避免太慢）
            if frame_count % 10 == 0:
                try:
                    # 处理frameset生成点云
                    point_frame = pointCloud.process(frameset)
                    if point_frame:
                        # 获取点云数据
                        points_data = point_frame.getPointCloudData()
                        
                        if len(points_data) > 100:  # 确保有足够的点
                            # 快速提取XYZ坐标和颜色
                            points_list = []
                            colors_list = []
                            
                            # 采样点云（每5个点取1个，加快速度）
                            for i in range(0, len(points_data), 5):
                                p = points_data[i]
                                z = p.get('z', 0)
                                if z > 0:  # 只要有效点
                                    points_list.append([p.get('x', 0), p.get('y', 0), z])
                                    # 尝试获取颜色
                                    r = p.get('r', 128)
                                    g = p.get('g', 128)
                                    b = p.get('b', 128)
                                    colors_list.append([r/255.0, g/255.0, b/255.0])
                            
                            if len(points_list) > 100:
                                points = np.array(points_list, dtype=np.float64)
                                colors = np.array(colors_list, dtype=np.float64)
                                
                                # 转换单位
                                depth_scale = depth_frame.getValueScale()
                                points = points * depth_scale
                                
                                # 更新Open3D点云
                                pcd.points = o3d.utility.Vector3dVector(points)
                                pcd.colors = o3d.utility.Vector3dVector(colors)
                                
                                if first_time:
                                    vis.add_geometry(pcd)
                                    first_time = False
                                    print("✓ 点云窗口已显示")
                                else:
                                    vis.update_geometry(pcd)
                                
                                vis.poll_events()
                                vis.update_renderer()
                
                except Exception as e:
                    if frame_count == 10:
                        print(f"点云处理错误: {e}")
            
            # 检查按键
            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord('q') or key == ord('Q'):
                print("\n退出程序...")
                break
            
            if frame_count % 30 == 0:
                print(f"运行中... 帧数: {frame_count} | 点云更新: {not first_time}", end='\r')
        
        # 清理
        print("\n清理资源...")
        pipe.stop()
        vis.destroy_window()
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
