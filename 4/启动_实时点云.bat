@echo off
chcp 65001 >nul
echo ========================================
echo   实时3D点云显示
echo   一启动就显示点云
echo ========================================
echo.

call conda activate orbbec_env
if errorlevel 1 (
    echo 错误: 无法激活 orbbec_env 环境
    pause
    exit /b 1
)

echo ✓ 环境已激活
echo.
echo 正在启动实时点云显示...
echo.

python 实时点云显示.py

pause
