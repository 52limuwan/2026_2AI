@echo off
chcp 65001 >nul
echo ========================================
echo   健康监测WebSocket服务器
echo ========================================
echo.
echo 正在启动服务器...
echo 服务地址: ws://localhost:8765
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

python health_monitor_server.py

pause
