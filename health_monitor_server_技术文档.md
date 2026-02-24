# 健康监测服务器技术文档

## 项目概述

**文件名**: `health_monitor_server.py`  
**代码行数**: 497 行  
**功能**: 基于毫米波雷达的实时生命体征监测系统，通过 WebSocket 向前端推送心率、呼吸率等健康数据

---

## 核心技术栈

### 1. 异步通信框架
- **WebSocket 服务器**: `websockets` 库
- **异步 I/O**: `asyncio` 事件循环
- **并发模型**: 多线程 + 异步协程混合架构

```python
# Windows 平台事件循环优化
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# WebSocket 服务器启动
async def start_server():
    server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    while not shutdown_event.is_set():
        await asyncio.sleep(0.5)
```

### 2. 串口通信
- **硬件接口**: 毫米波雷达传感器（波特率 921600）
- **数据协议**: 32 字节二进制帧结构
- **帧格式**:
  - 帧头: `0xa8 0xa8 0xa8 0xa8` (4 字节)
  - 数据载荷: 24 字节
  - 帧尾: `0xb6 0xb6 0xb6 0xb6` (4 字节)

```python
def read_serial_data(port, baudrate=921600):
    ser = serial.Serial(port, baudrate, timeout=1)
    buffer = bytearray()
    frame_size = 32
    
    while not shutdown_event.is_set():
        # 读取串口数据
        if ser.in_waiting > 0:
            data = ser.read(ser.in_waiting)
            buffer.extend(data)
        
        # 查找帧头
        start = buffer.find(b'\xa8\xa8\xa8\xa8')
        if start == -1:
            buffer.clear()
            continue
        
        # 验证帧尾并解析
        if frame[28:32] == b'\xb6\xb6\xb6\xb6':
            payload = frame[4:28]
            # 解析浮点数据
            Bwave = struct.unpack('<f', payload[0:4])[0]
            Hwave = struct.unpack('<f', payload[4:8])[0]
            BR_raw = struct.unpack('<f', payload[8:12])[0]
            HR_raw = struct.unpack('<f', payload[12:16])[0]
            distance = struct.unpack('<f', payload[16:20])[0]
```

**数据载荷结构** (24 字节):
| 偏移 | 长度 | 字段 | 说明 |
|------|------|------|------|
| 0-3  | 4    | Bwave | 呼吸波形幅度 (float) |
| 4-7  | 4    | Hwave | 心跳波形幅度 (float) |
| 8-11 | 4    | BR_raw | 原始呼吸率 (float) |
| 12-15| 4    | HR_raw | 原始心率 (float) |
| 16-19| 4    | distance | 检测距离 (float) |
| 20-23| 4    | 保留 | - |

---

## 关键技术实现

### 3. 数字信号处理 - 滑动窗口降噪

使用双端队列实现移动平均滤波，消除传感器噪声：

```python
from collections import deque

# 5 点滑动窗口
hr_window = deque(maxlen=5)
br_window = deque(maxlen=5)

# 数据验证与入队
if 30 <= HR_raw <= 200:
    hr_window.append(HR_raw)
if 0 <= BR_raw <= 200:
    br_window.append(BR_raw)

# 计算平滑值
HR = sum(hr_window) / len(hr_window) if hr_window else HR_raw
BR = sum(br_window) / len(br_window) if br_window else BR_raw
```

**算法优势**:
- 时间复杂度: O(1) 均摊
- 空间复杂度: O(n) 固定窗口大小
- 实时性: 无延迟累积

### 4. 生命体征检测算法

多条件融合判断，提高检测准确性：

```python
status = 'no_sign'
alert = None

# 条件 1: 呼吸波形检测
if (BR > 5 and 5 <= BR <= 40 and distance <= 4.0 and 
    (abs(Bwave) > 0.0001 or abs(Hwave) > 0.0001)):
    status = 'detected'

# 条件 2: 心率呼吸联合检测
elif (BR > 5 and HR > 30 and distance <= 4.0):
    status = 'detected'

# 异常告警逻辑
if BR >= 100:
    alert = '呼吸异常！呼吸率过高'
elif BR > 35 and BR < 100:
    alert = '呼吸偏快'
elif BR > 0 and BR < 10:
    alert = '呼吸偏慢'
```

**检测阈值**:
- 正常呼吸率: 5-40 次/分钟
- 正常心率: 30-200 次/分钟
- 有效检测距离: ≤ 4.0 米
- 波形灵敏度: > 0.0001

### 5. 线程安全与并发控制

