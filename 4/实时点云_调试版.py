"""
实时3D点云显示 - 调试版本
输出详细的调试信息
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
print("检查Open3D...")
try:
    import open3d as o3d
    print(f"✓ Open3D 版本: {o3d.__version__}")
    HAS_OPEN3D = True
except ImportError as e:
    print(f"✗ Open3D 未安装: {e}")
    sys.exit(1)

# 深度范围 (单位: mm)
MIN_DISTANCE = 300
MAX_DISTANCE = 3000

RESOLUTION_X = 640.0
RESOLUTION_Y = 480.0


class CameraIntrinsics:
    def __init__(self, fx=480.0, fy=480.0, cx=320.0, cy=240.0):
        self.fx = fx
        self.fy = fy
        self.cx = cx
        self.cy = cy


def get_camera_intrinsics(pipeline):
    """从Pipeline获取相机内参"""
    try:
        print("\n尝试获取相机内参...")
        camera_param = pipeline.getCameraParam()
        print(f"camera_param 类型: {type(camera_param)}")
        
        intrinsics = CameraIntrinsics(
            fx=camera_param.depthIntrinsic.fx,
            fy=camera_param.depthIntrinsic.fy,
            cx=camera_param.depthIntrinsic.cx,
            cy=camera_param.depthIntrinsic.cy
        )
        print(f"✓ 相机内参: fx={intrinsics.fx:.2f}, fy={intrinsics.fy:.2f}, cx={intrinsics.cx:.2f}, cy={intrinsics.cy:.2f}")
        return intrinsics
    except Exception as e:
        print(f"⚠ 获取内参失败: {e}")
        print("使用默认内参")
        return CameraIntrinsics()


def depth_to_pointcloud_fast(depth_data, width, height, intrinsics):
    """快速深度转点云"""
    print(f"\n转换点云:")
    print(f"  输入: {width}x{height}, dtype={depth_data.dtype}")
    print(f"  深度范围: {depth_data.min()} - {depth_data.max()}")
    
    scale_x = width / RESOLUTION_X
    scale_y = height / RESOLUTION_Y
    
    fx = intrinsics.fx * scale_x
    fy = intrinsics.fy * scale_y
    cx = intrinsics.cx * scale_x
    cy = intrinsics.cy * scale_y
    
    print(f"  调整后内参: fx={fx:.2f}, fy={fy:.2f}, cx={cx:.2f}, cy={cy:.2f}")
    
    # 创建像素坐标网格
    u = np.arange(width)
    v = np.arange(height)
    u, v = np.meshgrid(u, v)
    
    # 过滤有效深度
    valid_mask = (depth_data > MIN_DISTANCE) & (depth_data < MAX_DISTANCE)
    valid_count = np.count_nonzero(valid_mask)
    print(f"  有效点: {valid_count}/{width*height} ({valid_count*100.0/(width*height):.1f}%)")
    
    if valid_count == 0:
        print("  ✗ 没有有效点！")
        return np.array([])
    
    # 计算3D坐标
    z = depth_data[valid_mask].astype(np.float32)
    x = (u[valid_mask] - cx) / fx * z
    y = (v[valid_mask] - cy) / fy * z
    
    # 组合成点云
    points = np.stack([x, y, z], axis=-1)
    
    print(f"  点云范围:")
    print(f"    X: {x.min():.1f} ~ {x.max():.1f}")
    print(f"    Y: {y.min():.1f} ~ {y.max():.1f}")
    print(f"    Z: {z.min():.1f} ~ {z.max():.1f}")
    
    return points


def main():
    print("="*60)
    print("  实时3D点云显示 - 调试版本")
    print("="*60)
    
    try:
        # 初始化SDK
        print("\n初始化SDK...")
        ctx = Context.Context(None)
        ctx.setLoggerSeverity(OB_PY_LOG_SEVERITY_ERROR)
        print("✓ Context 创建成功")
        
        # 创建pipeline
        print("\n创建Pipeline...")
        pipeline = Pipeline.Pipeline(None, None)
        config = Pipeline.Config()
        print("✓ Pipeline 创建成功")
        
        # 配置深度流
        print("\n配置深度流...")
        profiles = pipeline.getStreamProfileList(OB_PY_SENSOR_DEPTH)
        print(f"  可用配置数: {profiles.count()}")
        
        videoProfile = profiles.getProfile(0)
        depthProfile = videoProfile.toConcreteStreamProfile(OB_PY_STREAM_VIDEO)
        config.enableStream(depthProfile)
        
        depth_width = depthProfile.width()
        depth_height = depthProfile.height()
        depth_fps = depthProfile.fps()
        print(f"✓ 深度流: {depth_width}x{depth_height} @ {depth_fps}fps")
        
        # 启动pipeline
        print("\n启动Pipeline...")
        pipeline.start(config, None)
        print("✓ Pipeline 已启动")
        
        # 获取相机内参
        intrinsics = get_camera_intrinsics(pipeline)
        
        # 等待相机稳定
        print("\n等待相机稳定...")
        for i in range(10):
            frameset = pipeline.waitForFrames(100)
            if frameset:
                print(f"\r  预热: {i+1}/10", end="")
        print("\n✓ 相机已稳定")
        
        # 测试获取几帧
        print("\n测试获取帧...")
        for test_frame in range(3):
            print(f"\n--- 测试帧 {test_frame+1} ---")
            frameset = pipeline.waitForFrames(100)
            
            if frameset is None:
                print("✗ frameset 为 None")
                continue
            
            print("✓ frameset 获取成功")
            
            depth_frame = frameset.depthFrame()
            if depth_frame is None:
                print("✗ depth_frame 为 None")
                continue
            
            print("✓ depth_frame 获取成功")
            print(f"  宽度: {depth_frame.width()}")
            print(f"  高度: {depth_frame.height()}")
            print(f"  数据大小: {depth_frame.dataSize()}")
            
            # 获取深度数据
            depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((depth_height, depth_width))
            
            # 转换为点云
            points = depth_to_pointcloud_fast(depth_data, depth_width, depth_height, intrinsics)
            
            if len(points) > 0:
                print(f"✓ 成功生成 {len(points)} 个点")
            else:
                print("✗ 点云为空")
        
        # 创建Open3D窗口
        print("\n创建Open3D窗口...")
        vis = o3d.visualization.Visualizer()
        success = vis.create_window(window_name="实时点云 - 调试", width=1024, height=768)
        print(f"  create_window 返回: {success}")
        
        if not success:
            print("✗ 无法创建Open3D窗口")
            pipeline.stop()
            return
        
        print("✓ Open3D 窗口创建成功")
        
        # 创建点云对象
        print("\n创建点云对象...")
        pcd = o3d.geometry.PointCloud()
        vis.add_geometry(pcd)
        print("✓ 点云对象已添加")
        
        # 设置渲染选项
        opt = vis.get_render_option()
        opt.point_size = 3.0
        opt.background_color = np.asarray([0.1, 0.1, 0.1])
        print("✓ 渲染选项已设置")
        
        print("\n开始实时显示...")
        print("按 ESC 或关闭窗口退出\n")
        
        frame_count = 0
        update_count = 0
        
        while True:
            # 获取帧
            frameset = pipeline.waitForFrames(100)
            if frameset is None:
                continue
            
            depth_frame = frameset.depthFrame()
            if depth_frame is None:
                continue
            
            frame_count += 1
            
            # 获取深度数据
            depth_data = np.frombuffer(depth_frame.data(), dtype=np.uint16).reshape((depth_height, depth_width))
            
            # 转换为点云
            valid_mask = (depth_data > MIN_DISTANCE) & (depth_data < MAX_DISTANCE)
            valid_count = np.count_nonzero(valid_mask)
            
            if valid_count < 100:
                print(f"\r帧 {frame_count}: 有效点太少 ({valid_count})", end="")
                continue
            
            # 快速转换
            scale_x = depth_width / RESOLUTION_X
            scale_y = depth_height / RESOLUTION_Y
            fx = intrinsics.fx * scale_x
            fy = intrinsics.fy * scale_y
            cx = intrinsics.cx * scale_x
            cy = intrinsics.cy * scale_y
            
            u = np.arange(depth_width)
            v = np.arange(depth_height)
            u, v = np.meshgrid(u, v)
            
            z = depth_data[valid_mask].astype(np.float32)
            x = (u[valid_mask] - cx) / fx * z
            y = (v[valid_mask] - cy) / fy * z
            
            points = np.stack([x, y, z], axis=-1)
            
            # 更新点云
            pcd.points = o3d.utility.Vector3dVector(points)
            
            # 添加颜色
            z_norm = (z - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)
            z_norm = np.clip(z_norm, 0, 1)
            colors = np.zeros((len(points), 3))
            colors[:, 0] = 1.0 - z_norm
            colors[:, 1] = z_norm * 0.5
            colors[:, 2] = z_norm
            pcd.colors = o3d.utility.Vector3dVector(colors)
            
            # 更新显示
            if update_count == 0:
                vis.reset_view_point(True)
            
            vis.update_geometry(pcd)
            
            if not vis.poll_events():
                print("\n窗口已关闭")
                break
            
            vis.update_renderer()
            
            update_count += 1
            print(f"\r帧 {frame_count}: 点数 {len(points):6d}, 更新 {update_count}", end="")
        
        # 清理
        vis.destroy_window()
        pipeline.stop()
        print("\n\n✓ 程序已退出")
    
    except ObException as e:
        print(f"\n✗ SDK错误: {e.getMessage()}")
    except Exception as e:
        print(f"\n✗ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
