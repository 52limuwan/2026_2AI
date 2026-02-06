"""
噪点过滤模块

过滤策略:
1. Flag 过滤: Flag=2 (镜面反射), Flag=3 (环境光干扰)
2. 距离过滤: 0 距离, 超量程, 突变
3. 角度过滤: 无效角度
"""

import numpy as np
from typing import Tuple
from .scan_assembler import FullScan
from .protocol_parser import ScanPoint


class ScanFilter:
    """扫描数据过滤器"""
    
    def __init__(
        self,
        filter_flag: bool = True,
        filter_zero_distance: bool = True,
        filter_out_of_range: bool = True,
        min_distance: float = 0.05,  # 最小距离 (米)
        max_distance: float = 12.0,  # 最大距离 (米)
        filter_sudden_change: bool = False,
        sudden_change_threshold: float = 1.0  # 突变阈值 (米)
    ):
        """
        Args:
            filter_flag: 是否过滤 Flag 标记的点
            filter_zero_distance: 是否过滤零距离点
            filter_out_of_range: 是否过滤超量程点
            min_distance: 最小有效距离
            max_distance: 最大有效距离
            filter_sudden_change: 是否过滤突变点
            sudden_change_threshold: 突变阈值
        """
        self.filter_flag = filter_flag
        self.filter_zero_distance = filter_zero_distance
        self.filter_out_of_range = filter_out_of_range
        self.min_distance = min_distance
        self.max_distance = max_distance
        self.filter_sudden_change = filter_sudden_change
        self.sudden_change_threshold = sudden_change_threshold
    
    def filter_scan(self, scan: FullScan) -> FullScan:
        """
        过滤完整一圈扫描数据
        
        Args:
            scan: 原始扫描数据
            
        Returns:
            过滤后的扫描数据
        """
        if len(scan.points) == 0:
            return scan
        
        filtered_points = []
        
        for i, point in enumerate(scan.points):
            # Flag 过滤
            if self.filter_flag:
                if point.flag == 2:  # 镜面反射
                    continue
                if point.flag == 3:  # 环境光干扰
                    continue
            
            # 零距离过滤
            if self.filter_zero_distance:
                if point.distance < 0.001:
                    continue
            
            # 距离范围过滤
            if self.filter_out_of_range:
                if point.distance < self.min_distance or point.distance > self.max_distance:
                    continue
            
            # 突变过滤（与前一个点比较）
            if self.filter_sudden_change and len(filtered_points) > 0:
                last_point = filtered_points[-1]
                distance_diff = abs(point.distance - last_point.distance)
                if distance_diff > self.sudden_change_threshold:
                    continue
            
            filtered_points.append(point)
        
        # 构造新的 FullScan
        from .scan_assembler import FullScan
        return FullScan(
            points=filtered_points,
            scan_freq=scan.scan_freq,
            point_count=len(filtered_points),
            start_angle=filtered_points[0].angle if filtered_points else 0.0,
            end_angle=filtered_points[-1].angle if filtered_points else 0.0
        )
    
    def filter_numpy(
        self,
        angles: np.ndarray,
        ranges: np.ndarray,
        intensities: np.ndarray,
        flags: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        过滤 numpy 数组格式的扫描数据
        
        Args:
            angles: (N,) 角度数组 (弧度)
            ranges: (N,) 距离数组 (米)
            intensities: (N,) 光强数组
            flags: (N,) 标志数组
            
        Returns:
            过滤后的 (angles, ranges, intensities, flags)
        """
        mask = np.ones(len(ranges), dtype=bool)
        
        # Flag 过滤
        if self.filter_flag:
            mask &= (flags != 2) & (flags != 3)
        
        # 零距离过滤
        if self.filter_zero_distance:
            mask &= (ranges > 0.001)
        
        # 距离范围过滤
        if self.filter_out_of_range:
            mask &= (ranges >= self.min_distance) & (ranges <= self.max_distance)
        
        # 突变过滤
        if self.filter_sudden_change:
            range_diff = np.abs(np.diff(ranges, prepend=ranges[0]))
            mask &= (range_diff <= self.sudden_change_threshold)
        
        return (
            angles[mask],
            ranges[mask],
            intensities[mask],
            flags[mask]
        )
    
    def update_params(self, **kwargs):
        """更新过滤参数"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
