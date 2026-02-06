"""
极速版 - 毫米波呼吸心率监测（多线程架构）
"""

import serial
import struct
import time
from datetime import datetime
from collections import deque
from threading import Thread, Lock, Event
from queue import Queue, Empty


class TurboRadarMonitor:
    """高性能多线程毫米波雷达监测器"""
    
    def __init__(self, port='COM3', baudrate=921600):
        self.port = port
        self.baudrate = baudrate
        self.ser = None
        self.frame_size = 32
        
        # 线程间通信队列
        self.raw_queue = Queue(maxsize=5)  # 原始帧队列
        self.result_queue = Queue(maxsize=3)  # 解析结果队列
        
        # 线程控制
        self.running = False
        self.stop_event = Event()
        self.lock = Lock()
        
        # 线程对象
        self.read_thread = None
        self.parse_thread = None
        self.display_thread = None
        
        # 统计信息
        self.frame_count = 0
        self.start_time = None
        
    def connect(self):
        """连接串口"""
        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=0.001  # 极短超时
            )
            print(f"成功连接到 {self.port} (波特率: {self.baudrate})")
            return True
        except serial.SerialException as e:
            print(f"串口连接失败: {e}")
            return False
    
    def disconnect(self):
        """断开串口"""
        if self.ser and self.ser.is_open:
            self.ser.close()
            print("串口已断开")
    
    def _read_worker(self):
        """工作线程：高速读取串口"""
        buffer = bytearray()
        
        while not self.stop_event.is_set():
            try:
                # 高速读取所有可用数据
                if self.ser.in_waiting > 0:
                    data = self.ser.read(self.ser.in_waiting)
                    buffer.extend(data)
                    
                    # 缓冲区管理
                    if len(buffer) > 200:
                        buffer = buffer[-100:]
                
                # 反向查找最新完整帧
                last_tail_pos = buffer.rfind(b'\xb6\xb6\xb6\xb6')
                
                if last_tail_pos >= self.frame_size - 4:
                    frame_start = last_tail_pos - (self.frame_size - 4)
                    
                    if frame_start >= 0 and buffer[frame_start:frame_start+4] == b'\xa8\xa8\xa8\xa8':
                        frame = bytes(buffer[frame_start:last_tail_pos+4])
                        buffer = buffer[last_tail_pos+4:]
                        
                        # 非阻塞放入队列
                        try:
                            if self.raw_queue.full():
                                self.raw_queue.get_nowait()  # 丢弃旧帧
                            self.raw_queue.put_nowait(frame)
                        except:
                            pass
                
                time.sleep(0.0001)  # 100微秒
                
            except Exception as e:
                if not self.stop_event.is_set():
                    print(f"读取线程错误: {e}")
                break
    
    def _parse_worker(self):
        """工作线程：解析数据"""
        hr_window = deque(maxlen=5)
        br_window = deque(maxlen=5)
        last_valid_hr = None
        last_valid_br = None
        invalid_hr_count = 0
        invalid_br_count = 0
        
        while not self.stop_event.is_set():
            try:
                frame = self.raw_queue.get(timeout=0.01)
                
                # 解析帧
                payload = frame[4:28]
                Bwave = struct.unpack('<f', payload[0:4])[0]
                Hwave = struct.unpack('<f', payload[4:8])[0]
                BR_raw = struct.unpack('<f', payload[8:12])[0]
                HR_raw = struct.unpack('<f', payload[12:16])[0]
                distance = struct.unpack('<f', payload[16:20])[0]
                
                with self.lock:
                    self.frame_count += 1
                
                # 快速检测
                if BR_raw <= 0 or HR_raw <= 0:
                    hr_window.clear()
                    br_window.clear()
                    last_valid_hr = None
                    last_valid_br = None
                    HR = 0
                    BR = 0
                else:
                    # 心率过滤
                    hr_valid = False
                    if 30 <= HR_raw <= 220:
                        if last_valid_hr is None or abs(HR_raw - last_valid_hr) <= 30:
                            hr_valid = True
                            hr_window.append(HR_raw)
                            last_valid_hr = HR_raw
                            invalid_hr_count = 0
                    
                    # 呼吸率过滤
                    br_valid = False
                    if 5 <= BR_raw <= 80:
                        if last_valid_br is None or abs(BR_raw - last_valid_br) <= 15:
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
                    
                    # 计算平滑值
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
                
                # 构造结果
                result = {
                    'timestamp': datetime.now().strftime('%H:%M:%S.%f')[:-3],
                    'HR': HR,
                    'BR': BR,
                    'distance': distance,
                    'Bwave': Bwave,
                    'Hwave': Hwave,
                    'has_person': (BR > 0 and HR > 0)
                }
                
                # 放入结果队列
                try:
                    if self.result_queue.full():
                        self.result_queue.get_nowait()
                    self.result_queue.put_nowait(result)
                except:
                    pass
                
            except Empty:
                continue
            except Exception as e:
                if not self.stop_event.is_set():
                    print(f"解析线程错误: {e}")
                continue
    
    def _display_worker(self):
        """工作线程：显示结果"""
        last_status = None
        status_count = 0
        is_first_detection = True
        
        while not self.stop_event.is_set():
            try:
                result = self.result_queue.get(timeout=0.01)
                
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
                
            except Empty:
                continue
            except Exception as e:
                if not self.stop_event.is_set():
                    print(f"显示线程错误: {e}")
                continue
    
    def start_monitoring(self, duration=None):
        """开始监测"""
        if not self.ser or not self.ser.is_open:
            print("请先连接串口")
            return
        
        print("\n" + "="*70)
        print("开始实时监测 (多线程极速模式) - 按 Ctrl+C 停止")
        print("="*70 + "\n")
        
        self.running = True
        self.stop_event.clear()
        self.start_time = time.time()
        
        # 启动工作线程
        self.read_thread = Thread(target=self._read_worker, daemon=True, name="ReadThread")
        self.parse_thread = Thread(target=self._parse_worker, daemon=True, name="ParseThread")
        self.display_thread = Thread(target=self._display_worker, daemon=True, name="DisplayThread")
        
        self.read_thread.start()
        self.parse_thread.start()
        self.display_thread.start()
        
        try:
            # 主线程等待
            if duration:
                time.sleep(duration)
            else:
                while self.running:
                    time.sleep(0.1)
        except KeyboardInterrupt:
            print("\n\n用户中断监测")
        finally:
            self.stop_monitoring()
    
    def stop_monitoring(self):
        """停止监测"""
        self.running = False
        self.stop_event.set()
        
        # 等待线程结束
        if self.read_thread:
            self.read_thread.join(timeout=1)
        if self.parse_thread:
            self.parse_thread.join(timeout=1)
        if self.display_thread:
            self.display_thread.join(timeout=1)
        
        # 统计信息
        if self.start_time:
            elapsed = time.time() - self.start_time
            print("\n" + "="*70)
            print(f"监测统计: 共接收 {self.frame_count} 帧数据，耗时 {elapsed:.1f} 秒")
            print("="*70)


def list_available_ports():
    """列出可用的串口"""
    import serial.tools.list_ports
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("未找到可用串口")
        return []
    
    print("\n可用串口列表:")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    
    return [port.device for port in ports]


if __name__ == "__main__":
    available_ports = list_available_ports()
    
    if not available_ports:
        print("\n提示: 请检查设备是否正确连接")
        exit(1)
    
    port = available_ports[0]
    
    print(f"\n使用串口: {port}")
    print("模式: 多线程极速版\n")
    
    # 创建监测器实例
    monitor = TurboRadarMonitor(port=port, baudrate=921600)
    
    # 连接串口
    if monitor.connect():
        try:
            # 开始实时监测
            monitor.start_monitoring()
        finally:
            # 断开连接
            monitor.disconnect()
