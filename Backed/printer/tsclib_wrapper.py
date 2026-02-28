#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
TSCLIB.DLL Python Wrapper
封装 TSCLIB.DLL 的基本函数 - 使用 ANSI 字符串（char*）而不是 Unicode
"""
import ctypes
import os
from ctypes import c_int, c_char_p

class TSCLib:
    """TSCLIB.DLL 封装类"""
    
    def __init__(self):
        """初始化 DLL"""
        dll_path = os.path.join(os.path.dirname(__file__), 'TSCLIB.dll')
        try:
            # 使用 CDLL 而不是 WinDLL，因为 TSCLIB 使用 cdecl 调用约定
            self.dll = ctypes.CDLL(dll_path)
            
            # 设置函数签名 - 所有参数都是 char* (ANSI 字符串)
            self.dll.openport.argtypes = [c_char_p]
            self.dll.openport.restype = c_int
            
            self.dll.closeport.argtypes = []
            self.dll.closeport.restype = c_int
            
            self.dll.setup.argtypes = [c_char_p, c_char_p, c_char_p, c_char_p, c_char_p, c_char_p, c_char_p]
            self.dll.setup.restype = c_int
            
            self.dll.clearbuffer.argtypes = []
            self.dll.clearbuffer.restype = c_int
            
            self.dll.printlabel.argtypes = [c_char_p, c_char_p]
            self.dll.printlabel.restype = c_int
            
            self.dll.sendcommand.argtypes = [c_char_p]
            self.dll.sendcommand.restype = c_int
            
            self.dll.printerfont.argtypes = [c_char_p, c_char_p, c_char_p, c_char_p, c_char_p, c_char_p, c_char_p]
            self.dll.printerfont.restype = c_int
            
            self.dll.downloadpcx.argtypes = [c_char_p, c_char_p]
            self.dll.downloadpcx.restype = c_int
            
        except Exception as e:
            raise RuntimeError(f"无法加载 TSCLIB.dll: {e}")
    
    def _encode(self, s):
        """将字符串编码为 ANSI (GBK)"""
        if isinstance(s, str):
            return s.encode('gbk')
        return s
    
    def about(self):
        """显示 DLL 版本信息"""
        try:
            self.dll.about()
        except:
            pass
    
    def openport(self, printer_name):
        """打开打印机端口"""
        return self.dll.openport(self._encode(printer_name))
    
    def closeport(self):
        """关闭打印机端口"""
        return self.dll.closeport()
    
    def setup(self, width, height, speed, density, sensor, vertical, offset):
        """设置标签参数"""
        return self.dll.setup(
            self._encode(str(width)),
            self._encode(str(height)),
            self._encode(str(speed)),
            self._encode(str(density)),
            self._encode(str(sensor)),
            self._encode(str(vertical)),
            self._encode(str(offset))
        )
    
    def clearbuffer(self):
        """清除缓冲区"""
        return self.dll.clearbuffer()
    
    def printlabel(self, sets, copies):
        """打印标签"""
        return self.dll.printlabel(self._encode(str(sets)), self._encode(str(copies)))
    
    def sendcommand(self, command):
        """发送原始命令"""
        return self.dll.sendcommand(self._encode(command))
    
    def printerfont(self, x, y, font, rotation, x_scale, y_scale, content):
        """打印内置字体"""
        return self.dll.printerfont(
            self._encode(str(x)),
            self._encode(str(y)),
            self._encode(font),
            self._encode(str(rotation)),
            self._encode(str(x_scale)),
            self._encode(str(y_scale)),
            self._encode(content)
        )
    
    def downloadpcx(self, filename, image_name):
        """下载 PCX 图片到打印机"""
        return self.dll.downloadpcx(self._encode(filename), self._encode(image_name))
    
    def nobackfeed(self):
        """禁用回退"""
        try:
            self.dll.nobackfeed()
        except:
            pass
    
    def formfeed(self):
        """走纸"""
        try:
            self.dll.formfeed()
        except:
            pass
