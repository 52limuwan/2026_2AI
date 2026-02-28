#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试 TSCLIB.DLL 直接调用
"""
import ctypes
import os

dll_path = os.path.join(os.path.dirname(__file__), 'TSCLIB.dll')
print(f"DLL路径: {dll_path}")
print(f"DLL存在: {os.path.exists(dll_path)}")

try:
    # 加载 DLL
    tsc = ctypes.WinDLL(dll_path)
    print("✓ DLL加载成功")
    
    # 测试不同的调用方式
    printer_name = "Gprinter GP-1324D"
    
    print(f"\n尝试连接打印机: {printer_name}")
    
    # 方式1: 使用 wchar_p
    print("\n方式1: wchar_p")
    try:
        result = tsc.openport(ctypes.c_wchar_p(printer_name))
        print(f"  返回值: {result}")
        if result == 1 or result == 0:
            print("  ✓ 连接成功")
            tsc.closeport()
        else:
            print(f"  ✗ 连接失败")
    except Exception as e:
        print(f"  ✗ 异常: {e}")
    
    # 方式2: 使用 char_p (GBK编码)
    print("\n方式2: char_p (GBK)")
    try:
        result = tsc.openport(printer_name.encode('gbk'))
        print(f"  返回值: {result}")
        if result == 1 or result == 0:
            print("  ✓ 连接成功")
            tsc.closeport()
        else:
            print(f"  ✗ 连接失败")
    except Exception as e:
        print(f"  ✗ 异常: {e}")
    
    # 方式3: 使用 char_p (UTF-8编码)
    print("\n方式3: char_p (UTF-8)")
    try:
        result = tsc.openport(printer_name.encode('utf-8'))
        print(f"  返回值: {result}")
        if result == 1 or result == 0:
            print("  ✓ 连接成功")
            tsc.closeport()
        else:
            print(f"  ✗ 连接失败")
    except Exception as e:
        print(f"  ✗ 异常: {e}")
    
    # 方式4: 直接传字符串
    print("\n方式4: 直接传字符串")
    try:
        result = tsc.openport(printer_name)
        print(f"  返回值: {result}")
        if result == 1 or result == 0:
            print("  ✓ 连接成功")
            tsc.closeport()
        else:
            print(f"  ✗ 连接失败")
    except Exception as e:
        print(f"  ✗ 异常: {e}")

except Exception as e:
    print(f"✗ 错误: {e}")
    import traceback
    traceback.print_exc()
