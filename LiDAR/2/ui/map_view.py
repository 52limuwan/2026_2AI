"""
SLAM 地图视图

显示:
- 占据栅格地图
- 机器人位姿（箭头）
- 轨迹
"""

from PySide6.QtWidgets import QWidget
from PySide6.QtCore import Qt, QPointF
from PySide6.QtGui import QPainter, QPen, QBrush, QColor, QPixmap, QImage, QPainterPath
import numpy as np


class MapView(QWidget):
    """SLAM 地图视图"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # 显示参数
        self.scale = 20.0  # 像素/米
        self.offset_x = 0.0
        self.offset_y = 0.0
        
        # 数据
        self.grid_map = None
        self.current_pose = None
        self.trajectory = []
        
        # 地图图像缓存
        self.map_image = None
        
        # 离屏缓冲
        self.pixmap = None
        
        # 背景色
        self.setStyleSheet("background-color: #2e2e2e;")
        
        # 最小尺寸
        self.setMinimumSize(600, 600)
    
    def update_map(self, grid_map, current_pose, trajectory):
        """更新地图数据"""
        self.grid_map = grid_map
        self.current_pose = current_pose
        self.trajectory = trajectory
        
        # 更新地图图像
        if grid_map:
            map_array = grid_map.to_image()
            # 确保数组是 C-contiguous
            map_array = np.ascontiguousarray(map_array)
            height, width = map_array.shape
            
            # 转换为 QImage
            self.map_image = QImage(
                map_array.data,
                width,
                height,
                width,
                QImage.Format_Grayscale8
            )
        
        self.update()
    
    def clear(self):
        """清空显示"""
        self.grid_map = None
        self.current_pose = None
        self.trajectory = []
        self.map_image = None
        self.update()
    
    def paintEvent(self, event):
        """绘制事件"""
        # 创建离屏缓冲
        if self.pixmap is None or self.pixmap.size() != self.size():
            self.pixmap = QPixmap(self.size())
        
        self.pixmap.fill(QColor(46, 46, 46))
        
        # 在离屏缓冲上绘制
        painter = QPainter(self.pixmap)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # 绘制地图
        if self.map_image:
            self._draw_map(painter)
        
        # 绘制轨迹
        if len(self.trajectory) > 1:
            self._draw_trajectory(painter)
        
        # 绘制当前位姿
        if self.current_pose:
            self._draw_pose(painter)
        
        painter.end()
        
        # 将离屏缓冲绘制到屏幕
        screen_painter = QPainter(self)
        screen_painter.drawPixmap(0, 0, self.pixmap)
        screen_painter.end()
    
    def _draw_map(self, painter: QPainter):
        """绘制栅格地图"""
        if not self.grid_map or not self.map_image:
            return
        
        # 计算地图在屏幕上的位置和大小
        map_width_pixels = self.grid_map.width * self.grid_map.resolution * self.scale
        map_height_pixels = self.grid_map.height * self.grid_map.resolution * self.scale
        
        # 地图左下角在世界坐标系中的位置
        map_world_x = self.grid_map.origin_x
        map_world_y = self.grid_map.origin_y
        
        # 转换为屏幕坐标
        screen_x, screen_y = self._world_to_screen(map_world_x, map_world_y)
        
        # 绘制地图图像（注意 Y 轴翻转）
        painter.drawImage(
            int(screen_x),
            int(screen_y - map_height_pixels),
            self.map_image.scaled(
                int(map_width_pixels),
                int(map_height_pixels),
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation
            )
        )
    
    def _draw_trajectory(self, painter: QPainter):
        """绘制轨迹"""
        painter.setPen(QPen(QColor(0, 255, 0), 2))
        
        for i in range(len(self.trajectory) - 1):
            p1 = self.trajectory[i]
            p2 = self.trajectory[i + 1]
            
            # 转换为屏幕坐标
            x1, y1 = self._world_to_screen(p1.x, p1.y)
            x2, y2 = self._world_to_screen(p2.x, p2.y)
            
            painter.drawLine(
                int(x1), int(y1),
                int(x2), int(y2)
            )
    
    def _draw_pose(self, painter: QPainter):
        """绘制当前位姿（箭头）"""
        x, y = self._world_to_screen(self.current_pose.x, self.current_pose.y)
        
        # 机器人圆圈（蓝色）
        painter.setPen(QPen(QColor(0, 150, 255), 2))
        painter.setBrush(QBrush(QColor(0, 150, 255, 100)))
        painter.drawEllipse(QPointF(x, y), 10, 10)
        
        # 朝向箭头（红色）
        arrow_length = 30
        end_x = x + arrow_length * np.cos(self.current_pose.theta)
        end_y = y - arrow_length * np.sin(self.current_pose.theta)  # Y 轴向上
        
        painter.setPen(QPen(QColor(255, 0, 0), 3))
        painter.drawLine(
            int(x), int(y),
            int(end_x), int(end_y)
        )
        
        # 箭头头部
        arrow_head_size = 10
        angle1 = self.current_pose.theta + np.deg2rad(150)
        angle2 = self.current_pose.theta - np.deg2rad(150)
        
        head_x1 = end_x + arrow_head_size * np.cos(angle1)
        head_y1 = end_y - arrow_head_size * np.sin(angle1)
        head_x2 = end_x + arrow_head_size * np.cos(angle2)
        head_y2 = end_y - arrow_head_size * np.sin(angle2)
        
        painter.drawLine(int(end_x), int(end_y), int(head_x1), int(head_y1))
        painter.drawLine(int(end_x), int(end_y), int(head_x2), int(head_y2))
    
    def _world_to_screen(self, x: float, y: float) -> tuple:
        """世界坐标转屏幕坐标"""
        screen_x = self.width() / 2 + x * self.scale + self.offset_x
        screen_y = self.height() / 2 - y * self.scale + self.offset_y
        return screen_x, screen_y
    
    def wheelEvent(self, event):
        """鼠标滚轮缩放"""
        delta = event.angleDelta().y()
        if delta > 0:
            self.scale *= 1.1
        else:
            self.scale /= 1.1
        
        self.scale = max(5.0, min(self.scale, 200.0))
        self.update()
    
    def mousePressEvent(self, event):
        """鼠标按下"""
        if event.button() == Qt.MiddleButton:
            self.last_mouse_pos = event.pos()
    
    def mouseMoveEvent(self, event):
        """鼠标移动（平移）"""
        if event.buttons() & Qt.MiddleButton:
            delta = event.pos() - self.last_mouse_pos
            self.offset_x += delta.x()
            self.offset_y += delta.y()
            self.last_mouse_pos = event.pos()
            self.update()
    
    def mouseDoubleClickEvent(self, event):
        """双击重置视图"""
        self.scale = 20.0
        self.offset_x = 0.0
        self.offset_y = 0.0
        self.update()
