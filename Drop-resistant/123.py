# 导入串口通讯库（用于与雷达模块UART接口通信）
import serial
# 导入串口列表工具（用于自动识别可用COM口）
import serial.tools.list_ports
# 导入时间库（用于日志时间戳、循环延时）
import time
# 导入系统库（用于异常退出时关闭串口）
import sys
# 导入绘图库（用于雷达可视化界面）
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Wedge
from matplotlib.animation import FuncAnimation
import numpy as np
# 导入线程库（用于串口读取和界面显示并行）
import threading
# 导入队列库（用于线程间通信）
import queue
# 导入音频播放库（用于播放报警音效）
import pygame
import os
# 导入Windows消息框（用于弹窗）
import ctypes

# 配置matplotlib支持中文显示
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']  # 中文字体
plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示问题

# ===================== 配置参数（根据产品规格书修改）=====================
# 串口端口（自动识别，无需手动配置）
SERIAL_PORT = None  # 将自动扫描可用COM口
# 波特率（匹配表2通讯参数：115200）
BAUD_RATE = 115200
# 数据位（匹配表2：8位）
DATA_BITS = serial.EIGHTBITS
# 校验位（匹配表2：无校验）
PARITY = serial.PARITY_NONE
# 停止位（匹配表2：1位）
STOP_BITS = serial.STOPBITS_ONE
# 串口超时时间（单位：秒，避免程序卡死）
TIMEOUT = 0.1
# 数据帧周期（匹配产品规格：100ms，用于控制循环频率）
FRAME_PERIOD = 0.1
# 跌倒状态标识（匹配表3：F1=跌倒，F0=正常）
FALL_FLAG = 'F1'
# 人员存在标识（匹配表3：E1=存在，E0=不存在）
PERSON_FLAG = 'E1'
# 坐标单位转换系数（匹配文档：数据单位0.001m → 实际米）
COORDINATE_SCALE = 0.001
# 报警音效文件路径
ALARM_SOUND_FILE = 'aviation-alarm.mp3'

# ===================== 全局变量初始化 =====================
# 串口对象（用于后续通讯操作）
ser = None
# 雷达数据缓存（用于可视化显示）
current_radar_data = {
    'x_position': 0,
    'y_position': 0,
    'person_exist': False,
    'fall_happened': False,
    'frame_index': '0'
}
# 历史轨迹缓存（最多保存50个点）
trajectory_history = []
MAX_TRAJECTORY_POINTS = 50
# 跌倒报警标志（避免重复弹窗）
fall_alert_shown = False
# 报警队列（用于线程间通信）
alert_queue = queue.Queue()
# 当前报警窗口（确保只有一个）
current_alert_window = None

# 初始化pygame音频系统
def init_audio():
    """初始化音频播放系统"""
    try:
        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
        # 检查音效文件是否存在
        if os.path.exists(ALARM_SOUND_FILE):
            print(f"报警音效文件已加载：{ALARM_SOUND_FILE}")
            return True
        else:
            print(f"警告：未找到报警音效文件 {ALARM_SOUND_FILE}")
            return False
    except Exception as e:
        print(f"音频系统初始化失败：{str(e)}")
        return False

def play_alarm_sound():
    """播放报警音效（循环播放）"""
    try:
        if os.path.exists(ALARM_SOUND_FILE):
            # 停止之前的播放
            pygame.mixer.music.stop()
            # 加载音效文件
            pygame.mixer.music.load(ALARM_SOUND_FILE)
            # -1表示无限循环播放
            pygame.mixer.music.play(loops=-1)
            print("报警音效开始循环播放")
    except Exception as e:
        print(f"播放报警音效失败：{str(e)}")

def stop_alarm_sound():
    """停止报警音效"""
    try:
        if pygame.mixer.music.get_busy():
            pygame.mixer.music.stop()
            print("报警音效已停止")
    except Exception as e:
        print(f"停止报警音效失败：{str(e)}")

def auto_detect_serial_port():
    """
    自动检测可用的串口（扫描系统所有COM口）
    返回：成功返回串口名称（如COM3），失败返回None
    """
    print("正在扫描可用串口...")
    # 获取系统所有串口列表
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("未检测到任何串口设备")
        return None
    
    # 打印所有可用串口信息
    print(f"检测到 {len(ports)} 个串口设备：")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    
    # 优先选择包含特定关键词的串口（常见雷达模块/USB转串口芯片）
    priority_keywords = ['CH340', 'CP210', 'FT232', 'USB-SERIAL', 'USB SERIAL']
    for port in ports:
        for keyword in priority_keywords:
            if keyword.upper() in port.description.upper():
                print(f"自动选择串口：{port.device} ({port.description})")
                return port.device
    
    # 如果没有匹配关键词，选择第一个可用串口
    selected_port = ports[0].device
    print(f"自动选择串口：{selected_port} ({ports[0].description})")
    return selected_port

