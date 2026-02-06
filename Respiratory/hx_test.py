"""
快速测试脚本 - 毫米波雷达串口读取（带降噪优化）
使用方法: python quick_test.py
快捷键:
  Ctrl+O - 模拟呼吸异常（100-150 BPM）并触发警报
  Ctrl+P - 模拟无生命体征
"""

import serial
import serial.tools.list_ports
import struct
import time
from collections import deque
import threading
import random
import sys
import os

# Windows平台键盘监听
if os.name == 'nt':
    import msvcrt

def list_ports():
    """列出所有可用串口"""
    ports = serial.tools.list_ports.comports()
    print("\n可用串口:")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    return [p.device for p in ports]

def test_serial(port, baudrate=921600):
    """测试串口连接和数据读取（带降噪）"""
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        print(f"\n已连接到 {port}")
        print("正在读取数据...\n")
        
        buffer = bytearray()
        frame_count = 0
        frame_size = 32  # 正确的帧大小：4(头)+24(数据)+4(尾)
        
        # 滑动窗口用于降噪
        hr_window = deque(maxlen=5)
        br_window = deque(maxlen=5)
        
        # 模拟模式控制
        simulation_mode = {'active': False, 'type': None}  # type: 'abnormal' or 'no_sign'
        simulation_lock = threading.Lock()
        
        def keyboard_listener():
            """监听键盘输入（Windows）"""
            if os.name != 'nt':
                return
            
            ctrl_pressed = False
            while True:
                if msvcrt.kbhit():
                    key = msvcrt.getch()
                    
                    # 检测Ctrl键
                    if key == b'\x00' or key == b'\xe0':
                        continue
                    
                    # Ctrl+O (0x0F)
                    if key == b'\x0f':
                        with simulation_lock:
                            simulation_mode['active'] = True
                            simulation_mode['type'] = 'abnormal'
                    
                    # Ctrl+P (0x10)
                    elif key == b'\x10':
                        with simulation_lock:
                            simulation_mode['active'] = True
                            simulation_mode['type'] = 'no_sign'
                    
                    # ESC键退出模拟
                    elif key == b'\x1b':
                        with simulation_lock:
                            if simulation_mode['active']:
                                simulation_mode['active'] = False
                                simulation_mode['type'] = None
                
                time.sleep(0.05)
        
        # 启动键盘监听线程
        if os.name == 'nt':
            kb_thread = threading.Thread(target=keyboard_listener, daemon=True)
            kb_thread.start()
        
        print("按 Ctrl+C 停止监测")
        print("快捷键: Ctrl+O=呼吸异常 | Ctrl+P=无生命体征 | ESC=恢复正常\n")
        
        try:
            while True:  # 持续运行直到手动停止
                if ser.in_waiting > 0:
                    data = ser.read(ser.in_waiting)
                    buffer.extend(data)
                
                # 持续查找和解析帧
                while True:
                    # 查找帧头
                    start = buffer.find(b'\xa8\xa8\xa8\xa8')
                    
                    if start == -1:
                        # 没找到帧头，清空缓冲区
                        buffer.clear()
                        break
                    
                    # 丢弃帧头之前的数据
                    if start > 0:
                        buffer = buffer[start:]
                    
                    # 检查是否有完整帧
                    if len(buffer) < frame_size:
                        break
                    
                    # 提取一帧
                    frame = buffer[0:frame_size]
                    
                    # 检查帧尾（第28-31字节）
                    if frame[28:32] == b'\xb6\xb6\xb6\xb6':               # 校验数据帧结束标识，确认数据完整有效
                                                                          # 解析数据（float格式，24字节payload）
                        payload = frame[4:28]                             # 提取4-28字节核心有效数据段
                        Bwave = struct.unpack('<f', payload[0:4])[0]      # 小端float解析0-4字节，得到B波数据
                        Hwave = struct.unpack('<f', payload[4:8])[0]      # 同理，得到H波数据
                        BR_raw = struct.unpack('<f', payload[8:12])[0]    # 同理，得到原始呼吸数据
                        HR_raw = struct.unpack('<f', payload[12:16])[0]   # 同理，得到原始心率数据
                        distance = struct.unpack('<f', payload[16:20])[0] # 同理，得到距离数据
                        
                        # 检查是否处于模拟模式
                        with simulation_lock:
                            sim_active = simulation_mode['active']
                            sim_type = simulation_mode['type']
                        
                        if sim_active:
                            if sim_type == 'abnormal':
                                # 模拟呼吸异常：呼吸率100-150
                                BR_raw = random.uniform(100, 150)
                                HR_raw = random.uniform(60, 90)  # 心率保持正常
                                Bwave = random.uniform(0.01, 0.05)
                                Hwave = random.uniform(0.01, 0.05)
                                distance = random.uniform(1.0, 2.0)
                            elif sim_type == 'no_sign':
                                # 模拟无生命体征
                                BR_raw = 0
                                HR_raw = 0
                                Bwave = 0
                                Hwave = 0
                                distance = random.uniform(0.1, 0.4)
                        
                        # 异常值过滤：心率原始值限定合理范围，有效数据加入滑动窗口
                        if 30 <= HR_raw <= 200:
                            hr_window.append(HR_raw)
                        # 异常值过滤：呼吸原始值限定合理范围，有效数据加入滑动窗口
                        if 0 <= BR_raw <= 200:  # 扩大范围以支持模拟异常值
                            br_window.append(BR_raw)
                        
                        # 滑动平均降噪：窗口有数据则取平均值，无数据则沿用原始值（避免除零）
                        HR = sum(hr_window) / len(hr_window) if hr_window else HR_raw
                        BR = sum(br_window) / len(br_window) if br_window else BR_raw
                        
                        # 判断是否检测到有效人体：多维度生命体征+距离联合判定
                        if (BR > 0 and 10 <= BR <= 35 and                                  # 呼吸非零且在正常生理范围
                            40 <= HR <= 150 and                                            # 心率在正常人体生理范围
                            0.5 <= distance <= 4.0 and                                     # 检测距离在有效监测区间
                            (abs(Bwave) > 0.0001 or abs(Hwave) > 0.0001)):                 # B/H波有有效波动
                            status = "检测到生命体征"
                        else:
                            status = "未检测到生命体征"
                        
                        # 呼吸异常警报
                        alert = ""
                        if BR >= 100:
                            alert = " [警报] 呼吸异常！"
                        
                        frame_count += 1
                        mode_tag = ""
                        print(f"帧 {frame_count} [{status}]{mode_tag}: 心率={HR:.1f} BPM, 呼吸率={BR:.1f} BPM, 距离={distance:.2f} m, B波={Bwave:.4f}, H波={Hwave:.4f}{alert}")
                        
                        # 移除已处理的帧
                        buffer = buffer[frame_size:]
                    else:
                        # 帧尾不对，跳过这个帧头
                        buffer = buffer[4:]
                
                time.sleep(0.01)  # 减少延时，提高响应速度
        
        except KeyboardInterrupt:
            print(f"\n\n用户停止监测")
        
        ser.close()
        print(f"监测完成，共接收 {frame_count} 帧数据")
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    ports = list_ports()
    
    if not ports:
        print("未找到串口设备")
        exit(1)
    
    # 使用第一个可用串口
    print(f"\n使用串口: {ports[0]}")
    test_serial(ports[0])
