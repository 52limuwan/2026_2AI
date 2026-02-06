@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════╗
echo ║          奥比相机 3D 点云实时查看器                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [信息] 激活 orbbec_env 环境...
call conda activate orbbec_env
if errorlevel 1 (
    echo [错误] 环境激活失败
    echo.
    echo 请先创建环境: 创建环境.bat
    pause
    exit /b 1
)

echo [信息] 检查 Open3D...
python -c "import open3d" >nul 2>&1
if errorlevel 1 (
    echo [警告] 未安装 Open3D，正在安装...
    echo.
    pip install open3d
    if errorlevel 1 (
        echo [错误] Open3D 安装失败
        echo.
        echo 尝试使用清华镜像源...
        pip install open3d -i https://pypi.tuna.tsinghua.edu.cn/simple
    )
    echo.
)

echo [信息] 启动 3D 点云查看器...
echo.
echo ════════════════════════════════════════════════════════════
echo 程序功能:
echo   • 实时显示 3D 点云（自动打开）
echo   • 实时显示红外图像
echo   • 实时显示深度图像
echo.
echo 操作说明:
echo   3D窗口:
echo     鼠标左键拖动 - 旋转点云
echo     鼠标滚轮     - 缩放
echo     鼠标右键拖动 - 平移
echo.
echo   2D窗口:
echo     ESC/Q - 退出程序
echo     S     - 保存当前点云为PLY文件
echo ════════════════════════════════════════════════════════════
echo.

python orbbec_pointcloud_viewer.py

if errorlevel 1 (
    echo.
    echo [错误] 程序运行出错
    pause
)
