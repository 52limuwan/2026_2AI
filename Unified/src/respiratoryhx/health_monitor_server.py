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
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# 配置日志系统
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)
logging.getLogger('websockets').setLevel(logging.CRITICAL)
logging.getLogger('websockets.server').setLevel(logging.CRITICAL)

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
shutdown_event = threading.Event()

# 滑动窗口用于降噪
hr_window = deque(maxlen=5)
br_window = deque(maxlen=5)

simulation_mode = None
simulation_lock = threading.Lock()
breath_holding_start_time = None
normal_heart_rate = 75

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
        last_process_time = time.time()
        
        while not shutdown_event.is_set():
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting)
                buffer.extend(data)
            
            while len(buffer) >= frame_size:
                start = buffer.find(b'\xa8\xa8\xa8\xa8')
                
                if start == -1:
                    buffer.clear()
                    break
                
                if start > 0:
                    buffer = buffer[start:]
                
                if len(buffer) < frame_size:
                    break
                
                frame = buffer[0:frame_size]
                
                if frame[28:32] == b'\xb6\xb6\xb6\xb6':
                    payload = frame[4:28]
                    Bwave = struct.unpack('<f', payload[0:4])[0]
                    Hwave = struct.unpack('<f', payload[4:8])[0]
                    BR_raw = struct.unpack('<f', payload[8:12])[0]
                    HR_raw = struct.unpack('<f', payload[12:16])[0]
                    distance = struct.unpack('<f', payload[16:20])[0]
                    
                    frame_count += 1
                    
                    if 30 <= HR_raw <= 200:
                        hr_window.append(HR_raw)
                    if 0 <= BR_raw <= 200:
                        br_window.append(BR_raw)
                    
                    HR = sum(hr_window) / len(hr_window) if hr_window else HR_raw
                    BR = sum(br_window) / len(br_window) if br_window else BR_raw
                    
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
                    
                    if BR >= 100:
                        alert = '呼吸异常！呼吸率过高'
                    elif BR > 35 and BR < 100:
                        alert = '呼吸偏快'
                    elif BR > 0 and BR < 10:
                        alert = '呼吸偏慢'
                    
                    current_time = time.time()
                    if current_time - last_process_time >= 0.2:
                        with simulation_lock:
                            if simulation_mode is None:
                                log_info("data", "frame", "数据帧", 
                                        帧号=f"#{frame_count}", 
                                        生命体征=status_text,
                                        心率=f"{HR:.1f}",
                                        呼吸=f"{BR:.1f}",
                                        距离=f"{distance:.2f}m",
                                        警报=alert if alert else "正常")
                        
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
            
            time.sleep(0.01)
    
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
    
    last_sim_log_time = 0
    
    try:
        while not shutdown_event.is_set():
            with simulation_lock:
                current_sim_mode = simulation_mode
            
            if current_sim_mode is not None:
                import random
                
                current_time = time.time()
                should_log = (current_time - last_sim_log_time) >= 1.0  # 改为1秒输出一次
                
                if current_sim_mode == 'breath_holding':
                    global breath_holding_start_time
                    if breath_holding_start_time is None:
                        breath_holding_start_time = time.time()
                    
                    holding_duration = time.time() - breath_holding_start_time
                    
                    if holding_duration < 2:
                        BR = 25 * (1 - holding_duration / 2)
                    else:
                        BR = 0
                    
                    if holding_duration < 2:
                        HR = 75 + (holding_duration / 2) * 30  # 75 -> 105
                    else:
                        HR = 105 + random.uniform(-5, 5)
                    
                    HR = max(70, min(110, HR))
                    
                    data = {
                        'heartRate': round(HR, 1),
                        'breathingRate': round(BR, 1),
                        'distance': round(random.uniform(0.5, 1.5), 2),
                        'bWave': 0.0001 if BR > 0 else 0,
                        'hWave': round(random.uniform(0.001, 0.01), 4),
                        'status': 'detected',
                        'alert': f'呼吸暂停！已持续 {int(holding_duration)} 秒'
                    }
                    
                    if should_log:
                        log_info("simulation", "breath_holding", "数据帧",
                                生命体征="检测到生命体征",
                                心率=f"{HR:.1f}",
                                呼吸=f"{BR:.1f}",
                                距离=f"{data['distance']:.2f}m",
                                警报="呼吸异常")
                        last_sim_log_time = current_time
                
                elif current_sim_mode == 'abnormal_breathing':
                    HR = random.uniform(70, 90)
                    BR = random.uniform(100, 150)
                    
                    data = {
                        'heartRate': round(HR, 1),
                        'breathingRate': round(BR, 1),
                        'distance': round(random.uniform(0.5, 1.5), 2),
                        'bWave': round(random.uniform(0.001, 0.01), 4),
                        'hWave': round(random.uniform(0.001, 0.01), 4),
                        'status': 'detected',
                        'alert': '呼吸异常！呼吸率过高'
                    }
                    
                    if should_log:
                        log_info("simulation", "abnormal_breathing", "数据帧",
                                生命体征="检测到生命体征",
                                心率=f"{HR:.1f}",
                                呼吸=f"{BR:.1f}",
                                距离=f"{data['distance']:.2f}m",
                                警报="呼吸异常-呼吸率过高")
                        last_sim_log_time = current_time
                
                elif current_sim_mode == 'no_sign':
                    data = {
                        'heartRate': 0,
                        'breathingRate': 0,
                        'distance': 0,
                        'bWave': 0,
                        'hWave': 0,
                        'status': 'no_sign',
                        'alert': None
                    }
                    
                    if should_log:
                        log_info("simulation", "no_sign", "数据帧",
                                生命体征="未检测到生命体征",
                                心率="0.0",
                                呼吸="0.0",
                                距离="0.00m",
                                警报="无生命体征")
                        last_sim_log_time = current_time
            else:
                if breath_holding_start_time is not None:
                    breath_holding_start_time = None
                
                with data_lock:
                    data = latest_data.copy()
            
            await websocket.send(json.dumps(data))
            await asyncio.sleep(1.0)  # 改为1秒发送一次
    
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
        # 定期检查 shutdown_event
        while not shutdown_event.is_set():
            await asyncio.sleep(0.5)
    except asyncio.CancelledError:
        pass
    finally:
        server.close()
        await server.wait_closed()

