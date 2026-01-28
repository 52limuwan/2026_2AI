# 智能配送路径优化系统 - 设计文档

## 1. 系统架构

### 1.1 核心模块

```
elevator_system.py          # 电梯调度系统
  ├── Elevator              # 电梯类
  ├── ElevatorController    # 电梯控制器
  └── ElevatorScheduler     # 电梯调度器

advanced_optimizer.py       # 高级优化器
  ├── PriorityQueue         # 优先级队列
  ├── TaskScheduler         # 任务调度器
  └── PathPlanner           # 路径规划器

elite_visualizer.py         # 精英可视化
  ├── ElevatorVisualizer    # 电梯可视化
  ├── RobotVisualizer       # 机器人可视化
  └── StatsVisualizer       # 统计可视化
```

## 2. 数据结构设计

### 2.1 电梯类 (Elevator)

```python
@dataclass
class Elevator:
    id: int                    # 电梯ID
    building: int              # 所属楼栋
    current_floor: int         # 当前楼层
    direction: str             # 方向：'up', 'down', 'idle'
    capacity: int              # 最大容量
    current_load: int          # 当前载重
    target_floors: List[int]   # 目标楼层队列
    wait_time: float           # 预计等待时间
    status: str                # 状态：'moving', 'stopped', 'loading'
```

### 2.2 订单类 (Order)

```python
@dataclass
class Order:
    id: int
    building: int
    floor: int
    unit: int
    room: str
    priority: int              # 优先级：1-5（5最高）
    timestamp: float           # 生成时间
    deadline: float            # 截止时间
    status: str                # 状态：'pending', 'assigned', 'delivering', 'completed'
```

### 2.3 机器人类 (Robot)

```python
@dataclass
class Robot:
    id: int
    current_building: int
    current_floor: int
    status: str                # 'idle', 'moving', 'waiting_elevator', 'delivering'
    assigned_orders: List[Order]
    current_order_idx: int
```

## 3. 核心算法设计

### 3.1 电梯调度算法

#### 3.1.1 最短等待时间调度 (SRT)

```python
def select_best_elevator(building: int, from_floor: int, to_floor: int) -> Elevator:
    """
    选择最优电梯
    考虑因素：
    1. 电梯当前位置
    2. 电梯运行方向
    3. 电梯当前载重
    4. 预计等待时间
    """
    elevators = get_building_elevators(building)
    best_elevator = None
    min_wait_time = float('inf')
    
    for elevator in elevators:
        # 计算等待时间
        wait_time = calculate_wait_time(elevator, from_floor, to_floor)
        
        # 考虑载重因素
        if elevator.current_load >= elevator.capacity:
            wait_time += FULL_ELEVATOR_PENALTY
        
        # 考虑方向匹配
        if is_direction_match(elevator, from_floor, to_floor):
            wait_time *= 0.7  # 方向匹配优先
        
        if wait_time < min_wait_time:
            min_wait_time = wait_time
            best_elevator = elevator
    
    return best_elevator
```

#### 3.1.2 批处理调度

```python
def batch_schedule_elevator(orders: List[Order]) -> Dict[int, List[Order]]:
    """
    批量调度电梯
    将同方向、同楼栋的订单合并到一次电梯行程
    """
    # 按楼栋分组
    building_groups = group_by_building(orders)
    
    for building, building_orders in building_groups.items():
        # 按楼层排序
        building_orders.sort(key=lambda o: o.floor)
        
        # 分配到电梯
        elevators = get_building_elevators(building)
        distribute_orders_to_elevators(building_orders, elevators)
```

### 3.2 优先级队列调度

```python
class PriorityTaskQueue:
    """
    优先级任务队列
    优先级计算：priority = urgency * 0.4 + distance * 0.3 + wait_time * 0.3
    """
    def __init__(self):
        self.heap = []
    
    def push(self, order: Order):
        priority = self.calculate_priority(order)
        heapq.heappush(self.heap, (-priority, order))
    
    def calculate_priority(self, order: Order) -> float:
        # 紧急程度（基于截止时间）
        urgency = (order.deadline - current_time()) / order.deadline
        
        # 距离因素
        distance = calculate_distance_from_canteen(order)
        
        # 等待时间
        wait_time = current_time() - order.timestamp
        
        return urgency * 0.4 + (1 - distance/MAX_DISTANCE) * 0.3 + wait_time * 0.3
```

### 3.3 动态任务重排

```python
def dynamic_replan(robot: Robot, new_order: Order) -> List[Order]:
    """
    动态重新规划任务
    考虑：
    1. 当前位置
    2. 剩余任务
    3. 新订单优先级
    4. 电梯可用性
    """
    remaining = robot.assigned_orders[robot.current_order_idx:]
    
    # 计算插入成本
    best_position = find_best_insertion_point(
        robot.current_position,
        remaining,
        new_order
    )
    
    # 重新优化整体路线
    new_route = optimize_route_with_elevators(
        robot.current_position,
        remaining[:best_position] + [new_order] + remaining[best_position:]
    )
    
    return new_route
```

