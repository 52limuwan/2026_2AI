# 串口配置文件

# 串口设置
SERIAL_CONFIG = {
    'port': 'COM3',        # 串口号，根据实际情况修改（COM3, COM4, COM5等）
    'baudrate': 115200,    # 波特率，常见值: 9600, 115200, 256000
    'timeout': 1           # 超时时间（秒）
}

# 显示设置
DISPLAY_CONFIG = {
    'show_timestamp': True,     # 是否显示时间戳
    'decimal_places': 1,        # 小数位数
    'refresh_rate': 0.01        # 刷新间隔（秒）
}

# 数据过滤（可选）
FILTER_CONFIG = {
    'enable': False,            # 是否启用过滤
    'hr_min': 40,              # 心率最小值
    'hr_max': 180,             # 心率最大值
    'br_min': 8,               # 呼吸率最小值
    'br_max': 40,              # 呼吸率最大值
    'distance_max': 3.0        # 最大检测距离（米）
}
