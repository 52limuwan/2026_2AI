# 毫米波呼吸心率监测 - 串口实时读取

## 📦 安装依赖

首先需要安装 pyserial 库：

```bash
pip install pyserial
```

## 🚀 快速开始

### 1. 快速测试（推荐先运行）

```bash
python quick_test.py
```

这个脚本会：
- 自动检测可用串口
- 连接并读取10秒数据
- 显示心率、呼吸率和距离

### 2. 完整实时监测

```bash
python BH_realtime_serial.py
```

按 `Ctrl+C` 停止监测

## ⚙️ 配置说明

### 修改串口号

如果自动检测的串口不对，可以修改 `serial_config.py`：

```python
SERIAL_CONFIG = {
    'port': 'COM3',        # 改成你的串口号
    'baudrate': 115200,    # 波特率
}
```

### 常见串口号

- Windows: `COM3`, `COM4`, `COM5` 等
- Linux: `/dev/ttyUSB0`, `/dev/ttyUSB1` 等
- Mac: `/dev/cu.usbserial-xxx`

### 查看串口号

**Windows:**
- 设备管理器 → 端口(COM和LPT)
- 或运行脚本自动检测

**Linux/Mac:**
```bash
ls /dev/tty*
```

## 📊 数据格式

每帧数据包含：
- **心率 (HR)**: 单位 BPM (次/分钟)
- **呼吸率 (BR)**: 单位 BPM (次/分钟)
- **距离 (distance)**: 单位 米
- **B波 (Bwave)**: 呼吸波形
- **H波 (Hwave)**: 心跳波形

## 🔧 常见问题

### 1. 找不到串口

- 检查USB线是否连接
- 检查驱动是否安装（CH340/CP2102等）
- Windows: 设备管理器查看是否有黄色感叹号

### 2. 连接失败

- 确认串口号正确
- 确认波特率正确（通常是115200）
- 关闭其他占用串口的程序

### 3. 没有数据输出

- 检查雷达是否上电
- 尝试调整波特率（9600, 115200, 256000）
- 检查数据线是否支持数据传输（不是只充电线）

### 4. 数据乱码

- 检查波特率设置
- 确认数据格式与雷达输出一致

## 💡 使用技巧

1. **先运行快速测试**: 确认能接收到数据
2. **调整显示**: 修改 `serial_config.py` 中的显示设置
3. **数据过滤**: 启用过滤功能去除异常值
4. **保存数据**: 可以重定向输出到文件

```bash
python BH_realtime_serial.py > data.txt
```

## 📝 代码说明

- `BH_realtime_serial.py`: 完整的实时监测程序
- `quick_test.py`: 快速测试脚本
- `serial_config.py`: 配置文件
- `BH_offline_data_process.py`: 原始离线数据处理（参考）
