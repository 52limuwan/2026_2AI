"""
简单的点云查看器
用于快速查看生成的PLY点云文件
"""

import os
import sys

print("=" * 60)
print("点云文件查看器")
print("=" * 60)
print()

# 查找当前目录下的所有PLY文件
ply_files = [f for f in os.listdir('.') if f.endswith('.ply')]

if not ply_files:
    print("❌ 当前目录下没有找到 .ply 文件")
    print()
    print("请先运行 orbbec_viewer.py 并按 R 或 D 键生成点云")
    print()
    input("按回车键退出...")
    sys.exit(0)

print(f"✓ 找到 {len(ply_files)} 个点云文件:")
print()

# 按修改时间排序
ply_files_with_time = [(f, os.path.getmtime(f)) for f in ply_files]
ply_files_with_time.sort(key=lambda x: x[1], reverse=True)

# 显示文件列表
for i, (filename, mtime) in enumerate(ply_files_with_time, 1):
    size_mb = os.path.getsize(filename) / (1024 * 1024)
    from datetime import datetime
    time_str = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
    print(f"{i}. {filename}")
    print(f"   大小: {size_mb:.2f} MB | 时间: {time_str}")
    print()

print("=" * 60)
print()

# 尝试使用Open3D查看
try:
    import open3d as o3d
    print("✓ 检测到 Open3D 库")
    print()
    
    # 选择文件
    if len(ply_files) == 1:
        choice = 1
        print(f"自动选择唯一的文件: {ply_files[0]}")
    else:
        try:
            choice = int(input(f"请选择要查看的文件 (1-{len(ply_files)}): "))
            if choice < 1 or choice > len(ply_files):
                print("无效的选择")
                input("按回车键退出...")
                sys.exit(1)
        except ValueError:
            print("无效的输入")
            input("按回车键退出...")
            sys.exit(1)
    
    selected_file = ply_files_with_time[choice - 1][0]
    print()
    print(f"正在加载点云: {selected_file}")
    print("请稍候...")
    
    # 读取点云
    pcd = o3d.io.read_point_cloud(selected_file)
    
    # 显示点云信息
    print()
    print("点云信息:")
    print(f"  点数: {len(pcd.points):,}")
    print(f"  有颜色: {'是' if pcd.has_colors() else '否'}")
    print(f"  有法线: {'是' if pcd.has_normals() else '否'}")
    print()
    print("=" * 60)
    print("3D查看器操作说明:")
    print("  鼠标左键拖动 - 旋转")
    print("  鼠标滚轮     - 缩放")
    print("  鼠标右键拖动 - 平移")
    print("  按 H 键      - 显示帮助")
    print("  按 Q 键      - 退出")
    print("=" * 60)
    print()
    input("按回车键打开3D查看器...")
    
    # 可视化
    o3d.visualization.draw_geometries(
        [pcd],
        window_name=f"点云查看器 - {selected_file}",
        width=1024,
        height=768,
        left=50,
        top=50
    )
    
    print()
    print("查看器已关闭")
    
except ImportError:
    print("❌ 未安装 Open3D 库")
    print()
    print("Open3D 是一个强大的3D数据处理库，可以直接在Python中查看点云")
    print()
    print("安装方法:")
    print("  pip install open3d")
    print()
    print("或者使用其他软件查看:")
    print("  1. CloudCompare (推荐) - https://www.cloudcompare.org/")
    print("  2. MeshLab - https://www.meshlab.net/")
    print("  3. Blender - https://www.blender.org/")
    print()
    print("只需将 .ply 文件拖拽到这些软件中即可查看")
    print()

except Exception as e:
    print(f"❌ 加载点云时出错: {e}")
    print()

input("按回车键退出...")
