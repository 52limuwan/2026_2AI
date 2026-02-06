@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║          奥比相机 - 深度图 + 3D点云查看器                 ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] 激活环境...
call conda activate orbbec_env
if errorlevel 1 (
    echo.
    echo ✗ 环境激活失败
    echo.
    echo 请先运行: 创建环境.bat
    echo.
    pause
    exit /b 1
)
echo ✓ 环境已激活
echo.

echo [2/3] 检查 Open3D...
python -c "import open3d" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ✗ 未安装 Open3D
    echo.
    echo 正在安装 Open3D...
    pip install open3d -i https://pypi.tuna.tsinghua.edu.cn/simple
    if errorlevel 1 (
        echo.
        echo ✗ 安装失败
        pause
        exit /b 1
    )
)
echo ✓ Open3D 已安装
echo.

echo [3/3] 启动程序...
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo  将显示 2 个窗口:
echo.
echo    1. Depth        - 深度图 (彩色)
echo    2. Point Cloud  - 3D点云 (可旋转)
echo.
echo  操作说明:
echo    • 深度窗口: 按 ESC 或 Q 退出
echo    • 点云窗口: 鼠标左键拖动旋转, 滚轮缩放
echo.
echo ════════════════════════════════════════════════════════════
echo.
timeout /t 2 >nul

python simple_pointcloud_viewer.py

if errorlevel 1 (
    echo.
    echo ✗ 程序出错
    pause
)
