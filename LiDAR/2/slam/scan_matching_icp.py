"""
Point-to-Point ICP (Iterative Closest Point) 扫描匹配

基于 https://ricojia.github.io/2024/04/10/Robotics-2D-SLAM-Scan-Matching/
实现简单高效的 2D ICP 算法

优点:
- 计算快速，适合实时应用
- 对初始位姿要求不高
- 收敛稳定

算法流程:
1. 数据关联: 使用 KD-Tree 找最近邻
2. 位姿估计: 最小化点对距离（非线性最小二乘）
3. 迭代优化: 重复 1-2 直到收敛
"""

import numpy as np
from typing import Tuple, Optional
from scipy.spatial import KDTree
from .pose2d import Pose2D


class ICPScanMatcher:
    """ICP 扫描匹配器"""
    
    def __init__(
        self,
        max_iterations: int = 20,           # 最大迭代次数
        tolerance: float = 1e-4,            # 收敛阈值
        max_correspondence_dist: float = 0.5,  # 最大对应距离 (米)
        min_points: int = 10                # 最少点数
    ):
        """
        Args:
            max_iterations: 最大迭代次数
            tolerance: 收敛阈值（位姿变化）
            max_correspondence_dist: 最大对应距离
            min_points: 最少点数要求
        """
        self.max_iterations = max_iterations
        self.tolerance = tolerance
        self.max_correspondence_dist = max_correspondence_dist
        self.min_points = min_points
        
        # 统计信息
        self.last_iterations = 0
        self.last_error = 0.0
        self.last_inlier_ratio = 0.0
    
    def match(
        self,
        source_points: np.ndarray,
        target_points: np.ndarray,
        initial_pose: Pose2D
    ) -> Tuple[Pose2D, float, bool]:
        """
        执行 ICP 匹配
        
        Args:
            source_points: (N, 2) 源点云（当前扫描，局部坐标系）
            target_points: (M, 2) 目标点云（地图点云，全局坐标系）
            initial_pose: 初始位姿估计
            
        Returns:
            (best_pose, error, success)
            - best_pose: 最佳匹配位姿
            - error: 平均匹配误差
            - success: 是否匹配成功
        """
        if len(source_points) < self.min_points or len(target_points) < self.min_points:
            return initial_pose, float('inf'), False
        
        # 构建目标点云 KD-Tree
        target_tree = KDTree(target_points)
        
        # 当前位姿
        current_pose = Pose2D(
            x=initial_pose.x,
            y=initial_pose.y,
            theta=initial_pose.theta
        )
        
        # 迭代优化
        for iteration in range(self.max_iterations):
            # 1. 将源点云变换到当前位姿
            transformed_source = current_pose.transform_point(source_points)
            
            # 2. 数据关联：找最近邻
            distances, indices = target_tree.query(transformed_source)
            
            # 3. 过滤：只保留距离小于阈值的对应
            valid_mask = distances < self.max_correspondence_dist
            if np.sum(valid_mask) < self.min_points:
                # 有效对应太少，匹配失败
                self.last_iterations = iteration + 1
                self.last_error = float('inf')
                self.last_inlier_ratio = 0.0
                return current_pose, float('inf'), False
            
            # 有效对应
            valid_source = transformed_source[valid_mask]
            valid_target = target_points[indices[valid_mask]]
            
            # 4. 位姿估计：最小化点对距离
            delta_pose = self._estimate_transform(
                source_points[valid_mask],  # 使用局部坐标
                valid_target
            )
            
            # 5. 更新位姿
            new_pose = Pose2D(
                x=current_pose.x + delta_pose[0],
                y=current_pose.y + delta_pose[1],
                theta=current_pose.theta + delta_pose[2]
            )
            
            # 6. 检查收敛
            pose_change = np.sqrt(delta_pose[0]**2 + delta_pose[1]**2 + (delta_pose[2]*0.1)**2)
            if pose_change < self.tolerance:
                # 收敛
                current_pose = new_pose
                break
            
            current_pose = new_pose
        
        # 计算最终误差
        final_transformed = current_pose.transform_point(source_points)
        final_distances, _ = target_tree.query(final_transformed)
        valid_final = final_distances < self.max_correspondence_dist
        
        if np.sum(valid_final) < self.min_points:
            self.last_iterations = iteration + 1
            self.last_error = float('inf')
            self.last_inlier_ratio = 0.0
            return current_pose, float('inf'), False
        
        avg_error = np.mean(final_distances[valid_final])
        inlier_ratio = np.sum(valid_final) / len(source_points)
        
        self.last_iterations = iteration + 1
        self.last_error = avg_error
        self.last_inlier_ratio = inlier_ratio
        
        # 成功条件：内点比例 > 50% 且平均误差 < 0.2m
        success = inlier_ratio > 0.5 and avg_error < 0.2
        
        return current_pose, avg_error, success
    
    def _estimate_transform(
        self,
        source: np.ndarray,
        target: np.ndarray
    ) -> np.ndarray:
        """
        估计 2D 刚体变换 [dx, dy, dtheta]
        
        使用 SVD 求解最优旋转和平移
        
        Args:
            source: (N, 2) 源点（局部坐标）
            target: (N, 2) 目标点（全局坐标）
            
        Returns:
            [dx, dy, dtheta] 位姿增量
        """
        # 计算质心
        source_center = np.mean(source, axis=0)
        target_center = np.mean(target, axis=0)
        
        # 去质心
        source_centered = source - source_center
        target_centered = target - target_center
        
        # 计算协方差矩阵
        H = source_centered.T @ target_centered
        
        # SVD 分解
        U, S, Vt = np.linalg.svd(H)
        
        # 计算旋转矩阵
        R = Vt.T @ U.T
        
        # 确保是旋转矩阵（det(R) = 1）
        if np.linalg.det(R) < 0:
            Vt[-1, :] *= -1
            R = Vt.T @ U.T
        
        # 提取旋转角
        dtheta = np.arctan2(R[1, 0], R[0, 0])
        
        # 计算平移
        t = target_center - R @ source_center
        
        return np.array([t[0], t[1], dtheta])
    
    def get_stats(self) -> dict:
        """获取统计信息"""
        return {
            'iterations': self.last_iterations,
            'error': self.last_error,
            'inlier_ratio': self.last_inlier_ratio
        }
