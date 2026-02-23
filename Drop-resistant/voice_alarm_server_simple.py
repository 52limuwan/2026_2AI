"""
防跌倒检测服务端 - 简化版（无TTS）
功能：连接雷达检测跌倒，通过WebSocket广播给Web报警端
仅支持：WebSocket客户端（Web版报警端使用浏览器内置TTS）
"""
import serial
import serial.tools.list_ports
import time
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Wedge
from matplotlib.animation import FuncAnimation
import threading
import json
import asyncio
import websockets
import queue
import sys

# 配置matplotlib支持中文显示和后端
import matplotlib
matplotlib.use('TkAgg')
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

# ===================== WebSocket服务器配置 =====================
SERVER_HOST = '0.0.0.0'
WEBSOCKET_PORT = 8765

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

# WebSocket客户端
websocket_clients = set()
ws_clients_lock = threading.Lock()

# 报警历史
alarm_history = []
MAX_HISTORY = 100

# 日志队列（用于线程安全的日志输出）
log_queue = queue.Queue()
should_exit = threading.Event()

# ===================== 日志系统 =====================
def log_print(message):
    """线程安全的日志输出"""
    log_queue.put(message)

def log_worker():
    """日志输出工作线程"""
    while not should_exit.is_set():
        try:
            message = log_queue.get(timeout=0.1)
            print(message)
            sys.stdout.flush()
        except queue.Empty:
            continue
        except Exception:
            break

# ===================== 串口通信 =====================
def auto_detect_serial_port():
    """自动检测串口"""
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("未检测到串口设备")
        return None
    
    # 优先查找雷达设备常用的串口芯片
    priority_keywords = ['CH340', 'CP210', 'FT232', 'USB-SERIAL', 'USB SERIAL', 'USB-ENHANCED']
    for port in ports:
        if 'bluetooth' in port.description.lower() or '蓝牙' in port.description:
            continue
        
        for keyword in priority_keywords:
            if keyword.upper() in port.description.upper():
                return port.device
    
    for port in ports:
        if 'bluetooth' not in port.description.lower() and '蓝牙' not in port.description:
            return port.device
    
    return None

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
            return ser
        return None
    except Exception:
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

# ===================== WebSocket服务器 =====================
async def broadcast_to_websockets(message):
    """异步广播消息给所有WebSocket客户端"""
    if not websocket_clients:
        return
    
    message_str = json.dumps(message)
    disconnected = set()
    
    for ws in websocket_clients.copy():
        try:
            await ws.send(message_str)
        except Exception:
            disconnected.add(ws)
    
    # 移除断开的客户端
    with ws_clients_lock:
        for ws in disconnected:
            websocket_clients.discard(ws)

def broadcast_fall_alarm(x_position, y_position):
    """广播跌倒报警给所有Web客户端"""
    alarm_msg = {
        'type': 'fall_alarm',
        'time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'person_name': '被监护人',
        'location_name': f'位置({round(x_position, 2)}m, {round(y_position, 2)}m)',
        'location': {
            'x': round(x_position, 3),
            'y': round(y_position, 3)
        }
    }
    
    alarm_history.append(alarm_msg)
    if len(alarm_history) > MAX_HISTORY:
        alarm_history.pop(0)
    
    with ws_clients_lock:
        ws_count = len(websocket_clients)
        if ws_count > 0:
            asyncio.run_coroutine_threadsafe(
                broadcast_to_websockets(alarm_msg),
                websocket_loop
            )

async def websocket_handler(websocket):
    """WebSocket连接处理器"""
    # 添加到客户端集合
    with ws_clients_lock:
        websocket_clients.add(websocket)
        log_print(f"[{time.strftime('%H:%M:%S')}] Web端连接 ({len(websocket_clients)}个在线)")
    
    try:
        # 发送欢迎消息
        welcome_msg = {
            'type': 'connected',
            'message': '已连接到检测端',
            'time': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        await websocket.send(json.dumps(welcome_msg))
        
        # 保持连接并接收消息
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get('type') == 'register':
                    pass  # 静默注册
            except json.JSONDecodeError:
                pass
    
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception:
        pass
    finally:
        # 移除客户端
        with ws_clients_lock:
            websocket_clients.discard(websocket)
            log_print(f"[{time.strftime('%H:%M:%S')}] Web端断开 ({len(websocket_clients)}个在线)")

async def start_websocket_server():
    """启动WebSocket服务器"""
    async with websockets.serve(websocket_handler, SERVER_HOST, WEBSOCKET_PORT):
        await asyncio.Future()

def websocket_server_thread():
    """WebSocket服务器线程"""
    global websocket_loop
    try:
        websocket_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(websocket_loop)
        websocket_loop.run_until_complete(start_websocket_server())
    except Exception as e:
        log_print(f"WebSocket服务器错误: {str(e)}")

# ===================== 报警处理 =====================
def show_fall_alert():
    """跌倒报警"""
    x_pos = current_radar_data['x_position']
    y_pos = current_radar_data['y_position']
    broadcast_fall_alarm(x_pos, y_pos)

# ===================== 串口读取线程 =====================
def serial_read_thread():
    """串口读取线程"""
    global ser, current_radar_data, trajectory_history, fall_alert_shown
    
    try:
        while not should_exit.is_set():
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
    fig.canvas.manager.set_window_title('防跌倒检测服务端（简化版 - 无TTS）')
    
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
    
    # Web客户端状态
    network_status_text = ax.text(0.98, 0.02, '', transform=ax.transAxes,
                                 fontsize=10, ha='right', va='bottom',
                                 bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.8))
    
    ax.legend(loc='upper right', fontsize=10)
    
    def update_frame(frame):
        """更新动画"""
        global current_radar_data, trajectory_history
        
        # 检查是否需要退出
        if should_exit.is_set():
            plt.close('all')
            return target_point, trajectory_line, status_text, fall_warning, network_status_text
        
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
            fall_warning.set_text('跌倒警告\n已发送到Web端')
        else:
            fall_warning.set_text('')
        
        # 更新Web客户端数量
        with ws_clients_lock:
            ws_count = len(websocket_clients)
        network_status_text.set_text(f"Web客户端: {ws_count}")
        
        return target_point, trajectory_line, status_text, fall_warning, network_status_text
    
    # 保存动画对象到 figure，避免被垃圾回收
    anim = FuncAnimation(fig, update_frame, interval=100, blit=False, cache_frame_data=False)
    fig._animation = anim  # 保存引用
    
    plt.tight_layout()
    
    return fig

