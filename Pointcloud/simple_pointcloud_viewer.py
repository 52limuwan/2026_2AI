"""
奥比相机简单点云查看器
只显示：深度图 + 3D点云
"""

import sys
import os
import numpy as np
import cv2

# 添加SDK库路径
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
    HAS_OPEN3D = False
    print("="*60)
    print("错误: 未安装 Open3D")
    print("="*60)
    print("必须安装 Open3D 才能显示3D点云")
    print("\n安装命令:")
    print("  pip install open3d")
    print("\n或使用清华镜像源:")
    print("  pip install open3d -i https://pypi.tuna.tsinghua.edu.cn/simple")
    print("="*60)
    input("\n按回车退出...")
    sys.exit(1)


class SimplePointCloudViewer:
    def __init__(self):
        self.pipeline = None
        self.vis = None
        self.pcd = None
        self.first_time = True
        
    def initialize(self):
        """初始化相机"""
        try:
            self.pipeline = Pipeline.Pipeline(None, None)
            config = Pipeline.Config()
            
            # 只配置深度流和彩色流
            print("初始化相机...")
            
            # 深度流
            depth_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_DEPTH)
            depth_profile = depth_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
            config.enableStream(depth_profile)
            print("✓ 深度流")
            
            # 彩色流
            try:
                color_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_COLOR)
                color_profile = color_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
                config.enableStream(color_profile)
                print("✓ 彩色流")
            except:
                print("⚠ 彩色流不可用")
            
            # 对齐模式
            config.setAlignMode(OB_PY_ALIGN_D2C_HW_MODE)
            
            # 启动
            self.pipeline.start(config, None)
            print("✓ 相机启动成功\n")
            
            return True
            
        except Exception as e:
            print(f"✗ 初始化失败: {e}")
            return False
    
    def create_pointcloud(self, depth_frame, color_frame=None):
        """创建点云"""
        try:
            # 获取深度数据
            width = depth_frame.width()
            height = depth_frame.height()
            depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((height, width))
            
            # 创建Open3D深度图像
            depth_o3d = o3d.geometry.Image(depth_data.astype(np.uint16))
            
            # 如果有彩色数据
            if color_frame:
                try:
                    color_width = color_frame.width()
                    color_height = color_frame.height()
                    color_data = color_frame.data()
                    
                    # 处理彩色数据
                    color_format = color_frame.format()
                    if color_format == int(OB_PY_FORMAT_RGB):
                        color_array = np.frombuffer(color_data, dtype=np.uint8).reshape((color_height, color_width, 3))
                    elif color_format == int(OB_PY_FORMAT_BGR):
                        color_array = np.frombuffer(color_data, dtype=np.uint8).reshape((color_height, color_width, 3))
                        color_array = cv2.cvtColor(color_array, cv2.COLOR_BGR2RGB)
                    else:
                        color_array = np.frombuffer(color_data, dtype=np.uint8).reshape((color_height, color_width, 3))
                    
                    # 调整大小
                    if color_width != width or color_height != height:
                        color_array = cv2.resize(color_array, (width, height))
                    
                    color_o3d = o3d.geometry.Image(color_array.astype(np.uint8))
                    
                    # 创建RGBD图像
                    rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
                        color_o3d, depth_o3d,
                        depth_scale=1000.0,
                        depth_trunc=3.0,
                        convert_rgb_to_intensity=False
                    )
                except:
                    # 如果彩色处理失败，只用深度
                    rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
                        o3d.geometry.Image(np.zeros((height, width, 3), dtype=np.uint8)),
                        depth_o3d,
                        depth_scale=1000.0,
                        depth_trunc=3.0
                    )
            else:
                # 只有深度
                rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
                    o3d.geometry.Image(np.zeros((height, width, 3), dtype=np.uint8)),
                    depth_o3d,
                    depth_scale=1000.0,
                    depth_trunc=3.0
                )
            
            # 相机内参
            intrinsic = o3d.camera.PinholeCameraIntrinsic()
            intrinsic.set_intrinsics(width, height, width/2, height/2, width/2, height/2)
            
            # 创建点云
            pcd = o3d.geometry.PointCloud.create_from_rgbd_image(rgbd, intrinsic)
            pcd.transform([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]])
            
            return pcd
            
        except Exception as e:
            print(f"创建点云错误: {e}")
            return None
    
    def run(self):
        """主循环"""
        if not self.initialize():
            return
        
        print("="*60)
        print("奥比相机点云查看器")
        print("="*60)
        print("显示窗口:")
        print("  1. 深度图 (Depth)")
        print("  2. 3D点云 (Point Cloud)")
        print("\n操作:")
        print("  深度窗口: ESC/Q - 退出")
        print("  点云窗口: 鼠标左键拖动-旋转, 滚轮-缩放")
        print("="*60)
        print("\n启动中...\n")
        
        # 创建深度图窗口
        cv2.namedWindow("Depth", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Depth", 640, 480)
        
        # 创建3D点云窗口
        self.vis = o3d.visualization.Visualizer()
        self.vis.create_window(window_name="Point Cloud - 3D点云", width=800, height=600)
        
        # 设置渲染选项
        opt = self.vis.get_render_option()
        opt.point_size = 2.0
        opt.background_color = np.asarray([0, 0, 0])
        
        print("✓ 窗口已打开\n")
        
        frame_count = 0
        
        try:
            while True:
                # 获取帧
                frameset = self.pipeline.waitForFrames(100)
                if frameset is None:
                    continue
                
                frame_count += 1
                
                depth_frame = frameset.depthFrame()
                color_frame = frameset.colorFrame()
                
                if not depth_frame:
                    continue
                
                # 显示深度图
                width = depth_frame.width()
                height = depth_frame.height()
                depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((height, width))
                
                # 转换为8位显示
                depth_display = (depth_data / depth_data.max() * 255).astype(np.uint8)
                depth_colormap = cv2.applyColorMap(depth_display, cv2.COLORMAP_JET)
                
                # 添加文字
                cv2.putText(depth_colormap, f"Depth - FPS: {frame_count % 30}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                cv2.imshow("Depth", depth_colormap)
                
                # 更新3D点云
                pcd = self.create_pointcloud(depth_frame, color_frame)
                if pcd and len(pcd.points) > 0:
                    if self.first_time:
                        self.pcd = pcd
                        self.vis.add_geometry(self.pcd)
                        self.first_time = False
                    else:
                        self.pcd.points = pcd.points
                        if pcd.has_colors():
                            self.pcd.colors = pcd.colors
                        self.vis.update_geometry(self.pcd)
                    
                    self.vis.poll_events()
                    self.vis.update_renderer()
                
                # 检查按键
                key = cv2.waitKey(1) & 0xFF
                if key == 27 or key == ord('q') or key == ord('Q'):
                    print("\n退出程序...")
                    break
                
                if frame_count % 30 == 0:
                    print(f"运行中... 帧数: {frame_count}", end='\r')
        
        except KeyboardInterrupt:
            print("\n\n用户中断")
        except Exception as e:
            print(f"\n错误: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """清理"""
        print("\n清理资源...")
        if self.pipeline:
            try:
                self.pipeline.stop()
            except:
                pass
        if self.vis:
            try:
                self.vis.destroy_window()
            except:
                pass
        cv2.destroyAllWindows()
        print("✓ 完成")


if __name__ == "__main__":
    viewer = SimplePointCloudViewer()
    viewer.run()
