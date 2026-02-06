"""
实时点云视图 - 极坐标显示（官方风格）

特性:
- 极坐标显示（类似官方上位机）
- 彩色距离编码
- 清晰的墙壁显示
- 离屏缓冲
"""

from PySide6.QtWidgets import QWidget
from PySide6.QtCore import Qt, QPointF
from PySide6.QtGui import QPainter, QPen, QBrush, QColor, QPixmap
import numpy as np
import math


class LidarView(QWidget):
    """实时点云视图（极坐标）"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # 显示参数
        self.max_range = 2.0  # 最大显示距离（米）- 默认2米
        self.point_size = 2   # 点大小（减小）
        
        # 点云累积
        self.accumulated_points = []  # [(angle_deg, distance_m, intensity), ...]
        self.max_accumulated = 3000   # 减少到3000（提高性能）
        self.accumulate_mode = True
        self.frame_count = 0
        
        # 数据
        self.scan = None
        self.flip_angle = False
        
        # 离屏缓冲
        self.pixmap = None
        
        # 背景色（深色，类似官方）
        self.setStyleSheet("background-color: #1a1a1a;")
        
        # 最小尺寸
        self.setMinimumSize(600, 600)
    
    
    def update_scan(self, scan, flip_angle=False):
        """更新扫描数据"""
        self.scan = scan
        self.flip_angle = flip_angle
        
        # 累积点云
        if self.accumulate_mode and scan:
            for point in scan.points:
                # 严格过滤
                if point.distance < 0.05 or point.distance > 12.0:
                    continue
                if point.flag == 2 or point.flag == 3:
                    continue
                
                # 角度（可选翻转）
                angle = point.angle
                if flip_angle:
                    angle = 360.0 - angle
                
                self.accumulated_points.append((angle, point.distance, point.intensity))
            
            # 限制累积数量
            if len(self.accumulated_points) > self.max_accumulated:
                self.accumulated_points = self.accumulated_points[-self.max_accumulated:]
            
            # 每帧都刷新（不再跳帧）
            self.update()
        else:
            self.update()
    
    def clear_accumulated(self):
        """清空累积点云"""
        self.accumulated_points = []
        self.frame_count = 0
        self.update()
    
    def toggle_accumulate(self):
        """切换累积模式"""
        self.accumulate_mode = not self.accumulate_mode
        if not self.accumulate_mode:
            self.accumulated_points = []
        self.update()
    
    
    def paintEvent(self, event):
        """绘制事件"""
        # 创建离屏缓冲
        if self.pixmap is None or self.pixmap.size() != self.size():
            self.pixmap = QPixmap(self.size())
        
        self.pixmap.fill(QColor(26, 26, 26))  # 深色背景
        
        # 在离屏缓冲上绘制
        painter = QPainter(self.pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 绘制极坐标网格
        self._draw_polar_grid(painter)
        
        # 绘制点云
        if self.accumulate_mode and len(self.accumulated_points) > 0:
            self._draw_accumulated_polar(painter)
        elif not self.accumulate_mode and self.scan:
            self._draw_scan_polar(painter)
        
        # 绘制中心点（雷达位置）
        self._draw_center(painter)
        
        painter.end()
        
        # 将离屏缓冲绘制到屏幕
        screen_painter = QPainter(self)
        screen_painter.drawPixmap(0, 0, self.pixmap)
        screen_painter.end()
    
    def _draw_polar_grid(self, painter: QPainter):
        """绘制极坐标网格（类似官方上位机）"""
        center_x = self.width() / 2
        center_y = self.height() / 2
        radius = min(center_x, center_y) * 0.9
        
        # 绘制同心圆（距离圈）
        painter.setPen(QPen(QColor(60, 60, 60), 1))
        for i in range(1, int(self.max_range) + 1):
            r = radius * (i / self.max_range)
            painter.drawEllipse(QPointF(center_x, center_y), r, r)
            
            # 标注距离
            painter.setPen(QPen(QColor(100, 100, 100), 1))
            painter.drawText(
                int(center_x + 5), int(center_y - r + 15),
                f"{i}m"
            )
            painter.setPen(QPen(QColor(60, 60, 60), 1))
        
        # 绘制角度线（每30度）
        painter.setPen(QPen(QColor(60, 60, 60), 1))
        for angle_deg in range(0, 360, 30):
            angle_rad = math.radians(angle_deg)
            x = center_x + radius * math.cos(angle_rad)
            y = center_y - radius * math.sin(angle_rad)  # Y轴向上
            painter.drawLine(int(center_x), int(center_y), int(x), int(y))
            
            # 标注角度
            text_x = center_x + (radius + 20) * math.cos(angle_rad)
            text_y = center_y - (radius + 20) * math.sin(angle_rad)
            painter.setPen(QPen(QColor(100, 100, 100), 1))
            painter.drawText(int(text_x - 15), int(text_y + 5), f"{angle_deg}°")
            painter.setPen(QPen(QColor(60, 60, 60), 1))
    
    def _draw_center(self, painter: QPainter):
        """绘制中心点（雷达位置）"""
        center_x = self.width() / 2
        center_y = self.height() / 2
        
        # 蓝色圆圈
        painter.setPen(QPen(QColor(0, 150, 255), 2))
        painter.setBrush(QBrush(QColor(0, 150, 255, 100)))
        painter.drawEllipse(QPointF(center_x, center_y), 8, 8)
    
    def _draw_accumulated_polar(self, painter: QPainter):
        """绘制累积点云（极坐标）"""
        center_x = self.width() / 2
        center_y = self.height() / 2
        radius = min(center_x, center_y) * 0.9
        
        if len(self.accumulated_points) == 0:
            return
        
        # 不降采样，绘制所有点（更流畅）
        for angle_deg, distance, intensity in self.accumulated_points:
            # 跳过超出范围的点
            if distance > self.max_range:
                continue
            
            # 转换为屏幕坐标（极坐标）
            angle_rad = math.radians(angle_deg)
            r = radius * (distance / self.max_range)
            
            screen_x = center_x + r * math.cos(angle_rad)
            screen_y = center_y - r * math.sin(angle_rad)
            
            # 颜色编码（根据距离）
            color = self._distance_to_color(distance)
            
            painter.setPen(QPen(color, self.point_size))
            painter.drawPoint(QPointF(screen_x, screen_y))
    
    def _draw_scan_polar(self, painter: QPainter):
        """绘制当前扫描（极坐标）"""
        center_x = self.width() / 2
        center_y = self.height() / 2
        radius = min(center_x, center_y) * 0.9
        
        if not self.scan or len(self.scan.points) == 0:
            return
        
        # 不降采样，绘制所有点（更流畅）
        for point in self.scan.points:
            # 过滤（官方方法：只用Flag）
            if point.distance < 0.05 or point.distance > self.max_range:
                continue
            if point.flag == 2 or point.flag == 3:  # 官方推荐：过滤Flag=2和Flag=3
                continue
            
            # 角度
            angle_deg = point.angle
            if self.flip_angle:
                angle_deg = 360.0 - angle_deg
            
            # 转换为屏幕坐标
            angle_rad = math.radians(angle_deg)
            r = radius * (point.distance / self.max_range)
            
            screen_x = center_x + r * math.cos(angle_rad)
            screen_y = center_y - r * math.sin(angle_rad)
            
            # 颜色编码
            color = self._distance_to_color(point.distance)
            
            painter.setPen(QPen(color, self.point_size))
            painter.drawPoint(QPointF(screen_x, screen_y))
    
    def _distance_to_color(self, distance: float) -> QColor:
        """
        距离到颜色的映射（彩虹色，类似官方）
        
        近距离（0-2m）: 蓝色 -> 青色
        中距离（2-4m）: 青色 -> 绿色 -> 黄色
        远距离（4-8m）: 黄色 -> 橙色 -> 红色
        """
        # 归一化到 [0, 1]
        t = min(distance / self.max_range, 1.0)
        
        if t < 0.25:  # 0-2m: 蓝色 -> 青色
            ratio = t / 0.25
            r = 0
            g = int(255 * ratio)
            b = 255
        elif t < 0.5:  # 2-4m: 青色 -> 绿色
            ratio = (t - 0.25) / 0.25
            r = 0
            g = 255
            b = int(255 * (1 - ratio))
        elif t < 0.75:  # 4-6m: 绿色 -> 黄色
            ratio = (t - 0.5) / 0.25
            r = int(255 * ratio)
            g = 255
            b = 0
        else:  # 6-8m: 黄色 -> 红色
            ratio = (t - 0.75) / 0.25
            r = 255
            g = int(255 * (1 - ratio))
            b = 0
        
        return QColor(r, g, b)
    
    def wheelEvent(self, event):
        """鼠标滚轮缩放"""
        delta = event.angleDelta().y()
        if delta > 0:
            self.max_range = max(2.0, self.max_range - 0.5)
        else:
            self.max_range = min(20.0, self.max_range + 0.5)
        self.update()

        """双击重置视图"""
        self.scale = 30.0
        self.center_x = 0.0
        self.center_y = 0.0
        self.update()
