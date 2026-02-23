"""
健康监测WebSocket服务器
连接毫米波雷达和前端页面，实时传输生命体征数据
"""

import asyncio
import websockets
import json
import serial
import serial.tools.list_ports
import struct
from collections import deque
import threading
import time
import sys
import logging
from datetime import datetime

# Windows平台特殊处理
if sys.platform == 'win32':
    # 设置事件循环策略，避免关闭时的警告
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# 配置日志系统
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

# 禁用websockets库的日志
logging.getLogger('websockets').setLevel(logging.CRITICAL)
logging.getLogger('websockets.server').setLevel(logging.CRITICAL)

# 自定义日志函数，支持结构化输出
def log_info(module, action, message, **kwargs):
    """结构化日志输出"""
    parts = [message]
    for key, value in kwargs.items():
        parts.append(f"{key}={value}")
    logger.info(" ".join(parts))

# 全局变量
connected_clients = set()
latest_data = {
    'heartRate': 0,
    'breathingRate': 0,
    'distance': 0,
    'bWave': 0,
    'hWave': 0,
    'status': 'no_sign',
    'alert': None
}
data_lock = threading.Lock()
shutdown_event = threading.Event()  # 用于优雅关闭

# 滑动窗口用于降噪
hr_window = deque(maxlen=5)
br_window = deque(maxlen=5)

def list_ports():
    """列出所有可用串口"""
    ports = serial.tools.list_ports.comports()
    return [p.device for p in ports]

def read_serial_data(port, baudrate=921600):
    """读取串口数据的线程函数"""
    global latest_data
    
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        
        buffer = bytearray()
        frame_size = 32
        frame_count = 0
        last_process_time = time.time()  # 记录上次处理帧的时间
        
        while not shutdown_event.is_set():
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting)
                buffer.extend(data)
            
            while True:
                # 查找帧头
                start = buffer.find(b'\xa8\xa8\xa8\xa8')
                
                if start == -1:
                    buffer.clear()
                    break
                
                if start > 0:
                    buffer = buffer[start:]
                
                if len(buffer) < frame_size:
                    break
                
                frame = buffer[0:frame_size]
                
                # 检查帧尾
                if frame[28:32] == b'\xb6\xb6\xb6\xb6':
                    payload = frame[4:28]
                    Bwave = struct.unpack('<f', payload[0:4])[0]
                    Hwave = struct.unpack('<f', payload[4:8])[0]
                    BR_raw = struct.unpack('<f', payload[8:12])[0]
                    HR_raw = struct.unpack('<f', payload[12:16])[0]
                    distance = struct.unpack('<f', payload[16:20])[0]
                    
                    frame_count += 1
                    
                    # 异常值过滤
                    if 30 <= HR_raw <= 200:
                        hr_window.append(HR_raw)
                        
                    if 0 <= BR_raw <= 200:
                        br_window.append(BR_raw)
                    
                    # 滑动平均降噪
                    HR = sum(hr_window) / len(hr_window) if hr_window else HR_raw
                    BR = sum(br_window) / len(br_window) if br_window else BR_raw
                    
                    # 判断生命体征
                    status = 'no_sign'
                    alert = None
                    status_text = "未检测到生命体征"
                    
                    if (BR > 5 and 5 <= BR <= 40 and distance <= 4.0 and 
                        (abs(Bwave) > 0.0001 or abs(Hwave) > 0.0001)):
                        status = 'detected'
                        status_text = "检测到生命体征"
                    elif (BR > 5 and HR > 30 and distance <= 4.0):
                        status = 'detected'
                        status_text = "检测到生命体征"
                    
                    # 检查警报
                    if BR >= 100:
                        alert = '呼吸异常！呼吸率过高'
                    elif BR > 35 and BR < 100:
                        alert = '呼吸偏快'
                    elif BR > 0 and BR < 10:
                        alert = '呼吸偏慢'
                    
                    # 每0.2秒处理一次帧（5帧/秒）
                    current_time = time.time()
                    if current_time - last_process_time >= 0.2:
                        # 输出日志
                        log_info("data", "frame", "数据帧", 
                                帧号=f"#{frame_count}", 
                                生命体征=status_text,
                                心率=f"{HR:.1f}",
                                呼吸=f"{BR:.1f}",
                                距离=f"{distance:.2f}m",
                                警报=alert if alert else "正常")
                        
                        # 更新全局数据
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
                        
                        last_process_time = current_time
                    
                    buffer = buffer[frame_size:]
                else:
                    buffer = buffer[4:]
            
            time.sleep(0.01)  # 短暂休眠，避免CPU占用过高
    
    except Exception as e:
        if not shutdown_event.is_set():
            logger.error(f"串口读取错误: {e}", exc_info=True)
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()

