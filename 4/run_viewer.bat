@echo off
chcp 65001 >nul
echo ========================================
echo 奥比相机可视化程序启动脚本
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.7/3.8/3.9
    pause
    exit /b 1
)

echo [信息] Python版本:
python --version
echo.

REM 检查依赖
echo [信息] 检查依赖包...
python -c "import numpy; import cv2" >nul 2>&1
if errorlevel 1 (
    echo [警告] 缺少必要的依赖包
    echo [信息] 正在安装依赖...
    pip install -r requirements.txt
    echo.
) else (
    REM 检查numpy版本
    python -c "import numpy; import sys; sys.exit(0 if numpy.__version__.startswith('1.') else 1)" >nul 2>&1
    if errorlevel 1 (
        echo [警告] NumPy 版本不兼容 (需要 1.x, 当前可能是 2.x)
        echo [信息] 正在修复...
        pip install "numpy>=1.21.0,<2.0" --force-reinstall
        echo.
    )
)

REM 运行程序
echo [信息] 启动可视化程序...
echo.
python orbbec_viewer.py

if errorlevel 1 (
    echo.
    echo [错误] 程序运行出错
    pause
)
