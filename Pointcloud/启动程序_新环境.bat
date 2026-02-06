@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════╗
echo ║        奥比相机可视化程序 (orbbec_env环境)                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [信息] 激活 orbbec_env 环境...
call conda activate orbbec_env
if errorlevel 1 (
    echo [错误] 环境激活失败
    echo.
    echo 可能的原因:
    echo   1. 环境尚未创建，请先运行: 创建环境.bat
    echo   2. Conda 未正确配置
    echo.
    echo 手动激活命令:
    echo   conda activate orbbec_env
    echo   python orbbec_viewer.py
    echo.
    pause
    exit /b 1
)

echo [信息] 当前环境: orbbec_env
echo [信息] Python版本:
python --version
echo.

echo [信息] 检查依赖包...
python -c "import numpy; import cv2" >nul 2>&1
if errorlevel 1 (
    echo [警告] 依赖包缺失，正在安装...
    pip install "numpy>=1.21.0,<2.0" opencv-python
    echo.
)

echo [信息] 启动程序...
echo.
echo ════════════════════════════════════════════════════════════
echo 操作说明:
echo   ESC/Q - 退出程序
echo   R     - 生成彩色点云
echo   D     - 生成深度点云
echo   S     - 保存红外图像
echo ════════════════════════════════════════════════════════════
echo.

python orbbec_viewer.py

if errorlevel 1 (
    echo.
    echo [错误] 程序运行出错
    echo.
    echo 故障排除:
    echo   1. 检查相机是否连接 (USB 3.0)
    echo   2. 运行测试: python test_sdk.py
    echo   3. 查看: 常见问题解决.txt
    echo.
    pause
)
