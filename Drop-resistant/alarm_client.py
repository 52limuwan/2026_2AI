"""
防跌倒报警客户端（远端设备）
功能：连接到服务器，接收跌倒报警并播放警报音效
"""
import socket
import threading
import json
import time
import os
import sys

# 尝试导入pygame（用于播放音效）
try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False
    print("警告: pygame未安装，将无法播放音效")
    print("安装命令: pip install pygame")

# 尝试导入Windows消息框
try:
    import ctypes
    WINDOWS_AVAILABLE = True
except:
    WINDOWS_AVAILABLE = False

# ===================== 配置参数 =====================
SERVER_HOST = '127.0.0.1'  # 服务器地址（修改为实际服务器IP）
SERVER_PORT = 9999         # 服务器端口
DEVICE_NAME = '远端报警器_1'  # 设备名称（可自定义）
ALARM_SOUND_FILE = 'aviation-alarm.mp3'  # 报警音效文件
RECONNECT_INTERVAL = 5     # 重连间隔（秒）

class AlarmClient:
    def __init__(self, server_host=SERVER_HOST, server_port=SERVER_PORT, device_name=DEVICE_NAME):
        self.server_host = server_host
        self.server_port = server_port
        self.device_name = device_name
        self.client_socket = None
        self.running = False
        self.connected = False
        
        # 初始化音频系统
        if PYGAME_AVAILABLE:
            try:
                pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
                print("音频系统初始化成功")
            except Exception as e:
                print(f"音频系统初始化失败: {str(e)}")
    
    def connect(self):
        """连接到服务器"""
        while self.running:
            try:
                print(f"\n正在连接服务器 {self.server_host}:{self.server_port}...")
                self.client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.client_socket.connect((self.server_host, self.server_port))
                self.connected = True
                
                print(f"{'='*60}")
                print(f"已连接到报警服务器")
                print(f"设备名称: {self.device_name}")
                print(f"服务器地址: {self.server_host}:{self.server_port}")
                print(f"{'='*60}\n")
                
                # 发送注册消息
                self.register_device()
                
                # 启动接收消息线程
                receive_thread = threading.Thread(target=self.receive_messages, daemon=True)
                receive_thread.start()
                
                # 启动心跳线程
                heartbeat_thread = threading.Thread(target=self.send_heartbeat, daemon=True)
                heartbeat_thread.start()
                
                # 等待连接断开
                receive_thread.join()
                
            except ConnectionRefusedError:
                print(f"连接被拒绝，{RECONNECT_INTERVAL}秒后重试...")
                time.sleep(RECONNECT_INTERVAL)
            except Exception as e:
                print(f"连接错误: {str(e)}")
                time.sleep(RECONNECT_INTERVAL)
            finally:
                self.connected = False
                if self.client_socket:
                    try:
                        self.client_socket.close()
                    except:
                        pass
    
    def register_device(self):
        """向服务器注册设备"""
        try:
            register_msg = {
                'type': 'register',
                'device_name': self.device_name,
                'time': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            self.send_message(register_msg)
            print(f"设备注册成功: {self.device_name}")
        except Exception as e:
            print(f"设备注册失败: {str(e)}")
    
    def send_heartbeat(self):
        """发送心跳包"""
        while self.running and self.connected:
            try:
                heartbeat_msg = {
                    'type': 'heartbeat',
                    'device_name': self.device_name,
                    'time': time.strftime('%Y-%m-%d %H:%M:%S')
                }
                self.send_message(heartbeat_msg)
                time.sleep(30)  # 每30秒发送一次心跳
            except Exception as e:
                print(f"心跳发送失败: {str(e)}")
                break
    
    def send_message(self, message):
        """发送消息到服务器"""
        try:
            data = json.dumps(message).encode('utf-8')
            self.client_socket.sendall(data)
        except Exception as e:
            print(f"发送消息失败: {str(e)}")
            raise
    
    def receive_messages(self):
        """接收服务器消息"""
        buffer = b''
        
        try:
            while self.running and self.connected:
                data = self.client_socket.recv(4096)
                if not data:
                    print("服务器连接断开")
                    break
                
                buffer += data
                
                # 尝试解析JSON消息
                try:
                    message = json.loads(buffer.decode('utf-8'))
                    buffer = b''  # 清空缓冲区
                    self.process_message(message)
                except json.JSONDecodeError:
                    # 数据不完整，继续接收
                    if len(buffer) > 10240:  # 防止缓冲区过大
                        buffer = b''
                
        except Exception as e:
            print(f"接收消息错误: {str(e)}")
        finally:
            self.connected = False
    
    def process_message(self, message):
        """处理接收到的消息"""
        msg_type = message.get('type')
        
        if msg_type == 'fall_alarm':
            # 跌倒报警消息
            self.handle_fall_alarm(message)
    
    def handle_fall_alarm(self, message):
        """处理跌倒报警"""
        alarm_time = message.get('time', time.strftime('%Y-%m-%d %H:%M:%S'))
        location = message.get('location', {})
        
        print(f"\n{'='*60}")
        print(f"【收到跌倒报警】")
        print(f"时间: {alarm_time}")
        print(f"位置: X={location.get('x', 0)}m, Y={location.get('y', 0)}m")
        print(f"{'='*60}\n")
        
        # 播放报警音效
        self.play_alarm_sound()
        
        # 显示报警弹窗
        self.show_alarm_window(alarm_time, location)
    
    def play_alarm_sound(self):
        """播放报警音效"""
        if not PYGAME_AVAILABLE:
            print("无法播放音效（pygame未安装）")
            return
        
        try:
            if os.path.exists(ALARM_SOUND_FILE):
                pygame.mixer.music.stop()
                pygame.mixer.music.load(ALARM_SOUND_FILE)
                pygame.mixer.music.play(loops=-1)  # 循环播放
                print("报警音效开始播放")
            else:
                print(f"警告: 未找到音效文件 {ALARM_SOUND_FILE}")
                # 使用系统蜂鸣声
                print('\a' * 5)  # 发出5次蜂鸣
        except Exception as e:
            print(f"播放音效失败: {str(e)}")
    
    def stop_alarm_sound(self):
        """停止报警音效"""
        if PYGAME_AVAILABLE:
            try:
                pygame.mixer.music.stop()
                print("报警音效已停止")
            except Exception as e:
                print(f"停止音效失败: {str(e)}")
    
    def show_alarm_window(self, alarm_time, location):
        """显示报警弹窗"""
        if not WINDOWS_AVAILABLE:
            print("无法显示弹窗（非Windows系统）")
            return
        
        def show_messagebox():
            try:
                message = f"检测到跌倒事件！\n\n"
                message += f"时间：{alarm_time}\n"
                message += f"位置：X={location.get('x', 0)}m, Y={location.get('y', 0)}m\n\n"
                message += f"请立即查看现场情况！"
                title = "【远端报警】跌倒警告"
                
                # 显示消息框（带警告图标和置顶）
                ctypes.windll.user32.MessageBoxW(0, message, title, 0x41030)
                
                # 用户点击确定后停止音效
                self.stop_alarm_sound()
                
            except Exception as e:
                print(f"显示弹窗失败: {str(e)}")
        
        # 在新线程中显示弹窗
        threading.Thread(target=show_messagebox, daemon=True).start()
    
    def start(self):
        """启动客户端"""
        self.running = True
        
        print(f"\n{'='*60}")
        print(f"防跌倒远端报警器")
        print(f"设备名称: {self.device_name}")
        print(f"{'='*60}\n")
        
        # 启动连接线程
        connect_thread = threading.Thread(target=self.connect, daemon=True)
        connect_thread.start()
        
        # 主线程处理命令
        self.handle_commands()
    
    def handle_commands(self):
        """处理用户命令"""
        print("可用命令:")
        print("  status - 查看连接状态")
        print("  test   - 测试报警音效")
        print("  stop   - 停止报警音效")
        print("  quit   - 退出程序\n")
        
        while self.running:
            try:
                cmd = input().strip().lower()
                
                if cmd == 'status':
                    status = "已连接" if self.connected else "未连接"
                    print(f"连接状态: {status}")
                    print(f"服务器: {self.server_host}:{self.server_port}")
                
                elif cmd == 'test':
                    print("测试报警音效...")
                    self.play_alarm_sound()
                    print("按回车停止音效")
                    input()
                    self.stop_alarm_sound()
                
                elif cmd == 'stop':
                    self.stop_alarm_sound()
                
                elif cmd == 'quit':
                    print("正在退出...")
                    self.stop()
                    break
                
            except KeyboardInterrupt:
                print("\n正在退出...")
                self.stop()
                break
            except Exception as e:
                print(f"命令处理错误: {str(e)}")
    
    def stop(self):
        """停止客户端"""
        self.running = False
        self.connected = False
        
        # 停止音效
        self.stop_alarm_sound()
        
        # 关闭socket
        if self.client_socket:
            try:
                self.client_socket.close()
            except:
                pass
        
        # 退出pygame
        if PYGAME_AVAILABLE:
            try:
                pygame.mixer.quit()
            except:
                pass
        
        print("客户端已停止")

if __name__ == "__main__":
    # 从命令行参数获取配置
    if len(sys.argv) > 1:
        SERVER_HOST = sys.argv[1]
    if len(sys.argv) > 2:
        DEVICE_NAME = sys.argv[2]
    
    client = AlarmClient(SERVER_HOST, SERVER_PORT, DEVICE_NAME)
    client.start()