### 3.4 路径规划算法 (A*)

```python
def astar_path_planning(start: Location, goal: Location) -> List[Location]:
    """
    A*路径规划
    考虑：
    1. 电梯等待时间
    2. 楼层移动时间
    3. 楼栋切换成本
    """
    open_set = PriorityQueue()
    open_set.put((0, start))
    came_from = {}
    g_score = {start: 0}
    
    while not open_set.empty():
        current = open_set.get()[1]
        
        if current == goal:
            return reconstruct_path(came_from, current)
        
        for neighbor in get_neighbors(current):
            # 计算实际成本（包含电梯等待）
            tentative_g = g_score[current] + calculate_cost(current, neighbor)
            
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, goal)
                open_set.put((f_score, neighbor))
    
    return []
```

## 4. 传统 vs AI 对比

### 4.1 传统模式

**特点**：
- 每单回食堂取餐
- 不考虑电梯状态
- 随机选择电梯
- 按接单顺序配送
- 不优化路线

**电梯使用**：
```python
def traditional_elevator_selection(building: int) -> Elevator:
    # 随机选择一部电梯，不考虑状态
    elevators = get_building_elevators(building)
    return random.choice(elevators)
```

### 4.2 AI智能模式

**特点**：
- 按楼栋批量配送
- 实时监控电梯状态
- 选择最优电梯
- 优先级队列调度
- 动态路径规划

**电梯使用**：
```python
def ai_elevator_selection(building: int, from_floor: int, to_floor: int) -> Elevator:
    # 智能选择：考虑位置、方向、载重、等待时间
    return select_best_elevator(building, from_floor, to_floor)
```

## 5. 可视化设计

### 5.1 电梯显示

```
每栋楼显示2部电梯：
┌─────┐ ┌─────┐
│ ↑ 8 │ │ ↓ 3 │  # 方向 + 当前楼层
│ 5/8 │ │ 2/8 │  # 载重/容量
└─────┘ └─────┘
  电梯1   电梯2
```

### 5.2 统计面板

```
传统模式：
- 配送时间：5230秒
- 电梯等待：1850秒
- 电梯使用次数：45次
- 效率：低

AI模式：
- 配送时间：1340秒
- 电梯等待：320秒
- 电梯使用次数：18次
- 效率：高（提升74%）
```

### 5.3 颜色编码

- 🟢 绿色：空闲电梯
- 🟡 黄色：运行中电梯
- 🔴 红色：满载电梯
- 🟠 橙色：紧急订单
- ⚪ 灰色：已完成订单

## 6. 性能优化

### 6.1 时间复杂度

- 电梯选择：O(E) - E为电梯数量
- 优先级队列：O(log N) - N为订单数量
- A*路径规划：O(N log N)
- 总体调度：O(N log N + E*N)

### 6.2 空间复杂度

- 电梯状态：O(E)
- 订单队列：O(N)
- 路径缓存：O(N)

## 7. 配置参数

```python
# 电梯配置
ELEVATORS_PER_BUILDING = 2
ELEVATOR_CAPACITY = 8
ELEVATOR_SPEED = 2  # 秒/层
DOOR_TIME = 3       # 开关门时间

# 时间成本
FLOOR_TIME = 5      # 上下一层
UNIT_TIME = 20      # 切换单元
BUILDING_TIME = 240 # 换楼栋
DELIVERY_TIME = 20  # 配送时间

# 优先级权重
URGENCY_WEIGHT = 0.4
DISTANCE_WEIGHT = 0.3
WAIT_TIME_WEIGHT = 0.3

# 惩罚因子
FULL_ELEVATOR_PENALTY = 120  # 满载电梯惩罚
WRONG_DIRECTION_PENALTY = 60 # 反向电梯惩罚
```

## 8. 测试场景

### 8.1 正常场景
- 15个初始订单
- 每6秒生成1个新订单
- 订单随机分布

### 8.2 高峰场景
- 30个初始订单
- 每3秒生成1个新订单
- 订单集中在特定楼栋

### 8.3 紧急场景
- 包含高优先级订单
- 截止时间紧迫
- 测试优先级调度

## 9. 预期效果

### 9.1 效率提升
- 配送时间：减少70-80%
- 电梯等待：减少75%
- 电梯使用次数：减少60%

### 9.2 用户体验
- 平滑动画（60 FPS）
- 实时统计更新
- 清晰的电梯状态显示
- 直观的效率对比

## 10. 实现优先级

### Phase 1: 电梯基础系统
1. Elevator类实现
2. ElevatorController实现
3. 基础电梯调度算法
4. 电梯可视化

### Phase 2: 智能调度
1. 优先级队列
2. 动态任务重排
3. 最短等待时间算法
4. 批处理调度

### Phase 3: 高级优化
1. A*路径规划
2. 负载均衡
3. 冲突检测
4. 性能优化
