@echo off
chcp 65001 >nul
title 防跌倒检测服务端

echo ============================================================
echo 防跌倒检测服务端（雷达检测 + 报警服务器）
echo ============================================================
echo.
echo 功能：
echo   1. 连接雷达检测跌倒
echo   2. 本地报警（音效 + 弹窗）
echo   3. 广播报警给所有远端设备
echo.
echo 正在启动...
echo.

python fall_detection_server.py

pause
