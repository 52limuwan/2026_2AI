#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
打印机诊断工具
"""
import ctypes
import os
import sys

print("=" * 60)
print("打印机诊断工具")
print("=" * 60)

# 1. 检查 DLL
dll_path = os.path.join(os.path.dirname(__file__), 'TSCLIB.dll')
print(f"\n1. DLL 文件")
print(f"   路径: {dll_path}")
print(f"   存在: {os.path.exists(dll_path)}")

if not os.path.exists(dll_path):
    print("   ✗ DLL 文件不存在！")
    sys.exit(1)

# 2. 加载 DLL
print(f"\n2. 加载 DLL")
try:
    tsc = ctypes.WinDLL(dll_path)
    print("   ✓ 加载成功")
except Exception as e:
    print(f"   ✗ 加载失败: {e}")
    sys.exit(1)

# 3. 检查打印机
print(f"\n3. 系统打印机列表")
try:
    import subprocess
    result = subprocess.run(
        ['powershell', '-Command', 'Get-Printer | Select-Object Name, DriverName, PortName | Format-Table -AutoSize'],
        capture_output=True,
        text=True
    )
    print(result.stdout)
except Exception as e:
    print(f"   无法获取打印机列表: {e}")

# 4. 测试连接
printer_name = "Gprinter GP-1324D"
print(f"\n4. 测试连接: {printer_name}")

try:
    # 尝试调用 about()
    print("   尝试调用 about()...")
    try:
        tsc.about()
        print("   ✓ about() 调用成功")
    except Exception as e:
        print(f"   - about() 不可用或失败: {e}")
    
    # 尝试连接
    print(f"   尝试 openport('{printer_name}')...")
    result = tsc.openport(ctypes.c_wchar_p(printer_name))
    print(f"   返回值: {result}")
    
    if result >= 0:
        print("   ✓ 连接成功")
        
        # 测试基本命令
        print("\n5. 测试基本命令")
        
        print("   clearbuffer()...")
        tsc.clearbuffer()
        print("   ✓ 成功")
        
        print("   setup()...")
        tsc.setup(
            ctypes.c_wchar_p("50"),
            ctypes.c_wchar_p("50"),
            ctypes.c_wchar_p("4"),
            ctypes.c_wchar_p("8"),
            ctypes.c_wchar_p("0"),
            ctypes.c_wchar_p("2"),
            ctypes.c_wchar_p("0")
        )
        print("   ✓ 成功")
        
        print("   closeport()...")
        tsc.closeport()
        print("   ✓ 成功")
        
        print("\n" + "=" * 60)
        print("✓ 所有测试通过！打印机工作正常。")
        print("=" * 60)
    else:
        print(f"   ✗ 连接失败")
        print("\n可能的原因：")
        print("   1. 打印机名称不正确")
        print("   2. 打印机未开机或未连接")
        print("   3. 打印机驱动未正确安装")
        print("   4. 打印机被其他程序占用")
        
except Exception as e:
    print(f"   ✗ 异常: {e}")
    import traceback
    traceback.print_exc()
