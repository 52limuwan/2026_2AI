#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
批量打印测试 - 一次性打印50张标签
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from label_printer_dll import LabelPrinterDLL, LabelData, ImageElement

def print_batch(count=50):
    """批量打印指定数量的标签"""
    printer_name = "Gprinter GP-1324D"
    
    print(f"准备打印 {count} 张标签...")
    print(f"连接打印机: {printer_name}")
    
    printer = LabelPrinterDLL(printer_name)
    
    if not printer.connect():
        print("✗ 连接打印机失败")
        return False
    
    print("✓ 连接成功")
    
    # 图片路径
    image_dir = os.path.join(os.path.dirname(__file__), '../images')
    a1_path = os.path.join(image_dir, 'a1.png')
    a2_path = os.path.join(image_dir, 'a2.png')
    
    # 检查图片
    if not os.path.exists(a1_path):
        print(f"✗ 图片不存在: {a1_path}")
        printer.disconnect()
        return False
    
    if not os.path.exists(a2_path):
        print(f"✗ 图片不存在: {a2_path}")
        printer.disconnect()
        return False
    
    print(f"✓ 找到图片: a1.png, a2.png")
    print(f"\n开始打印 {count} 张标签...")
    
    success_count = 0
    
    for i in range(count):
        # 每张标签打印两个图片
        # 图片1: a1.png
        label1 = LabelData(width=50, height=50, gap=2, density=8, copies=1)
        label1.images.append(ImageElement(
            x=0, y=0,
            image_path=a1_path,
            width=int(50 * 8),
            height=int(50 * 8),
            dither=False,
            threshold=128
        ))
        
        if printer.print_label(label1):
            success_count += 1
            print(f"  [{i*2+1}/{count*2}] a1.png ✓")
        else:
            print(f"  [{i*2+1}/{count*2}] a1.png ✗")
        
        # 图片2: a2.png
        label2 = LabelData(width=50, height=50, gap=2, density=8, copies=1)
        label2.images.append(ImageElement(
            x=0, y=0,
            image_path=a2_path,
            width=int(50 * 8),
            height=int(50 * 8),
            dither=False,
            threshold=128
        ))
        
        if printer.print_label(label2):
            success_count += 1
            print(f"  [{i*2+2}/{count*2}] a2.png ✓")
        else:
            print(f"  [{i*2+2}/{count*2}] a2.png ✗")
    
    printer.disconnect()
    
    print(f"\n{'='*60}")
    print(f"打印完成！")
    print(f"成功: {success_count}/{count*2} 张")
    print(f"{'='*60}")
    
    return True

if __name__ == "__main__":
    # 默认打印50张
    count = 50
    
    # 如果有命令行参数，使用指定数量
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            print("✗ 参数无效，使用默认值 50")
    
    print(f"批量打印工具")
    print(f"将打印 {count} 组标签（每组2张，共 {count*2} 张）")
    
    confirm = input(f"\n确认打印 {count*2} 张标签？(y/n): ").strip().lower()
    
    if confirm == 'y':
        print_batch(count)
    else:
        print("已取消")
