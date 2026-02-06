@echo off
chcp 65001 >nul
echo ========================================
echo   启动修复版点云显示程序
echo ========================================
echo.

call conda activate orbbec_env
if errorlevel 1 (
    echo 错误: 无法激活 orbbec_env 环境
    echo 请先运行 创建环境.bat
    pause
    exit /b 1
)

echo ✓ 环境已激活: orbbec_env
echo.
echo 正在启动程序...
echo.

python SDK点云显示_修复版.py

pause
