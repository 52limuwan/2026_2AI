#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试打印机连接
"""
import sys
import os
import io

# 设置标准输出为UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../c/SimplePrinter'))

from label_printer_dll import LabelPrinterDLL, LabelData, TextElement

def test_printer():
    """测试打印机"""
    try:
        printer = LabelPrinterDLL("Gprinter GP-1324D")
        
        if not printer.connect():
            print("ERROR: 无法连接打印机", file=sys.stderr)
            return False
        
        print("SUCCESS: 打印机连接成功")
        
        # 打印测试页
        label = LabelData(width=70, height=50, gap=2, density=8, copies=1)
        label.texts.append(TextElement(
            x=50, y=100,
            content="Printer Test OK",  # 使用英文避免编码问题
            font="4", x_scale=2, y_scale=2
        ))
        
        if printer.print_label(label):
            print("SUCCESS: 测试页打印成功")
        else:
            print("WARNING: 测试页打印失败", file=sys.stderr)
        
        printer.disconnect()
        return True
        
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = test_printer()
    sys.exit(0 if success else 1)
