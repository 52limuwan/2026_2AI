@echo off
chcp 65001 >nul
echo ========================================
echo   启动正确的点云生成程序
echo   (基于C++ SDK的转换逻辑)
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
python 正确的点云生成.py

pause
