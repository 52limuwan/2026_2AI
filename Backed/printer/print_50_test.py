#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
打印50张 TEST 标签
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from label_printer_dll import LabelPrinterDLL, LabelData, TextElement

printer_name = "Gprinter GP-1324D"

print("连接打印机...")
printer = LabelPrinterDLL(printer_name)

if not printer.connect():
    print("✗ 连接失败")
    sys.exit(1)

print("✓ 连接成功")
print("\n开始打印 50 张 TEST 标签...\n")

for i in range(1, 51):
    # 创建标签
    label = LabelData(width=50, height=50, gap=2, density=8, copies=1)
    
    # 添加 TEST 文本
    label.texts.append(TextElement(
        x=100, y=100,
        content="TEST",
        font="4",
        x_scale=3,
        y_scale=3
    ))
    
    # 添加编号
    label.texts.append(TextElement(
        x=100, y=250,
        content=f"No.{i:03d}",
        font="3",
        x_scale=2,
        y_scale=2
    ))
    
    # 打印
    if printer.print_label(label):
        print(f"[{i}/50] ✓ 打印成功")
    else:
        print(f"[{i}/50] ✗ 打印失败")

printer.disconnect()

print("\n" + "="*60)
print("✓ 完成！已打印 50 张 TEST 标签")
print("="*60)
