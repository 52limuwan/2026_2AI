@echo off
chcp 65001 >nul
echo ========================================
echo   测试新SDK工具
echo ========================================
echo.

echo 1. 测试 SimpleViewer (简单查看器)
echo    - 应该显示深度图像窗口
echo.
echo 2. 测试 GeneratePointCloud (生成点云)
echo    - 会生成50帧点云到 PointCloud 文件夹
echo.
echo 3. 测试 NiViewer (官方查看器)
echo    - 完整的相机查看器
echo.

:menu
echo.
echo 请选择:
echo [1] 运行 SimpleViewer
echo [2] 运行 GeneratePointCloud
echo [3] 运行 NiViewer
echo [4] 退出
echo.
set /p choice="输入选择 (1-4): "

if "%choice%"=="1" goto simpleviewer
if "%choice%"=="2" goto pointcloud
if "%choice%"=="3" goto niviewer
if "%choice%"=="4" goto end
goto menu

:simpleviewer
echo.
echo 启动 SimpleViewer...
cd samples\bin
SimpleViewer.exe
cd ..\..
goto menu

:pointcloud
echo.
echo 启动 GeneratePointCloud...
echo 将生成50帧点云到 samples\bin\PointCloud 文件夹
cd samples\bin
GeneratePointCloud.exe
cd ..\..
echo.
echo 点云已生成！
pause
goto menu

:niviewer
echo.
echo 启动 NiViewer...
cd Win64-Release\tools\NiViewer
NiViewer.exe
cd ..\..\..
goto menu

:end
echo.
echo 退出
