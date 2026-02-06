@echo off
chcp 65001 >nul
echo ========================================
echo   实时3D点云 - 双窗口版本
echo   深度图 + 3D点云同时显示
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
python 实时点云_双窗口.py

pause