```python
import threading

# 全局数据保护
data_lock = threading.Lock()
simulation_lock = threading.Lock()

# 线程安全的数据更新
with data_lock:
    latest_data = {
        'heartRate': round(HR, 1),
        'breathingRate': round(BR, 1),
        'distance': round(distance, 2),
        'bWave': round(Bwave, 4),
        'hWave': round(Hwave, 4),
        'status': status,
        'alert': alert
    }

# 优雅关闭机制
shutdown_event = threading.Event()

# 串口读取线程
serial_thread = threading.Thread(target=read_serial_data, args=(port,), daemon=True)
serial_thread.start()
```

### 6. WebSocket 实时推送

```python
connected_clients = set()

async def handle_client(websocket):
    """处理单个客户端连接"""
    connected_clients.add(websocket)
    
    try:
        while not shutdown_event.is_set():
            # 获取最新数据（支持模拟模式）
            with data_lock:
                data = latest_data.copy()
            
            # JSON 序列化推送
            await websocket.send(json.dumps(data))
            await asyncio.sleep(1.0)  # 1Hz 推送频率
    
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
```

**数据格式**:
```json
{
  "heartRate": 75.3,
  "breathingRate": 18.2,
  "distance": 1.25,
  "bWave": 0.0023,
  "hWave": 0.0045,
  "status": "detected",
  "alert": null
}
```

---

## 高级特性

### 7. 模拟测试模式

支持三种模拟场景，用于前端开发和算法测试：

```python
simulation_mode = None  # 'breath_holding' | 'abnormal_breathing' | 'no_sign'

# 场景 1: 呼吸暂停模拟
if current_sim_mode == 'breath_holding':
    holding_duration = time.time() - breath_holding_start_time
    
    # 呼吸率衰减曲线
    if holding_duration < 2:
        BR = 25 * (1 - holding_duration / 2)  # 25 → 0
    else:
        BR = 0
    
    # 心率上升曲线
    if holding_duration < 2:
        HR = 75 + (holding_duration / 2) * 30  # 75 → 105
    else:
        HR = 105 + random.uniform(-5, 5)
    
    alert = f'呼吸暂停！已持续 {int(holding_duration)} 秒'

# 场景 2: 呼吸异常模拟
elif current_sim_mode == 'abnormal_breathing':
    HR = random.uniform(70, 90)
    BR = random.uniform(100, 150)  # 异常高呼吸率
    alert = '呼吸异常！呼吸率过高'

# 场景 3: 无生命体征
elif current_sim_mode == 'no_sign':
    data = {'heartRate': 0, 'breathingRate': 0, 'status': 'no_sign'}
```

**快捷键控制**:
- `1`: 呼吸暂停模式
- `2`: 无生命体征
- `3`: 呼吸异常
- `0`: 退出模拟（恢复真实数据）

### 8. 跨平台键盘监听

```python
def command_input_thread():
    if sys.platform == 'win32':
        import msvcrt
        while not shutdown_event.is_set():
            if msvcrt.kbhit():
                char = msvcrt.getch().decode('utf-8').lower()
                # 处理命令...
    else:
        import select
        while not shutdown_event.is_set():
            if select.select([sys.stdin], [], [], 0.1)[0]:
                char = sys.stdin.read(1).lower()
                # 处理命令...
```

### 9. 启动自检系统

7 步自动化检测流程，确保系统可用性：

```python
def startup_animation():
    """启动自检流程"""
    steps = [
        ("系统初始化", lambda: init_globals()),
        ("加载配置文件", lambda: load_config()),
        ("检查依赖库", lambda: check_dependencies()),
        ("初始化WebSocket", lambda: check_port(8765)),
        ("扫描硬件设备", lambda: list_ports()),
        ("建立串口连接", lambda: test_serial()),
        ("校准传感器", lambda: calibrate_sensor()),
        ("启动数据流", lambda: validate_data_structure())
    ]
    
    for name, check_func in steps:
        print(f"[·] {name}", end="", flush=True)
        time.sleep(0.2)
        
        try:
            result = check_func()
            if result is False:
                print(f"\r[✗] {name} - 失败")
                return False
            print(f"\r[✓] {name}")
        except Exception as e:
            print(f"\r[✗] {name} - {str(e)}")
            return False
    
    return True
```

**自检项目**:
1. ✓ 系统初始化 - 清空全局变量
2. ✓ 加载配置文件 - 验证参数
3. ✓ 检查依赖库 - websockets, serial, struct
4. ✓ 初始化 WebSocket - 端口占用检测
5. ✓ 扫描硬件设备 - 串口枚举
6. ✓ 建立串口连接 - 通信测试
7. ✓ 校准传感器 - 滑动窗口预热
8. ✓ 启动数据流 - 数据结构验证

