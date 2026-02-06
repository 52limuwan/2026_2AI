@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║          奥比相机点云显示 - 按空格键显示3D点云            ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/2] 激活环境...
call conda activate orbbec_env
if errorlevel 1 (
    echo ✗ 环境激活失败
    pause
    exit /b 1
)
echo ✓ 环境已激活
echo.

echo [2/2] 启动程序...
echo.
echo ════════════════════════════════════════════════════════════
echo  使用说明:
echo    1. 深度窗口会实时显示
echo    2. 按 空格键 生成并显示3D点云
echo    3. 在点云窗口可以用鼠标旋转、缩放
echo    4. 按 ESC/Q 退出程序
echo ════════════════════════════════════════════════════════════
echo.

python 直接显示点云.py

if errorlevel 1 (
    echo.
    echo 程序出错
    pause
)
