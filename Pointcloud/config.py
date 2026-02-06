"""
奥比相机可视化程序配置文件
可以根据实际情况修改SDK路径和其他参数
"""

import os

# ==================== SDK路径配置 ====================
# 根据你的Python版本选择对应的SDK路径
PYTHON_VERSION = "3.9"  # 可选: "3.7", "3.8", "3.9"

# SDK基础路径（相对于本脚本的位置）
SDK_BASE_PATH = os.path.join(
    os.path.dirname(__file__),
    'OrbbecSDK_Python_v1.1.4_win_x64_release',
    'OrbbecSDK_Python_v1.1.4_win_x64_release',
    f'python{PYTHON_VERSION}',
    'Samples'
)

# 如果SDK在其他位置，可以直接指定绝对路径
# SDK_BASE_PATH = r"C:\path\to\your\SDK\python3.9\Samples"

# ==================== 显示窗口配置 ====================
# 窗口名称
IR_WINDOW_NAME = "红外图像 - Infrared View"
DEPTH_WINDOW_NAME = "深度图像 - Depth View"

# 窗口初始大小（0表示自动）
WINDOW_WIDTH = 0
WINDOW_HEIGHT = 0

# ==================== 图像处理配置 ====================
# 深度图颜色映射方案
# 可选: cv2.COLORMAP_JET, cv2.COLORMAP_HOT, cv2.COLORMAP_RAINBOW, 
#       cv2.COLORMAP_OCEAN, cv2.COLORMAP_VIRIDIS
DEPTH_COLORMAP = "COLORMAP_JET"

# 是否启用红外镜像
IR_MIRROR_ENABLED = True

# ==================== 点云配置 ====================
# 点云文件保存路径
POINTCLOUD_SAVE_PATH = "."  # 当前目录

# 点云文件名前缀
RGB_POINTCLOUD_PREFIX = "RGBPoints"
DEPTH_POINTCLOUD_PREFIX = "DepthPoints"

# 图像文件名前缀
IR_IMAGE_PREFIX = "IR_Image"

# ==================== 性能配置 ====================
# 帧等待超时时间（毫秒）
FRAME_TIMEOUT_MS = 100

# 是否显示帧率信息
SHOW_FPS = True

# 帧率统计间隔（帧数）
FPS_UPDATE_INTERVAL = 30

# ==================== 调试配置 ====================
# 日志级别
# 可选: "ERROR", "WARN", "INFO", "DEBUG"
LOG_LEVEL = "ERROR"

# 是否显示详细错误信息
VERBOSE_ERROR = True

# ==================== 流配置 ====================
# 是否启用各个传感器流
ENABLE_DEPTH = True
ENABLE_COLOR = True
ENABLE_IR = True

# 对齐模式
# 可选: "D2C" (深度对齐到彩色), "C2D" (彩色对齐到深度), "NONE" (不对齐)
ALIGN_MODE = "D2C"

# ==================== 辅助函数 ====================
def get_sdk_path():
    """获取SDK路径"""
    if not os.path.exists(SDK_BASE_PATH):
        print(f"[警告] SDK路径不存在: {SDK_BASE_PATH}")
        print("请检查config.py中的SDK_BASE_PATH配置")
    return SDK_BASE_PATH

def get_colormap_value():
    """获取OpenCV颜色映射值"""
    import cv2
    colormap_dict = {
        "COLORMAP_JET": cv2.COLORMAP_JET,
        "COLORMAP_HOT": cv2.COLORMAP_HOT,
        "COLORMAP_RAINBOW": cv2.COLORMAP_RAINBOW,
        "COLORMAP_OCEAN": cv2.COLORMAP_OCEAN,
        "COLORMAP_VIRIDIS": cv2.COLORMAP_VIRIDIS,
    }
    return colormap_dict.get(DEPTH_COLORMAP, cv2.COLORMAP_JET)

def print_config():
    """打印当前配置"""
    print("=" * 60)
    print("当前配置:")
    print("=" * 60)
    print(f"Python版本: {PYTHON_VERSION}")
    print(f"SDK路径: {SDK_BASE_PATH}")
    print(f"SDK路径存在: {os.path.exists(SDK_BASE_PATH)}")
    print(f"启用深度流: {ENABLE_DEPTH}")
    print(f"启用彩色流: {ENABLE_COLOR}")
    print(f"启用红外流: {ENABLE_IR}")
    print(f"对齐模式: {ALIGN_MODE}")
    print(f"深度颜色映射: {DEPTH_COLORMAP}")
    print(f"日志级别: {LOG_LEVEL}")
    print("=" * 60)

if __name__ == "__main__":
    print_config()