def init_serial():
    """
    初始化串口连接（遵循产品规格书4.连接方法和5.1通讯协议）
    返回：成功返回串口对象，失败返回None
    """
    global ser, SERIAL_PORT
    
    # 自动检测串口
    if SERIAL_PORT is None:
        SERIAL_PORT = auto_detect_serial_port()
        if SERIAL_PORT is None:
            print("无法自动识别串口，请手动指定")
            return None
    
    try:
        # 创建串口实例，配置通讯参数
        ser = serial.Serial(
            port=SERIAL_PORT,
            baudrate=BAUD_RATE,
            bytesize=DATA_BITS,
            parity=PARITY,
            stopbits=STOP_BITS,
            timeout=TIMEOUT
        )
        # 检查串口是否成功打开
        if ser.is_open:
            print(f"串口{SERIAL_PORT}打开成功，波特率：{BAUD_RATE}")
            return ser
        else:
            print(f"串口{SERIAL_PORT}打开失败")
            return None
    # 捕获串口访问权限错误（如端口被占用）
    except PermissionError:
        print(f"权限错误：串口{SERIAL_PORT}被占用，请关闭其他串口工具")
        return None
    # 捕获串口不存在错误（如端口号配置错误）
    except FileNotFoundError:
        print(f"未找到串口{SERIAL_PORT}，请检查端口配置")
        return None
    # 捕获其他未知错误
    except Exception as e:
        print(f"串口初始化失败：{str(e)}")
        return None

def show_fall_alert():
    """跌倒报警提示（弹窗+日志输出+音效，适配老人监护等场景）"""
    # 打印报警日志（终端可视化）
    print(f"\n{'='*50}")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 检测到跌倒！")
    print(f"{'='*50}\n")
    
    # 播放报警音效（循环播放）
    play_alarm_sound()
    
    # 将报警事件放入队列，由主线程处理
    try:
        alert_queue.put(time.strftime('%Y-%m-%d %H:%M:%S'))
        print("报警事件已加入队列")
    except Exception as e:
        print(f"加入报警队列失败：{str(e)}")

def create_alert_window(alert_time):
    """使用Windows原生消息框创建报警弹窗"""
    global current_alert_window
    
    # 如果已经有弹窗存在，不再创建新的
    if current_alert_window is not None:
        print("报警弹窗已存在，不重复创建")
        return
    
    print(f"\n{'='*50}")
    print(f"创建报警弹窗...")
    print(f"{'='*50}\n")
    
    # 在新线程中显示Windows消息框
    def show_messagebox():
        global current_alert_window
        current_alert_window = True
        
        try:
            # 使用Windows API显示消息框
            # MB_OK = 0x0, MB_ICONWARNING = 0x30, MB_SYSTEMMODAL = 0x1000, MB_TOPMOST = 0x40000
            message = f"检测到跌倒事件！\n\n时间：{alert_time}\n\n请立即查看现场情况！"
            title = "【紧急报警】跌倒警告"
            
            # 0x1030 = MB_OK | MB_ICONWARNING | MB_SYSTEMMODAL
            result = ctypes.windll.user32.MessageBoxW(0, message, title, 0x41030)
            
            print(f"\n[{time.strftime('%H:%M:%S')}] 用户已确认报警")
            
        except Exception as e:
            print(f"显示消息框失败：{str(e)}")
        finally:
            # 用户点击确定后，停止音效
            stop_alarm_sound()
            current_alert_window = None
    
    # 在新线程中显示消息框，避免阻塞主线程
    threading.Thread(target=show_messagebox, daemon=True).start()
    print(f"[{time.strftime('%H:%M:%S')}] 报警弹窗已显示")

