"""
防跌倒检测服务端（雷达检测 + 报警服务器）
功能：连接雷达检测跌倒，同时作为服务器广播报警给所有远端设备
"""
import serial
import serial.tools.list_ports
import time
import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Wedge
from matplotlib.animation import FuncAnimation
import threading
import queue
import pygame
import os
import ctypes
import socket
import json

# 配置matplotlib支持中文显示
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

# ===================== 雷达配置 =====================
SERIAL_PORT = None
BAUD_RATE = 115200
DATA_BITS = serial.EIGHTBITS
PARITY = serial.PARITY_NONE
STOP_BITS = serial.STOPBITS_ONE
TIMEOUT = 0.1
FALL_FLAG = 'F1'
PERSON_FLAG = 'E1'
COORDINATE_SCALE = 0.001
ALARM_SOUND_FILE = 'aviation-alarm.mp3'

# ===================== 服务器配置 =====================
SERVER_HOST = '0.0.0.0'  # 监听所有网络接口
SERVER_PORT = 9999
MAX_CLIENTS = 10

# ===================== 全局变量 =====================
ser = None
current_radar_data = {
    'x_position': 0,
    'y_position': 0,
    'person_exist': False,
    'fall_happened': False,
    'frame_index': '0'
}
trajectory_history = []
MAX_TRAJECTORY_POINTS = 50
fall_alert_shown = False
alert_queue = queue.Queue()
current_alert_window = None

# 网络客户端列表
connected_clients = []
clients_lock = threading.Lock()

# 报警历史
alarm_history = []
MAX_HISTORY = 100

# ===================== 音频系统 =====================
def init_audio():
    """初始化音频系统"""
    try:
        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
        if os.path.exists(ALARM_SOUND_FILE):
            print(f"报警音效已加载：{ALARM_SOUND_FILE}")
            return True
        else:
            print(f"警告：未找到音效文件 {ALARM_SOUND_FILE}")
            return False
    except Exception as e:
        print(f"音频初始化失败：{str(e)}")
        return False

def play_alarm_sound():
    """播放报警音效"""
    try:
        if os.path.exists(ALARM_SOUND_FILE):
            pygame.mixer.music.stop()
            pygame.mixer.music.load(ALARM_SOUND_FILE)
            pygame.mixer.music.play(loops=-1)
            print("报警音效开始播放")
    except Exception as e:
        print(f"播放音效失败：{str(e)}")

def stop_alarm_sound():
    """停止报警音效"""
    try:
        if pygame.mixer.music.get_busy():
            pygame.mixer.music.stop()
            print("报警音效已停止")
    except Exception as e:
        print(f"停止音效失败：{str(e)}")

# ===================== 串口通信 =====================
def auto_detect_serial_port():
    """自动检测串口"""
    print("正在扫描串口...")
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("未检测到串口设备")
        return None
    
    print(f"检测到 {len(ports)} 个串口：")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    
    priority_keywords = ['CH340', 'CP210', 'FT232', 'USB-SERIAL', 'USB SERIAL']
    for port in ports:
        for keyword in priority_keywords:
            if keyword.upper() in port.description.upper():
                print(f"自动选择：{port.device}")
                return port.device
    
    selected_port = ports[0].device
    print(f"自动选择：{selected_port}")
    return selected_port

def init_serial():
    """初始化串口"""
    global ser, SERIAL_PORT
    
    if SERIAL_PORT is None:
        SERIAL_PORT = auto_detect_serial_port()
        if SERIAL_PORT is None:
            return None
    
    try:
        ser = serial.Serial(
            port=SERIAL_PORT,
            baudrate=BAUD_RATE,
            bytesize=DATA_BITS,
            parity=PARITY,
            stopbits=STOP_BITS,
            timeout=TIMEOUT
        )
        if ser.is_open:
            print(f"串口 {SERIAL_PORT} 已打开")
            return ser
        return None
    except Exception as e:
        print(f"串口初始化失败：{str(e)}")
        return None

