import serial
import struct
import time
from datetime import datetime
from collections import deque

class RadarMonitor:
    """毫米波呼吸心率监测实时串口读取"""
    
    def __init__(self, port='COM3', baudrate=921600):
        """
        初始化串口连接
        :param port: 串口号，Windows下通常是COM3、COM4等
        :param baudrate: 波特率，默认921600
        """
        self.port = port
        self.baudrate = baudrate
        self.ser = None
        self.frame_size = 32  # 4(头)+24(数据)+4(尾)
        self.buffer = bytearray()
        
        # 自适应滑动窗口（运动时增加平滑）
        self.hr_window = deque(maxlen=5)  # 心率窗口：5帧用于平滑
        self.br_window = deque(maxlen=5)  # 呼吸率窗口：5帧用于平滑
        
        # 状态跟踪
        self.last_status = None
        self.status_count = 0
        self.is_first_detection = True  # 标记是否是第一次检测
        
        # 上一次的有效值（用于异常检测）
        self.last_valid_hr = None
        self.last_valid_br = None
        
        # 无效数据计数器
        self.invalid_hr_count = 0
        self.invalid_br_count = 0
        
    def connect(self):
        """连接串口"""
        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1
            )
            print(f"成功连接到 {self.port} (波特率: {self.baudrate})")
            return True
        except serial.SerialException as e:
            print(f"❌ 串口连接失败: {e}")
            return False
    
    def disconnect(self):
        """断开串口"""
        if self.ser and self.ser.is_open:
            self.ser.close()
            print("串口已断开")
    
    def parse_frame(self, frame_data):
        """解析单帧数据（带降噪）"""
        if len(frame_data) != self.frame_size:
            return None
        
        # 检查帧头和帧尾
        if frame_data[0:4] != b'\xa8\xa8\xa8\xa8':
            return None
        if frame_data[28:32] != b'\xb6\xb6\xb6\xb6':
            return None
        
        # 提取24字节有效载荷
        payload = frame_data[4:28]
        
        try:
            # 解析5个关键参数（小端序float）
            Bwave = struct.unpack('<f', payload[0:4])[0]
            Hwave = struct.unpack('<f', payload[4:8])[0]
            BR_raw = struct.unpack('<f', payload[8:12])[0]  # 呼吸率原始值
            HR_raw = struct.unpack('<f', payload[12:16])[0]  # 心率原始值
            distance = struct.unpack('<f', payload[16:20])[0]  # 距离
            
            # 快速检测：如果原始数据明显无效，立即清空窗口
            if BR_raw <= 0 or HR_raw <= 0:
                # 数据为0或负数，说明无人，立即清空
                self.hr_window.clear()
                self.br_window.clear()
                self.last_valid_hr = None
                self.last_valid_br = None
                HR = 0
                BR = 0
            else:
                # 智能过滤：检测异常跳变
                hr_valid = False
                br_valid = False
                
                # 心率范围检查（扩大范围支持剧烈运动）
                if 30 <= HR_raw <= 220:
                    # 如果有历史值，检查变化率
                    if self.last_valid_hr is not None:
                        hr_change = abs(HR_raw - self.last_valid_hr)
                        # 允许每帧最大变化30 BPM（剧烈运动时心率变化快）
                        if hr_change <= 30:
                            hr_valid = True
                            self.hr_window.append(HR_raw)
                            self.last_valid_hr = HR_raw
                            self.invalid_hr_count = 0  # 重置无效计数
                    else:
                        # 第一次，直接接受
                        hr_valid = True
                        self.hr_window.append(HR_raw)
                        self.last_valid_hr = HR_raw
                        self.invalid_hr_count = 0
                
                # 呼吸率范围检查（扩大范围支持剧烈运动）
                if 5 <= BR_raw <= 80:  # 剧烈运动时呼吸可达60-80次/分
                    # 如果有历史值，检查变化率
                    if self.last_valid_br is not None:
                        br_change = abs(BR_raw - self.last_valid_br)
                        # 允许每帧最大变化15 BPM（呼吸变化相对平缓）
                        if br_change <= 15:
                            br_valid = True
                            self.br_window.append(BR_raw)
                            self.last_valid_br = BR_raw
                            self.invalid_br_count = 0  # 重置无效计数
                    else:
                        # 第一次，直接接受
                        br_valid = True
                        self.br_window.append(BR_raw)
                        self.last_valid_br = BR_raw
                        self.invalid_br_count = 0
                
                # 如果数据无效，增加无效计数
                if not hr_valid:
                    self.invalid_hr_count += 1
                    # 连续2帧无效，立即清空窗口（加快响应）
                    if self.invalid_hr_count >= 2:
                        self.hr_window.clear()
                        self.last_valid_hr = None
                
                if not br_valid:
                    self.invalid_br_count += 1
                    # 连续2帧无效，立即清空窗口（加快响应）
                    if self.invalid_br_count >= 2:
                        self.br_window.clear()
                        self.last_valid_br = None
                
                # 使用滑动窗口平均值（更平滑）
                if len(self.hr_window) >= 3:
                    # 去掉最大最小值后取平均（更稳定）
                    hr_sorted = sorted(self.hr_window)
                    HR = sum(hr_sorted[1:-1]) / (len(hr_sorted) - 2) if len(hr_sorted) > 2 else sum(hr_sorted) / len(hr_sorted)
                elif self.hr_window:
                    HR = sum(self.hr_window) / len(self.hr_window)
                else:
                    HR = 0  # 窗口为空，说明无人
                
                if len(self.br_window) >= 3:
                    # 去掉最大最小值后取平均（更稳定）
                    br_sorted = sorted(self.br_window)
                    BR = sum(br_sorted[1:-1]) / (len(br_sorted) - 2) if len(br_sorted) > 2 else sum(br_sorted) / len(br_sorted)
                elif self.br_window:
                    BR = sum(self.br_window) / len(self.br_window)
                else:
                    BR = 0  # 窗口为空，说明无人
            
            return {
                'timestamp': datetime.now().strftime('%H:%M:%S.%f')[:-3],
                'Bwave': Bwave,
                'Hwave': Hwave,
                'BR': BR,  # 平滑后的呼吸率
                'HR': HR,  # 平滑后的心率
                'distance': distance
            }
        except Exception as e:
            print(f"⚠️ 数据解析错误: {e}")
            return None
    
    def find_frame_in_buffer(self):
        """在缓冲区中查找完整帧"""
        # 查找帧头
        header = b'\xa8\xa8\xa8\xa8'
        header_pos = self.buffer.find(header)
        
        if header_pos == -1:
            # 没找到帧头，清空过旧数据
            if len(self.buffer) > 100:
                self.buffer.clear()
            return None
        
        # 丢弃帧头之前的数据
        if header_pos > 0:
            self.buffer = self.buffer[header_pos:]
        
        # 检查是否有完整帧
        if len(self.buffer) < self.frame_size:
            return None
        
        # 提取一帧数据
        frame = bytes(self.buffer[:self.frame_size])
        
        # 验证帧尾
        if frame[28:32] == b'\xb6\xb6\xb6\xb6':
            self.buffer = self.buffer[self.frame_size:]
            return frame
        else:
            # 帧尾不匹配，跳过这个帧头
            self.buffer = self.buffer[4:]
            return None
    
    def start_monitoring(self, duration=None):
        """
        开始实时监测
        :param duration: 监测时长（秒），None表示持续监测
        """
        if not self.ser or not self.ser.is_open:
            print("❌ 请先连接串口")
            return
        
        print("\n" + "="*70)
        print("开始实时监测 (按 Ctrl+C 停止)")
        print("="*70)
        
        start_time = time.time()
        frame_count = 0
        
        try:
            while True:
                # 检查是否超时
                if duration and (time.time() - start_time) > duration:
                    break
                
                # 读取串口数据
                if self.ser.in_waiting > 0:
                    data = self.ser.read(self.ser.in_waiting)
                    self.buffer.extend(data)
                
                # 极速模式：直接找最后一个完整帧，跳过所有旧数据
                # 从后往前找帧尾
                last_tail_pos = self.buffer.rfind(b'\xb6\xb6\xb6\xb6')
                
                if last_tail_pos >= self.frame_size - 4:
                    # 计算帧头位置
                    frame_start = last_tail_pos - (self.frame_size - 4)
                    
                    # 验证帧头
                    if frame_start >= 0 and self.buffer[frame_start:frame_start+4] == b'\xa8\xa8\xa8\xa8':
                        # 提取最后一个完整帧
                        frame_data = bytes(self.buffer[frame_start:last_tail_pos+4])
                        
                        # 清空缓冲区，只保留帧尾之后的数据
                        self.buffer = self.buffer[last_tail_pos+4:]
                        
                        # 解析帧
                        parsed = self.parse_frame(frame_data)
                        if parsed:
                            # 判断是否检测到有效人体（放宽判断条件）
                            BR = parsed['BR']
                            HR = parsed['HR']
                            distance = parsed['distance']
                            
                            # 放宽判断条件：只要有合理的数据就显示
                            if BR > 0 and HR > 0:
                                status = "检测到生命体征"
                                HR_display = HR
                                BR_display = BR
                            else:
                                status = "未检测到生命体征"
                                HR_display = 0.0
                                BR_display = 0.0
                            
                            frame_count += 1
                            
                            # 状态变化检测：立即响应每次变化
                            if status != self.last_status:
                                # 状态改变，立即打印
                                if status == "检测到生命体征":
                                    print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={distance:.2f} m")
                                else:
                                    # 第一次显示"初始化中"
                                    if self.is_first_detection:
                                        print(f"[{status}] - 初始化中")
                                        self.is_first_detection = False
                                    else:
                                        print(f"[{status}]")
                                self.last_status = status
                                self.status_count = 0
                            elif status == "检测到生命体征" and self.status_count % 5 == 0:
                                # 检测到生命体征时，每5帧更新一次数据（更频繁）
                                print(f"[{status}]: 心率={HR_display:.1f} BPM, 呼吸率={BR_display:.1f} BPM, 距离={distance:.2f} m")
                            
                            self.status_count += 1
                    else:
                        # 帧头不对，清理部分缓冲区
                        if len(self.buffer) > 200:
                            self.buffer = self.buffer[-100:]
                else:
                    # 没找到完整帧，清理过大的缓冲区
                    if len(self.buffer) > 200:
                        self.buffer = self.buffer[-100:]
                
                time.sleep(0.0001)  # 减少到0.1ms，接近极限
                
        except KeyboardInterrupt:
            print("\n\n用户中断监测")
        finally:
            elapsed = time.time() - start_time
            print("\n" + "="*70)
            print(f"监测统计: 共接收 {frame_count} 帧数据，耗时 {elapsed:.1f} 秒")
            print("="*70)


def list_available_ports():
    """列出可用的串口"""
    import serial.tools.list_ports
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("❌ 未找到可用串口")
        return []
    
    print("\n可用串口列表:")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    
    return [port.device for port in ports]


if __name__ == "__main__":
    # 列出可用串口
    available_ports = list_available_ports()
    
    if not available_ports:
        print("\n💡 提示: 请检查设备是否正确连接")
        exit(1)
    
    # 选择串口（可以修改为你的实际串口号）
    port = available_ports[0] if available_ports else 'COM3'
    
    print(f"\n使用串口: {port}")
    print("如需更改，请修改代码中的 port 变量\n")
    
    # 创建监测器实例
    monitor = RadarMonitor(port=port, baudrate=921600)
    
    # 连接串口
    if monitor.connect():
        try:
            # 开始实时监测
            monitor.start_monitoring()
        finally:
            # 断开连接
            monitor.disconnect()
