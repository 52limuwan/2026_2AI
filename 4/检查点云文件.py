"""
检查生成的点云文件
"""

import open3d as o3d
import numpy as np
import os

ply_file = "RGBPoints.ply"

if not os.path.exists(ply_file):
    print(f"错误: 找不到文件 {ply_file}")
    print("请先运行程序并按R键生成点云")
    input("按回车退出...")
    exit()

print(f"正在加载: {ply_file}")
pcd = o3d.io.read_point_cloud(ply_file)

print(f"\n点云信息:")
print(f"  点数: {len(pcd.points)}")
print(f"  有颜色: {pcd.has_colors()}")
print(f"  有法线: {pcd.has_normals()}")

if len(pcd.points) > 0:
    points = np.asarray(pcd.points)
    print(f"\n坐标范围:")
    print(f"  X: {points[:, 0].min():.3f} ~ {points[:, 0].max():.3f}")
    print(f"  Y: {points[:, 1].min():.3f} ~ {points[:, 1].max():.3f}")
    print(f"  Z: {points[:, 2].min():.3f} ~ {points[:, 2].max():.3f}")
    
    if pcd.has_colors():
        colors = np.asarray(pcd.colors)
        print(f"\n颜色范围:")
        print(f"  R: {colors[:, 0].min():.3f} ~ {colors[:, 0].max():.3f}")
        print(f"  G: {colors[:, 1].min():.3f} ~ {colors[:, 1].max():.3f}")
        print(f"  B: {colors[:, 2].min():.3f} ~ {colors[:, 2].max():.3f}")
        
        # 检查是否所有颜色都是白色
        if colors.max() > 0.9 and colors.min() > 0.9:
            print("\n⚠ 警告: 所有点都是白色!")
        elif colors.max() < 0.1:
            print("\n⚠ 警告: 所有点都是黑色!")
    
    # 检查是否所有点的Z坐标都是0
    if points[:, 2].max() == 0:
        print("\n⚠ 警告: 所有点的Z坐标都是0!")
    
    print("\n正在显示点云...")
    print("如果看不到点云，尝试:")
    print("  1. 滚轮缩小")
    print("  2. 按 H 键查看帮助")
    print("  3. 按 - 键缩小点的大小")
    
    # 设置可视化参数
    vis = o3d.visualization.Visualizer()
    vis.create_window(window_name="Point Cloud Check", width=1024, height=768)
    vis.add_geometry(pcd)
    
    # 设置渲染选项
    opt = vis.get_render_option()
    opt.point_size = 3.0
    opt.background_color = np.asarray([0.5, 0.5, 0.5])  # 灰色背景
    
    # 重置视角
    vis.reset_view_point(True)
    
    vis.run()
    vis.destroy_window()
else:
    print("\n错误: 点云为空!")

input("\n按回车退出...")
