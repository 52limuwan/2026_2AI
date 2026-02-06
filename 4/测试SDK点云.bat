@echo off
chcp 65001 >nul
cls
echo.
echo ════════════════════════════════════════════════════════════
echo 测试SDK自带的点云示例
echo ════════════════════════════════════════════════════════════
echo.

call conda activate orbbec_env

cd OrbbecSDK_Python_v1.1.4_win_x64_release\OrbbecSDK_Python_v1.1.4_win_x64_release\python3.9\Samples

echo 运行SDK自带的PointCloud.py
echo.
echo 操作说明:
echo   按 R 键 - 生成彩色点云
echo   按 D 键 - 生成深度点云
echo   按 ESC - 退出
echo.
pause

python PointCloud.py

cd ..\..\..\..

pause
