"""
Correlative Scan Matching (CSM) 算法

原理:
- 在搜索窗口内暴力搜索最佳匹配位姿
- 使用栅格地图计算匹配分数
- 多分辨率加速（可选）

参数:
- 搜索窗口: ±0.5m (x, y), ±10° (theta)
- 搜索步长: 0.05m, 1°
- 匹配阈值: 0.5
"""

import numpy as np
from typing import Tuple, Optional
from .pose2d import Pose2D


class CorrelativeScanMatcher:
    """相关扫描匹配器"""
    
    def __init__(
        self,
        search_window_xy: float = 0.5,      # XY 搜索窗口 (米)
        search_window_theta: float = 10.0,  # 角度搜索窗口 (度)
        search_step_xy: float = 0.05,       # XY 搜索步长 (米)
        search_step_theta: float = 1.0,     # 角度搜索步长 (度)
        min_score: float = 0.5,             # 最小匹配分数
        use_coarse_to_fine: bool = False    # 是否使用粗到精策略
    ):
        """
        Args:
            search_window_xy: XY 方向搜索窗口大小
            search_window_theta: 角度搜索窗口大小
            search_step_xy: XY 方向搜索步长
            search_step_theta: 角度搜索步长
            min_score: 最小匹配分数阈值
            use_coarse_to_fine: 是否使用粗到精搜索
        """
        self.search_window_xy = search_window_xy
        self.search_window_theta = np.deg2rad(search_window_theta)
        self.search_step_xy = search_step_xy
        self.search_step_theta = np.deg2rad(search_step_theta)
        self.min_score = min_score
        self.use_coarse_to_fine = use_coarse_to_fine
        
        # 统计信息
        self.last_match_score = 0.0
        self.last_search_count = 0
    
    def match(
        self,
        scan_points: np.ndarray,
        grid_map: 'OccupancyGridMap',
        initial_pose: Pose2D
    ) -> Tuple[Pose2D, float, bool]:
        """
        执行扫描匹配
        
        Args:
            scan_points: (N, 2) 扫描点云（局部坐标系）
            grid_map: 栅格地图
            initial_pose: 初始位姿估计
            
        Returns:
            (best_pose, score, success)
            - best_pose: 最佳匹配位姿
            - score: 匹配分数
            - success: 是否匹配成功
        """
        if len(scan_points) == 0:
            return initial_pose, 0.0, False
        
        # 生成搜索候选
        candidates = self._generate_candidates(initial_pose)
        self.last_search_count = len(candidates)
        
        # 评估每个候选
        best_pose = initial_pose
        best_score = 0.0
        
        for candidate in candidates:
            # 将扫描点变换到候选位姿
            transformed_points = candidate.transform_point(scan_points)
            
            # 计算匹配分数
            score = self._compute_score(transformed_points, grid_map)
            
            if score > best_score:
                best_score = score
                best_pose = candidate
        
        self.last_match_score = best_score
        success = best_score >= self.min_score
        
        return best_pose, best_score, success
    
    def _generate_candidates(self, initial_pose: Pose2D) -> list:
        """生成搜索候选位姿"""
        candidates = []
        
        # XY 搜索范围
        x_range = np.arange(
            -self.search_window_xy,
            self.search_window_xy + self.search_step_xy,
            self.search_step_xy
        )
        y_range = np.arange(
            -self.search_window_xy,
            self.search_window_xy + self.search_step_xy,
            self.search_step_xy
        )
        
        # 角度搜索范围
        theta_range = np.arange(
            -self.search_window_theta,
            self.search_window_theta + self.search_step_theta,
            self.search_step_theta
        )
        
        # 生成所有组合
        for dx in x_range:
            for dy in y_range:
                for dtheta in theta_range:
                    candidate = Pose2D(
                        x=initial_pose.x + dx,
                        y=initial_pose.y + dy,
                        theta=initial_pose.theta + dtheta
                    )
                    candidates.append(candidate)
        
        return candidates
    
    def _compute_score(
        self,
        points: np.ndarray,
        grid_map: 'OccupancyGridMap'
    ) -> float:
        """
        计算匹配分数
        
        分数 = 占据格子的点数 / 总点数
        
        Args:
            points: (N, 2) 全局坐标系下的点
            grid_map: 栅格地图
            
        Returns:
            匹配分数 [0, 1]
        """
        if len(points) == 0:
            return 0.0
        
        # 统计落在占据格子上的点数
        hit_count = 0
        
        for point in points:
            # 查询地图
            prob = grid_map.get_probability(point[0], point[1])
            
            # 如果是占据格子（概率 > 0.5），计数
            if prob > 0.5:
                hit_count += 1
        
        # 归一化分数
        score = hit_count / len(points)
        return score
    
    def get_stats(self) -> dict:
        """获取统计信息"""
        return {
            'last_score': self.last_match_score,
            'search_count': self.last_search_count
        }
