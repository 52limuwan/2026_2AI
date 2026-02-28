#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试真实打印 - 打印一个简单的文本标签
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from label_printer_dll import LabelPrinterDLL, LabelData, TextElement

printer_name = "Gprinter GP-1324D"

print(f"连接打印机: {printer_name}")
printer = LabelPrinterDLL(printer_name)

if not printer.connect():
    print("✗ 连接失败")
    sys.exit(1)

print("✓ 连接成功")

# 创建一个简单的标签
label = LabelData(width=50, height=30, gap=2, density=8, copies=1)

# 添加文本
label.texts.append(TextElement(
    x=50, y=50,
    content="TEST PRINT",
    font="4",
    x_scale=2,
    y_scale=2
))

label.texts.append(TextElement(
    x=50, y=150,
    content="2026-03-01",
    font="3",
    x_scale=1,
    y_scale=1
))

print("开始打印...")
if printer.print_label(label):
    print("✓ 打印命令发送成功")
else:
    print("✗ 打印失败")

printer.disconnect()
print("✓ 完成")
