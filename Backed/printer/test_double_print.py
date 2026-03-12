#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试连续打印两张图片 - 验证修复效果
"""
import sys
import os
import time
sys.path.insert(0, os.path.dirname(__file__))

from label_printer_dll import LabelPrinterDLL, LabelData, ImageElement

printer_name = "Gprinter GP-1324D"

print(f"连接打印机: {printer_name}")
printer = LabelPrinterDLL(printer_name)

if not printer.connect():
    print("✗ 连接失败")
    sys.exit(1)

print("✓ 连接成功")

# 图片路径
image_dir = os.path.join(os.path.dirname(__file__), '../images')
a1_path = os.path.join(image_dir, 'a1.png')
a2_path = os.path.join(image_dir, 'a2.png')

# 检查图片
if not os.path.exists(a1_path) or not os.path.exists(a2_path):
    print("✗ 图片文件不存在")
    printer.disconnect()
    sys.exit(1)

print("✓ 图片文件存在")

# 初始定位
print("初始定位...")
printer.tsc.sendcommand('HOME')
time.sleep(0.3)

# 打印第一张
print("\n打印第一张 (a1.png)...")
label1 = LabelData(width=50, height=50, gap=2, density=8, copies=1)
label1.images.append(ImageElement(
    x=0, y=0,
    image_path=a1_path,
    width=400,
    height=400,
    threshold=128
))

if printer.print_label(label1):
    print("✓ 第一张打印命令发送成功")
else:
    print("✗ 第一张打印失败")

# 等待第一张完成
print("等待第一张打印完成...")
time.sleep(1.5)

# 打印第二张
print("\n打印第二张 (a2.png)...")
label2 = LabelData(width=50, height=50, gap=2, density=8, copies=1)
label2.images.append(ImageElement(
    x=0, y=0,
    image_path=a2_path,
    width=400,
    height=400,
    threshold=128
))

if printer.print_label(label2):
    print("✓ 第二张打印命令发送成功")
else:
    print("✗ 第二张打印失败")

# 等待完成
time.sleep(1.0)

printer.disconnect()
print("\n✓ 测试完成")
print("\n请检查打印结果：")
print("- 第一张应该完整打印 a1.png")
print("- 第二张应该完整打印 a2.png")
print("- 两张都不应该出现只打印一半的情况")
