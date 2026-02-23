"""
防跌倒检测服务端 - 自定义TTS版本
功能：连接雷达检测跌倒，使用自定义TTS服务播报，同时广播给远端设备
支持：TCP Socket客户端 + WebSocket客户端（Web版报警端）
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
import os
import socket
import json
import requests
import pygame
from urllib.parse import quote
import asyncio
import websockets

# 配置matplotlib支持中文显示和后端
import matplotlib
matplotlib.use('TkAgg')  # 使用TkAgg后端，确保在主线程中运行
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

# ===================== TTS服务配置 =====================
TTS_SERVER_URL = "http://172.16.4.127:9880/tts"
# 注意：路径使用正斜杠，或者让requests自动编码
TTS_REF_AUDIO = "C:/NutriAI/healthy_eating_tts/TTS_OUT/N.wav"  # 使用正斜杠
TTS_PROMPT_TEXT = "观众朋友们，大家晚上好！欢迎收看今天的新闻联播。"
TTS_TEMP_FILE = "temp_alarm.wav"

# ===================== 雷达配置 =====================
SERIAL_PORT = None
BAUD_RATE = 115200
DATA_BITS = serial.EIGHTBITS
PARITY = serial.PARITY_NONE
STOP_BITS = serial.STOPBITS_ONE
TIMEOUT = 0.1
FALL_FLAG = 'F1'
# ===================== 服务器配置 =====================
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 9999          # TCP Socket端口（Python客户端）
WEBSOCKET_PORT = 8765       # WebSocket端口（Web客户端）
MAX_CLIENTS = 10======= 服务器配置 =====================
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

# 网络客户端列表
connected_clients = []          # TCP Socket客户端
websocket_clients = set()       # WebSocket客户端
clients_lock = threading.Lock()
ws_clients_lock = threading.Lock()

# 报警历史
alarm_history = []
MAX_HISTORY = 100

# 音频播放
audio_lock = threading.Lock()
MAX_HISTORY = 100

# 音频播放
audio_lock = threading.Lock()

# ===================== TTS语音系统 =====================
def init_voice():
    """初始化语音系统"""
    # 检测端不需要语音，直接返回
    print("检测端模式：不使用本地语音播报")
    print("报警将发送到远端报警设备\n")
    return True

def generate_tts(text, test_mode=False):
    """生成TTS语音
    
    Args:
        text: 要转换的文本
        test_mode: 测试模式，不播放音频
    
    Returns:
        bool: 是否成功
    """
    try:
        # 构建请求URL
        params = {
            'text': text,
            'text_lang': 'zh',
            'ref_audio_path': TTS_REF_AUDIO,
            'prompt_lang': 'zh',
            'prompt_text': TTS_PROMPT_TEXT,
            'text_split_method': 'cut5',
            'batch_size': '1',
            'media_type': 'wav',
            'streaming_mode': 'false'
        }
        
        # 添加浏览器headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive'
        }
        
        # 创建session并禁用代理
        session = requests.Session()
        session.trust_env = False  # 禁用环境变量中的代理
        session.proxies = {'http': None, 'https': None}
        
        # 发送请求
        print(f"正在生成语音: {text[:20]}...")
        response = session.get(TTS_SERVER_URL, params=params, headers=headers, timeout=60)
        
        if response.status_code == 200:
            # 保存音频文件
            with open(TTS_TEMP_FILE, 'wb') as f:
                f.write(response.content)
            
            print(f"✓ 语音生成成功 ({len(response.content)} 字节)")
            
            if not test_mode:
                # 播放音频
                play_audio_file(TTS_TEMP_FILE)
            
            return True
        else:
            print(f"✗ TTS服务返回错误: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"✗ TTS请求超时（60秒）")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"✗ 无法连接到TTS服务器: {e}")
        return False
    except Exception as e:
        print(f"✗ TTS生成失败: {type(e).__name__}: {e}")
        return False

def play_audio_file(audio_file):
    """播放音频文件"""
    try:
        with audio_lock:
            pygame.mixer.music.stop()
            pygame.mixer.music.load(audio_file)
            pygame.mixer.music.play()
            
            # 等待播放完成
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
    except Exception as e:
        print(f"播放音频失败：{str(e)}")

def play_local_alarm():
    """检测端播放本地警报音（2秒）"""
    def alarm_thread():
        try:
            alarm_file = "aviation-alarm.mp3"
            if os.path.exists(alarm_file):
                print("播放警报音（2秒）...")
                with audio_lock:
                    pygame.mixer.music.stop()
                    pygame.mixer.music.load(alarm_file)
                    pygame.mixer.music.play()
                    # 播放2秒后停止
                    time.sleep(2)
                    pygame.mixer.music.stop()
                print("警报音播放完成")
            else:
                print(f"警报音文件不存在: {alarm_file}")
                # 使用系统蜂鸣
                for i in range(4):
                    print('\a', end='', flush=True)
                    time.sleep(0.5)
        except Exception as e:
            print(f"播放警报音失败: {e}")

    threading.Thread(target=alarm_thread, daemon=True).start()


def speak_alarm(message):
    """语音播报"""
    def speak_thread():
        print(f"语音播报：{message}")
        success = generate_tts(message)
        if not success:
            print("TTS播报失败，使用系统提示音")
            print('\a' * 3)  # 系统蜂鸣
    
    threading.Thread(target=speak_thread, daemon=True).start()

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
    
    # 优先查找雷达设备常用的串口芯片
    priority_keywords = ['CH340', 'CP210', 'FT232', 'USB-SERIAL', 'USB SERIAL', 'USB-ENHANCED']
    for port in ports:
        # 排除蓝牙串口
        if 'bluetooth' in port.description.lower() or '蓝牙' in port.description:
            continue
        
        for keyword in priority_keywords:
            if keyword.upper() in port.description.upper():
                print(f"✓ 自动选择：{port.device} ({port.description})")
                return port.device
    
    # 如果没有找到优先串口，选择第一个非蓝牙串口
    for port in ports:
        if 'bluetooth' not in port.description.lower() and '蓝牙' not in port.description:
            print(f"自动选择：{port.device} ({port.description})")
            return port.device
    
    print("警告：未找到合适的串口设备（排除了蓝牙串口）")
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
# ===================== 网络服务器 =====================
def broadcast_fall_alarm(x_position, y_position):
    """广播跌倒报警给所有客户端（TCP + WebSocket）"""
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
    
    # 记录到历史
    alarm_history.append(alarm_msg)
    if len(alarm_history) > MAX_HISTORY:
        alarm_history.pop(0)
    
    # 广播给TCP客户端
    tcp_broadcast_count = 0
    failed_clients = []
    
    with clients_lock:
        for client_info in connected_clients:
            try:
                data = json.dumps(alarm_msg).encode('utf-8')
                client_info['socket'].sendall(data)
                tcp_broadcast_count += 1
                print(f"报警已发送至TCP客户端: {client_info['device_name']}")
            except Exception as e:
                print(f"TCP发送失败: {client_info['address']}")
                failed_clients.append(client_info)
        
        # 移除失败的客户端
        for failed_client in failed_clients:
            if failed_client in connected_clients:
                connected_clients.remove(failed_client)
    
    # 广播给WebSocket客户端
    ws_broadcast_count = 0
    with ws_clients_lock:
        ws_count = len(websocket_clients)
        if ws_count > 0:
            # 在事件循环中发送WebSocket消息
            asyncio.run_coroutine_threadsafe(
                broadcast_to_websockets(alarm_msg),
                websocket_loop
            )
            ws_broadcast_count = ws_count
    
    total_count = tcp_broadcast_count + ws_broadcast_count
    if total_count > 0:
        print(f"报警已广播至 {total_count} 个设备 (TCP:{tcp_broadcast_count}, WebSocket:{ws_broadcast_count})")

async def broadcast_to_websockets(message):
    """异步广播消息给所有WebSocket客户端"""
    if not websocket_clients:
        return
    
    message_str = json.dumps(message)
    disconnected = set()
    
    for ws in websocket_clients.copy():
        try:
            await ws.send(message_str)
            print(f"报警已发送至WebSocket客户端")
        except Exception as e:
            print(f"WebSocket发送失败: {e}")
            disconnected.add(ws)
    
    # 移除断开的客户端
    with ws_clients_lock:
        for ws in disconnected:
            websocket_clients.discard(ws)
        'time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'location': {
            'x': round(x_position, 3),
            'y': round(y_position, 3)
        }
    }
    
def server_thread():
    """TCP服务器线程"""
    try:
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((SERVER_HOST, SERVER_PORT))
        server_socket.listen(MAX_CLIENTS)
        
        print(f"\nTCP报警服务器已启动: {SERVER_HOST}:{SERVER_PORT}")
        print("等待Python客户端连接...\n")
        
        while True:
            client_socket, client_address = server_socket.accept()
            client_thread = threading.Thread(
                target=handle_client,
                args=(client_socket, client_address),
                daemon=True
            )
            client_thread.start()
    except Exception as e:
        print(f"TCP服务器错误: {str(e)}")

async def websocket_handler(websocket, path):
    """WebSocket连接处理器"""
    client_address = websocket.remote_address
    print(f"[{time.strftime('%H:%M:%S')}] WebSocket客户端连接: {client_address}")
    
    # 添加到客户端集合
    with ws_clients_lock:
        websocket_clients.add(websocket)
        print(f"当前WebSocket连接数: {len(websocket_clients)}")
    
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
                    device_name = data.get('device_name', 'Web客户端')
                    print(f"WebSocket设备注册: {device_name}")
            except json.JSONDecodeError:
                pass
    
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"WebSocket错误: {e}")
    finally:
        # 移除客户端
        with ws_clients_lock:
            websocket_clients.discard(websocket)
        print(f"[{time.strftime('%H:%M:%S')}] WebSocket客户端断开: {client_address}")
        print(f"当前WebSocket连接数: {len(websocket_clients)}")

async def start_websocket_server():
    """启动WebSocket服务器"""
    print(f"\nWebSocket服务器已启动: {SERVER_HOST}:{WEBSOCKET_PORT}")
    print("等待Web客户端连接...\n")
    
    async with websockets.serve(websocket_handler, SERVER_HOST, WEBSOCKET_PORT):
        await asyncio.Future()  # 永久运行

def websocket_server_thread():
    """WebSocket服务器线程"""
    global websocket_loop
    try:
        websocket_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(websocket_loop)
        websocket_loop.run_until_complete(start_websocket_server())
    except Exception as e:
        print(f"WebSocket服务器错误: {str(e)}")ed_clients:
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
    
    # 不在检测端播放语音，只广播给报警端
    x_pos = current_radar_data['x_position']
    y_pos = current_radar_data['y_position']
    
    # 广播给远端设备
    broadcast_fall_alarm(x_pos, y_pos)
    
    print(f"报警信息已发送到所有报警端")
    print(f"位置: X={x_pos}m, Y={y_pos}m\n")

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
        # 更新远端设备数量
        with clients_lock:
            tcp_count = len(connected_clients)
        with ws_clients_lock:
            ws_count = len(websocket_clients)
        total_devices = tcp_count + ws_count
        network_status_text.set_text(f"远端设备: {total_devices} (TCP:{tcp_count} WS:{ws_count})")
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
            elif cmd_lower == 'status':
                with clients_lock:
                    tcp_count = len(connected_clients)
                with ws_clients_lock:
                    ws_count = len(websocket_clients)
                print(f"\n系统状态:")
                print(f"  串口: {'已连接' if ser and ser.is_open else '未连接'}")
                print(f"  TCP服务器: 运行中 ({SERVER_HOST}:{SERVER_PORT})")
                print(f"  WebSocket服务器: 运行中 ({SERVER_HOST}:{WEBSOCKET_PORT})")
            elif cmd_lower == 'clients':
                with clients_lock:
                    tcp_clients = list(connected_clients)
                with ws_clients_lock:
                    ws_count = len(websocket_clients)
                
                total = len(tcp_clients) + ws_count
                if total == 0:
                    print("\n当前无设备连接\n")
                else:
                    print(f"\n连接的报警端设备 ({total} 个):")
                    if tcp_clients:
                        print(f"  TCP客户端 ({len(tcp_clients)} 个):")
                        for i, client in enumerate(tcp_clients, 1):
                            print(f"    {i}. {client['device_name']} - {client['address'][0]}:{client['address'][1]}")
                    if ws_count > 0:
                        print(f"  WebSocket客户端 ({ws_count} 个)")
                    print()
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
def main():
    """主函数"""
    global ser, websocket_loop
    
    print(f"\n{'='*60}")
    print(f"防跌倒检测服务端（自定义TTS版 + WebSocket支持）")
    print(f"TTS服务: {TTS_SERVER_URL}")
    print(f"{'='*60}\n")
    
    # 1. 初始化语音系统
    init_voice()
    
    # 2. 启动TCP服务器
    tcp_server_th = threading.Thread(target=server_thread, daemon=True)
    tcp_server_th.start()
    
    # 3. 启动WebSocket服务器
    ws_server_th = threading.Thread(target=websocket_server_thread, daemon=True)
    ws_server_th.start()
    
    # 等待WebSocket服务器启动
    time.sleep(1)
    
    # 4. 初始化串口
    ser = init_serial()
    if not ser:
        print("\n" + "="*60)
        print("串口初始化失败，将以测试模式运行（无雷达）")
        print("="*60)
        print("测试模式说明：")
        print("  - 可以使用 'test' 命令手动触发报警测试")
        print("  - 报警端可以正常连接和接收测试报警")
        print("="*60 + "\n")
    else:
        # 5. 启动串口读取
        serial_th = threading.Thread(target=serial_read_thread, daemon=True)
        serial_th.start()
    
    # 6. 启动可视化（在主线程中）
    print("\n" + "="*60)
    print("系统已启动！")
    print("="*60)
    if ser:
        print("✓ 雷达已连接")
    else:
        print("✗ 雷达未连接（测试模式）")
    print(f"✓ TCP服务器运行中: {SERVER_HOST}:{SERVER_PORT}")
    print(f"✓ WebSocket服务器运行中: {SERVER_HOST}:{WEBSOCKET_PORT}")
    print("="*60)
    print("\nWeb版报警端连接方式：")
    print(f"  1. 打开 tablet_os.html")
    print(f"  2. 自动连接到 ws://localhost:{WEBSOCKET_PORT}")
    print("="*60 + "\n")
    
    # 7. 在新线程中启动命令处理（让主线程用于GUI）
    cmd_thread = threading.Thread(target=handle_commands, daemon=True)
    cmd_thread.start()
    
    # 8. 在主线程中启动可视化（matplotlib需要主线程）
    try:
        init_radar_visualization()
    except KeyboardInterrupt:
        print("\n用户退出")
    except Exception as e:
        print(f"\n可视化错误：{str(e)}")
    finally:
        if ser and ser.is_open:
            try:
                ser.close()
                print("串口已关闭")
            except:
                pass
        
        # 清理临时文件
        try:
            if os.path.exists(TTS_TEMP_FILE):
                os.remove(TTS_TEMP_FILE)
        except:
            pass
        
        try:
            pygame.mixer.quit()
        except:
            pass
        
        print("系统已停止")
            cmd_lower = cmd.lower()
            
            if cmd_lower == 'test':
                print("\n发送测试报警...")
                # 使用当前位置或默认位置
                test_x = current_radar_data.get('x_position', 1.5)
                test_y = current_radar_data.get('y_position', 2.0)
                
                # 广播给远端设备
                broadcast_fall_alarm(test_x, test_y)
                
                print(f"✓ 测试报警已发送！")
                print(f"  位置: X={test_x}m, Y={test_y}m")
                print(f"  时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"  报警端将收到语音播报\n")
            
            elif cmd_lower == 'status':
                with clients_lock:
                    device_count = len(connected_clients)
                print(f"\n系统状态:")
                print(f"  串口: {'已连接' if ser and ser.is_open else '未连接'}")
                print(f"  服务器: 运行中 ({SERVER_HOST}:{SERVER_PORT})")
                print(f"  报警端设备: {device_count} 个")
                print(f"  报警历史: {len(alarm_history)} 条\n")
            
            elif cmd_lower == 'clients':
                with clients_lock:
                    if not connected_clients:
                        print("\n当前无设备连接\n")
                    else:
                        print(f"\n连接的报警端设备 ({len(connected_clients)} 个):")
                        for i, client in enumerate(connected_clients, 1):
                            print(f"  {i}. {client['device_name']} - {client['address'][0]}:{client['address'][1]}")
                        print()
            
            elif cmd_lower == 'history':
                if not alarm_history:
                    print("\n暂无报警历史\n")
                else:
                    print(f"\n报警历史 (最近{min(10, len(alarm_history))}条):")
                    for i, alarm in enumerate(alarm_history[-10:], 1):
                        loc = alarm['location']
                        print(f"  {i}. {alarm['time']} - 位置: X={loc['x']}m, Y={loc['y']}m")
                    print()
            
            elif cmd_lower == 'quit':
                print("\n正在退出...")
                break
            
            elif cmd_lower == 'help' or cmd_lower == '?':
                print("\n可用命令:")
                print("  test       - 发送测试报警（模拟跌倒）")
                print("  status     - 查看系统状态")
                print("  clients    - 查看连接的报警端设备")
                print("  history    - 查看报警历史")
                print("  quit       - 退出程序\n")
            
            else:
                print(f"未知命令: {cmd}，输入 'help' 查看可用命令\n")
        
        except KeyboardInterrupt:
            print("\n\n正在退出...")
            break
        except Exception as e:
            print(f"命令处理错误: {str(e)}\n")

# ===================== 主函数 =====================
def main():
    """主函数"""
    global ser
    
    print(f"\n{'='*60}")
    print(f"防跌倒检测服务端（自定义TTS版）")
    print(f"TTS服务: {TTS_SERVER_URL}")
    print(f"{'='*60}\n")
    
    # 1. 初始化语音系统
    init_voice()
    
    # 2. 启动服务器
    server_th = threading.Thread(target=server_thread, daemon=True)
    server_th.start()
    
    # 3. 初始化串口
    ser = init_serial()
    if not ser:
        print("\n" + "="*60)
        print("串口初始化失败，将以测试模式运行（无雷达）")
        print("="*60)
        print("测试模式说明：")
        print("  - 可以使用 'test' 命令手动触发报警测试")
        print("  - 报警端可以正常连接和接收测试报警")
        print("="*60 + "\n")
    else:
        # 4. 启动串口读取
        serial_th = threading.Thread(target=serial_read_thread, daemon=True)
        serial_th.start()
    
    # 5. 启动可视化（在主线程中）
    print("\n" + "="*60)
    print("系统已启动！")
    print("="*60)
    if ser:
        print("✓ 雷达已连接")
    else:
        print("✗ 雷达未连接（测试模式）")
    print(f"✓ 报警服务器运行中: {SERVER_HOST}:{SERVER_PORT}")
    print("="*60 + "\n")
    
    # 6. 在新线程中启动命令处理（让主线程用于GUI）
    cmd_thread = threading.Thread(target=handle_commands, daemon=True)
    cmd_thread.start()
    
    # 7. 在主线程中启动可视化（matplotlib需要主线程）
    try:
        init_radar_visualization()
    except KeyboardInterrupt:
        print("\n用户退出")
    except Exception as e:
        print(f"\n可视化错误：{str(e)}")
    finally:
        if ser and ser.is_open:
            try:
                ser.close()
                print("串口已关闭")
            except:
                pass
        
        # 清理临时文件
        try:
            if os.path.exists(TTS_TEMP_FILE):
                os.remove(TTS_TEMP_FILE)
        except:
            pass
        
        try:
            pygame.mixer.quit()
        except:
            pass
        
        print("系统已停止")

if __name__ == "__main__":
    main()
