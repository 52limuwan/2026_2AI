@echo off
chcp 65001 >nul
echo ========================================
echo   实时点云 - 调试版本
echo   输出详细调试信息
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
python 实时点云_调试版.py

echo.
echo 程序已结束
pause
