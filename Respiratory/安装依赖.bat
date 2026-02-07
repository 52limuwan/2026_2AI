@echo off
chcp 65001 >nul
echo ========================================
echo   安装健康监测系统依赖
echo ========================================
echo.
echo 正在安装 Python 依赖包...
echo.

pip install -r requirements_health_monitor.txt

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 现在可以运行: 启动健康监测服务.bat
echo.
pause
    