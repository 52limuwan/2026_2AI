"""
2D 位姿表示

Pose2D: (x, y, theta)
- x, y: 位置 (米)
- theta: 朝向 (弧度)
"""

import numpy as np
from dataclasses import dataclass
from typing import Tuple


@dataclass
class Pose2D:
    """2D 位姿"""
    x: float = 0.0      # X 坐标 (米)
    y: float = 0.0      # Y 坐标 (米)
    theta: float = 0.0  # 朝向 (弧度)
    
    def to_array(self) -> np.ndarray:
        """转换为 numpy 数组 [x, y, theta]"""
        return np.array([self.x, self.y, self.theta], dtype=np.float64)
    
    @staticmethod
    def from_array(arr: np.ndarray) -> 'Pose2D':
        """从 numpy 数组构造"""
        return Pose2D(x=arr[0], y=arr[1], theta=arr[2])
    
    def transform_point(self, point: np.ndarray) -> np.ndarray:
        """
        将点从局部坐标系变换到全局坐标系
        
        Args:
            point: (2,) 或 (N, 2) 局部坐标点
            
        Returns:
            全局坐标点
        """
        cos_t = np.cos(self.theta)
        sin_t = np.sin(self.theta)
        
        # 旋转矩阵
        R = np.array([
            [cos_t, -sin_t],
            [sin_t, cos_t]
        ])
        
        # 平移向量
        t = np.array([self.x, self.y])
        
        if point.ndim == 1:
            return R @ point + t
        else:
            return (R @ point.T).T + t
    
    def inverse_transform_point(self, point: np.ndarray) -> np.ndarray:
        """
        将点从全局坐标系变换到局部坐标系
        
        Args:
            point: (2,) 或 (N, 2) 全局坐标点
            
        Returns:
            局部坐标点
        """
        cos_t = np.cos(self.theta)
        sin_t = np.sin(self.theta)
        
        # 逆旋转矩阵
        R_inv = np.array([
            [cos_t, sin_t],
            [-sin_t, cos_t]
        ])
        
        # 平移向量
        t = np.array([self.x, self.y])
        
        if point.ndim == 1:
            return R_inv @ (point - t)
        else:
            return (R_inv @ (point - t).T).T
    
    def compose(self, other: 'Pose2D') -> 'Pose2D':
        """
        位姿复合: self ⊕ other
        
        Args:
            other: 另一个位姿
            
        Returns:
            复合后的位姿
        """
        cos_t = np.cos(self.theta)
        sin_t = np.sin(self.theta)
        
        x = self.x + cos_t * other.x - sin_t * other.y
        y = self.y + sin_t * other.x + cos_t * other.y
        theta = self.theta + other.theta
        
        # 归一化角度到 [-pi, pi]
        theta = np.arctan2(np.sin(theta), np.cos(theta))
        
        return Pose2D(x=x, y=y, theta=theta)
    
    def inverse(self) -> 'Pose2D':
        """
        位姿求逆
        
        Returns:
            逆位姿
        """
        cos_t = np.cos(self.theta)
        sin_t = np.sin(self.theta)
        
        x = -(cos_t * self.x + sin_t * self.y)
        y = -(-sin_t * self.x + cos_t * self.y)
        theta = -self.theta
        
        return Pose2D(x=x, y=y, theta=theta)
    
    def distance_to(self, other: 'Pose2D') -> float:
        """
        计算到另一个位姿的欧氏距离
        
        Args:
            other: 另一个位姿
            
        Returns:
            距离 (米)
        """
        dx = self.x - other.x
        dy = self.y - other.y
        return np.sqrt(dx * dx + dy * dy)
    
    def angle_diff_to(self, other: 'Pose2D') -> float:
        """
        计算到另一个位姿的角度差
        
        Args:
            other: 另一个位姿
            
        Returns:
            角度差 (弧度, [-pi, pi])
        """
        diff = self.theta - other.theta
        return np.arctan2(np.sin(diff), np.cos(diff))
    
    def __repr__(self) -> str:
        return f"Pose2D(x={self.x:.3f}, y={self.y:.3f}, theta={np.rad2deg(self.theta):.1f}°)"