def parse_radar_data(data_str):
    """
    解析雷达模块输出的数据帧（遵循表3帧数据格式）
    参数：data_str - 串口接收的原始字符串（如：F82,P-206,146,E1,F0,ND）
    返回：解析后的字典（包含帧索引、位置、人员状态、跌倒状态），解析失败返回None
    """
    # 1. 过滤无效数据帧（必须以"F"开头、以"ND"结尾，符合表3帧格式）
    if not (data_str.startswith('F') and 'ND' in data_str):
        return None
    
    # 2. 按逗号分割字段（分割后格式：['F82', 'P-206', '146', 'E1', 'F0', 'ND']）
    data_parts = data_str.strip().split(',')
    
    # 3. 检查字段数量（有效帧需至少包含5个核心字段，避免数据缺失）
    if len(data_parts) < 5:
        print(f"无效数据格式：{data_str}")
        return None
    
    try:
        # 4. 提取帧索引（从第一个字段截取，如"F82"→"82"）
        frame_index = data_parts[0][1:]
        # 5. 提取X坐标（第二个字段去除前缀"P"，转换为数值后×单位系数，如"P-206"→-206×0.001=-0.206m）
        x_coord = int(data_parts[1][1:]) * COORDINATE_SCALE
        # 6. 提取Y坐标（第三个字段直接转换为数值×单位系数，如"146"→146×0.001=0.146m）
        y_coord = int(data_parts[2]) * COORDINATE_SCALE
        # 7. 判断人员存在状态（第四个字段是否为"E1"，符合表3定义）
        person_exist = data_parts[3] == PERSON_FLAG
        # 8. 判断跌倒状态（第五个字段是否为"F1"，符合表3定义）
        fall_happened = data_parts[4] == FALL_FLAG
        
        # 9. 封装解析结果为字典（便于后续使用）
        parsed_result = {
            'frame_index': frame_index,
            'x_position': round(x_coord, 3),  # 保留3位小数，优化显示
            'y_position': round(y_coord, 3),
            'person_exist': person_exist,
            'fall_happened': fall_happened
        }
        return parsed_result
    # 捕获数值转换错误（如坐标字段非数字）
    except ValueError as e:
        print(f"数据解析失败（数值错误）：{data_str} | 错误：{str(e)}")
        return None
    # 捕获其他未知解析错误
    except Exception as e:
        print(f"数据解析失败：{data_str} | 错误：{str(e)}")
        return None

def serial_read_thread():
    """串口读取线程（后台持续接收雷达数据）"""
    global ser, current_radar_data, trajectory_history, fall_alert_shown
    
    print("\n防跌识别系统启动成功，开始监听雷达数据...")
    print(f"监听参数：串口{SERIAL_PORT} | 波特率{BAUD_RATE} | 检测范围0.2-6.4m")
    print("日志格式：[时间] 人员状态 | 位置(X,Y) | 跌倒状态\n")
    
    try:
        while True:
            # 检查串口是否仍然有效
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
                        
                        # 更新全局数据（供可视化使用）
                        current_radar_data.update(radar_data)
                        
                        # 更新轨迹历史（仅当有人员时）
                        if radar_data['person_exist']:
                            trajectory_history.append((radar_data['x_position'], radar_data['y_position']))
                            if len(trajectory_history) > MAX_TRAJECTORY_POINTS:
                                trajectory_history.pop(0)
                        
                        # 格式化输出日志：[15:01:28] 无人员 | 位置：(0.0m, 0.0m) | 正常
                        person_status = "有人员" if radar_data['person_exist'] else "无人员"
                        fall_status = "发生跌倒" if radar_data['fall_happened'] else "正常"
                        position_str = f"({radar_data['x_position']}m, {radar_data['y_position']}m)"
                        print(f"[{time.strftime('%H:%M:%S')}] {person_status} | 位置：{position_str} | {fall_status}")
                        
                        # 跌倒检测：只在首次检测到跌倒时弹窗
                        if radar_data['fall_happened'] and radar_data['person_exist']:
                            if not fall_alert_shown:
                                # 先设置标志，防止多线程重复触发
                                fall_alert_shown = True
                                print(f"[{time.strftime('%H:%M:%S')}] 触发跌倒报警")
                                # 在新线程中显示弹窗，避免阻塞数据接收
                                threading.Thread(target=show_fall_alert, daemon=True).start()
                        else:
                            # 如果恢复正常，重置弹窗标志（允许下次跌倒再次弹窗）
                            if fall_alert_shown:
                                fall_alert_shown = False
                                print(f"[{time.strftime('%H:%M:%S')}] 跌倒状态已恢复正常，重置报警标志")
                    
                    except UnicodeDecodeError:
                        # 忽略解码错误
                        continue
                    except Exception as e:
                        # 忽略数据处理错误，避免打印过多错误信息
                        continue
                
                time.sleep(0.01)  # 减少CPU占用
                
            except (serial.SerialException, OSError) as e:
                # 串口异常（如设备断开、句柄无效等），静默退出
                break
    
    except KeyboardInterrupt:
        pass
    except Exception:
        pass
    finally:
        # 线程退出时不打印信息，避免干扰用户
        pass

