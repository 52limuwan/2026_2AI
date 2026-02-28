#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
简单测试打印图片
"""
import ctypes
import os
from PIL import Image

dll_path = os.path.join(os.path.dirname(__file__), 'TSCLIB.dll')
tsc = ctypes.WinDLL(dll_path)

printer_name = "Gprinter GP-1324D"

print("1. 连接打印机...")
result = tsc.openport(ctypes.c_wchar_p(printer_name))
print(f"   连接结果: {result}")

if result >= 0:
    print("2. 清除缓冲区...")
    tsc.clearbuffer()
    
    print("3. 设置标签尺寸 (50mm x 50mm)...")
    tsc.setup(
        ctypes.c_wchar_p("50"),   # width
        ctypes.c_wchar_p("50"),   # height
        ctypes.c_wchar_p("4"),    # speed
        ctypes.c_wchar_p("8"),    # density
        ctypes.c_wchar_p("0"),    # sensor (0=gap)
        ctypes.c_wchar_p("2"),    # vertical gap
        ctypes.c_wchar_p("0")     # offset
    )
    
    print("4. 处理图片...")
    image_path = os.path.join(os.path.dirname(__file__), '../images/a1.png')
    image = Image.open(image_path)
    
    # 调整尺寸为 400x400 点 (50mm * 8 dots/mm)
    image = image.resize((400, 400), Image.Resampling.LANCZOS)
    
    # 转换为黑白
    image = image.convert('L')
    image = image.point(lambda x: 0 if x < 128 else 255, '1')
    
    # 保存为 BMP
    temp_bmp = os.path.join(os.path.dirname(__file__), 'temp_test.bmp')
    image.save(temp_bmp, 'BMP')
    print(f"   临时文件: {temp_bmp}")
    
    print("5. 发送打印命令...")
    # 使用绝对路径
    cmd = f'BITMAP 0,0,"{temp_bmp}",0'
    print(f"   命令: {cmd}")
    tsc.sendcommand(ctypes.c_wchar_p(cmd))
    
    print("6. 执行打印...")
    tsc.printlabel(ctypes.c_wchar_p("1"), ctypes.c_wchar_p("1"))
    
    print("7. 关闭打印机...")
    tsc.closeport()
    
    print("\n✓ 打印完成")
    
    # 清理临时文件
    try:
        os.remove(temp_bmp)
    except:
        pass
else:
    print("✗ 连接失败")
