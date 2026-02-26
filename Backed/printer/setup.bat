@echo off
echo ========================================
echo 打印机功能安装脚本
echo ========================================

echo.
echo 1. 复制打印库文件...
xcopy /Y /I ..\..\c\SimplePrinter\tsclib_wrapper.py .
xcopy /Y /I ..\..\c\SimplePrinter\label_printer_dll.py .
xcopy /Y /I ..\..\c\SimplePrinter\TSCLIB.dll .

echo.
echo 2. 检查Python环境...
python --version
if errorlevel 1 (
    echo ERROR: Python未安装或不在PATH中
    pause
    exit /b 1
)

echo.
echo 3. 安装Python依赖...
pip install Pillow pywin32

echo.
echo 4. 测试打印机连接...
python test_printer.py

echo.
echo ========================================
echo 安装完成！
echo ========================================
pause
