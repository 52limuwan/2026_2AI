"""
奥比相机SDK测试脚本
用于验证SDK是否正确配置和相机是否正常连接
"""

import sys
import os

print("=" * 60)
print("奥比相机SDK测试程序")
print("=" * 60)
print()

# 测试1: 检查Python版本
print("[测试1] 检查Python版本...")
python_version = sys.version_info
print(f"  Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
if python_version.major == 3 and python_version.minor in [7, 8, 9]:
    print("  ✓ Python版本符合要求")
else:
    print("  ⚠ 警告: 推荐使用Python 3.7/3.8/3.9")
print()

# 测试2: 检查依赖包
print("[测试2] 检查依赖包...")
try:
    import numpy as np
    print(f"  ✓ numpy {np.__version__}")
except ImportError:
    print("  ✗ numpy 未安装")
    print("    安装命令: pip install numpy")

try:
    import cv2
    print(f"  ✓ opencv-python {cv2.__version__}")
except ImportError:
    print("  ✗ opencv-python 未安装")
    print("    安装命令: pip install opencv-python")
print()

# 测试3: 检查SDK路径
print("[测试3] 检查SDK路径...")
try:
    import config
    sdk_path = config.get_sdk_path()
    print(f"  SDK路径: {sdk_path}")
except ImportError:
    sdk_path = os.path.join(os.path.dirname(__file__), 
                            'OrbbecSDK_Python_v1.1.4_win_x64_release',
                            'OrbbecSDK_Python_v1.1.4_win_x64_release',
                            'python3.9', 'Samples')
    print(f"  SDK路径 (默认): {sdk_path}")

if os.path.exists(sdk_path):
    print("  ✓ SDK路径存在")
    
    # 检查关键文件
    key_files = ['ObTypes.py', 'Pipeline.py', 'Context.py', 'Filter.py']
    missing_files = []
    for file in key_files:
        file_path = os.path.join(sdk_path, file)
        if os.path.exists(file_path):
            print(f"    ✓ {file}")
        else:
            print(f"    ✗ {file} 缺失")
            missing_files.append(file)
    
    if missing_files:
        print("  ⚠ 警告: 部分SDK文件缺失")
else:
    print("  ✗ SDK路径不存在")
    print("    请检查SDK是否正确解压到程序目录")
print()

# 测试4: 尝试导入SDK模块
print("[测试4] 尝试导入SDK模块...")
sys.path.insert(0, sdk_path)

try:
    from ObTypes import *
    print("  ✓ ObTypes 导入成功")
except Exception as e:
    print(f"  ✗ ObTypes 导入失败: {e}")

try:
    import Pipeline
    print("  ✓ Pipeline 导入成功")
except Exception as e:
    print(f"  ✗ Pipeline 导入失败: {e}")

try:
    import Context
    print("  ✓ Context 导入成功")
except Exception as e:
    print(f"  ✗ Context 导入失败: {e}")

try:
    import Filter
    print("  ✓ Filter 导入成功")
except Exception as e:
    print(f"  ✗ Filter 导入失败: {e}")

try:
    from Error import ObException
    print("  ✓ Error 导入成功")
except Exception as e:
    print(f"  ✗ Error 导入失败: {e}")
print()

# 测试5: 尝试连接相机
print("[测试5] 尝试连接相机...")
try:
    import Context
    from Error import ObException
    
    ctx = Context.Context(None)
    print("  ✓ Context创建成功")
    
    import Pipeline
    pipe = Pipeline.Pipeline(None, None)
    print("  ✓ Pipeline创建成功")
    
    # 尝试获取设备信息
    try:
        device = pipe.getDevice()
        print("  ✓ 相机设备已连接")
        
        # 尝试获取设备名称
        try:
            device_info = device.getDeviceInfo()
            device_name = device_info.name()
            print(f"    设备名称: {device_name}")
        except:
            print("    (无法获取设备名称)")
        
        # 检查支持的传感器
        print("  支持的传感器:")
        
        try:
            depth_profiles = pipe.getStreamProfileList(OB_PY_SENSOR_DEPTH)
            print("    ✓ 深度传感器")
        except:
            print("    ✗ 深度传感器")
        
        try:
            color_profiles = pipe.getStreamProfileList(OB_PY_SENSOR_COLOR)
            print("    ✓ 彩色传感器")
        except:
            print("    ✗ 彩色传感器")
        
        try:
            ir_profiles = pipe.getStreamProfileList(OB_PY_SENSOR_IR)
            print("    ✓ 红外传感器")
        except:
            print("    ✗ 红外传感器")
        
    except Exception as e:
        print(f"  ✗ 无法连接到相机设备: {e}")
        print("    请检查:")
        print("    1. 相机是否通过USB 3.0连接")
        print("    2. 设备管理器中相机是否正常识别")
        print("    3. 如果使用虚拟机，USB设备是否已连接到虚拟机")
    
except Exception as e:
    print(f"  ✗ 相机连接测试失败: {e}")
print()

# 总结
print("=" * 60)
print("测试完成")
print("=" * 60)
print()
print("如果所有测试都通过，可以运行主程序:")
print("  python orbbec_viewer.py")
print()
print("或使用批处理脚本:")
print("  run_viewer.bat")
print()
