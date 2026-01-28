"""
配送路径优化算法
"""
from dataclasses import dataclass
from typing import List, Dict
import numpy as np

@dataclass
class Order:
    """订单数据"""
    id: int
    building: int
    floor: int
    unit: int
    room: str

class DeliveryOptimizer:
    """配送路径优化器"""
    
    FLOOR_TIME = 10      # 上下一层楼的时间(秒)
    UNIT_TIME = 15       # 切换单元的时间(秒)
    BUILDING_TIME = 60   # 切换楼栋的时间(秒)
    
    def optimize(self, orders: List[Order]) -> Dict:
        """优化配送路径"""
        if not orders:
            return self._empty_result()
        
        # 计算原始时间
        original_time = self._calculate_time(orders)
        
        # 优化路径
        optimized = self._optimize_route(orders)
        optimized_time = self._calculate_time(optimized)
        
        # 计算改进
        improvement = ((original_time - optimized_time) / original_time * 100) if original_time > 0 else 0
        
        return {
            'original': {
                'route': orders,
                'time': original_time
            },
            'optimized': {
                'route': optimized,
                'time': optimized_time
            },
            'improvement': improvement
        }
    
    def _optimize_route(self, orders: List[Order]) -> List[Order]:
        """
        优化算法：楼栋分组 -> 按楼层从低到高排序 -> 同楼层按单元排序
        确保同一楼栋内从1楼到顶楼依次配送，不跳过中间楼层
        """
        # 按楼栋分组
        building_groups = {}
        for order in orders:
            if order.building not in building_groups:
                building_groups[order.building] = []
            building_groups[order.building].append(order)
        
        optimized = []
        
        # 对每个楼栋
        for building in sorted(building_groups.keys()):
            building_orders = building_groups[building]
            
            # 关键：按楼层从低到高排序，同楼层的按单元排序
            # 这样确保从1楼到顶楼依次配送，不会跳过中间楼层
            building_orders_sorted = sorted(building_orders, key=lambda x: (x.floor, x.unit, x.room))
            optimized.extend(building_orders_sorted)
        
        return optimized
    
    def _calculate_time(self, orders: List[Order]) -> float:
        """计算总配送时间"""
        if not orders:
            return 0
        
        total_time = abs(orders[0].floor - 1) * self.FLOOR_TIME
        
        for i in range(len(orders) - 1):
            total_time += self._transition_time(orders[i], orders[i + 1])
        
        return total_time
    
    def _transition_time(self, from_order: Order, to_order: Order) -> float:
        """计算两个订单间的转移时间"""
        time = 0
        
        if from_order.building != to_order.building:
            time += self.BUILDING_TIME
            time += abs(to_order.floor - 1) * self.FLOOR_TIME
        elif from_order.unit != to_order.unit:
            time += self.UNIT_TIME
            time += abs(to_order.floor - 1) * self.FLOOR_TIME
        else:
            time += abs(to_order.floor - from_order.floor) * self.FLOOR_TIME
        
        return time
    
    def _empty_result(self) -> Dict:
        """空结果"""
        return {
            'original': {'route': [], 'time': 0},
            'optimized': {'route': [], 'time': 0},
            'improvement': 0
        }
