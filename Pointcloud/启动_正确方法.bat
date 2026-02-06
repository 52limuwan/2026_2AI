@echo off
chcp 65001 >nul
echo ========================================
echo   基于C++示例的正确点云生成方法
echo ========================================
echo.

call conda activate orbbec_env
if errorlevel 1 (
    echo 错误: 无法激活环境
    pause
    exit /b 1
)

echo ✓ 环境已激活
echo.
echo 正在启动程序...
echo 使用相机内参手动计算3D坐标
echo.

python 正确的点云生成.py

pause