def parse_radar_data(data_str):
    """解析雷达数据"""
    if not (data_str.startswith('F') and 'ND' in data_str):
        return None
    
    data_parts = data_str.strip().split(',')
    if len(data_parts) < 5:
        return None
    
    try:
        frame_index = data_parts[0][1:]
        x_coord = int(data_parts[1][1:]) * COORDINATE_SCALE
        y_coord = int(data_parts[2]) * COORDINATE_SCALE
        person_exist = data_parts[3] == PERSON_FLAG
        fall_happened = data_parts[4] == FALL_FLAG
        
        return {
            'frame_index': frame_index,
            'x_position': round(x_coord, 3),
            'y_position': round(y_coord, 3),
            'person_exist': person_exist,
            'fall_happened': fall_happened
        }
    except Exception:
        return None

# ===================== 网络服务器 =====================
def broadcast_fall_alarm(x_position, y_position):
    """广播跌倒报警给所有客户端"""
    alarm_msg = {
        'type': 'fall_alarm',
        'time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'location': {
            'x': round(x_position, 3),
            'y': round(y_position, 3)
        }
    }
    
    # 记录到历史
    alarm_history.append(alarm_msg)
    if len(alarm_history) > MAX_HISTORY:
        alarm_history.pop(0)
    
    broadcast_count = 0
    failed_clients = []
    
    with clients_lock:
        for client_info in connected_clients:
            try:
                data = json.dumps(alarm_msg).encode('utf-8')
                client_info['socket'].sendall(data)
                broadcast_count += 1
                print(f"报警已发送至: {client_info['device_name']}")
            except Exception as e:
                print(f"发送失败: {client_info['address']}")
                failed_clients.append(client_info)
        
        # 移除失败的客户端
        for failed_client in failed_clients:
            if failed_client in connected_clients:
                connected_clients.remove(failed_client)
    
    if broadcast_count > 0:
        print(f"报警已广播至 {broadcast_count} 个远端设备")

def handle_client(client_socket, client_address):
    """处理客户端连接"""
    client_info = {
        'socket': client_socket,
        'address': client_address,
        'device_name': f"设备_{client_address[0]}"
    }
    
    with clients_lock:
        connected_clients.append(client_info)
    
    print(f"[{time.strftime('%H:%M:%S')}] 远端设备连接: {client_address}")
    print(f"当前连接设备数: {len(connected_clients)}")
    
    try:
        while True:
            data = client_socket.recv(4096)
            if not data:
                break
            
            try:
                message = json.loads(data.decode('utf-8'))
                if message.get('type') == 'register':
                    device_name = message.get('device_name', client_info['device_name'])
                    client_info['device_name'] = device_name
                    print(f"设备注册: {device_name}")
            except:
                pass
    except Exception:
        pass
    finally:
        with clients_lock:
            if client_info in connected_clients:
                connected_clients.remove(client_info)
        
        try:
            client_socket.close()
        except:
            pass
        
        print(f"[{time.strftime('%H:%M:%S')}] 设备断开: {client_address}")
        print(f"当前连接设备数: {len(connected_clients)}")

def server_thread():
    """服务器线程"""
    try:
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((SERVER_HOST, SERVER_PORT))
        server_socket.listen(MAX_CLIENTS)
        
        print(f"\n报警服务器已启动: {SERVER_HOST}:{SERVER_PORT}")
        print("等待远端设备连接...\n")
        
        while True:
            client_socket, client_address = server_socket.accept()
            client_thread = threading.Thread(
                target=handle_client,
                args=(client_socket, client_address),
                daemon=True
            )
            client_thread.start()
    except Exception as e:
        print(f"服务器错误: {str(e)}")

