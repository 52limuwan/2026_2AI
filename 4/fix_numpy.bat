@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════╗
echo ║          修复 NumPy 版本兼容性问题                        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [诊断] 检查当前环境...
python --version
echo.

echo [诊断] 检查当前 NumPy 版本...
python -c "import numpy; print(f'当前 NumPy 版本: {numpy.__version__}')" 2>nul
if errorlevel 1 (
    echo NumPy 未安装
) else (
    python -c "import numpy; import sys; sys.exit(0 if numpy.__version__.startswith('1.') else 1)" >nul 2>&1
    if errorlevel 1 (
        echo [警告] NumPy 2.x 与 SDK 不兼容！
    ) else (
        echo [信息] NumPy 版本正常
        echo.
        echo 如果仍有问题，请查看 常见问题解决.txt
        pause
        exit /b 0
    )
)

echo.
echo ════════════════════════════════════════════════════════════
echo 开始修复...
echo ════════════════════════════════════════════════════════════
echo.

echo [步骤1/3] 卸载当前 NumPy...
pip uninstall numpy -y
if errorlevel 1 (
    echo [错误] 卸载失败
    pause
    exit /b 1
)

echo.
echo [步骤2/3] 安装兼容的 NumPy 1.x 版本...
pip install "numpy>=1.21.0,<2.0"
if errorlevel 1 (
    echo [错误] 安装失败
    echo.
    echo 尝试使用清华镜像源...
    pip install "numpy>=1.21.0,<2.0" -i https://pypi.tuna.tsinghua.edu.cn/simple
    if errorlevel 1 (
        echo [错误] 安装仍然失败
        pause
        exit /b 1
    )
)

echo.
echo [步骤3/3] 验证安装...
python -c "import numpy; print(f'✓ NumPy 版本: {numpy.__version__}')"
if errorlevel 1 (
    echo [错误] NumPy 导入失败
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                  ✓ 修复完成！                             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 现在可以运行程序了:
echo   python orbbec_viewer.py
echo.
echo 或使用启动脚本:
echo   run_viewer.bat
echo.
pause
