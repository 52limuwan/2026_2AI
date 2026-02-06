"""
快速测试脚本 - 毫米波雷达串口读取（带降噪优化）
使用方法: python quick_test.py
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

def test_serial(port, baudrate=921600, debug=False, turbo=False):
    """测试串口连接和数据读取（带降噪）"""
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        print(f"\n已连接到 {port}")
        print("正在读取数据...\n")
        
        buffer = bytearray()
        frame_count = 0
        frame_size = 32  # 正确的帧大小：4(头)+24(数据)+4(尾)
        
        # 根据模式调整参数
        if turbo:
            # 极速模式
            hr_window = deque(maxlen=2)
            br_window = deque(maxlen=2)
            invalid_threshold = 1
            sleep_time = 0.00005  # 0.05ms
            print("【极速模式】最快响应速度\n")
        else:
            # 标准模式
            hr_window = deque(maxlen=5)
            br_window = deque(maxlen=5)
            invalid_threshold = 2
            sleep_time = 0.0001  # 0.1ms
        
        # 状态跟踪
        last_status = None
        status_count = 0
        is_first_detection = True  # 标记是否是第一次检测
        
        # 上一次的有效值（用于异常检测）
        last_valid_hr = None
        last_valid_br = None
        
        # 无效数据计数器
        invalid_hr_count = 0
        invalid_br_count = 0
        
        if debug:
            print("【调试模式】显示所有原始数据\n")
        elif not turbo:
            print("按 Ctrl+C 停止监测\n")
        
        try:
            while True:  # 持续运行直到手动停止
                if ser.in_waiting > 0:
                    data = ser.read(ser.in_waiting)
                    buffer.extend(data)
                
                # 极速模式：直接找最后一个完整帧，跳过所有旧数据
                # 从后往前找帧尾
                last_tail_pos = buffer.rfind(b'\xb6\xb6\xb6\xb6')
                
                if last_tail_pos >= frame_size - 4:
                    # 计算帧头位置
                    frame_start = last_tail_pos - (frame_size - 4)
                    
                    # 验证帧头
                    if frame_start >= 0 and buffer[frame_start:frame_start+4] == b'\xa8\xa8\xa8\xa8':
                        # 提取最后一个完整帧
                        frame = buffer[frame_start:last_tail_pos+4]
                        
                        # 清空缓冲区，只保留帧尾之后的数据
                        buffer = buffer[last_tail_pos+4:]
                        
                        # 解析数据（float格式，24字节payload）
                        payload = frame[4:28]
                        Bwave = struct.unpack('<f', payload[0:4])[0]
                        Hwave = struct.unpack('<f', payload[4:8])[0]
                        BR_raw = struct.unpack('<f', payload[8:12])[0]
                        HR_raw = struct.unpack('<f', payload[12:16])[0]
                        distance = struct.unpack('<f', payload[16:20])[0]
                        
                        # 快速检测：如果原始数据明显无效，立即清空窗口
                        if BR_raw <= 0 or HR_raw <= 0:
                            # 数据为0或负数，说明无人，立即清空
                            hr_window.clear()
                            br_window.clear()
                            last_valid_hr = None
                            last_valid_br = None
                            HR = 0
                            BR = 0
                        else:
                            # 智能过滤：检测异常跳变
                            hr_valid = False
                            br_valid = False
                            
                            # 心率范围检查（扩大范围支持剧烈运动）
                            if 30 <= HR_raw <= 220:
                                # 如果有历史值，检查变化率
                                if last_valid_hr is not None:
                                    hr_change = abs(HR_raw - last_valid_hr)
                                    # 允许每帧最大变化30 BPM（剧烈运动时心率变化快）
                                    if hr_change <= 30:
                                        hr_valid = True
                                        hr_window.append(HR_raw)
                                        last_valid_hr = HR_raw
                                        invalid_hr_count = 0  # 重置无效计数
                                else:
                                    # 第一次，直接接受
                                    hr_valid = True
                                    hr_window.append(HR_raw)
                                    last_valid_hr = HR_raw
                                    invalid_hr_count = 0
                            
                            # 呼吸率范围检查（扩大范围支持剧烈运动）
                            if 5 <= BR_raw <= 80:  # 剧烈运动时呼吸可达60-80次/分
                                # 如果有历史值，检查变化率
                                if last_valid_br is not None:
                                    br_change = abs(BR_raw - last_valid_br)
                                    # 允许每帧最大变化15 BPM（呼吸变化相对平缓）
                                    if br_change <= 15:
                                        br_valid = True
                                        br_window.append(BR_raw)
                                        last_valid_br = BR_raw
                                        invalid_br_count = 0  # 重置无效计数
                                else:
                                    # 第一次，直接接受
                                    br_valid = True
                                    br_window.append(BR_raw)
                                    last_valid_br = BR_raw
                                    invalid_br_count = 0
                            
                            # 如果数据无效，增加无效计数
                            if not hr_valid:
                                invalid_hr_count += 1
                                # 根据模式调整清空阈值
                                if invalid_hr_count >= invalid_threshold:
                                    hr_window.clear()
                                    last_valid_hr = None
                            
                            if not br_valid:
                                invalid_br_count += 1
                                # 根据模式调整清空阈值
                                if invalid_br_count >= invalid_threshold:
                                    br_window.clear()
                                    last_valid_br = None
                            
                            # 使用滑动窗口平均值（更平滑）
                            if len(hr_window) >= 3:
                                # 去掉最大最小值后取平均（更稳定）
                                hr_sorted = sorted(hr_window)
                                HR = sum(hr_sorted[1:-1]) / (len(hr_sorted) - 2) if len(hr_sorted) > 2 else sum(hr_sorted) / len(hr_sorted)
                            elif hr_window:
                                HR = sum(hr_window) / len(hr_window)
                            else:
                                HR = 0  # 窗口为空，说明无人
                            
                            if len(br_window) >= 3:
                                # 去掉最大最小值后取平均（更稳定）
                                br_sorted = sorted(br_window)
                                BR = sum(br_sorted[1:-1]) / (len(br_sorted) - 2) if len(br_sorted) > 2 else sum(br_sorted) / len(br_sorted)
                            elif br_window:
                                BR = sum(br_window) / len(br_window)
                            else:
                                BR = 0  # 窗口为空，说明无人
                        
                        frame_count += 1
                        
                        # 调试模式：显示所有原始数据
                        if debug:
                            print(f"帧{frame_count}: BR_raw={BR_raw:.2f}, HR_raw={HR_raw:.2f}, BR={BR:.2f}, HR={HR:.2f}, "
                                  f"距离={distance:.2f}m, Bwave={Bwave:.4f}, Hwave={Hwave:.4f}")
                            continue
                        
                        # 放宽判断条件：只要有合理的数据就显示
                        if BR > 0 and HR > 0:
                            status = "检测到生命体征"
                            HR_display = HR
                            BR_display = BR
                        else:
                            status = "未检测到生命体征"
                            HR_display = 0.0
                            BR_display = 0.0
                        
                        # 状态变化检测：立即响应每次变化
                        if status != last_status:
                            # 状态改变，立即打印
                            if status == "检测到生命体征":
                                print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={distance:.2f} m")
                            else:
                                # 第一次显示"初始化中"
                                if is_first_detection:
                                    print(f"[{status}] - 初始化中")
                                    is_first_detection = False
                                else:
                                    print(f"[{status}]")
                            last_status = status
                            status_count = 0
                        elif status == "检测到生命体征" and status_count % 5 == 0:
                            # 检测到生命体征时，每5帧更新一次数据（更频繁）
                            print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={distance:.2f} m")
                        
                        status_count += 1
                    else:
                        # 帧头不对，清理部分缓冲区
                        if len(buffer) > 200:
                            buffer = buffer[-100:]
                else:
                    # 没找到完整帧，清理过大的缓冲区
                    if len(buffer) > 200:
                        buffer = buffer[-100:]
                
                time.sleep(sleep_time)  # 根据模式调整延迟
        
        except KeyboardInterrupt:
            print(f"\n\n用户停止监测")
        
        ser.close()
        print(f"监测完成，共接收 {frame_count} 帧数据")
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import sys
    
    # 检查是否启用调试模式或极速模式
    debug_mode = "--debug" in sys.argv or "-d" in sys.argv
    turbo_mode = "--turbo" in sys.argv or "-t" in sys.argv
    
    ports = list_ports()
    
    if not ports:
        print("未找到串口设备")
        exit(1)
    
    # 使用第一个可用串口
    print(f"\n使用串口: {ports[0]}")
    if debug_mode:
        print("模式: 调试模式 - 显示所有原始数据")
    elif turbo_mode:
        print("模式: 极速模式 - 最快响应速度")
    else:
        print("模式: 标准模式")
    print("提示: 使用 'python quick_test.py --turbo' 启用极速模式")
    print("      使用 'python quick_test.py --debug' 查看原始数据\n")
    
    test_serial(ports[0], debug=debug_mode, turbo=turbo_mode)