# ===================== 命令处理 =====================
def handle_commands():
    """处理用户命令"""
    while not should_exit.is_set():
        try:
            cmd = input(">>> ").strip()
            
            if not cmd:
                continue
            
            cmd_lower = cmd.lower()
            
            if cmd_lower == 'test':
                test_x = current_radar_data.get('x_position', 0)
                test_y = current_radar_data.get('y_position', 0)
                broadcast_fall_alarm(test_x, test_y)
                with ws_clients_lock:
                    ws_count = len(websocket_clients)
                log_print(f"已发送测试警报至 {ws_count} 个Web端")
            
            elif cmd_lower == 'status':
                with ws_clients_lock:
                    ws_count = len(websocket_clients)
                log_print(f"雷达: {'已连接' if ser and ser.is_open else '未连接'} | Web端: {ws_count} | 历史: {len(alarm_history)}")
            
            elif cmd_lower == 'clients':
                with ws_clients_lock:
                    log_print(f"Web端: {len(websocket_clients)}")
            
            elif cmd_lower == 'history':
                if alarm_history:
                    for alarm in alarm_history[-5:]:
                        log_print(f"{alarm['time']} - X={alarm['location']['x']}m Y={alarm['location']['y']}m")
                else:
                    log_print("无历史记录")
            
            elif cmd_lower in ['quit', 'exit', 'q']:
                log_print("正在退出...")
                should_exit.set()
                break
            
            else:
                log_print(f"未知命令: {cmd}")
        
        except KeyboardInterrupt:
            log_print("\n正在退出...")
            should_exit.set()
            break
        except EOFError:
            should_exit.set()
            break
        except Exception as e:
            log_print(f"错误: {e}")

# ===================== 主函数 =====================
def main():
    """主函数"""
    global ser, websocket_loop
    
    # 启动日志工作线程
    log_thread = threading.Thread(target=log_worker, daemon=True)
    log_thread.start()
    time.sleep(0.1)  # 确保日志线程启动
    
    log_print(f">>> WebSocket服务器: {SERVER_HOST}:{WEBSOCKET_PORT}")
    
    # 1. 启动WebSocket服务器
    ws_server_th = threading.Thread(target=websocket_server_thread, daemon=True)
    ws_server_th.start()
    time.sleep(0.5)  # 等待服务器启动
    
    # 2. 初始化串口
    ser = init_serial()
    if ser:
        serial_th = threading.Thread(target=serial_read_thread, daemon=True)
        serial_th.start()
        log_print(f">>> 雷达已连接: {SERIAL_PORT}")
    else:
        log_print(">>> 雷达未连接 (测试模式)")
        log_print("使用 'test' 命令手动触发测试")
    
    log_print(">>> 系统已就绪")
    log_print("命令: test | status | clients | history | quit")
    
    # 3. 在新线程中启动命令处理
    cmd_thread = threading.Thread(target=handle_commands, daemon=True)
    cmd_thread.start()
    
    # 4. 在主线程中启动可视化
    try:
        # 设置窗口关闭事件
        def on_close(event):
            log_print("窗口已关闭，正在退出...")
            should_exit.set()
            plt.close('all')
        
        fig = init_radar_visualization()
        fig.canvas.mpl_connect('close_event', on_close)
        
        # 显示窗口
        plt.show()
        
    except KeyboardInterrupt:
        log_print("\n收到中断信号，正在退出...")
    except Exception as e:
        log_print(f"可视化错误: {e}")
    finally:
        should_exit.set()
        
        # 关闭串口
        if ser and ser.is_open:
            try:
                ser.close()
            except:
                pass
        
        # 等待线程结束
        time.sleep(0.5)
        log_print(">>> 程序已退出")
        sys.exit(0)

if __name__ == "__main__":
    main()
