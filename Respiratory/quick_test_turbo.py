"""
极速版 - 毫米波雷达串口读取（多线程优化）
使用方法: python quick_test_turbo.py
"""

import serial
import serial.tools.list_ports
import struct
import time
from collections import deque
from threading import Thread, Lock
from queue import Queue
import sys

class TurboRadarReader:
    """高性能多线程雷达读取器"""
    
    def __init__(self, port, baudrate=921600):
        self.port = port
        self.baudrate = baudrate
        self.ser = None
        self.frame_size = 32
        
        # 线程间通信
        self.raw_queue = Queue(maxsize=5)  # 原始数据队列（限制大小避免积压）
        self.result_queue = Queue(maxsize=3)  # 解析结果队列
        
        # 控制标志
        self.running = False
        self.lock = Lock()
        
        # 线程
        self.read_thread = None
        self.parse_thread = None
        self.display_thread = None
        
    def connect(self):
        """连接串口"""
        try:
            self.ser = serial.Serial(self.port, self.baudrate, timeout=0.001)
            print(f"\n已连接到 {self.port}")
            return True
        except Exception as e:
            print(f"连接失败: {e}")
            return False
    
    def thread_read_serial(self):
        """线程A：高速读取串口数据"""
        buffer = bytearray()
        
        while self.running:
            try:
                # 高速读取
                if self.ser.in_waiting > 0:
                    data = self.ser.read(self.ser.in_waiting)
                    buffer.extend(data)
                    
                    # 缓冲区管理：只保留最新数据
                    if len(buffer) > 200:
                        buffer = buffer[-100:]
                
                # 查找最后一个完整帧（反向查找，最快）
                last_tail_pos = buffer.rfind(b'\xb6\xb6\xb6\xb6')
                
                if last_tail_pos >= self.frame_size - 4:
                    frame_start = last_tail_pos - (self.frame_size - 4)
                    
                    if frame_start >= 0 and buffer[frame_start:frame_start+4] == b'\xa8\xa8\xa8\xa8':
                        # 提取最新帧
                        frame = bytes(buffer[frame_start:last_tail_pos+4])
                        buffer = buffer[last_tail_pos+4:]
                        
                        # 放入队列（非阻塞，满了就丢弃旧数据）
                        if self.raw_queue.full():
                            try:
                                self.raw_queue.get_nowait()  # 丢弃旧数据
                            except:
                                pass
                        self.raw_queue.put(frame)
                
                time.sleep(0.0001)  # 极短延迟，100微秒
                
            except Exception as e:
                if self.running:
                    print(f"读取错误: {e}")
                break
    
    def thread_parse_data(self):
        """线程B：解析数据"""
        # 滑动窗口
        hr_window = deque(maxlen=5)
        br_window = deque(maxlen=5)
        
        # 历史值
        last_valid_hr = None
        last_valid_br = None
        invalid_hr_count = 0
        invalid_br_count = 0
        
        frame_count = 0
        
        while self.running:
            try:
                # 从队列获取原始帧（超时0.01秒）
                try:
                    frame = self.raw_queue.get(timeout=0.01)
                except:
                    continue  # 队列为空，继续等待
                
                # 解析
                payload = frame[4:28]
                Bwave = struct.unpack('<f', payload[0:4])[0]
                Hwave = struct.unpack('<f', payload[4:8])[0]
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
                    HR = 0
                    BR = 0
                else:
                    # 智能过滤
                    hr_valid = False
                    br_valid = False
                    
                    # 心率检查
                    if 30 <= HR_raw <= 220:
                        if last_valid_hr is not None:
                            if abs(HR_raw - last_valid_hr) <= 30:
                                hr_valid = True
                                hr_window.append(HR_raw)
                                last_valid_hr = HR_raw
                                invalid_hr_count = 0
                        else:
                            hr_valid = True
                            hr_window.append(HR_raw)
                            last_valid_hr = HR_raw
                            invalid_hr_count = 0
                    
                    # 呼吸率检查
                    if 5 <= BR_raw <= 80:
                        if last_valid_br is not None:
                            if abs(BR_raw - last_valid_br) <= 15:
                                br_valid = True
                                br_window.append(BR_raw)
                                last_valid_br = BR_raw
                                invalid_br_count = 0
                        else:
                            br_valid = True
                            br_window.append(BR_raw)
                            last_valid_br = BR_raw
                            invalid_br_count = 0
                    
                    # 无效数据处理
                    if not hr_valid:
                        invalid_hr_count += 1
                        if invalid_hr_count >= 2:
                            hr_window.clear()
                            last_valid_hr = None
                    
                    if not br_valid:
                        invalid_br_count += 1
                        if invalid_br_count >= 2:
                            br_window.clear()
                            last_valid_br = None
                    
                    # 计算平均值
                    if len(hr_window) >= 3:
                        hr_sorted = sorted(hr_window)
                        HR = sum(hr_sorted[1:-1]) / (len(hr_sorted) - 2)
                    elif hr_window:
                        HR = sum(hr_window) / len(hr_window)
                    else:
                        HR = 0
                    
                    if len(br_window) >= 3:
                        br_sorted = sorted(br_window)
                        BR = sum(br_sorted[1:-1]) / (len(br_sorted) - 2)
                    elif br_window:
                        BR = sum(br_window) / len(br_window)
                    else:
                        BR = 0
                
                # 放入结果队列
                result = {
                    'frame': frame_count,
                    'HR': HR,
                    'BR': BR,
                    'distance': distance,
                    'has_person': (BR > 0 and HR > 0)
                }
                
                # 非阻塞放入，满了就丢弃旧结果
                if self.result_queue.full():
                    try:
                        self.result_queue.get_nowait()
                    except:
                        pass
                self.result_queue.put(result)
                
            except Exception as e:
                import traceback
                print(f"\n解析错误详情: {e}")
                traceback.print_exc()
                time.sleep(0.1)
    
    def thread_display(self):
        """线程C：显示结果"""
        last_status = None
        status_count = 0
        is_first_detection = True
        
        print("正在监测...\n")
        
        while self.running:
            try:
                # 从结果队列获取（超时0.01秒）
                try:
                    result = self.result_queue.get(timeout=0.01)
                except:
                    continue  # 队列为空，继续等待
                
                if result['has_person']:
                    status = "检测到生命体征"
                    HR_display = result['HR']
                    BR_display = result['BR']
                else:
                    status = "未检测到生命体征"
                    HR_display = 0.0
                    BR_display = 0.0
                
                # 状态变化检测
                if status != last_status:
                    if status == "检测到生命体征":
                        print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={result['distance']:.2f} m")
                    else:
                        if is_first_detection:
                            print(f"[{status}] - 初始化中")
                            is_first_detection = False
                        else:
                            print(f"[{status}]")
                    last_status = status
                    status_count = 0
                elif status == "检测到生命体征" and status_count % 5 == 0:
                    print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={result['distance']:.2f} m")
                
                status_count += 1
                
            except Exception as e:
                import traceback
                print(f"\n显示错误详情: {e}")
                traceback.print_exc()
                time.sleep(0.1)
    
    def start(self):
        """启动所有线程"""
        self.running = True
        
        # 启动线程
        self.read_thread = Thread(target=self.thread_read_serial, daemon=True)
        self.parse_thread = Thread(target=self.thread_parse_data, daemon=True)
        self.display_thread = Thread(target=self.thread_display, daemon=True)
        
        self.read_thread.start()
        self.parse_thread.start()
        self.display_thread.start()
        
        print("多线程模式已启动 (按 Ctrl+C 停止)\n")
    
    def stop(self):
        """停止所有线程"""
        self.running = False
        
        # 等待线程结束
        if self.read_thread:
            self.read_thread.join(timeout=1)
        if self.parse_thread:
            self.parse_thread.join(timeout=1)
        if self.display_thread:
            self.display_thread.join(timeout=1)
        
        if self.ser:
            self.ser.close()
        
        print("\n已停止")


def list_ports():
    """列出所有可用串口"""
    ports = serial.tools.list_ports.comports()
    print("\n可用串口:")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    return [p.device for p in ports]


if __name__ == "__main__":
    ports = list_ports()
    
    if not ports:
        print("未找到串口设备")
        exit(1)
    
    print(f"\n使用串口: {ports[0]}")
    print("提示: 这是多线程极速版本\n")
    
    # 创建读取器
    reader = TurboRadarReader(ports[0])
    
    if reader.connect():
        try:
            reader.start()
            
            # 主线程等待
            while True:
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            print("\n\n用户停止监测")
        finally:
            reader.stop()
