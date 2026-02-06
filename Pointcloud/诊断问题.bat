@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              诊断 3D 点云显示问题                         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [检查1] 激活环境...
call conda activate orbbec_env
if errorlevel 1 (
    echo ✗ 环境未创建
    echo.
    echo 解决方法: 双击运行 创建环境.bat
    echo.
    pause
    exit /b 1
)
echo ✓ 环境已激活
echo.

echo [检查2] Python 版本...
python --version
echo.

echo [检查3] NumPy 版本...
python -c "import numpy; print(f'NumPy: {numpy.__version__}')"
if errorlevel 1 (
    echo ✗ NumPy 未安装
    pause
    exit /b 1
)
echo.

echo [检查4] OpenCV...
python -c "import cv2; print(f'OpenCV: {cv2.__version__}')"
if errorlevel 1 (
    echo ✗ OpenCV 未安装
    echo 安装: pip install opencv-python
    pause
    exit /b 1
)
echo.

echo [检查5] Open3D (关键!)...
python -c "import open3d; print(f'Open3D: {open3d.__version__}')"
if errorlevel 1 (
    echo.
    echo ════════════════════════════════════════════════════════════
    echo ✗✗✗ 问题找到了! Open3D 未安装 ✗✗✗
    echo ════════════════════════════════════════════════════════════
    echo.
    echo 这就是为什么看不到 3D 点云窗口!
    echo.
    echo 正在安装 Open3D...
    echo.
    pip install open3d -i https://pypi.tuna.tsinghua.edu.cn/simple
    if errorlevel 1 (
        echo.
        echo ✗ 安装失败，尝试其他方式...
        pip install open3d
    )
    echo.
    echo 验证安装...
    python -c "import open3d; print(f'✓ Open3D {open3d.__version__} 安装成功!')"
    if errorlevel 1 (
        echo ✗ 安装仍然失败
        pause
        exit /b 1
    )
) else (
    echo ✓ Open3D 已安装
)
echo.

echo [检查6] SDK 模块...
python -c "import sys; sys.path.insert(0, 'OrbbecSDK_Python_v1.1.4_win_x64_release/OrbbecSDK_Python_v1.1.4_win_x64_release/python3.9/Samples'); from ObTypes import *; print('✓ SDK 可用')"
if errorlevel 1 (
    echo ✗ SDK 模块加载失败
    pause
    exit /b 1
)
echo.

echo ════════════════════════════════════════════════════════════
echo ✓✓✓ 所有检查通过! ✓✓✓
echo ════════════════════════════════════════════════════════════
echo.
echo 现在可以运行程序了!
echo.
set /p run="是否立即运行程序? (Y/N): "
if /i "%run%"=="Y" (
    echo.
    echo 启动程序...
    python simple_pointcloud_viewer.py
)

pause
