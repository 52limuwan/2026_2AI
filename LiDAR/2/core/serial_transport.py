"""
串口通信模块 - YDLIDAR T-mini Plus
严格按照官方开发手册实现

特性:
- 波特率: 230400 (固定)
- 参数: 8N1
- 自动枚举 COM 口
- 断线自动重连
- 后台线程读取
"""

import serial
import serial.tools.list_ports
import threading
import queue
import time
from typing import Optional, Callable, List


class SerialTransport:
    """串口通信类"""
    
    # T-mini Plus 固定参数
    BAUDRATE = 230400
    BYTESIZE = serial.EIGHTBITS
    PARITY = serial.PARITY_NONE
    STOPBITS = serial.STOPBITS_ONE
    TIMEOUT = 0.001  # 极小超时，配合阻塞读
    
    # 命令定义（按官方手册）
    CMD_START_SCAN = bytes([0xA5, 0x60])      # 开始扫描
    CMD_STOP_SCAN = bytes([0xA5, 0x65])       # 停止扫描
    CMD_GET_DEVICE_INFO = bytes([0xA5, 0x90]) # 获取设备信息
    CMD_GET_HEALTH = bytes([0xA5, 0x92])      # 获取健康状态
    CMD_RESTART = bytes([0xA5, 0x40])         # 软重启
    
    def __init__(self, auto_reconnect: bool = True):
        self.port: Optional[str] = None
        self.serial: Optional[serial.Serial] = None
        self.is_connected = False
        self.auto_reconnect = auto_reconnect
        
        # 读线程
        self.read_thread: Optional[threading.Thread] = None
        self.stop_flag = threading.Event()
        
        # 数据队列（bytes 缓冲）
        self.data_queue = queue.Queue(maxsize=1000)
        
        # 回调函数
        self.on_data_callback: Optional[Callable[[bytes], None]] = None
        self.on_disconnect_callback: Optional[Callable[[], None]] = None
        
    @staticmethod
    def list_ports() -> List[str]:
        """枚举所有可用的 COM 口"""
        ports = serial.tools.list_ports.comports()
        return [port.device for port in ports]
    
    def connect(self, port: str) -> bool:
        """
        连接串口
        
        Args:
            port: COM 口名称，如 "COM3"
            
        Returns:
            是否连接成功
        """
        if self.is_connected:
            self.disconnect()
        
        try:
            self.serial = serial.Serial(
                port=port,
                baudrate=self.BAUDRATE,
                bytesize=self.BYTESIZE,
                parity=self.PARITY,
                stopbits=self.STOPBITS,
                timeout=self.TIMEOUT
            )
            
            self.port = port
            self.is_connected = True
            self.stop_flag.clear()
            
            # 启动读线程
            self.read_thread = threading.Thread(target=self._read_loop, daemon=True)
            self.read_thread.start()
            
            return True
            
        except Exception as e:
            # print(f"[SerialTransport] 连接失败: {e}")  # 静默错误
            self.is_connected = False
            return False
    
    def disconnect(self):
        """断开串口连接"""
        self.is_connected = False
        self.stop_flag.set()
        
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=1.0)
        
        if self.serial and self.serial.is_open:
            try:
                self.serial.close()
            except:
                pass
        
        self.serial = None
    
    def _read_loop(self):
        """后台读线程（阻塞读取）"""
        reconnect_delay = 1.0
        
        while not self.stop_flag.is_set():
            try:
                if not self.serial or not self.serial.is_open:
                    raise serial.SerialException("串口未打开")
                
                # 阻塞读取（每次读取可用字节）
                if self.serial.in_waiting > 0:
                    data = self.serial.read(self.serial.in_waiting)
                    if data:
                        # 放入队列
                        try:
                            self.data_queue.put_nowait(data)
                        except queue.Full:
                            # 队列满，丢弃最旧数据
                            try:
                                self.data_queue.get_nowait()
                                self.data_queue.put_nowait(data)
                            except:
                                pass
                        
                        # 回调
                        if self.on_data_callback:
                            self.on_data_callback(data)
                else:
                    time.sleep(0.001)  # 避免空转
                    
            except Exception as e:
                # print(f"[SerialTransport] 读取错误: {e}")  # 静默错误
                self.is_connected = False
                
                # 触发断线回调
                if self.on_disconnect_callback:
                    self.on_disconnect_callback()
                
                # 自动重连
                if self.auto_reconnect and self.port:
                    # print(f"[SerialTransport] {reconnect_delay:.1f}秒后尝试重连...")  # 静默重连
                    time.sleep(reconnect_delay)
                    if self.connect(self.port):
                        # print(f"[SerialTransport] 重连成功")  # 静默重连
                        reconnect_delay = 1.0
                    else:
                        reconnect_delay = min(reconnect_delay * 2, 10.0)
                else:
                    break
    
    def write(self, data: bytes) -> bool:
        """
        写入数据
        
        Args:
            data: 要发送的字节数据
            
        Returns:
            是否发送成功
        """
        if not self.is_connected or not self.serial:
            return False
        
        try:
            self.serial.write(data)
            return True
        except Exception as e:
            # print(f"[SerialTransport] 写入失败: {e}")  # 静默错误
            return False
    
    def read_data(self, timeout: float = 0.1) -> Optional[bytes]:
        """
        从队列读取数据（非阻塞）
        
        Args:
            timeout: 超时时间（秒）
            
        Returns:
            读取到的字节数据，超时返回 None
        """
        try:
            return self.data_queue.get(timeout=timeout)
        except queue.Empty:
            return None
    
    # ========== 雷达命令 ==========
    
    def start_scan(self) -> bool:
        """发送开始扫描命令 [A5 60]"""
        return self.write(self.CMD_START_SCAN)
    
    def stop_scan(self) -> bool:
        """发送停止扫描命令 [A5 65]"""
        return self.write(self.CMD_STOP_SCAN)
    
    def get_device_info(self) -> bool:
        """发送获取设备信息命令 [A5 90]"""
        return self.write(self.CMD_GET_DEVICE_INFO)
    
    def get_health(self) -> bool:
        """发送获取健康状态命令 [A5 92]"""
        return self.write(self.CMD_GET_HEALTH)
    
    def restart(self) -> bool:
        """发送软重启命令 [A5 40]"""
        return self.write(self.CMD_RESTART)
