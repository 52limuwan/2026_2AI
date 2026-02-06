@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     奥比相机实时点云显示 - 使用SDK的PointCloudFilter      ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] 激活环境...
call conda activate orbbec_env
if errorlevel 1 (
    echo ✗ 环境激活失败
    echo 请先运行: 创建环境.bat
    pause
    exit /b 1
)
echo ✓ 环境已激活
echo.

echo [2/3] 检查 Open3D...
python -c "import open3d" >nul 2>&1
if errorlevel 1 (
    echo ✗ 未安装 Open3D
    echo.
    echo 正在安装...
    pip install open3d -i https://pypi.tuna.tsinghua.edu.cn/simple
    if errorlevel 1 (
        echo 安装失败
        pause
        exit /b 1
    )
)
echo ✓ Open3D 已安装
echo.

echo [3/3] 启动程序...
echo.
echo ════════════════════════════════════════════════════════════
echo  将显示:
echo    • Depth - 深度图 (彩色)
echo    • Point Cloud - 3D点云 (可旋转)
echo.
echo  使用SDK的PointCloudFilter生成点云数据
echo ════════════════════════════════════════════════════════════
echo.

python realtime_pointcloud.py

if errorlevel 1 (
    echo.
    echo 程序出错
    pause
)
