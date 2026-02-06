@echo off
chcp 65001 >nul
title 远端报警器

echo ============================================================
echo 防跌倒远端报警器
echo ============================================================
echo.
echo 请输入服务器地址（直接回车使用 127.0.0.1）:
set /p SERVER_IP=

if "%SERVER_IP%"=="" (
    set SERVER_IP=127.0.0.1
)

echo.
echo 请输入设备名称（直接回车使用默认名称）:
set /p DEVICE_NAME=

echo.
echo 正在连接服务器 %SERVER_IP%...
echo.

if "%DEVICE_NAME%"=="" (
    python alarm_client.py %SERVER_IP%
) else (
    python alarm_client.py %SERVER_IP% %DEVICE_NAME%
)

pause
