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

# 滑动窗口用于降噪
hr_window = deque(maxlen=5)
br_window = deque(maxlen=5)

def list_ports():
    """列出所有可用串口"""
    ports = serial.tools.list_ports.comports()
    print("\n可用串口:")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    return [p.device for p in ports]

def read_serial_data(port, baudrate=921600):
    """读取串口数据的线程函数"""
    global latest_data
    
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        print(f"已连接到串口 {port}")
        
        buffer = bytearray()
        frame_size = 32
        
        while True:
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
                    
                    if (BR > 5 and 5 <= BR <= 40 and distance <= 4.0 and 
                        (abs(Bwave) > 0.0001 or abs(Hwave) > 0.0001)):
                        status = 'detected'
                    elif (BR > 5 and HR > 30 and distance <= 4.0):
                        status = 'detected'
                    
                    # 检查警报
                    if BR >= 100:
                        alert = '呼吸异常！呼吸率过高'
                    elif BR > 35 and BR < 100:
                        alert = '呼吸偏快'
                    elif BR > 0 and BR < 10:
                        alert = '呼吸偏慢'
                    
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
                    
                    buffer = buffer[frame_size:]
                else:
                    buffer = buffer[4:]
            
            time.sleep(0.05)
    
    except Exception as e:
        print(f"串口读取错误: {e}")
        import traceback
        traceback.print_exc()

async def handle_client(websocket):
    """处理WebSocket客户端连接"""
    connected_clients.add(websocket)
    print(f"新客户端连接，当前连接数: {len(connected_clients)}")
    
    try:
        # 持续发送数据给客户端
        while True:
            with data_lock:
                data = latest_data.copy()
            
            await websocket.send(json.dumps(data))
            await asyncio.sleep(0.2)  # 5帧/秒
    
    except websockets.exceptions.ConnectionClosed:
        print("客户端断开连接")
    finally:
        connected_clients.remove(websocket)
        print(f"客户端已移除，当前连接数: {len(connected_clients)}")

async def start_server():
    """启动WebSocket服务器"""
    server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    print("WebSocket服务器已启动: ws://localhost:8765")
    await server.wait_closed()

def main():
    """主函数"""
    # 查找串口
    ports = list_ports()
    
    if not ports:
        print("未找到串口设备，将只启动WebSocket服务器（用于测试）")
        port = None
    else:
        port = ports[0]
        print(f"\n使用串口: {port}")
        
        # 启动串口读取线程
        serial_thread = threading.Thread(target=read_serial_data, args=(port,), daemon=True)
        serial_thread.start()
    
    # 启动WebSocket服务器
    print("\n启动WebSocket服务器...")
    asyncio.run(start_server())

if __name__ == "__main__":
    main()
