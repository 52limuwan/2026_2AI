"""
Occupancy Grid Map - 占据栅格地图

特性:
- 分辨率可配置 (默认 0.05m/格)
- Log-odds 更新
- Ray casting (Bresenham 算法)
- 动态扩展
"""

import numpy as np
from typing import Tuple, Optional
import cv2


class OccupancyGridMap:
    """占据栅格地图"""
    
    def __init__(
        self,
        resolution: float = 0.05,      # 分辨率 (米/格)
        width: int = 400,              # 初始宽度 (格)
        height: int = 400,             # 初始高度 (格)
        origin_x: float = 0.0,         # 原点 X (米)
        origin_y: float = 0.0,         # 原点 Y (米)
        log_odds_occ: float = 0.7,     # 占据 log-odds 增量
        log_odds_free: float = -0.4,   # 空闲 log-odds 增量
        log_odds_min: float = -5.0,    # 最小 log-odds
        log_odds_max: float = 5.0      # 最大 log-odds
    ):
        """
        Args:
            resolution: 地图分辨率
            width: 初始宽度
            height: 初始高度
            origin_x: 地图原点 X 坐标
            origin_y: 地图原点 Y 坐标
            log_odds_occ: 占据更新值
            log_odds_free: 空闲更新值
            log_odds_min: 最小 log-odds
            log_odds_max: 最大 log-odds
        """
        self.resolution = resolution
        self.width = width
        self.height = height
        self.origin_x = origin_x
        self.origin_y = origin_y
        
        # Log-odds 参数
        self.log_odds_occ = log_odds_occ
        self.log_odds_free = log_odds_free
        self.log_odds_min = log_odds_min
        self.log_odds_max = log_odds_max
        
        # 地图数据（log-odds 表示）
        self.data = np.zeros((height, width), dtype=np.float32)
        
        # 统计
        self.update_count = 0
    
    def world_to_grid(self, x: float, y: float) -> Tuple[int, int]:
        """
        世界坐标转栅格坐标
        
        Args:
            x, y: 世界坐标 (米)
            
        Returns:
            (grid_x, grid_y) 栅格坐标
        """
        grid_x = int((x - self.origin_x) / self.resolution)
        grid_y = int((y - self.origin_y) / self.resolution)
        return grid_x, grid_y
    
    def grid_to_world(self, grid_x: int, grid_y: int) -> Tuple[float, float]:
        """
        栅格坐标转世界坐标
        
        Args:
            grid_x, grid_y: 栅格坐标
            
        Returns:
            (x, y) 世界坐标 (米)
        """
        x = grid_x * self.resolution + self.origin_x
        y = grid_y * self.resolution + self.origin_y
        return x, y
    
    def is_valid_grid(self, grid_x: int, grid_y: int) -> bool:
        """检查栅格坐标是否有效"""
        return 0 <= grid_x < self.width and 0 <= grid_y < self.height
    
    def update_scan(
        self,
        robot_x: float,
        robot_y: float,
        scan_points: np.ndarray
    ):
        """
        使用扫描数据更新地图
        
        Args:
            robot_x, robot_y: 机器人位置 (米)
            scan_points: (N, 2) 扫描点（全局坐标系）
        """
        robot_gx, robot_gy = self.world_to_grid(robot_x, robot_y)
        
        for point in scan_points:
            end_gx, end_gy = self.world_to_grid(point[0], point[1])
            
            # Ray casting: 从机器人到扫描点
            ray_cells = self._bresenham(robot_gx, robot_gy, end_gx, end_gy)
            
            # 更新射线路径上的格子为 free
            for i, (gx, gy) in enumerate(ray_cells[:-1]):
                if self.is_valid_grid(gx, gy):
                    self.data[gy, gx] += self.log_odds_free
                    self.data[gy, gx] = np.clip(
                        self.data[gy, gx],
                        self.log_odds_min,
                        self.log_odds_max
                    )
            
            # 更新终点为 occupied
            if self.is_valid_grid(end_gx, end_gy):
                self.data[end_gy, end_gx] += self.log_odds_occ
                self.data[end_gy, end_gx] = np.clip(
                    self.data[end_gy, end_gx],
                    self.log_odds_min,
                    self.log_odds_max
                )
        
        self.update_count += 1
    
    def _bresenham(
        self,
        x0: int,
        y0: int,
        x1: int,
        y1: int
    ) -> list:
        """
        Bresenham 直线算法
        
        Args:
            x0, y0: 起点
            x1, y1: 终点
            
        Returns:
            路径上的格子列表 [(x, y), ...]
        """
        cells = []
        
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        
        x, y = x0, y0
        
        while True:
            cells.append((x, y))
            
            if x == x1 and y == y1:
                break
            
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy
        
        return cells
    
    def get_probability(self, x: float, y: float) -> float:
        """
        获取指定位置的占据概率
        
        Args:
            x, y: 世界坐标 (米)
            
        Returns:
            占据概率 [0, 1]
        """
        gx, gy = self.world_to_grid(x, y)
        
        if not self.is_valid_grid(gx, gy):
            return 0.5  # 未知区域
        
        # Log-odds 转概率
        log_odds = self.data[gy, gx]
        prob = 1.0 / (1.0 + np.exp(-log_odds))
        return prob
    
    def to_image(self, unknown_color: int = 128) -> np.ndarray:
        """
        转换为图像（用于显示和保存）
        
        Args:
            unknown_color: 未知区域的颜色 (0-255)
            
        Returns:
            (H, W) 灰度图像，0=占据, 255=空闲, unknown_color=未知
        """
        # Log-odds 转概率
        prob = 1.0 / (1.0 + np.exp(-self.data))
        
        # 转换为图像
        image = np.full_like(prob, unknown_color, dtype=np.uint8)
        
        # 占据 (prob > 0.65) -> 黑色
        image[prob > 0.65] = 0
        
        # 空闲 (prob < 0.35) -> 白色
        image[prob < 0.35] = 255
        
        # 翻转 Y 轴（图像坐标系）
        image = np.flipud(image)
        
        return image
    
    def save_map(self, filename: str, metadata: Optional[dict] = None):
        """
        保存地图为 PNG + YAML
        
        Args:
            filename: 文件名（不含扩展名）
            metadata: 元数据字典
        """
        # 保存图像
        image = self.to_image()
        cv2.imwrite(f"{filename}.png", image)
        
        # 保存元数据
        if metadata is None:
            metadata = {}
        
        metadata.update({
            'resolution': self.resolution,
            'width': self.width,
            'height': self.height,
            'origin_x': self.origin_x,
            'origin_y': self.origin_y
        })
        
        import yaml
        with open(f"{filename}.yaml", 'w') as f:
            yaml.dump(metadata, f)
        
        print(f"[OccupancyGridMap] 地图已保存: {filename}.png, {filename}.yaml")
    
    def clear(self):
        """清空地图"""
        self.data.fill(0.0)
        self.update_count = 0
