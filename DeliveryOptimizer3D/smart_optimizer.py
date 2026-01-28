"""
智能配送路径优化器 - 参考美团/饿了么算法
"""
from dataclasses import dataclass
from typing import List, Tuple
import math

@dataclass
class Order:
    """订单数据"""
    id: int
    building: int
    floor: int
    unit: int
    room: str
    timestamp: float = 0

class SmartOptimizer:
    """智能路径优化器"""
    
    # 时间成本（让楼栋切换代价更大）
    FLOOR_TIME = 5       # 上下一层楼
    UNIT_TIME = 20       # 切换单元
    BUILDING_TIME = 240  # 切换楼栋（含回食堂取餐）- 超级耗时！
    DELIVERY_TIME = 20   # 每单配送时间
    
    def calculate_time(self, from_order: Order, to_order: Order, batch_mode: bool = False) -> float:
        """
        计算两订单间的时间
        batch_mode: True表示批量配送（一次拿多单），False表示单次配送
        """
        time = self.DELIVERY_TIME
        
        if from_order.building != to_order.building:
            if batch_mode:
                # AI批量模式：同批次换楼栋不需要回食堂
                time += self.BUILDING_TIME // 3  # 只需要走路时间
                time += abs(to_order.floor - 1) * self.FLOOR_TIME
            else:
                # 传统模式：每次都要回食堂拿餐
                time += self.BUILDING_TIME  # 回食堂+取餐+去新楼
                time += abs(to_order.floor - 1) * self.FLOOR_TIME
        elif from_order.unit != to_order.unit:
            time += abs(to_order.floor - from_order.floor) * self.FLOOR_TIME
            time += self.UNIT_TIME
        else:
            time += abs(to_order.floor - from_order.floor) * self.FLOOR_TIME
        
        return time
    
    def calculate_total_time_traditional(self, orders: List[Order]) -> float:
        """
        传统模式总时间：每单都要回食堂拿餐
        """
        if not orders:
            return 0
        
        total = 60 + orders[0].floor * self.FLOOR_TIME  # 第一单
        
        for i in range(len(orders) - 1):
            # 每单之间都要回食堂（非常低效）
            total += self.BUILDING_TIME  # 回食堂拿下一单的餐
            total += self.calculate_time(orders[i], orders[i + 1], batch_mode=False)
        
        return total
    
    def calculate_total_time_smart(self, orders: List[Order]) -> float:
        """
        AI模式总时间：按楼栋批量配送
        """
        if not orders:
            return 0
        
        # 从食堂到第一单
        total = 60 + orders[0].floor * self.FLOOR_TIME
        
        # 订单间时间（同楼栋不需要回食堂）
        for i in range(len(orders) - 1):
            if orders[i].building != orders[i + 1].building:
                # 换楼栋：回食堂拿新楼栋的餐
                total += self.BUILDING_TIME
            total += self.calculate_time(orders[i], orders[i + 1], batch_mode=True)
        
        return total
    
    def optimize_traditional(self, orders: List[Order]) -> List[Order]:
        """
        传统模式：完全按接单时间顺序
        模拟传统外卖员：接一单送一单，完全不考虑路线
        这样会导致大量的楼栋切换，非常低效
        """
        return orders.copy()
    
    def optimize_smart(self, orders: List[Order]) -> List[Order]:
        """
        智能优化算法（美团/饿了么风格）：
        1. 按楼栋分组（减少楼栋切换）
        2. 每组内按楼层从低到高（电梯效率最高）
        3. 同楼层按单元排序
        4. 楼栋间按订单密度排序（先送订单多的楼）
        """
        if not orders:
            return []
        
        # 按楼栋分组
        building_groups = {}
        for order in orders:
            if order.building not in building_groups:
                building_groups[order.building] = []
            building_groups[order.building].append(order)
        
        # 每组内优化：按楼层从低到高，同楼层按单元
        for building in building_groups:
            building_groups[building].sort(
                key=lambda x: (x.floor, x.unit, x.room)
            )
        
        # 楼栋间排序：优先送订单多的楼（批量配送效率高）
        sorted_buildings = sorted(
            building_groups.keys(),
            key=lambda b: (-len(building_groups[b]), b)
        )
        
        # 合并结果
        result = []
        for building in sorted_buildings:
            result.extend(building_groups[building])
        
        return result
    
    def insert_new_order_smart(self, current_route: List[Order], 
                               completed_count: int, 
                               new_order: Order) -> List[Order]:
        """
        智能插入新订单
        关键：新订单必须先回食堂取餐，所以优先插入到同楼栋或楼栋切换点
        """
        if completed_count >= len(current_route):
            return current_route + [new_order]
        
        remaining = current_route[completed_count:]
        if not remaining:
            return current_route + [new_order]
        
        # 找最优插入位置
        best_pos = len(remaining)  # 默认插到末尾
        best_cost = float('inf')
        
        for i in range(len(remaining) + 1):
            cost = 0
            
            # 计算插入成本
            if i == 0:
                # 插到开头
                if completed_count > 0:
                    prev = current_route[completed_count - 1]
                    # 需要回食堂取新订单的餐
                    cost += self.BUILDING_TIME + self.calculate_time(prev, new_order)
                if remaining:
                    cost += self.calculate_time(new_order, remaining[0])
            elif i == len(remaining):
                # 插到末尾
                cost += self.calculate_time(remaining[-1], new_order)
            else:
                # 插到中间
                prev_order = remaining[i-1]
                next_order = remaining[i]
                
                # 如果在楼栋切换点插入，成本较低（反正要回食堂）
                if prev_order.building != next_order.building:
                    cost += self.calculate_time(prev_order, new_order)
                    cost += self.calculate_time(new_order, next_order)
                    cost -= self.calculate_time(prev_order, next_order)
                    cost *= 0.5  # 楼栋切换点插入成本低
                else:
                    # 同楼栋内插入
                    if new_order.building == prev_order.building:
                        # 同楼栋，成本较低
                        cost += self.calculate_time(prev_order, new_order)
                        cost += self.calculate_time(new_order, next_order)
                        cost -= self.calculate_time(prev_order, next_order)
                        cost *= 0.6
                    else:
                        # 不同楼栋，需要额外回食堂
                        cost += self.BUILDING_TIME * 2
            
            if cost < best_cost:
                best_cost = cost
                best_pos = i
        
        new_remaining = remaining[:best_pos] + [new_order] + remaining[best_pos:]
        
        # 重新优化插入后的路线（保持楼栋分组）
        result = current_route[:completed_count] + self.optimize_smart(new_remaining)
        return result
    
    def calculate_total_time(self, orders: List[Order]) -> float:
        """计算总时间（兼容接口）"""
        return self.calculate_total_time_smart(orders)
