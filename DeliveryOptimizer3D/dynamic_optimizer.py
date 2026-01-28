"""
动态配送路径优化器
支持实时订单插入和路径重规划
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
    timestamp: float = 0  # 订单生成时间

class DynamicOptimizer:
    """动态路径优化器"""
    
    FLOOR_TIME = 8       # 上下一层楼的时间(秒)
    UNIT_TIME = 20       # 切换单元的时间(秒)
    BUILDING_TIME = 90   # 切换楼栋的时间(秒) - 包含回食堂取餐
    CANTEEN_TIME = 30    # 在食堂取餐的时间(秒)
    
    def calculate_distance(self, from_order: Order, to_order: Order) -> float:
        """计算两个订单之间的配送时间"""
        time = 0
        
        if from_order.building != to_order.building:
            # 换楼栋：下到1楼 -> 回食堂 -> 取餐 -> 去新楼栋1楼 -> 上到目标楼层
            time += abs(from_order.floor - 1) * self.FLOOR_TIME  # 下到1楼
            time += self.BUILDING_TIME  # 回食堂+去新楼栋
            time += self.CANTEEN_TIME  # 取餐时间
            time += abs(to_order.floor - 1) * self.FLOOR_TIME  # 上到目标楼层
        elif from_order.unit != to_order.unit:
            time += self.UNIT_TIME
            time += abs(to_order.floor - from_order.floor) * self.FLOOR_TIME
        else:
            time += abs(to_order.floor - from_order.floor) * self.FLOOR_TIME
        
        return time
    
    def find_nearest_order(self, current: Order, remaining: List[Order]) -> Order:
        """找到距离当前位置最近的订单"""
        if not remaining:
            return None
        
        nearest = min(remaining, key=lambda o: self.calculate_distance(current, o))
        return nearest
    
    def optimize_greedy(self, orders: List[Order], current_position: Order = None) -> List[Order]:
        """
        贪心算法：每次选择距离当前位置最近的订单
        适合动态场景，可以快速响应新订单
        """
        if not orders:
            return []
        
        result = []
        remaining = orders.copy()
        
        # 如果没有当前位置，从第一个订单开始
        if current_position is None:
            current = remaining.pop(0)
            result.append(current)
        else:
            current = current_position
        
        # 贪心选择最近的订单
        while remaining:
            nearest = self.find_nearest_order(current, remaining)
            remaining.remove(nearest)
            result.append(nearest)
            current = nearest
        
        return result
    
    def optimize_batch(self, orders: List[Order]) -> List[Order]:
        """
        批量优化：按楼栋->楼层排序
        适合静态场景，全局最优但不灵活
        """
        if not orders:
            return []
        
        # 按楼栋、楼层、单元排序
        return sorted(orders, key=lambda x: (x.building, x.floor, x.unit, x.room))
    
    def replan_route(self, completed: List[Order], current: Order, 
                     remaining: List[Order], new_orders: List[Order]) -> List[Order]:
        """
        重新规划路径：考虑当前位置和新订单
        """
        # 合并剩余订单和新订单
        all_remaining = remaining + new_orders
        
        # 从当前位置开始，贪心选择最近的订单
        return self.optimize_greedy(all_remaining, current)
    
    def calculate_total_time(self, orders: List[Order]) -> float:
        """计算总配送时间 - 从食堂开始"""
        if not orders:
            return 0
        
        # 从食堂到第一个订单的楼栋1楼，再上到目标楼层
        total = self.BUILDING_TIME // 2  # 从食堂到第一栋楼
        total += abs(orders[0].floor - 1) * self.FLOOR_TIME  # 上到目标楼层
        
        # 订单之间的时间
        for i in range(len(orders) - 1):
            total += self.calculate_distance(orders[i], orders[i + 1])
        
        return total
