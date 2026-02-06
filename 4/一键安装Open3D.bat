@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║              一键安装 Open3D                               ║
echo ║          (显示 3D 点云必需!)                               ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 激活环境...
call conda activate orbbec_env
if errorlevel 1 (
    echo ✗ 环境激活失败
    echo.
    echo 请先运行: 创建环境.bat
    pause
    exit /b 1
)
echo ✓ 环境已激活
echo.

echo 检查是否已安装...
python -c "import open3d" >nul 2>&1
if not errorlevel 1 (
    python -c "import open3d; print(f'✓ Open3D {open3d.__version__} 已安装')"
    echo.
    echo Open3D 已经安装，无需重复安装
    echo.
    pause
    exit /b 0
)

echo Open3D 未安装，开始安装...
echo.
echo ════════════════════════════════════════════════════════════
echo 方法1: 使用清华镜像源 (推荐，速度快)
echo ════════════════════════════════════════════════════════════
echo.
pip install open3d -i https://pypi.tuna.tsinghua.edu.cn/simple

if errorlevel 1 (
    echo.
    echo ════════════════════════════════════════════════════════════
    echo 方法1 失败，尝试方法2: 使用官方源
    echo ════════════════════════════════════════════════════════════
    echo.
    pip install open3d
    
    if errorlevel 1 (
        echo.
        echo ════════════════════════════════════════════════════════════
        echo 方法2 失败，尝试方法3: 使用 conda
        echo ════════════════════════════════════════════════════════════
        echo.
        conda install -c conda-forge open3d -y
        
        if errorlevel 1 (
            echo.
            echo ✗✗✗ 所有安装方法都失败了 ✗✗✗
            echo.
            echo 可能的原因:
            echo   1. 网络连接问题
            echo   2. Python 版本不兼容
            echo   3. 系统环境问题
            echo.
            echo 请手动尝试:
            echo   conda activate orbbec_env
            echo   pip install open3d
            echo.
            pause
            exit /b 1
        )
    )
)

echo.
echo ════════════════════════════════════════════════════════════
echo 验证安装...
echo ════════════════════════════════════════════════════════════
python -c "import open3d; print(f'\n✓✓✓ Open3D {open3d.__version__} 安装成功! ✓✓✓\n')"

if errorlevel 1 (
    echo ✗ 验证失败
    pause
    exit /b 1
)

echo ════════════════════════════════════════════════════════════
echo ✓ 安装完成!
echo ════════════════════════════════════════════════════════════
echo.
echo 现在可以运行程序查看 3D 点云了!
echo.
echo 运行方式:
echo   双击: 启动_深度和点云.bat
echo.
pause
