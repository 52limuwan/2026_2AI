"""
多机器人协作系统
实现多机器人任务分配、冲突检测、负载均衡
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from enum import Enum
from advanced_optimizer import Order
import heapq

class RobotStatus(Enum):
    IDLE = "idle"
    MOVING = "moving"
    WAITING_ELEVATOR = "waiting_elevator"
    IN_ELEVATOR = "in_elevator"
    DELIVERING = "delivering"
    AT_CANTEEN = "at_canteen"

@dataclass
class Robot:
    """机器人类"""
    id: int
    current_building: int = 0  # 0表示在食堂
    current_floor: int = 1
    status: RobotStatus = RobotStatus.IDLE
    assigned_orders: List[Order] = field(default_factory=list)
    current_order_idx: int = 0
    total_distance: float = 0
    total_time: float = 0
    
    def is_idle(self) -> bool:
        """是否空闲"""
        return self.status == RobotStatus.IDLE and self.current_order_idx >= len(self.assigned_orders)
    
    def get_current_order(self) -> Optional[Order]:
        """获取当前订单"""
        if self.current_order_idx < len(self.assigned_orders):
            return self.assigned_orders[self.current_order_idx]
        return None
    
    def complete_current_order(self):
        """完成当前订单"""
        if self.current_order_idx < len(self.assigned_orders):
            self.current_order_idx += 1
    
    def add_order(self, order: Order):
        """添加订单"""
        self.assigned_orders.append(order)
    
    def get_workload(self) -> int:
        """获取工作负载（剩余订单数）"""
        return len(self.assigned_orders) - self.current_order_idx

class MultiRobotCoordinator:
    """多机器人协调器"""
    
    def __init__(self, num_robots: int = 3):
        self.robots = [Robot(id=i) for i in range(num_robots)]
        self.elevator_usage = {}  # 记录电梯使用情况
    
    def get_robot(self, robot_id: int) -> Optional[Robot]:
        """获取机器人"""
        if 0 <= robot_id < len(self.robots):
            return self.robots[robot_id]
        return None
    
    def get_idle_robots(self) -> List[Robot]:
        """获取空闲机器人"""
        return [r for r in self.robots if r.is_idle()]
    
    def get_least_loaded_robot(self) -> Robot:
        """获取负载最小的机器人"""
        return min(self.robots, key=lambda r: r.get_workload())
    
    def assign_order_to_robot(self, order: Order) -> Robot:
        """
        分配订单给机器人
        策略：负载均衡 + 位置优先
        """
        # 优先分配给空闲机器人
        idle_robots = self.get_idle_robots()
        if idle_robots:
            # 选择距离订单最近的空闲机器人
            best_robot = min(idle_robots, 
                           key=lambda r: self._calculate_distance(r, order))
            best_robot.add_order(order)
            return best_robot
        
        # 没有空闲机器人，选择负载最小的
        robot = self.get_least_loaded_robot()
        robot.add_order(order)
        return robot
    
    def _calculate_distance(self, robot: Robot, order: Order) -> float:
        """计算机器人到订单的距离"""
        if robot.current_building == 0:  # 在食堂
            return abs(order.building - 1) * 100 + order.floor * 5
        
        building_dist = abs(robot.current_building - order.building) * 100
        floor_dist = abs(robot.current_floor - order.floor) * 5
        return building_dist + floor_dist
    
    def distribute_orders(self, orders: List[Order]) -> Dict[int, List[Order]]:
        """
        分配订单给所有机器人
        使用负载均衡算法
        """
        # 清空所有机器人的订单
        for robot in self.robots:
            robot.assigned_orders = []
            robot.current_order_idx = 0
        
        # 按优先级排序订单
        sorted_orders = sorted(orders, key=lambda o: -o.priority)
        
        # 轮流分配
        for order in sorted_orders:
            self.assign_order_to_robot(order)
        
        # 返回分配结果
        return {robot.id: robot.assigned_orders for robot in self.robots}
    
    def check_elevator_conflict(self, robot: Robot, building: int, 
                               floor: int, elevator_id: int) -> bool:
        """
        检查电梯冲突
        避免多个机器人同时使用同一电梯
        """
        key = f"{building}_{elevator_id}"
        
        # 检查是否有其他机器人正在使用这部电梯
        for other_robot in self.robots:
            if other_robot.id != robot.id:
                if (other_robot.status == RobotStatus.IN_ELEVATOR and
                    other_robot.current_building == building):
                    return True
        
        return False
    
    def reserve_elevator(self, robot: Robot, building: int, elevator_id: int):
        """预约电梯"""
        key = f"{building}_{elevator_id}"
        self.elevator_usage[key] = robot.id
    
    def release_elevator(self, robot: Robot, building: int, elevator_id: int):
        """释放电梯"""
        key = f"{building}_{elevator_id}"
        if key in self.elevator_usage and self.elevator_usage[key] == robot.id:
            del self.elevator_usage[key]
    
    def get_robot_statistics(self) -> Dict:
        """获取机器人统计信息"""
        stats = {
            'total_robots': len(self.robots),
            'idle_robots': len(self.get_idle_robots()),
            'busy_robots': len(self.robots) - len(self.get_idle_robots()),
            'total_orders': sum(len(r.assigned_orders) for r in self.robots),
            'completed_orders': sum(r.current_order_idx for r in self.robots),
            'workload_distribution': [r.get_workload() for r in self.robots]
        }
        return stats
    
    def balance_workload(self):
        """
        负载均衡
        将任务从负载高的机器人转移到负载低的机器人
        """
        # 计算平均负载
        total_workload = sum(r.get_workload() for r in self.robots)
        avg_workload = total_workload / len(self.robots)
        
        # 找出负载过高和过低的机器人
        overloaded = [r for r in self.robots if r.get_workload() > avg_workload * 1.5]
        underloaded = [r for r in self.robots if r.get_workload() < avg_workload * 0.5]
        
        # 转移任务
        for over_robot in overloaded:
            for under_robot in underloaded:
                if over_robot.get_workload() > avg_workload:
                    # 转移一个订单
                    remaining_orders = over_robot.assigned_orders[over_robot.current_order_idx:]
                    if remaining_orders:
                        order_to_transfer = remaining_orders[-1]
                        over_robot.assigned_orders.remove(order_to_transfer)
                        under_robot.add_order(order_to_transfer)

class TaskScheduler:
    """任务调度器 - 高级调度策略"""
    
    def __init__(self, coordinator: MultiRobotCoordinator):
        self.coordinator = coordinator
        self.priority_queue = []
    
    def add_task(self, order: Order, priority: float):
        """添加任务到优先级队列"""
        heapq.heappush(self.priority_queue, (-priority, order))
    
    def get_next_task(self) -> Optional[Order]:
        """获取下一个任务"""
        if self.priority_queue:
            return heapq.heappop(self.priority_queue)[1]
        return None
    
    def schedule_tasks(self, orders: List[Order], current_time: float):
        """
        调度任务
        考虑：优先级、截止时间、机器人位置
        """
        # 清空队列
        self.priority_queue = []
        
        # 计算每个订单的优先级并加入队列
        for order in orders:
            priority = self._calculate_task_priority(order, current_time)
            self.add_task(order, priority)
        
        # 按优先级分配给机器人
        scheduled_orders = []
        while self.priority_queue:
            order = self.get_next_task()
            scheduled_orders.append(order)
        
        # 分配给机器人
        return self.coordinator.distribute_orders(scheduled_orders)
    
    def _calculate_task_priority(self, order: Order, current_time: float) -> float:
        """
        计算任务优先级
        考虑：紧急程度、等待时间、距离
        """
        # 紧急程度
        if order.deadline > 0:
            time_left = order.deadline - current_time
            urgency = max(0, 1 - time_left / order.deadline)
        else:
            urgency = 0.5
        
        # 等待时间
        wait_time = current_time - order.timestamp
        wait_factor = min(1.0, wait_time / 300)
        
        # 订单优先级
        priority_factor = order.priority / 5.0
        
        # 综合优先级
        return urgency * 0.4 + wait_factor * 0.3 + priority_factor * 0.3
