"""
电梯调度系统
实现智能电梯调度、等待时间计算、批处理优化
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
import heapq

class Direction(Enum):
    UP = "up"
    DOWN = "down"
    IDLE = "idle"

class ElevatorStatus(Enum):
    MOVING = "moving"
    STOPPED = "stopped"
    LOADING = "loading"

@dataclass
class Elevator:
    """电梯类"""
    id: int
    building: int
    current_floor: int = 1
    direction: Direction = Direction.IDLE
    capacity: int = 8
    current_load: int = 0
    target_floors: List[int] = field(default_factory=list)
    status: ElevatorStatus = ElevatorStatus.STOPPED
    
    def is_full(self) -> bool:
        """是否满载"""
        return self.current_load >= self.capacity
    
    def can_take_passenger(self) -> bool:
        """是否可以接乘客"""
        return not self.is_full() and self.status != ElevatorStatus.MOVING
    
    def add_target_floor(self, floor: int):
        """添加目标楼层"""
        if floor not in self.target_floors and floor != self.current_floor:
            self.target_floors.append(floor)
            self.target_floors.sort()
    
    def get_next_floor(self) -> Optional[int]:
        """获取下一个目标楼层"""
        if not self.target_floors:
            return None
        
        if self.direction == Direction.UP:
            # 向上：找最近的上方楼层
            upper_floors = [f for f in self.target_floors if f > self.current_floor]
            return min(upper_floors) if upper_floors else None
        elif self.direction == Direction.DOWN:
            # 向下：找最近的下方楼层
            lower_floors = [f for f in self.target_floors if f < self.current_floor]
            return max(lower_floors) if lower_floors else None
        else:
            # 空闲：找最近的楼层
            return min(self.target_floors, key=lambda f: abs(f - self.current_floor))
    
    def move_to_next_floor(self):
        """移动到下一层"""
        next_floor = self.get_next_floor()
        if next_floor is None:
            self.direction = Direction.IDLE
            self.status = ElevatorStatus.STOPPED
            return
        
        # 更新方向
        if next_floor > self.current_floor:
            self.direction = Direction.UP
            self.current_floor += 1
        elif next_floor < self.current_floor:
            self.direction = Direction.DOWN
            self.current_floor -= 1
        
        self.status = ElevatorStatus.MOVING
        
        # 到达目标楼层
        if self.current_floor in self.target_floors:
            self.target_floors.remove(self.current_floor)
            self.status = ElevatorStatus.LOADING

class ElevatorController:
    """电梯控制器 - 管理单栋楼的所有电梯"""
    
    ELEVATOR_SPEED = 2  # 秒/层
    DOOR_TIME = 3       # 开关门时间
    
    def __init__(self, building: int, num_elevators: int = 2):
        self.building = building
        self.elevators = [
            Elevator(id=i, building=building)
            for i in range(num_elevators)
        ]
    
    def get_elevator(self, elevator_id: int) -> Optional[Elevator]:
        """获取指定电梯"""
        for elevator in self.elevators:
            if elevator.id == elevator_id:
                return elevator
        return None
    
    def calculate_wait_time(self, elevator: Elevator, from_floor: int, to_floor: int) -> float:
        """
        计算等待时间
        考虑：电梯当前位置、方向、目标楼层队列
        """
        wait_time = 0
        
        # 如果电梯空闲且在目标楼层
        if elevator.direction == Direction.IDLE and elevator.current_floor == from_floor:
            return self.DOOR_TIME
        
        # 计算电梯到达from_floor的时间
        if elevator.direction == Direction.IDLE:
            # 空闲：直接计算距离
            distance = abs(elevator.current_floor - from_floor)
            wait_time = distance * self.ELEVATOR_SPEED + self.DOOR_TIME
        else:
            # 运行中：需要考虑当前任务
            # 简化：计算完成当前所有任务后到达的时间
            remaining_stops = len(elevator.target_floors)
            avg_distance = sum(abs(f - elevator.current_floor) for f in elevator.target_floors)
            if remaining_stops > 0:
                avg_distance /= remaining_stops
            
            wait_time = (remaining_stops * self.ELEVATOR_SPEED * avg_distance + 
                        remaining_stops * self.DOOR_TIME +
                        abs(from_floor - elevator.current_floor) * self.ELEVATOR_SPEED)
        
        return wait_time
    
    def select_best_elevator(self, from_floor: int, to_floor: int) -> Elevator:
        """
        选择最优电梯
        考虑：等待时间、方向匹配、载重状态
        """
        best_elevator = None
        min_cost = float('inf')
        
        for elevator in self.elevators:
            # 基础等待时间
            wait_time = self.calculate_wait_time(elevator, from_floor, to_floor)
            
            # 载重惩罚
            if elevator.is_full():
                wait_time += 120  # 满载惩罚
            
            # 方向匹配奖励
            request_direction = Direction.UP if to_floor > from_floor else Direction.DOWN
            if elevator.direction == request_direction or elevator.direction == Direction.IDLE:
                wait_time *= 0.7  # 方向匹配优先
            else:
                wait_time += 60  # 反向惩罚
            
            if wait_time < min_cost:
                min_cost = wait_time
                best_elevator = elevator
        
        return best_elevator
    
    def select_random_elevator(self) -> Elevator:
        """随机选择电梯（传统模式）"""
        import random
        return random.choice(self.elevators)

class ElevatorScheduler:
    """电梯调度器 - 管理所有楼栋的电梯"""
    
    def __init__(self, num_buildings: int = 3, elevators_per_building: int = 2):
        self.controllers = {
            building: ElevatorController(building, elevators_per_building)
            for building in range(1, num_buildings + 1)
        }
    
    def get_controller(self, building: int) -> Optional[ElevatorController]:
        """获取楼栋的电梯控制器"""
        return self.controllers.get(building)
    
    def get_all_elevators(self, building: int) -> List[Elevator]:
        """获取楼栋的所有电梯"""
        controller = self.get_controller(building)
        return controller.elevators if controller else []
    
    def select_best_elevator_smart(self, building: int, from_floor: int, to_floor: int) -> Elevator:
        """AI模式：智能选择电梯"""
        controller = self.get_controller(building)
        if not controller:
            return None
        return controller.select_best_elevator(from_floor, to_floor)
    
    def select_elevator_traditional(self, building: int) -> Elevator:
        """传统模式：随机选择电梯"""
        controller = self.get_controller(building)
        if not controller:
            return None
        return controller.select_random_elevator()
    
    def calculate_elevator_wait_time(self, building: int, from_floor: int, to_floor: int, 
                                    is_smart: bool = True) -> float:
        """计算电梯等待时间"""
        controller = self.get_controller(building)
        if not controller:
            return 0
        
        if is_smart:
            elevator = controller.select_best_elevator(from_floor, to_floor)
        else:
            elevator = controller.select_random_elevator()
        
        return controller.calculate_wait_time(elevator, from_floor, to_floor)
    
    def update_elevators(self, dt: float):
        """更新所有电梯状态"""
        for controller in self.controllers.values():
            for elevator in controller.elevators:
                if elevator.status == ElevatorStatus.MOVING:
                    # 简化：每次更新移动一层
                    elevator.move_to_next_floor()
