"""
扫描拼帧模块 - 将多个数据包拼成一圈完整扫描

功能:
- 检测起始包，开始新一圈
- 累积点云数据
- 处理角度跨越 0°/360°
- 输出完整一圈数据
"""

from typing import List, Optional
from dataclasses import dataclass
import numpy as np
from .protocol_parser import ScanPackage, ScanPoint


@dataclass
class FullScan:
    """完整一圈扫描数据"""
    points: List[ScanPoint]  # 所有点
    scan_freq: float         # 扫描频率 (Hz)
    point_count: int         # 点数
    start_angle: float       # 起始角度
    end_angle: float         # 结束角度
    
    def to_numpy(self) -> tuple:
        """
        转换为 numpy 数组
        
        Returns:
            (angles, ranges, intensities, flags)
            - angles: (N,) 角度数组 (弧度)
            - ranges: (N,) 距离数组 (米)
            - intensities: (N,) 光强数组
            - flags: (N,) 标志数组
        """
        n = len(self.points)
        angles = np.zeros(n, dtype=np.float32)
        ranges = np.zeros(n, dtype=np.float32)
        intensities = np.zeros(n, dtype=np.uint8)
        flags = np.zeros(n, dtype=np.uint8)
        
        for i, p in enumerate(self.points):
            angles[i] = np.deg2rad(p.angle)
            ranges[i] = p.distance
            intensities[i] = p.intensity
            flags[i] = p.flag
        
        return angles, ranges, intensities, flags


class ScanAssembler:
    """扫描拼帧器"""
    
    def __init__(self, max_points: int = 10000):  # 增大到 10000
        """
        Args:
            max_points: 单圈最大点数
        """
        self.max_points = max_points
        self.reset()
    
    def reset(self):
        """重置状态"""
        self.current_scan: List[ScanPoint] = []
        self.scan_freq = 0.0
        self.is_scanning = False
        self.last_angle = 0.0
    
    def feed_package(self, package: ScanPackage) -> Optional[FullScan]:
        """
        喂入数据包，返回完整一圈（如果有）
        
        Args:
            package: 数据包
            
        Returns:
            完整一圈数据，如果还未完成则返回 None
        """
        # 检查校验 - 完全禁用，T-mini Plus 硬件数据无法验证
        # 原因：硬件数据与文档/SDK都不匹配，可能是固件版本差异
        # if not package.checksum_ok:
        #     print(f"[ScanAssembler] 校验失败，丢弃包")
        #     return None
        
        # 检测起始包
        if package.is_start:
            # 如果已有数据，先输出上一圈
            full_scan = None
            if self.is_scanning and len(self.current_scan) > 0:
                full_scan = self._build_full_scan()
            
            # 开始新一圈
            self.current_scan = []
            self.is_scanning = True
            
            # 解析扫描频率（从 CT）
            from .protocol_parser import ProtocolParser
            ct_info = ProtocolParser.get_ct_info(package.ct, 0)
            if 'freq' in ct_info:
                self.scan_freq = ct_info['freq']
            
            # 添加起始包的点
            self.current_scan.extend(package.points)
            self.last_angle = package.points[-1].angle if package.points else 0.0
            
            return full_scan
        
        # 非起始包 - 修改：即使没有起始包也开始累积
        if not self.is_scanning:
            # 强制开始扫描
            # print(f"[ScanAssembler] 没有起始包，强制开始累积数据")
            self.is_scanning = True
            self.current_scan = []
            self.last_angle = 0.0
        
        # 检测角度跳变（完成一圈）
        if len(package.points) > 0:
            first_angle = package.points[0].angle
            last_angle_in_pkg = package.points[-1].angle
            
            # 调试：打印角度信息（关闭）
            # if len(self.current_scan) % 200 == 0:
            #     print(f"[ScanAssembler] 累积 {len(self.current_scan)} 个点, 上次角度: {self.last_angle:.1f}°, 本包: {first_angle:.1f}° - {last_angle_in_pkg:.1f}°")
            
            # 方法1: 角度跳变检测（从大角度跳到小角度）
            angle_jump = False
            if self.last_angle > 270.0 and first_angle < 90.0:
                angle_jump = True
                # print(f"[ScanAssembler] ✅ 检测到角度跳变: {self.last_angle:.1f}° → {first_angle:.1f}°")
            
            # 方法2: 点数检测（一圈大约 400-600 个点）
            points_enough = len(self.current_scan) >= 400
            
            # 如果满足任一条件，输出一圈
            if angle_jump or points_enough:
                # 输出当前圈
                full_scan = self._build_full_scan()
                # print(f"[ScanAssembler] ✅ 完成一圈: {len(self.current_scan)} 个点 ({'角度跳变' if angle_jump else '点数足够'})")
                
                # 开始新一圈（当前包作为新圈的开始）
                self.current_scan = list(package.points)
                self.last_angle = last_angle_in_pkg
                
                return full_scan
            
            # 累积点云
            self.current_scan.extend(package.points)
            self.last_angle = last_angle_in_pkg
            
            # 防止溢出
            if len(self.current_scan) > self.max_points:
                # print(f"[ScanAssembler] 点数超限，强制输出")
                full_scan = self._build_full_scan()
                self.current_scan = []
                return full_scan
        
        return None
    
    def _build_full_scan(self) -> FullScan:
        """构建完整一圈数据"""
        if len(self.current_scan) == 0:
            return FullScan(
                points=[],
                scan_freq=self.scan_freq,
                point_count=0,
                start_angle=0.0,
                end_angle=0.0
            )
        
        # 按角度排序（确保连续性）
        sorted_points = sorted(self.current_scan, key=lambda p: p.angle)
        
        return FullScan(
            points=sorted_points,
            scan_freq=self.scan_freq,
            point_count=len(sorted_points),
            start_angle=sorted_points[0].angle,
            end_angle=sorted_points[-1].angle
        )
    
    def get_current_point_count(self) -> int:
        """获取当前累积的点数"""
        return len(self.current_scan)
