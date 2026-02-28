#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
标签打印机高级封装
提供面向对象的打印接口
"""
import os
from PIL import Image
from tsclib_wrapper import TSCLib

class TextElement:
    """文本元素"""
    def __init__(self, x, y, content, font="4", rotation=0, x_scale=1, y_scale=1):
        self.x = x
        self.y = y
        self.content = content
        self.font = font
        self.rotation = rotation
        self.x_scale = x_scale
        self.y_scale = y_scale

class BoxElement:
    """矩形框元素"""
    def __init__(self, x, y, width, height, thickness=1):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.thickness = thickness

class ImageElement:
    """图片元素"""
    def __init__(self, x, y, image_path, width=None, height=None, dither=False, threshold=128):
        self.x = x
        self.y = y
        self.image_path = image_path
        self.width = width
        self.height = height
        self.dither = dither
        self.threshold = threshold

class LabelData:
    """标签数据"""
    def __init__(self, width, height, gap=2, density=8, speed=4, copies=1):
        self.width = width  # mm
        self.height = height  # mm
        self.gap = gap  # mm
        self.density = density  # 打印密度 (0-15)
        self.speed = speed  # 打印速度
        self.copies = copies  # 打印份数
        
        self.texts = []
        self.boxes = []
        self.images = []

class LabelPrinterDLL:
    """标签打印机类"""
    
    def __init__(self, printer_name):
        self.printer_name = printer_name
        self.tsc = TSCLib()
        self.connected = False
    
    def connect(self):
        """连接打印机"""
        try:
            result = self.tsc.openport(self.printer_name)
            # 返回值 0 或 1 都表示成功，-1 表示失败
            self.connected = (result >= 0)
            if not self.connected:
                print(f"连接打印机失败，返回值: {result}")
            return self.connected
        except Exception as e:
            print(f"连接打印机异常: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def disconnect(self):
        """断开打印机"""
        if self.connected:
            self.tsc.closeport()
            self.connected = False
    
    def print_label(self, label_data):
        """打印标签"""
        if not self.connected:
            print("打印机未连接")
            return False
        
        try:
            # 清除缓冲区
            self.tsc.clearbuffer()
            
            # 设置标签尺寸
            self.tsc.setup(
                width=label_data.width,
                height=label_data.height,
                speed=label_data.speed,
                density=label_data.density,
                sensor=0,  # 0=垂直间距传感器, 1=黑标传感器
                vertical=label_data.gap,
                offset=0
            )
            
            # 打印文本
            for text in label_data.texts:
                self.tsc.printerfont(
                    x=text.x,
                    y=text.y,
                    font=text.font,
                    rotation=text.rotation,
                    x_scale=text.x_scale,
                    y_scale=text.y_scale,
                    content=text.content
                )
            
            # 打印矩形框
            for box in label_data.boxes:
                # 使用 sendcommand 绘制矩形
                cmd = f'BOX {box.x},{box.y},{box.x + box.width},{box.y + box.height},{box.thickness}'
                self.tsc.sendcommand(cmd)
            
            # 打印图片
            for img in label_data.images:
                if os.path.exists(img.image_path):
                    self._print_image(img)
                else:
                    print(f"图片不存在: {img.image_path}")
            
            # 执行打印
            self.tsc.printlabel(1, label_data.copies)
            
            return True
            
        except Exception as e:
            print(f"打印失败: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _print_image(self, img_element):
        """处理并打印图片 - 使用 PCX 格式"""
        try:
            # 打开图片
            image = Image.open(img_element.image_path)
            
            # 调整尺寸
            if img_element.width and img_element.height:
                image = image.resize((img_element.width, img_element.height), Image.Resampling.LANCZOS)
            
            # 转换为黑白
            if image.mode != '1':
                image = image.convert('L')  # 先转灰度
                # 二值化
                image = image.point(lambda x: 0 if x < img_element.threshold else 255, '1')
            
            # 保存为临时 PCX 文件（TSCLIB 更好地支持 PCX）
            temp_pcx = os.path.join(os.path.dirname(__file__), 'temp_print.pcx')
            image.save(temp_pcx, 'PCX')
            
            # 下载 PCX 到打印机内存
            image_name = 'TEMP.PCX'
            self.tsc.downloadpcx(temp_pcx, image_name)
            
            # 使用 PUTPCX 命令打印
            cmd = f'PUTPCX {img_element.x},{img_element.y},"{image_name}"'
            self.tsc.sendcommand(cmd)
            
            # 清理临时文件
            try:
                os.remove(temp_pcx)
            except:
                pass
                
        except Exception as e:
            print(f"图片处理失败: {e}")
            import traceback
            traceback.print_exc()