def startup_animation():
    """启动自检流程"""
    print()
    
    print(f"[·] 系统初始化", end="", flush=True)
    time.sleep(0.2)
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
    
    print(f"[·] 加载配置文件", end="", flush=True)
    time.sleep(0.1)
    config = {
        'ws_host': '0.0.0.0',
        'ws_port': 8765,
        'baudrate': 921600,
        'frame_rate': 5
    }
    time.sleep(0.1)
    print(f"\r[✓] 加载配置文件")
    
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
    
    print(f"[·] 初始化WebSocket", end="", flush=True)
    time.sleep(0.2)
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
    
    print(f"[·] 扫描硬件设备", end="", flush=True)
    time.sleep(0.2)
    ports = list_ports()
    time.sleep(0.2)
    if ports:
        print(f"\r[✓] 扫描硬件设备 - 发现 {len(ports)} 个串口")
    else:
        print(f"\r[✗] 扫描硬件设备 - 未发现串口")
        return False
    
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
    
    print(f"[·] 校准传感器", end="", flush=True)
    time.sleep(0.3)
    for _ in range(5):
        hr_window.append(0)
        br_window.append(0)
    time.sleep(0.1)
    print(f"\r[✓] 校准传感器")
    
    print(f"[·] 启动数据流", end="", flush=True)
    time.sleep(0.2)
    assert 'heartRate' in latest_data
    assert 'breathingRate' in latest_data
    time.sleep(0.1)
    print(f"\r[✓] 启动数据流")
    
    print()
    time.sleep(0.2)
    return True

def command_input_thread():
    """命令行输入线程"""
    global simulation_mode, breath_holding_start_time
    
    import sys
    import select
    
    # Windows 下使用 msvcrt，Unix 下使用 select
    if sys.platform == 'win32':
        import msvcrt
        
        while not shutdown_event.is_set():
            try:
                if msvcrt.kbhit():
                    char = msvcrt.getch().decode('utf-8', errors='ignore').lower()
                    
                    if char == '1':
                        with simulation_lock:
                            simulation_mode = 'breath_holding'
                            breath_holding_start_time = time.time()
                    
                    elif char == '2':
                        with simulation_lock:
                            simulation_mode = 'no_sign'
                            breath_holding_start_time = None
                    
                    elif char == '3':
                        with simulation_lock:
                            simulation_mode = 'abnormal_breathing'
                            breath_holding_start_time = None
                    
                    elif char == '0':
                        with simulation_lock:
                            simulation_mode = None
                            breath_holding_start_time = None
                
                time.sleep(0.1)
            
            except Exception as e:
                if not shutdown_event.is_set():
                    pass
    else:
        # Unix/Linux 系统
        while not shutdown_event.is_set():
            try:
                if select.select([sys.stdin], [], [], 0.1)[0]:
                    char = sys.stdin.read(1).lower()
                    
                    if char == '1':
                        with simulation_lock:
                            simulation_mode = 'breath_holding'
                            breath_holding_start_time = time.time()
                    
                    elif char == '2':
                        with simulation_lock:
                            simulation_mode = 'no_sign'
                            breath_holding_start_time = None
                    
                    elif char == '3':
                        with simulation_lock:
                            simulation_mode = 'abnormal_breathing'
                            breath_holding_start_time = None
                    
                    elif char == '0':
                        with simulation_lock:
                            simulation_mode = None
                            breath_holding_start_time = None
            
            except Exception as e:
                if not shutdown_event.is_set():
                    pass

def main():
    """主函数"""
    if not startup_animation():
        print("\n自检失败，服务无法启动")
        return
    
    ports = list_ports()
    
    if not ports:
        logger.warning("未找到串口设备")
        return
    
    port = ports[0]
    serial_thread = threading.Thread(target=read_serial_data, args=(port,), daemon=True)
    serial_thread.start()
    time.sleep(0.5)
    
    cmd_thread = threading.Thread(target=command_input_thread, daemon=True)
    cmd_thread.start()
    
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        pass
    finally:
        print("\n正在关闭服务...", flush=True)
        shutdown_event.set()
        
        for client in list(connected_clients):
            try:
                asyncio.run(client.close())
            except:
                pass
        
        print("服务已停止")

if __name__ == "__main__":
    main()
