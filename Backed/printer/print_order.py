#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
外卖单打印脚本
接收订单JSON数据，打印外卖单
"""
import sys
import json
import os
import io

# 设置标准输出为UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 添加打印库路径（当前目录）
sys.path.insert(0, os.path.dirname(__file__))

from label_printer_dll import LabelPrinterDLL, LabelData, TextElement, BoxElement, ImageElement

def print_order(order_data):
    """打印外卖单 - 打印两张固定图片"""
    try:
        # 连接打印机
        printer = LabelPrinterDLL("Gprinter GP-1324D")
        
        if not printer.connect():
            print("ERROR: 连接打印机失败", file=sys.stderr)
            return False
        
        # 固定图片路径
        image_dir = os.path.join(os.path.dirname(__file__), '../images')
        a1_path = os.path.join(image_dir, 'a1.png')
        a2_path = os.path.join(image_dir, 'a2.png')
        
        # 检查图片是否存在
        if not os.path.exists(a1_path):
            print(f"ERROR: 图片不存在: {a1_path}", file=sys.stderr)
            printer.disconnect()
            return False
        
        if not os.path.exists(a2_path):
            print(f"ERROR: 图片不存在: {a2_path}", file=sys.stderr)
            printer.disconnect()
            return False
        
        print(f"找到图片: {a1_path}")
        print(f"找到图片: {a2_path}")
        
        # 打印第一张：a1.png
        print("打印 a1.png...")
        label1 = LabelData(width=50, height=50, gap=2, density=8, copies=1)
        
        label1.images.append(ImageElement(
            x=0, y=0,
            image_path=a1_path,
            width=int(50 * 8),  # 50mm * 8 dots/mm = 400 dots
            height=int(50 * 8), # 50mm * 8 dots/mm = 400 dots
            dither=False,
            threshold=128
        ))
        
        if not printer.print_label(label1):
            print("ERROR: a1.png 打印失败", file=sys.stderr)
        else:
            print("SUCCESS: a1.png 打印成功")
        
        # 打印第二张：a2.png
        print("打印 a2.png...")
        label2 = LabelData(width=50, height=50, gap=2, density=8, copies=1)
        
        label2.images.append(ImageElement(
            x=0, y=0,
            image_path=a2_path,
            width=int(50 * 8),  # 50mm * 8 dots/mm = 400 dots
            height=int(50 * 8), # 50mm * 8 dots/mm = 400 dots
            dither=False,
            threshold=128
        ))
        
        if not printer.print_label(label2):
            print("ERROR: a2.png 打印失败", file=sys.stderr)
        else:
            print("SUCCESS: a2.png 打印成功")
        
        printer.disconnect()
        
        print(f"SUCCESS: 订单 {order_data.get('order_number')} 打印完成（2张标签）")
        return True
            
    except Exception as e:
        print(f"ERROR: 打印异常: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: 缺少订单数据参数", file=sys.stderr)
        sys.exit(1)
    
    try:
        order_json = sys.argv[1]
        order_data = json.loads(order_json)
        
        success = print_order(order_data)
        sys.exit(0 if success else 1)
        
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON解析失败: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: 未知错误: {e}", file=sys.stderr)
        sys.exit(1)
