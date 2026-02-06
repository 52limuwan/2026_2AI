@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════╗
echo ║        创建奥比相机专用虚拟环境                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [步骤1/4] 检查 Conda 是否安装...
conda --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Conda
    echo 请先安装 Anaconda 或 Miniconda
    pause
    exit /b 1
)
conda --version
echo.

echo [步骤2/4] 创建新的虚拟环境 orbbec_env (Python 3.9)...
echo 这可能需要几分钟时间，请耐心等待...
echo.
conda create -n orbbec_env python=3.9 -y
if errorlevel 1 (
    echo [错误] 环境创建失败
    pause
    exit /b 1
)
echo.

echo [步骤3/4] 激活环境并安装依赖包...
echo.
call conda activate orbbec_env
if errorlevel 1 (
    echo [警告] 自动激活失败，请手动激活
    echo.
    echo 请执行以下命令:
    echo   conda activate orbbec_env
    echo   pip install "numpy>=1.21.0,<2.0" opencv-python
    pause
    exit /b 1
)

echo 安装 NumPy 1.x 和 OpenCV...
pip install "numpy>=1.21.0,<2.0" opencv-python
if errorlevel 1 (
    echo [警告] 安装失败，尝试使用清华镜像源...
    pip install "numpy>=1.21.0,<2.0" opencv-python -i https://pypi.tuna.tsinghua.edu.cn/simple
)
echo.

echo [步骤4/4] 验证安装...
python -c "import numpy; print(f'✓ NumPy 版本: {numpy.__version__}')"
python -c "import cv2; print(f'✓ OpenCV 版本: {cv2.__version__}')"
echo.

echo ╔════════════════════════════════════════════════════════════╗
echo ║              ✓ 环境创建成功！                             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 环境名称: orbbec_env
echo Python版本: 3.9
echo 已安装: NumPy 1.x, OpenCV
echo.
echo ════════════════════════════════════════════════════════════
echo 下一步操作:
echo ════════════════════════════════════════════════════════════
echo.
echo 1. 激活环境:
echo    conda activate orbbec_env
echo.
echo 2. 运行程序:
echo    python orbbec_viewer.py
echo.
echo 或者直接双击运行:
echo    启动程序_新环境.bat
echo.
pause
