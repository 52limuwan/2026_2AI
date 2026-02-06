@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════╗
echo ║              查看已生成的点云和图像文件                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [点云文件 - PLY格式]
echo ════════════════════════════════════════════════════════════
dir /B /O-D *.ply 2>nul
if errorlevel 1 (
    echo   未找到点云文件
    echo.
    echo   💡 提示: 运行程序后按 R 或 D 键生成点云
) else (
    echo.
    echo 详细信息:
    dir *.ply | findstr /V "个文件"
)

echo.
echo [红外图像 - PNG格式]
echo ════════════════════════════════════════════════════════════
dir /B /O-D IR_Image_*.png 2>nul
if errorlevel 1 (
    echo   未找到红外图像
    echo.
    echo   💡 提示: 运行程序后按 S 键保存红外图像
) else (
    echo.
    echo 详细信息:
    dir IR_Image_*.png | findstr /V "个文件"
)

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 操作选项:
echo   1. 在文件资源管理器中打开当前目录
echo   2. 使用Python查看器查看点云
echo   3. 退出
echo.
set /p choice="请选择 (1-3): "

if "%choice%"=="1" (
    echo.
    echo 正在打开文件资源管理器...
    explorer .
) else if "%choice%"=="2" (
    echo.
    echo 启动Python点云查看器...
    python 查看点云.py
) else (
    echo.
    echo 退出
)

echo.
pause
