"""
极速优化版 - 毫米波雷达串口读取
使用方法: python quick_test_fast.py
"""

import serial
import serial.tools.list_ports
import struct
import time
from collections import deque

def list_ports():
    """列出所有可用串口"""
    ports = serial.tools.list_ports.comports()
    print("\n可用串口:")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    return [p.device for p in ports]

def test_serial_fast(port, baudrate=921600):
    """极速版串口读取"""
    try:
        ser = serial.Serial(port, baudrate, timeout=0.001)
        print(f"\n已连接到 {port}")
        print("【极速模式】最快响应速度\n")
        
        buffer = bytearray()
        frame_count = 0
        frame_size = 32
        
        # 极简窗口（2帧，最快响应）
        hr_window = deque(maxlen=2)
        br_window = deque(maxlen=2)
        
        # 状态跟踪
        last_status = None
        status_count = 0
        is_first_detection = True
        
        # 历史值
        last_valid_hr = None
        last_valid_br = None
        invalid_hr_count = 0
        invalid_br_count = 0
        
        print("按 Ctrl+C 停止监测\n")
        
        try:
            while True:
                # 高速读取
                if ser.in_waiting > 0:
                    data = ser.read(ser.in_waiting)
                    buffer.extend(data)
                    
                    # 缓冲区管理
                    if len(buffer) > 150:
                        buffer = buffer[-80:]
                
                # 反向查找最新帧
                last_tail_pos = buffer.rfind(b'\xb6\xb6\xb6\xb6')
                
                if last_tail_pos >= frame_size - 4:
                    frame_start = last_tail_pos - (frame_size - 4)
                    
                    if frame_start >= 0 and buffer[frame_start:frame_start+4] == b'\xa8\xa8\xa8\xa8':
                        frame = buffer[frame_start:last_tail_pos+4]
                        buffer = buffer[last_tail_pos+4:]
                        
                        # 解析
                        payload = frame[4:28]
                        BR_raw = struct.unpack('<f', payload[8:12])[0]
                        HR_raw = struct.unpack('<f', payload[12:16])[0]
                        distance = struct.unpack('<f', payload[16:20])[0]
                        
                        frame_count += 1
                        
                        # 快速检测：数据为0立即清空
                        if BR_raw <= 0 or HR_raw <= 0:
                            hr_window.clear()
                            br_window.clear()
                            last_valid_hr = None
                            last_valid_br = None
                            invalid_hr_count = 0
                            invalid_br_count = 0
                            HR = 0
                            BR = 0
                        else:
                            # 心率过滤
                            if 30 <= HR_raw <= 220:
                                if last_valid_hr is None or abs(HR_raw - last_valid_hr) <= 30:
                                    hr_window.append(HR_raw)
                                    last_valid_hr = HR_raw
                                    invalid_hr_count = 0
                                else:
                                    invalid_hr_count += 1
                            else:
                                invalid_hr_count += 1
                            
                            # 呼吸率过滤
                            if 5 <= BR_raw <= 80:
                                if last_valid_br is None or abs(BR_raw - last_valid_br) <= 15:
                                    br_window.append(BR_raw)
                                    last_valid_br = BR_raw
                                    invalid_br_count = 0
                                else:
                                    invalid_br_count += 1
                            else:
                                invalid_br_count += 1
                            
                            # 连续1帧无效就清空（极速响应）
                            if invalid_hr_count >= 1:
                                hr_window.clear()
                                last_valid_hr = None
                            if invalid_br_count >= 1:
                                br_window.clear()
                                last_valid_br = None
                            
                            # 计算平均值
                            HR = sum(hr_window) / len(hr_window) if hr_window else 0
                            BR = sum(br_window) / len(br_window) if br_window else 0
                        
                        # 判断状态
                        if BR > 0 and HR > 0:
                            status = "检测到生命体征"
                            HR_display = HR
                            BR_display = BR
                        else:
                            status = "未检测到生命体征"
                            HR_display = 0.0
                            BR_display = 0.0
                        
                        # 状态变化检测
                        if status != last_status:
                            if status == "检测到生命体征":
                                print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={distance:.2f} m")
                            else:
                                if is_first_detection:
                                    print(f"[{status}] - 初始化中")
                                    is_first_detection = False
                                else:
                                    print(f"[{status}]")
                            last_status = status
                            status_count = 0
                        elif status == "检测到生命体征" and status_count % 5 == 0:
                            print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={distance:.2f} m")
                        
                        status_count += 1
                    else:
                        if len(buffer) > 150:
                            buffer = buffer[-80:]
                else:
                    if len(buffer) > 150:
                        buffer = buffer[-80:]
                
                # 极短延迟
                time.sleep(0.00005)  # 0.05ms
        
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
    
    print(f"\n使用串口: {ports[0]}")
    print("模式: 极速优化版（单线程）\n")
    test_serial_fast(ports[0])
