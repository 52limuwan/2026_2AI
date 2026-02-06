"""
奥比相机实时点云可视化程序
功能：实时显示3D点云、红外图像和深度图像
"""

import sys
import os
import numpy as np
import cv2

# 添加SDK库路径
try:
    import config
    sdk_path = config.get_sdk_path()
except ImportError:
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
import Filter
from Error import ObException

# 检查是否安装了Open3D
try:
    import open3d as o3d
    HAS_OPEN3D = True
    print("✓ Open3D 已安装，将显示实时3D点云")
except ImportError:
    HAS_OPEN3D = False
    print("⚠ 未安装 Open3D，只显示2D图像")
    print("安装命令: pip install open3d")


class PointCloudViewer:
    def __init__(self):
        self.pipeline = None
        self.pointCloud = None
        self.running = False
        
        # Open3D可视化器
        if HAS_OPEN3D:
            self.vis = None
            self.pcd = None
            self.first_time = True
        
    def map_uint16_to_uint8(self, img, lower_bound=None, upper_bound=None):
        """将16位图像转换为8位"""
        if lower_bound is None:
            lower_bound = np.min(img)
        if upper_bound is None:
            upper_bound = np.max(img)
        lut = np.concatenate([
            np.zeros(lower_bound, dtype=np.uint16),
            np.linspace(0, 255, upper_bound - lower_bound).astype(np.uint16),
            np.ones(2**16 - upper_bound, dtype=np.uint16) * 255
        ])
        return lut[img].astype(np.uint8)
    
    def initialize(self):
        """初始化相机"""
        try:
            ctx = Context.Context(None)
            ctx.setLoggerSeverity(OB_PY_LOG_SEVERITY_ERROR)
            
            self.pipeline = Pipeline.Pipeline(None, None)
            config = Pipeline.Config()
            
            # 配置深度流
            try:
                depth_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_DEPTH)
                depth_profile = depth_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
                config.enableStream(depth_profile)
                print("✓ 深度流配置成功")
            except ObException as e:
                print(f"✗ 深度流配置失败: {e.getMessage()}")
                return False
            
            # 配置彩色流
            try:
                color_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_COLOR)
                color_profile = color_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
                config.enableStream(color_profile)
                print("✓ 彩色流配置成功")
            except ObException as e:
                print(f"⚠ 彩色流配置失败: {e.getMessage()}")
            
            # 配置红外流
            try:
                ir_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_IR)
                ir_profile = ir_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
                config.enableStream(ir_profile)
                self.ir_width = ir_profile.width()
                self.ir_height = ir_profile.height()
                print("✓ 红外流配置成功")
            except ObException as e:
                print(f"⚠ 红外流配置失败: {e.getMessage()}")
                self.ir_width = 640
                self.ir_height = 480
            
            # 设置对齐模式
            config.setAlignMode(OB_PY_ALIGN_D2C_HW_MODE)
            
            # 启动Pipeline
            self.pipeline.start(config, None)
            print("✓ Pipeline启动成功")
            
            # 创建点云滤波器
            self.pointCloud = Filter.PointCloudFilter()
            camera_param = self.pipeline.getCameraParam()
            self.pointCloud.setCameraParam(camera_param)
            print("✓ 点云滤波器初始化成功")
            
            return True
            
        except ObException as e:
            print(f"✗ 初始化错误: {e.getMessage()}")
            return False
    
    def create_point_cloud_from_rgbd(self, depth_frame, color_frame):
        """从深度和彩色帧创建点云"""
        if not HAS_OPEN3D:
            return None
        
        try:
            # 获取深度数据
            depth_width = depth_frame.width()
            depth_height = depth_frame.height()
            depth_data = depth_frame.data()
            depth_array = np.frombuffer(depth_data, dtype=np.uint16).reshape((depth_height, depth_width))
            
            # 获取彩色数据
            color_width = color_frame.width()
            color_height = color_frame.height()
            color_data = color_frame.data()
            
            # 根据格式处理彩色数据
            color_format = color_frame.format()
            if color_format == int(OB_PY_FORMAT_RGB):
                color_array = np.frombuffer(color_data, dtype=np.uint8).reshape((color_height, color_width, 3))
            elif color_format == int(OB_PY_FORMAT_BGR):
                color_array = np.frombuffer(color_data, dtype=np.uint8).reshape((color_height, color_width, 3))
                color_array = cv2.cvtColor(color_array, cv2.COLOR_BGR2RGB)
            elif color_format == int(OB_PY_FORMAT_YUYV):
                yuyv = np.frombuffer(color_data, dtype=np.uint8).reshape((color_height, color_width, 2))
                color_array = cv2.cvtColor(yuyv, cv2.COLOR_YUV2RGB_YUYV)
            else:
                # 默认处理
                color_array = np.frombuffer(color_data, dtype=np.uint8).reshape((color_height, color_width, 3))
            
            # 调整彩色图像大小以匹配深度图像
            if color_width != depth_width or color_height != depth_height:
                color_array = cv2.resize(color_array, (depth_width, depth_height))
            
            # 创建Open3D RGBD图像
            depth_o3d = o3d.geometry.Image(depth_array.astype(np.uint16))
            color_o3d = o3d.geometry.Image(color_array.astype(np.uint8))
            rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
                color_o3d, 
                depth_o3d,
                depth_scale=1000.0,
                depth_trunc=3.0,
                convert_rgb_to_intensity=False
            )
            
            # 创建相机内参
            intrinsic = o3d.camera.PinholeCameraIntrinsic()
            intrinsic.set_intrinsics(
                depth_width, depth_height,
                depth_width / 2, depth_height / 2,  # fx, fy
                depth_width / 2, depth_height / 2   # cx, cy
            )
            
            # 从RGBD创建点云
            pcd = o3d.geometry.PointCloud.create_from_rgbd_image(rgbd, intrinsic)
            
            # 翻转点云（相机坐标系转换）
            pcd.transform([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]])
            
            return pcd
            
        except Exception as e:
            print(f"创建点云错误: {e}")
            return None
    
    def run(self):
        """主运行循环"""
        if not self.initialize():
            print("初始化失败，程序退出")
            return
        
        print("\n" + "="*60)
        print("奥比相机实时点云可视化程序")
        print("="*60)
        if HAS_OPEN3D:
            print("✓ 3D点云窗口将自动打开")
            print("  鼠标左键拖动 - 旋转")
            print("  鼠标滚轮     - 缩放")
            print("  鼠标右键拖动 - 平移")
        print("\n2D图像窗口操作:")
        print("  ESC/Q - 退出程序")
        print("  S     - 保存当前点云为PLY文件")
        print("="*60 + "\n")
        
        self.running = True
        
        # 创建OpenCV窗口
        cv2.namedWindow("Infrared View", cv2.WINDOW_NORMAL)
        cv2.namedWindow("Depth View", cv2.WINDOW_NORMAL)
        
        # 创建Open3D可视化器
        if HAS_OPEN3D:
            self.vis = o3d.visualization.Visualizer()
            self.vis.create_window(window_name="3D Point Cloud - 实时点云", width=1024, height=768)
            
            # 设置渲染选项
            opt = self.vis.get_render_option()
            opt.point_size = 2.0
            opt.background_color = np.asarray([0.1, 0.1, 0.1])
        
        frame_count = 0
        
        try:
            while self.running:
                # 获取帧数据
                frameset = self.pipeline.waitForFrames(100)
                if frameset is None:
                    continue
                
                frame_count += 1
                
                # 获取各种帧
                depth_frame = frameset.depthFrame()
                color_frame = frameset.colorFrame()
                ir_frame = frameset.irFrame()
                
                # 显示红外图像
                if ir_frame:
                    self.display_ir_frame(ir_frame)
                
                # 显示深度图像
                if depth_frame:
                    self.display_depth_frame(depth_frame)
                
                # 更新3D点云
                if HAS_OPEN3D and depth_frame and color_frame:
                    pcd = self.create_point_cloud_from_rgbd(depth_frame, color_frame)
                    if pcd is not None and len(pcd.points) > 0:
                        if self.first_time:
                            self.pcd = pcd
                            self.vis.add_geometry(self.pcd)
                            self.first_time = False
                        else:
                            self.pcd.points = pcd.points
                            self.pcd.colors = pcd.colors
                            self.vis.update_geometry(self.pcd)
                        
                        self.vis.poll_events()
                        self.vis.update_renderer()
                
                # 处理键盘输入
                key = cv2.waitKey(1) & 0xFF
                
                if key == 27 or key == ord('q') or key == ord('Q'):  # ESC or Q
                    print("\n退出程序...")
                    break
                elif key == ord('s') or key == ord('S'):
                    if HAS_OPEN3D and self.pcd is not None:
                        import time
                        timestamp = time.strftime("%Y%m%d_%H%M%S")
                        filename = f"PointCloud_{timestamp}.ply"
                        o3d.io.write_point_cloud(filename, self.pcd)
                        print(f"\n✓ 点云已保存: {filename}")
                
                # 显示帧率
                if frame_count % 30 == 0:
                    print(f"运行中... 已处理 {frame_count} 帧", end='\r')
        
        except KeyboardInterrupt:
            print("\n\n用户中断程序")
        except Exception as e:
            print(f"\n运行错误: {e}")
        finally:
            self.cleanup()
    
    def display_ir_frame(self, ir_frame):
        """显示红外帧"""
        try:
            size = ir_frame.dataSize()
            if size == 0:
                return
            
            data = ir_frame.data()
            ir_format = ir_frame.format()
            
            if ir_format == int(OB_PY_FORMAT_Y16):
                data = np.resize(data, (self.ir_height, self.ir_width, 2))
                new_data = data[:, :, 0] + data[:, :, 1] * 256
            elif ir_format == int(OB_PY_FORMAT_Y8):
                data = np.resize(data, (self.ir_height, self.ir_width, 1))
                new_data = data[:, :, 0]
            else:
                return
            
            new_data = self.map_uint16_to_uint8(new_data)
            new_data = cv2.cvtColor(new_data, cv2.COLOR_GRAY2RGB)
            
            cv2.putText(new_data, "Infrared View", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            cv2.imshow("Infrared View", new_data)
            
        except Exception as e:
            pass
    
    def display_depth_frame(self, depth_frame):
        """显示深度帧"""
        try:
            width = depth_frame.width()
            height = depth_frame.height()
            size = depth_frame.dataSize()
            
            if size == 0:
                return
            
            data = depth_frame.data()
            data = np.resize(data, (height, width, 2))
            depth_data = data[:, :, 0] + data[:, :, 1] * 256
            
            depth_data = self.map_uint16_to_uint8(depth_data)
            depth_colormap = cv2.applyColorMap(depth_data, cv2.COLORMAP_JET)
            
            cv2.putText(depth_colormap, "Depth View", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            cv2.imshow("Depth View", depth_colormap)
            
        except Exception as e:
            pass
    
    def cleanup(self):
        """清理资源"""
        print("\n清理资源...")
        if self.pipeline:
            try:
                self.pipeline.stop()
                print("✓ Pipeline已停止")
            except:
                pass
        
        if HAS_OPEN3D and self.vis:
            try:
                self.vis.destroy_window()
            except:
                pass
        
        cv2.destroyAllWindows()
        print("✓ 程序已退出")


if __name__ == "__main__":
    if not HAS_OPEN3D:
        print("\n" + "="*60)
        print("⚠ 警告: 未安装 Open3D")
        print("="*60)
        print("程序将只显示2D图像，不显示3D点云")
        print("\n要显示3D点云，请安装 Open3D:")
        print("  pip install open3d")
        print("\n按回车继续运行（只显示2D图像）...")
        print("或按 Ctrl+C 退出安装 Open3D 后再运行")
        print("="*60)
        try:
            input()
        except KeyboardInterrupt:
            print("\n程序已取消")
            sys.exit(0)
    
    viewer = PointCloudViewer()
    viewer.run()
