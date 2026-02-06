@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     奥比相机点云显示 - 基于SDK官方示例                    ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

call conda activate orbbec_env
if errorlevel 1 (
    echo ✗ 环境激活失败
    pause
    exit /b 1
)

echo ════════════════════════════════════════════════════════════
echo  使用说明:
echo    按 R 键 - 生成彩色点云并立即显示3D窗口
echo    按 ESC  - 退出程序
echo.
echo  3D窗口操作:
echo    鼠标左键 - 旋转
echo    滚轮     - 缩放
echo    右键     - 平移
echo ════════════════════════════════════════════════════════════
echo.

python SDK点云加显示.py

if errorlevel 1 (
    echo.
    echo 程序出错
    pause
)