# ===================== 报警处理 =====================
def show_fall_alert():
    """跌倒报警"""
    print(f"\n{'='*50}")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 检测到跌倒！")
    print(f"{'='*50}\n")
    
    # 播放本地音效
    play_alarm_sound()
    
    # 广播给远端设备
    x_pos = current_radar_data['x_position']
    y_pos = current_radar_data['y_position']
    broadcast_fall_alarm(x_pos, y_pos)
    
    # 本地弹窗
    try:
        alert_queue.put(time.strftime('%Y-%m-%d %H:%M:%S'))
    except Exception as e:
        print(f"加入报警队列失败：{str(e)}")

def create_alert_window(alert_time):
    """创建报警弹窗"""
    global current_alert_window
    
    if current_alert_window is not None:
        return
    
    def show_messagebox():
        global current_alert_window
        current_alert_window = True
        
        try:
            message = f"检测到跌倒事件！\n\n时间：{alert_time}\n\n请立即查看现场情况！"
            title = "【紧急报警】跌倒警告"
            ctypes.windll.user32.MessageBoxW(0, message, title, 0x41030)
        except Exception as e:
            print(f"显示弹窗失败：{str(e)}")
        finally:
            stop_alarm_sound()
            current_alert_window = None
    
    threading.Thread(target=show_messagebox, daemon=True).start()

# ===================== 串口读取线程 =====================
def serial_read_thread():
    """串口读取线程"""
    global ser, current_radar_data, trajectory_history, fall_alert_shown
    
    print("\n雷达监听已启动...")
    print(f"串口: {SERIAL_PORT} | 波特率: {BAUD_RATE}\n")
    
    try:
        while True:
            if not ser or not ser.is_open:
                break
            
            try:
                if ser.in_waiting > 0:
                    try:
                        raw_data = ser.readline().decode('ascii', errors='ignore').strip()
                        if not raw_data:
                            continue
                        
                        radar_data = parse_radar_data(raw_data)
                        if not radar_data:
                            continue
                        
                        current_radar_data.update(radar_data)
                        
                        if radar_data['person_exist']:
                            trajectory_history.append((radar_data['x_position'], radar_data['y_position']))
                            if len(trajectory_history) > MAX_TRAJECTORY_POINTS:
                                trajectory_history.pop(0)
                        
                        person_status = "有人员" if radar_data['person_exist'] else "无人员"
                        fall_status = "发生跌倒" if radar_data['fall_happened'] else "正常"
                        position_str = f"({radar_data['x_position']}m, {radar_data['y_position']}m)"
                        print(f"[{time.strftime('%H:%M:%S')}] {person_status} | 位置：{position_str} | {fall_status}")
                        
                        if radar_data['fall_happened'] and radar_data['person_exist']:
                            if not fall_alert_shown:
                                fall_alert_shown = True
                                threading.Thread(target=show_fall_alert, daemon=True).start()
                        else:
                            if fall_alert_shown:
                                fall_alert_shown = False
                    
                    except UnicodeDecodeError:
                        continue
                    except Exception:
                        continue
                
                time.sleep(0.01)
                
            except (serial.SerialException, OSError):
                break
    
    except KeyboardInterrupt:
        pass
    except Exception:
        pass

