#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试标签尺寸配置
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from label_printer_dll import LabelPrinterDLL, LabelData, TextElement

def test_size(width, height, gap):
    """测试指定尺寸"""
    print(f"\n{'='*60}")
    print(f"测试标签尺寸: {width}mm x {height}mm, 间距: {gap}mm")
    print(f"{'='*60}")
    
    printer = LabelPrinterDLL("Gprinter GP-1324D")
    
    if not printer.connect():
        print("✗ 连接失败")
        return False
    
    label = LabelData(width=width, height=height, gap=gap, density=8, copies=1)
    
    # 添加测试文本
    label.texts.append(TextElement(
        x=50, y=50,
        content=f"{width}x{height}mm",
        font="4",
        x_scale=2,
        y_scale=2
    ))
    
    label.texts.append(TextElement(
        x=50, y=150,
        content=f"Gap:{gap}mm",
        font="3",
        x_scale=1,
        y_scale=1
    ))
    
    if printer.print_label(label):
        print("✓ 打印成功")
        result = True
    else:
        print("✗ 打印失败")
        result = False
    
    printer.disconnect()
    return result

if __name__ == "__main__":
    print("标签尺寸测试工具")
    print("常见标签尺寸：")
    print("1. 40mm x 30mm (gap 2mm)")
    print("2. 50mm x 30mm (gap 2mm)")
    print("3. 50mm x 50mm (gap 2mm)")
    print("4. 60mm x 40mm (gap 2mm)")
    print("5. 70mm x 50mm (gap 2mm)")
    print("6. 100mm x 50mm (gap 2mm)")
    print("7. 自定义")
    
    choice = input("\n请选择 (1-7): ").strip()
    
    sizes = {
        '1': (40, 30, 2),
        '2': (50, 30, 2),
        '3': (50, 50, 2),
        '4': (60, 40, 2),
        '5': (70, 50, 2),
        '6': (100, 50, 2),
    }
    
    if choice in sizes:
        width, height, gap = sizes[choice]
        test_size(width, height, gap)
    elif choice == '7':
        try:
            width = int(input("宽度 (mm): "))
            height = int(input("高度 (mm): "))
            gap = int(input("间距 (mm): "))
            test_size(width, height, gap)
        except ValueError:
            print("✗ 输入无效")
    else:
        print("✗ 选择无效")
