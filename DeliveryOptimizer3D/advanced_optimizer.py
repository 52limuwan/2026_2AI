"""
高级优化器
集成电梯调度、优先级队列、动态任务重排
"""
from dataclasses import dataclass, field
from typing import List, Optional
import heapq
import time
from elevator_system import ElevatorScheduler

@dataclass(order=True)
class Order:
    """订单数据"""
    id: int = field(compare=True)
    building: int = field(compare=False)
    floor: int = field(compare=False)
    unit: int = field(compare=False)
    room: str = field(compare=False)
    priority: int = field(default=3, compare=False)          # 优先级1-5（5最高）
    timestamp: float = field(default=0, compare=False)       # 生成时间
    deadline: float = field(default=0, compare=False)        # 截止时间
    status: str = field(default="pending", compare=False)    # pending, assigned, delivering, completed

class AdvancedOptimizer:
    """高级优化器"""
    
    # 时间成本
    FLOOR_TIME = 5       # 上下一层楼（步行）
    UNIT_TIME = 20       # 切换单元
    BUILDING_TIME = 240  # 换楼栋（含取餐）
    DELIVERY_TIME = 20   # 配送时间
    
    # 优先级权重
    URGENCY_WEIGHT = 0.4
    DISTANCE_WEIGHT = 0.3
    WAIT_TIME_WEIGHT = 0.3
    
    def __init__(self, num_buildings: int = 3):
        self.elevator_scheduler = ElevatorScheduler(num_buildings)
    
    def calculate_time_with_elevator(self, from_order: Order, to_order: Order, 
                                     is_smart: bool = True) -> float:
        """
        计算两订单间的时间（包含电梯等待）
        """
        time = self.DELIVERY_TIME
        
        if from_order.building != to_order.building:
            # 换楼栋：回食堂取餐
            time += self.BUILDING_TIME
            
            # 新楼栋：电梯从1楼到目标楼层
            elevator_wait = self.elevator_scheduler.calculate_elevator_wait_time(
                to_order.building, 1, to_order.floor, is_smart
            )
            time += elevator_wait
            time += abs(to_order.floor - 1) * self.FLOOR_TIME
        elif from_order.unit != to_order.unit:
            # 同楼栋换单元
            time += self.UNIT_TIME
            
            # 电梯时间
            elevator_wait = self.elevator_scheduler.calculate_elevator_wait_time(
                to_order.building, from_order.floor, to_order.floor, is_smart
            )
            time += elevator_wait
            time += abs(to_order.floor - from_order.floor) * self.FLOOR_TIME
        else:
            # 同单元换楼层
            elevator_wait = self.elevator_scheduler.calculate_elevator_wait_time(
                to_order.building, from_order.floor, to_order.floor, is_smart
            )
            time += elevator_wait
            time += abs(to_order.floor - from_order.floor) * self.FLOOR_TIME
        
        return time
    
    def optimize_traditional(self, orders: List[Order]) -> List[Order]:
        """
        传统模式：按接单顺序，不优化
        """
        return orders.copy()
    
    def optimize_smart(self, orders: List[Order]) -> List[Order]:
        """
        AI智能优化：按楼栋分组 + 楼层排序
        """
        if not orders:
            return []
        
        # 按楼栋分组
        building_groups = {}
        for order in orders:
            if order.building not in building_groups:
                building_groups[order.building] = []
            building_groups[order.building].append(order)
        
        # 每组内按楼层从低到高排序
        for building in building_groups:
            building_groups[building].sort(
                key=lambda x: (x.floor, x.unit, x.room)
            )
        
        # 楼栋间按订单密度排序（订单多的优先）
        sorted_buildings = sorted(
            building_groups.keys(),
            key=lambda b: (-len(building_groups[b]), b)
        )
        
        # 合并结果
        result = []
        for building in sorted_buildings:
            result.extend(building_groups[building])
        
        return result
    
    def calculate_priority(self, order: Order, current_time: float) -> float:
        """
        计算订单优先级
        考虑：紧急程度、距离、等待时间
        """
        # 紧急程度（基于截止时间）
        if order.deadline > 0:
            time_left = order.deadline - current_time
            urgency = max(0, 1 - time_left / order.deadline)
        else:
            urgency = 0.5
        
        # 距离因素（楼层越高越远）
        distance_factor = order.floor / 18.0  # 归一化到0-1
        
        # 等待时间
        wait_time = current_time - order.timestamp
        wait_factor = min(1.0, wait_time / 300)  # 5分钟归一化
        
        # 综合优先级
        priority = (urgency * self.URGENCY_WEIGHT +
                   (1 - distance_factor) * self.DISTANCE_WEIGHT +
                   wait_factor * self.WAIT_TIME_WEIGHT)
        
        # 考虑订单本身的优先级
        priority *= (order.priority / 3.0)
        
        return priority
    
    def insert_new_order_smart(self, current_route: List[Order], 
                               completed_count: int, 
                               new_order: Order) -> List[Order]:
        """
        智能插入新订单
        考虑：优先级、电梯状态、当前位置
        """
        if completed_count >= len(current_route):
            return current_route + [new_order]
        
        remaining = current_route[completed_count:]
        if not remaining:
            return current_route + [new_order]
        
        # 找最优插入位置
        best_pos = len(remaining)
        best_cost = float('inf')
        
        for i in range(len(remaining) + 1):
            cost = 0
            
            if i == 0:
                # 插到开头
                if completed_count > 0:
                    prev = current_route[completed_count - 1]
                    cost += self.calculate_time_with_elevator(prev, new_order, is_smart=True)
                if remaining:
                    cost += self.calculate_time_with_elevator(new_order, remaining[0], is_smart=True)
            elif i == len(remaining):
                # 插到末尾
                cost += self.calculate_time_with_elevator(remaining[-1], new_order, is_smart=True)
            else:
                # 插到中间
                prev_order = remaining[i-1]
                next_order = remaining[i]
                
                # 新路径成本
                cost += self.calculate_time_with_elevator(prev_order, new_order, is_smart=True)
                cost += self.calculate_time_with_elevator(new_order, next_order, is_smart=True)
                
                # 减去原路径成本
                cost -= self.calculate_time_with_elevator(prev_order, next_order, is_smart=True)
            
            # 同楼栋优先
            if i < len(remaining) and remaining[i].building == new_order.building:
                cost *= 0.6
            
            # 考虑优先级
            priority_factor = self.calculate_priority(new_order, time.time())
            cost *= (1 - priority_factor * 0.3)  # 高优先级降低成本
            
            if cost < best_cost:
                best_cost = cost
                best_pos = i
        
        # 插入并重新优化
        new_remaining = remaining[:best_pos] + [new_order] + remaining[best_pos:]
        result = current_route[:completed_count] + self.optimize_smart(new_remaining)
        
        return result
    
    def calculate_total_time_traditional(self, orders: List[Order]) -> float:
        """
        传统模式总时间：每单回食堂 + 随机电梯
        """
        if not orders:
            return 0
        
        # 从食堂到第一单
        total = 60 + orders[0].floor * self.FLOOR_TIME
        
        # 每单之间都回食堂
        for i in range(len(orders) - 1):
            total += self.BUILDING_TIME  # 回食堂
            total += self.calculate_time_with_elevator(orders[i], orders[i + 1], is_smart=False)
        
        return total
    
    def calculate_total_time_smart(self, orders: List[Order]) -> float:
        """
        AI模式总时间：批量配送 + 智能电梯
        """
        if not orders:
            return 0
        
        # 从食堂到第一单
        total = 60 + orders[0].floor * self.FLOOR_TIME
        
        # 订单间时间（同楼栋不回食堂）
        for i in range(len(orders) - 1):
            if orders[i].building != orders[i + 1].building:
                total += self.BUILDING_TIME  # 换楼栋回食堂
            total += self.calculate_time_with_elevator(orders[i], orders[i + 1], is_smart=True)
        
        return total
    
    def calculate_total_time(self, orders: List[Order]) -> float:
        """兼容接口"""
        return self.calculate_total_time_smart(orders)