# ===================== 可视化界面 =====================
def init_radar_visualization():
    """初始化可视化"""
    global current_radar_data, trajectory_history
    
    fig, ax = plt.subplots(figsize=(10, 8))
    fig.canvas.manager.set_window_title('防跌倒检测服务端（雷达+服务器）')
    
    ax.set_xlim(-7, 7)
    ax.set_ylim(0, 7)
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    ax.set_xlabel('X 轴距离 (米)', fontsize=12)
    ax.set_ylabel('Y 轴距离 (米)', fontsize=12)
    
    detection_range = Wedge((0, 0), 6.4, 15, 165, 
                           facecolor='lightblue', alpha=0.2, 
                           edgecolor='blue', linewidth=2, label='检测范围')
    ax.add_patch(detection_range)
    
    min_range = Circle((0, 0), 0.2, fill=False, 
                      edgecolor='red', linewidth=2, 
                      linestyle='--', label='最小检测距离')
    ax.add_patch(min_range)
    
    ax.plot(0, 0, 'r^', markersize=15, label='雷达')
    
    target_point, = ax.plot([], [], 'go', markersize=20, label='人员位置')
    trajectory_line, = ax.plot([], [], 'g-', alpha=0.5, linewidth=2, label='运动轨迹')
    
    status_text = ax.text(0.02, 0.98, '', transform=ax.transAxes,
                         fontsize=12, verticalalignment='top',
                         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
    
    fall_warning = ax.text(0.5, 0.5, '', transform=ax.transAxes,
                          fontsize=24, color='red', weight='bold',
                          ha='center', va='center')
    
    # 远端设备状态
    network_status_text = ax.text(0.98, 0.02, '', transform=ax.transAxes,
                                 fontsize=10, ha='right', va='bottom',
                                 bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.8))
    
    ax.legend(loc='upper right', fontsize=10)
    
    def update_frame(frame):
        """更新动画"""
        global current_radar_data, trajectory_history
        
        try:
            if not alert_queue.empty():
                alert_time = alert_queue.get_nowait()
                create_alert_window(alert_time)
                while not alert_queue.empty():
                    alert_queue.get_nowait()
        except:
            pass
        
        if current_radar_data['person_exist']:
            x = current_radar_data['x_position']
            y = current_radar_data['y_position']
            target_point.set_data([x], [y])
            
            if current_radar_data['fall_happened']:
                target_point.set_color('red')
                target_point.set_markersize(25)
            else:
                target_point.set_color('green')
                target_point.set_markersize(20)
            
            if trajectory_history:
                traj_x = [p[0] for p in trajectory_history]
                traj_y = [p[1] for p in trajectory_history]
                trajectory_line.set_data(traj_x, traj_y)
        else:
            target_point.set_data([], [])
            trajectory_line.set_data([], [])
        
        status_info = f"帧索引: {current_radar_data['frame_index']}\n"
        status_info += f"人员: {'检测到' if current_radar_data['person_exist'] else '未检测到'}\n"
        if current_radar_data['person_exist']:
            status_info += f"位置: ({current_radar_data['x_position']:.2f}m, {current_radar_data['y_position']:.2f}m)\n"
            status_info += f"状态: {'跌倒' if current_radar_data['fall_happened'] else '正常'}"
        status_text.set_text(status_info)
        
        if current_radar_data['fall_happened'] and current_radar_data['person_exist']:
            fall_warning.set_text('跌倒警告')
        else:
            fall_warning.set_text('')
        
        # 更新远端设备数量
        with clients_lock:
            device_count = len(connected_clients)
        network_status_text.set_text(f"远端设备: {device_count}")
        
        return target_point, trajectory_line, status_text, fall_warning, network_status_text
    
    anim = FuncAnimation(fig, update_frame, interval=100, blit=False, cache_frame_data=False)
    
    plt.tight_layout()
    plt.show()

# ===================== 主函数 =====================
def main():
    """主函数"""
    global ser
    
    print(f"\n{'='*60}")
    print(f"防跌倒检测服务端（雷达检测 + 报警服务器）")
    print(f"{'='*60}\n")
    
    # 1. 初始化音频
    init_audio()
    
    # 2. 启动服务器
    server_th = threading.Thread(target=server_thread, daemon=True)
    server_th.start()
    
    # 3. 初始化串口
    ser = init_serial()
    if not ser:
        print("串口初始化失败，退出")
        sys.exit(1)
    
    # 4. 启动串口读取
    serial_th = threading.Thread(target=serial_read_thread, daemon=True)
    serial_th.start()
    
    # 5. 启动可视化
    try:
        init_radar_visualization()
    except KeyboardInterrupt:
        print("\n用户退出")
    except Exception as e:
        print(f"\n错误：{str(e)}")
    finally:
        if ser and ser.is_open:
            try:
                ser.close()
                print("串口已关闭")
            except:
                pass
        
        try:
            stop_alarm_sound()
            pygame.mixer.quit()
        except:
            pass
        
        print("系统已停止")

if __name__ == "__main__":
    main()