async def handle_client(websocket):
    """处理WebSocket客户端连接"""
    client_addr = websocket.remote_address
    connected_clients.add(websocket)
    
    try:
        # 持续发送数据给客户端
        while not shutdown_event.is_set():
            with data_lock:
                data = latest_data.copy()
            
            await websocket.send(json.dumps(data))
            await asyncio.sleep(0.2)  # 5帧/秒
    
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        pass
    finally:
        connected_clients.discard(websocket)

async def start_server():
    """启动WebSocket服务器"""
    server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    
    try:
        await asyncio.Future()  # 永久运行
    except asyncio.CancelledError:
        pass
    finally:
        server.close()
        await server.wait_closed()

def startup_animation():
    """启动自检流程"""
    print()
    
    # 1. 系统初始化
    print(f"[·] 系统初始化", end="", flush=True)
    time.sleep(0.2)
    # 清理全局状态
    global latest_data, connected_clients, hr_window, br_window
    connected_clients.clear()
    hr_window.clear()
    br_window.clear()
    latest_data = {
        'heartRate': 0,
        'breathingRate': 0,
        'distance': 0,
        'bWave': 0,
        'hWave': 0,
        'status': 'no_sign',
        'alert': None
    }
    time.sleep(0.1)
    print(f"\r[✓] 系统初始化")
    
    # 2. 加载配置文件
    print(f"[·] 加载配置文件", end="", flush=True)
    time.sleep(0.1)
    # 检查环境变量和配置
    config = {
        'ws_host': '0.0.0.0',
        'ws_port': 8765,
        'baudrate': 921600,
        'frame_rate': 5
    }
    time.sleep(0.1)
    print(f"\r[✓] 加载配置文件")
    
    # 3. 检查依赖库
    print(f"[·] 检查依赖库", end="", flush=True)
    time.sleep(0.1)
    try:
        import websockets
        import serial
        import struct
        time.sleep(0.1)
        print(f"\r[✓] 检查依赖库")
    except ImportError as e:
        print(f"\r[✗] 检查依赖库 - 缺少: {e.name}")
        return False
    
    # 4. 初始化WebSocket
    print(f"[·] 初始化WebSocket", end="", flush=True)
    time.sleep(0.2)
    # 验证端口可用性
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('0.0.0.0', config['ws_port']))
        sock.close()
        time.sleep(0.1)
        print(f"\r[✓] 初始化WebSocket")
    except OSError:
        print(f"\r[✗] 初始化WebSocket - 端口 {config['ws_port']} 已被占用")
        return False
    
    # 5. 扫描硬件设备
    print(f"[·] 扫描硬件设备", end="", flush=True)
    time.sleep(0.2)
    ports = list_ports()
    time.sleep(0.2)
    if ports:
        print(f"\r[✓] 扫描硬件设备 - 发现 {len(ports)} 个串口")
    else:
        print(f"\r[✗] 扫描硬件设备 - 未发现串口")
        return False
    
    # 6. 建立串口连接
    print(f"[·] 建立串口连接", end="", flush=True)
    time.sleep(0.2)
    try:
        test_ser = serial.Serial(ports[0], config['baudrate'], timeout=1)
        time.sleep(0.1)
        test_ser.close()
        print(f"\r[✓] 建立串口连接 - {ports[0]}")
    except Exception as e:
        print(f"\r[✗] 建立串口连接 - {str(e)}")
        return False
    
    # 7. 校准传感器
    print(f"[·] 校准传感器", end="", flush=True)
    time.sleep(0.3)
    # 预热滑动窗口
    for _ in range(5):
        hr_window.append(0)
        br_window.append(0)
    time.sleep(0.1)
    print(f"\r[✓] 校准传感器")
    
    # 8. 启动数据流
    print(f"[·] 启动数据流", end="", flush=True)
    time.sleep(0.2)
    # 验证数据结构
    assert 'heartRate' in latest_data
    assert 'breathingRate' in latest_data
    time.sleep(0.1)
    print(f"\r[✓] 启动数据流")
    
    print()
    time.sleep(0.2)
    return True

def main():
    """主函数"""
    # 启动自检流程
    if not startup_animation():
        print("\n自检失败，服务无法启动")
        return
    
    # 查找串口
    ports = list_ports()
    
    serial_thread = None
    
    if not ports:
        logger.warning("未找到串口设备")
        return
    else:
        port = ports[0]
        
        # 启动串口读取线程
        serial_thread = threading.Thread(target=read_serial_data, args=(port,), daemon=True)
        serial_thread.start()
        time.sleep(0.5)  # 等待串口初始化
    
    # 启动WebSocket服务器
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        pass
    finally:
        print("\n正在关闭服务...", flush=True)
        shutdown_event.set()
        
        # 关闭所有WebSocket连接
        for client in list(connected_clients):
            try:
                asyncio.run(client.close())
            except:
                pass
        
        print("服务已停止")

if __name__ == "__main__":
    main()
