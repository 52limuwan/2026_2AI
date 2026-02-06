"""
实时3D点云显示
一启动就显示点云，实时更新
"""

import sys
import os
import numpy as np
import time

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
from Error import ObException

# 检查Open3D
try:
    import open3d as o3d
    HAS_OPEN3D = True
    print("✓ Open3D 可用")
except ImportError:
    HAS_OPEN3D = False
    print("✗ Open3D 未安装，无法显示3D点云")
    sys.exit(1)

# 深度范围 (单位: mm)
MIN_DISTANCE = 300
MAX_DISTANCE = 3000

# 默认分辨率
RESOLUTION_X = 640.0
RESOLUTION_Y = 480.0


class CameraIntrinsics:
    """相机内参"""
    def __init__(self, fx=480.0, fy=480.0, cx=320.0, cy=240.0):
        self.fx = fx
        self.fy = fy
        self.cx = cx
        self.cy = cy


def get_camera_intrinsics(pipeline):
    """从Pipeline获取相机内参"""
    try:
        camera_param = pipeline.getCameraParam()
        intrinsics = CameraIntrinsics(
            fx=camera_param.depthIntrinsic.fx,
            fy=camera_param.depthIntrinsic.fy,
            cx=camera_param.depthIntrinsic.cx,
            cy=camera_param.depthIntrinsic.cy
        )
        print(f"相机内参: fx={intrinsics.fx:.2f}, fy={intrinsics.fy:.2f}, cx={intrinsics.cx:.2f}, cy={intrinsics.cy:.2f}")
        return intrinsics
    except Exception as e:
        print(f"⚠ 使用默认内参: {e}")
        return CameraIntrinsics()


def depth_to_pointcloud_fast(depth_data, width, height, intrinsics):
    """
    快速将深度图转换为点云（向量化计算）
    """
    # 根据实际分辨率调整内参
    scale_x = width / RESOLUTION_X
    scale_y = height / RESOLUTION_Y
    
    fx = intrinsics.fx * scale_x
    fy = intrinsics.fy * scale_y
    cx = intrinsics.cx * scale_x
    cy = intrinsics.cy * scale_y
    
    # 创建像素坐标网格
    u = np.arange(width)
    v = np.arange(height)
    u, v = np.meshgrid(u, v)
    
    # 过滤有效深度
    valid_mask = (depth_data > MIN_DISTANCE) & (depth_data < MAX_DISTANCE)
    
    # 计算3D坐标
    z = depth_data[valid_mask].astype(np.float32)
    x = (u[valid_mask] - cx) / fx * z
    y = (v[valid_mask] - cy) / fy * z
    
    # 组合成点云
    points = np.stack([x, y, z], axis=-1)
    
    return points


class RealtimePointCloudViewer:
    """实时点云查看器"""
    
    def __init__(self, pipeline, intrinsics, width, height):
        self.pipeline = pipeline
        self.intrinsics = intrinsics
        self.width = width
        self.height = height
        
        # 创建Open3D可视化窗口
        self.vis = o3d.visualization.Visualizer()
        self.vis.create_window(window_name="实时点云 - ESC退出", width=1280, height=720)
        
        # 创建点云对象
        self.pcd = o3d.geometry.PointCloud()
        self.vis.add_geometry(self.pcd)
        
        # 设置渲染选项
        opt = self.vis.get_render_option()
        opt.point_size = 2.0
        opt.background_color = np.asarray([0.1, 0.1, 0.1])
        opt.show_coordinate_frame = True
        
        # 设置视角
        ctr = self.vis.get_view_control()
        ctr.set_zoom(0.5)
        
        self.frame_count = 0
        self.last_time = time.time()
        self.fps = 0
        
        print("\n✓ 实时点云窗口已创建")
        print("  鼠标左键 - 旋转")
        print("  滚轮     - 缩放")
        print("  右键     - 平移")
        print("  按 ESC   - 退出\n")
    
    def update(self):
        """更新点云"""
        # 获取帧
        frameset = self.pipeline.waitForFrames(100)
        if frameset is None:
            return True
        
        depth_frame = frameset.depthFrame()
        if depth_frame is None:
            return True
        
        # 获取深度数据
        depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((self.height, self.width))
        
        # 转换为点云
        points = depth_to_pointcloud_fast(depth_data, self.width, self.height, self.intrinsics)
        
        if len(points) < 100:
            return True
        
        # 更新点云
        self.pcd.points = o3d.utility.Vector3dVector(points)
        
        # 添加颜色（根据深度着色）
        z_values = points[:, 2]
        z_norm = (z_values - z_values.min()) / (z_values.max() - z_values.min() + 1e-6)
        colors = np.zeros((len(points), 3))
        colors[:, 0] = 1.0 - z_norm  # R
        colors[:, 1] = z_norm * 0.5  # G
        colors[:, 2] = z_norm        # B
        self.pcd.colors = o3d.utility.Vector3dVector(colors)
        
        # 更新几何体
        self.vis.update_geometry(self.pcd)
        self.vis.poll_events()
        self.vis.update_renderer()
        
        # 计算FPS
        self.frame_count += 1
        current_time = time.time()
        if current_time - self.last_time >= 1.0:
            self.fps = self.frame_count / (current_time - self.last_time)
            print(f"\r点数: {len(points):6d} | FPS: {self.fps:.1f} | 深度范围: {z_values.min():.0f}-{z_values.max():.0f}mm", end="")
            self.frame_count = 0
            self.last_time = current_time
        
        return True
    
    def run(self):
        """运行实时显示"""
        print("开始实时显示...")
        
        try:
            while True:
                if not self.update():
                    break
                
                # 检查窗口是否关闭
                if not self.vis.poll_events():
                    break
        
        except KeyboardInterrupt:
            print("\n\n用户中断")
        
        finally:
            self.vis.destroy_window()
            print("\n✓ 窗口已关闭")


def main():
    print("="*60)
    print("  实时3D点云显示程序")
    print("="*60)
    
    try:
        # 初始化SDK
        ctx = Context.Context(None)
        ctx.setLoggerSeverity(OB_PY_LOG_SEVERITY_ERROR)
        
        # 创建pipeline
        pipeline = Pipeline.Pipeline(None, None)
        config = Pipeline.Config()
        
        # 配置深度流
        print("\n正在配置深度流...")
        profiles = pipeline.getStreamProfileList(OB_PY_SENSOR_DEPTH)
        videoProfile = profiles.getProfile(0)
        depthProfile = videoProfile.toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
        config.enableStream(depthProfile)
        
        depth_width = depthProfile.width()
        depth_height = depthProfile.height()
        print(f"✓ 深度流: {depth_width}x{depth_height} @ {depthProfile.fps()}fps")
        
        # 启动pipeline
        print("正在启动相机...")
        pipeline.start(config, None)
        print("✓ 相机已启动")
        
        # 获取相机内参
        intrinsics = get_camera_intrinsics(pipeline)
        
        # 等待几帧让相机稳定
        print("\n等待相机稳定...")
        for i in range(10):
            frameset = pipeline.waitForFrames(100)
            if frameset:
                print(f"\r预热: {i+1}/10", end="")
        print("\n✓ 相机已稳定")
        
        # 创建并运行实时查看器
        viewer = RealtimePointCloudViewer(pipeline, intrinsics, depth_width, depth_height)
        viewer.run()
        
        # 清理
        pipeline.stop()
        print("✓ 程序已退出")
    
    except ObException as e:
        print(f"\n✗ SDK错误: {e.getMessage()}")
    except Exception as e:
        print(f"\n✗ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
