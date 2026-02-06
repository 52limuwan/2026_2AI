"""
奥比相机点云与红外可视化程序
功能：实时显示红外图像，并支持点云生成和保存
操作说明：
  - ESC/Q: 退出程序
  - R: 生成并保存彩色点云 (RGBPoints.ply)
  - D: 生成并保存深度点云 (DepthPoints.ply)
  - S: 保存当前红外图像
"""

import sys
import os

# 导入配置
try:
    import config
    sdk_path = config.get_sdk_path()
except ImportError:
    # 如果没有配置文件，使用默认路径
    sdk_path = os.path.join(os.path.dirname(__file__), 
                            'OrbbecSDK_Python_v1.1.4_win_x64_release',
                            'OrbbecSDK_Python_v1.1.4_win_x64_release',
                            'python3.9', 'Samples')
    config = None

sys.path.insert(0, sdk_path)

from ObTypes import *
from Property import *
import Context
import Pipeline
import StreamProfile
import Filter
from Error import ObException
import cv2
import numpy as np
import time


class OrbbecViewer:
    def __init__(self):
        self.pipeline = None
        self.pointCloud = None
        
        # 使用配置文件中的设置（如果存在）
        if config:
            self.ir_window_name = config.IR_WINDOW_NAME
            self.depth_window_name = config.DEPTH_WINDOW_NAME
            self.frame_timeout = config.FRAME_TIMEOUT_MS
            self.show_fps = config.SHOW_FPS
            self.fps_interval = config.FPS_UPDATE_INTERVAL
        else:
            self.ir_window_name = "Infrared Viewer"
            self.depth_window_name = "Depth Viewer"
            self.frame_timeout = 100
            self.show_fps = True
            self.fps_interval = 30
        
        self.running = False
        self.current_ir_image = None
        
    def map_uint16_to_uint8(self, img, lower_bound=None, upper_bound=None):
        """将16位图像转换为8位用于显示"""
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
    
    def save_points_to_ply(self, frame, depth_scale, filename):
        """保存深度点云到PLY文件"""
        points = frame.getPointCloudData()
        points_size = len(points)
        print(f"保存点云数据，点数: {points_size}")
        
        with open(filename, "w") as fo:
            header = f"ply\nformat ascii 1.0\nelement vertex {points_size}\n"
            header += "property float x\nproperty float y\nproperty float z\nend_header\n"
            fo.write(header)
            
            for point in points:
                x = point.get("x") * depth_scale
                y = point.get("y") * depth_scale
                z = point.get("z") * depth_scale
                fo.write(f"{x} {y} {z}\n")
        
        print(f"✓ 点云已保存: {filename}")
    
    def save_rgb_points_to_ply(self, frame, depth_scale, filename):
        """保存彩色点云到PLY文件"""
        points = frame.getPointCloudData()
        points_size = len(points)
        print(f"保存彩色点云数据，点数: {points_size}")
        
        with open(filename, "w") as fo:
            header = f"ply\nformat ascii 1.0\nelement vertex {points_size}\n"
            header += "property float x\nproperty float y\nproperty float z\n"
            header += "property uchar red\nproperty uchar green\nproperty uchar blue\n"
            header += "end_header\n"
            fo.write(header)
            
            for point in points:
                x = point.get("x") * depth_scale
                y = point.get("y") * depth_scale
                z = point.get("z") * depth_scale
                r = int(point.get("r"))
                g = int(point.get("g"))
                b = int(point.get("b"))
                fo.write(f"{x} {y} {z} {r} {g} {b}\n")
        
        print(f"✓ 彩色点云已保存: {filename}")
    
    def generate_rgb_pointcloud(self):
        """生成彩色点云"""
        count = 0
        while count < 10:
            count += 1
            frameset = self.pipeline.waitForFrames(100)
            if frameset and frameset.depthFrame() and frameset.colorFrame():
                try:
                    print("正在生成彩色点云...")
                    depth_frame = frameset.depthFrame()
                    depth_scale = depth_frame.getValueScale()
                    self.pointCloud.setCreatePointFormat(OB_PY_FORMAT_RGB_POINT)
                    frame = self.pointCloud.process(frameset)
                    
                    timestamp = time.strftime("%Y%m%d_%H%M%S")
                    filename = f"RGBPoints_{timestamp}.ply"
                    self.save_rgb_points_to_ply(frame, depth_scale, filename)
                    return True
                except ObException as e:
                    print(f"生成彩色点云错误: {e.getMessage()}")
                break
        return False
    
    def generate_depth_pointcloud(self):
        """生成深度点云"""
        count = 0
        while count < 10:
            count += 1
            frameset = self.pipeline.waitForFrames(100)
            if frameset and frameset.depthFrame():
                try:
                    print("正在生成深度点云...")
                    depth_frame = frameset.depthFrame()
                    depth_scale = depth_frame.getValueScale()
                    self.pointCloud.setCreatePointFormat(OB_PY_FORMAT_POINT)
                    frame = self.pointCloud.process(frameset)
                    
                    timestamp = time.strftime("%Y%m%d_%H%M%S")
                    filename = f"DepthPoints_{timestamp}.ply"
                    self.save_points_to_ply(frame, depth_scale, filename)
                    return True
                except ObException as e:
                    print(f"生成深度点云错误: {e.getMessage()}")
                break
        return False
    
    def initialize(self):
        """初始化相机和配置"""
        try:
            # 创建上下文
            ctx = Context.Context(None)
            ctx.setLoggerSeverity(OB_PY_LOG_SEVERITY_ERROR)
            
            # 创建Pipeline
            self.pipeline = Pipeline.Pipeline(None, None)
            config = Pipeline.Config()
            
            # 配置深度流
            try:
                depth_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_DEPTH)
                depth_profile = depth_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
                config.enableStream(depth_profile)
                print("✓ 深度流配置成功")
            except ObException as e:
                print(f"深度流配置失败: {e.getMessage()}")
                return False
            
            # 配置彩色流
            try:
                color_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_COLOR)
                color_profile = color_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
                config.enableStream(color_profile)
                print("✓ 彩色流配置成功")
            except ObException as e:
                print(f"彩色流配置失败: {e.getMessage()}")
            
            # 配置红外流
            try:
                ir_profiles = self.pipeline.getStreamProfileList(OB_PY_SENSOR_IR)
                ir_profile = ir_profiles.getProfile(0).toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
                config.enableStream(ir_profile)
                self.ir_width = ir_profile.width()
                self.ir_height = ir_profile.height()
                print("✓ 红外流配置成功")
            except ObException as e:
                print(f"红外流配置失败: {e.getMessage()}")
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
            
            # 设置镜像（如果支持）
            try:
                if self.pipeline.getDevice().isPropertySupported(OB_PY_PROP_IR_MIRROR_BOOL, OB_PY_PERMISSION_WRITE):
                    self.pipeline.getDevice().setBoolProperty(OB_PY_PROP_IR_MIRROR_BOOL, True)
            except:
                pass
            
            return True
            
        except ObException as e:
            print(f"初始化错误: {e.getMessage()}")
            return False
    
    def run(self):
        """主运行循环"""
        if not self.initialize():
            print("初始化失败，程序退出")
            return
        
        print("\n" + "="*60)
        print("奥比相机可视化程序已启动")
        print("="*60)
        print("操作说明:")
        print("  ESC/Q - 退出程序")
        print("  R     - 生成并保存彩色点云 (RGB)")
        print("  D     - 生成并保存深度点云 (Depth)")
        print("  S     - 保存当前红外图像")
        print("="*60 + "\n")
        
        self.running = True
        cv2.namedWindow(self.ir_window_name, cv2.WINDOW_NORMAL)
        cv2.namedWindow(self.depth_window_name, cv2.WINDOW_NORMAL)
        
        frame_count = 0
        
        try:
            while self.running:
                # 获取帧数据
                frameset = self.pipeline.waitForFrames(100)
                if frameset is None:
                    continue
                
                frame_count += 1
                
                # 处理红外帧
                ir_frame = frameset.irFrame()
                if ir_frame:
                    self.display_ir_frame(ir_frame)
                
                # 处理深度帧
                depth_frame = frameset.depthFrame()
                if depth_frame:
                    self.display_depth_frame(depth_frame)
                
                # 处理键盘输入
                key = cv2.waitKey(1) & 0xFF
                
                if key == 27 or key == ord('q') or key == ord('Q'):  # ESC or Q
                    print("\n退出程序...")
                    break
                elif key == ord('r') or key == ord('R'):
                    print("\n[R] 生成彩色点云...")
                    self.generate_rgb_pointcloud()
                elif key == ord('d') or key == ord('D'):
                    print("\n[D] 生成深度点云...")
                    self.generate_depth_pointcloud()
                elif key == ord('s') or key == ord('S'):
                    print("\n[S] 保存红外图像...")
                    if ir_frame:
                        timestamp = time.strftime("%Y%m%d_%H%M%S")
                        filename = f"IR_Image_{timestamp}.png"
                        # 保存当前显示的图像
                        cv2.imwrite(filename, self.current_ir_image)
                        print(f"✓ 红外图像已保存: {filename}")
                
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
            
            # 根据格式处理数据
            if ir_format == int(OB_PY_FORMAT_Y16):
                data = np.resize(data, (self.ir_height, self.ir_width, 2))
                new_data = data[:, :, 0] + data[:, :, 1] * 256
            elif ir_format == int(OB_PY_FORMAT_Y8):
                data = np.resize(data, (self.ir_height, self.ir_width, 1))
                new_data = data[:, :, 0]
            else:
                return
            
            # 转换为8位图像
            new_data = self.map_uint16_to_uint8(new_data)
            
            # 转换为彩色图像以便显示
            new_data = cv2.cvtColor(new_data, cv2.COLOR_GRAY2RGB)
            
            # 添加文字信息
            cv2.putText(new_data, "Infrared View", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            self.current_ir_image = new_data
            cv2.imshow(self.ir_window_name, new_data)
            
        except Exception as e:
            print(f"显示红外帧错误: {e}")
    
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
            
            # 转换为8位图像
            depth_data = self.map_uint16_to_uint8(depth_data)
            
            # 应用颜色映射
            depth_colormap = cv2.applyColorMap(depth_data, cv2.COLORMAP_JET)
            
            # 添加文字信息
            cv2.putText(depth_colormap, "Depth View", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            cv2.imshow(self.depth_window_name, depth_colormap)
            
        except Exception as e:
            print(f"显示深度帧错误: {e}")
    
    def cleanup(self):
        """清理资源"""
        print("\n清理资源...")
        if self.pipeline:
            try:
                self.pipeline.stop()
                print("✓ Pipeline已停止")
            except:
                pass
        cv2.destroyAllWindows()
        print("✓ 程序已退出")


if __name__ == "__main__":
    viewer = OrbbecViewer()
    viewer.run()