def init_radar_visualization():
    """初始化雷达可视化界面"""
    global current_radar_data, trajectory_history
    
    # 创建图形窗口
    fig, ax = plt.subplots(figsize=(10, 8))
    fig.canvas.manager.set_window_title('雷达跌倒检测可视化系统')
    
    # 设置坐标轴范围（根据产品规格：0.2-6.4m）
    ax.set_xlim(-7, 7)
    ax.set_ylim(0, 7)
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    ax.set_xlabel('X 轴距离 (米)', fontsize=12)
    ax.set_ylabel('Y 轴距离 (米)', fontsize=12)
    
    # 绘制雷达检测范围（方位角±75°，俯仰角±50°，简化为扇形）
    detection_range = Wedge((0, 0), 6.4, 15, 165, 
                           facecolor='lightblue', alpha=0.2, 
                           edgecolor='blue', linewidth=2, label='检测范围')
    ax.add_patch(detection_range)
    
    # 绘制最小检测距离
    min_range = Circle((0, 0), 0.2, fill=False, 
                      edgecolor='red', linewidth=2, 
                      linestyle='--', label='最小检测距离(0.2m)')
    ax.add_patch(min_range)
    
    # 绘制雷达位置
    ax.plot(0, 0, 'r^', markersize=15, label='雷达模组')
    
    # 初始化目标点（人员位置）
    target_point, = ax.plot([], [], 'go', markersize=20, label='人员位置')
    
    # 初始化轨迹线
    trajectory_line, = ax.plot([], [], 'g-', alpha=0.5, linewidth=2, label='运动轨迹')
    
    # 初始化状态文本
    status_text = ax.text(0.02, 0.98, '', transform=ax.transAxes,
                         fontsize=12, verticalalignment='top',
                         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
    
    # 初始化跌倒警告文本
    fall_warning = ax.text(0.5, 0.5, '', transform=ax.transAxes,
                          fontsize=24, color='red', weight='bold',
                          ha='center', va='center')
    
    ax.legend(loc='upper right', fontsize=10)
    
    def update_frame(frame):
        """动画更新函数"""
        global current_radar_data, trajectory_history
        
        # 检查报警队列，处理报警事件（只处理一个，避免多个弹窗）
        try:
            if not alert_queue.empty():
                alert_time = alert_queue.get_nowait()
                create_alert_window(alert_time)
                # 清空队列中的其他报警
                while not alert_queue.empty():
                    alert_queue.get_nowait()
        except queue.Empty:
            pass
        except Exception as e:
            print(f"处理报警队列错误：{str(e)}")
        
        # 更新目标位置
        if current_radar_data['person_exist']:
            x = current_radar_data['x_position']
            y = current_radar_data['y_position']
            target_point.set_data([x], [y])
            
            # 根据跌倒状态改变颜色
            if current_radar_data['fall_happened']:
                target_point.set_color('red')
                target_point.set_markersize(25)
            else:
                target_point.set_color('green')
                target_point.set_markersize(20)
            
            # 更新轨迹
            if trajectory_history:
                traj_x = [p[0] for p in trajectory_history]
                traj_y = [p[1] for p in trajectory_history]
                trajectory_line.set_data(traj_x, traj_y)
        else:
            target_point.set_data([], [])
            trajectory_line.set_data([], [])
        
        # 更新状态文本
        status_info = f"帧索引: {current_radar_data['frame_index']}\n"
        status_info += f"人员状态: {'检测到' if current_radar_data['person_exist'] else '未检测到'}\n"
        if current_radar_data['person_exist']:
            status_info += f"位置: ({current_radar_data['x_position']:.2f}m, {current_radar_data['y_position']:.2f}m)\n"
            status_info += f"跌倒状态: {'发生跌倒' if current_radar_data['fall_happened'] else '正常'}"
        status_text.set_text(status_info)
        
        # 更新跌倒警告
        if current_radar_data['fall_happened'] and current_radar_data['person_exist']:
            fall_warning.set_text('跌倒警告')
        else:
            fall_warning.set_text('')
        
        return target_point, trajectory_line, status_text, fall_warning
    
    # 创建动画（每100ms更新一次，匹配数据帧周期）
    anim = FuncAnimation(fig, update_frame, interval=100, blit=False, cache_frame_data=False)
    
    plt.tight_layout()
    plt.show()

def fall_detection_main():
    """防跌识别主函数（串口读取+可视化显示）"""
    global ser
    
    # 1. 初始化音频系统
    init_audio()
    
    # 2. 初始化串口连接
    ser = init_serial()
    if not ser:
        sys.exit(1)
    
    # 3. 启动串口读取线程
    serial_thread = threading.Thread(target=serial_read_thread, daemon=True)
    serial_thread.start()
    
    # 4. 启动可视化界面（主线程）
    try:
        init_radar_visualization()
    except KeyboardInterrupt:
        print("\n用户手动退出系统")
    except Exception as e:
        print(f"\n可视化系统错误：{str(e)}")
    finally:
        # 先关闭串口，避免线程继续访问
        if ser and ser.is_open:
            try:
                ser.close()
                print("串口已关闭")
            except Exception:
                pass
        
        # 停止音效
        try:
            stop_alarm_sound()
            pygame.mixer.quit()
        except:
            pass
        
        print("防跌识别系统已停止")

# ===================== 程序入口 =====================
if __name__ == "__main__":
    # 启动防跌识别系统
    fall_detection_main()