---

## 性能优化

### 10. 数据处理频率控制

```python
last_process_time = time.time()
frame_count = 0

while not shutdown_event.is_set():
    # 串口数据读取（高频）
    if ser.in_waiting > 0:
        data = ser.read(ser.in_waiting)
        buffer.extend(data)
    
    # 数据处理与推送（限频 5Hz）
    current_time = time.time()
    if current_time - last_process_time >= 0.2:
        # 更新 latest_data
        with data_lock:
            latest_data = {...}
        
        last_process_time = current_time
    
    time.sleep(0.01)  # 100Hz 轮询
```

**频率设计**:
- 串口读取: 100 Hz (10ms 间隔)
- 数据处理: 5 Hz (200ms 间隔)
- WebSocket 推送: 1 Hz (1000ms 间隔)

### 11. 日志系统优化

```python
# 禁用 websockets 库的冗余日志
logging.getLogger('websockets').setLevel(logging.CRITICAL)
logging.getLogger('websockets.server').setLevel(logging.CRITICAL)

# 结构化日志输出
def log_info(module, action, message, **kwargs):
    parts = [message]
    for key, value in kwargs.items():
        parts.append(f"{key}={value}")
    logger.info(" ".join(parts))

# 使用示例
log_info("data", "frame", "数据帧", 
        帧号=f"#{frame_count}", 
        生命体征="检测到生命体征",
        心率=f"{HR:.1f}",
        呼吸=f"{BR:.1f}",
        距离=f"{distance:.2f}m",
        警报=alert if alert else "正常")
```

**输出示例**:
```
数据帧 帧号=#1234 生命体征=检测到生命体征 心率=75.3 呼吸=18.2 距离=1.25m 警报=正常
```

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    主线程 (main)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 启动自检流程  │  │ 初始化线程池  │  │ 启动事件循环  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│  串口读取线程   │  │  键盘监听线程   │  │ WebSocket   │
│                │  │                │  │  协程池     │
│ ┌────────────┐ │  │ ┌────────────┐ │  │             │
│ │ 帧同步解析  │ │  │ │ 模拟模式   │ │  │ ┌─────────┐ │
│ │ 数据降噪   │ │  │ │ 控制切换   │ │  │ │ Client1 │ │
│ │ 异常检测   │ │  │ └────────────┘ │  │ │ Client2 │ │
│ └────────────┘ │  │                │  │ │ Client3 │ │
│       │        │  │                │  │ └─────────┘ │
│       ▼        │  │                │  │             │
│ ┌────────────┐ │  │                │  │             │
│ │ latest_data│◄┼──┼────────────────┼──┤  JSON推送   │
│ │  (共享)    │ │  │                │  │   1Hz      │
│ └────────────┘ │  │                │  │             │
└────────────────┘  └────────────────┘  └─────────────┘
```

---

## 部署说明

### 依赖安装
```bash
pip install websockets pyserial
```

### 启动服务
```bash
python health_monitor_server.py
```

### 连接测试
```javascript
// 前端 WebSocket 客户端
const ws = new WebSocket('ws://localhost:8765');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('心率:', data.heartRate);
  console.log('呼吸率:', data.breathingRate);
  console.log('状态:', data.status);
  console.log('告警:', data.alert);
};
```

---

## 技术亮点总结

1. **高性能并发**: 多线程 + 异步协程混合架构，支持多客户端实时推送
2. **信号处理**: 滑动窗口移动平均滤波，有效降低传感器噪声
3. **协议解析**: 二进制帧同步算法，支持高速串口通信（921600 bps）
4. **智能检测**: 多条件融合的生命体征识别算法
5. **模拟测试**: 内置三种测试场景，支持无硬件开发
6. **跨平台**: Windows/Linux 兼容的键盘监听和事件循环
7. **可靠性**: 7 步自检流程 + 优雅关闭机制
8. **可维护性**: 结构化日志 + 线程安全设计

---

## 代码统计

- **总行数**: 497 行
- **有效代码**: ~380 行
- **注释文档**: ~50 行
- **空行**: ~67 行
- **函数数量**: 8 个
- **线程数量**: 3 个（串口、键盘、WebSocket 协程池）
- **支持的并发客户端**: 无限制（受系统资源约束）

---

**文档生成时间**: 2026-02-24  
**代码版本**: 1.0  
**维护团队**: 健康监测系统开发组
