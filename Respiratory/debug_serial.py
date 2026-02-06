"""
调试版本 - 查看原始数据
"""
import serial
import serial.tools.list_ports

def list_ports():
    """列出所有可用串口"""
    ports = serial.tools.list_ports.comports()
    print("\n可用串口:")
    for i, port in enumerate(ports, 1):
        print(f"  {i}. {port.device} - {port.description}")
    return [p.device for p in ports]

def debug_serial(port, baudrate=921600):
    """调试串口 - 显示原始数据"""
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        print(f"\n✅ 已连接到 {port}, 波特率: {baudrate}")
        print("等待数据...\n")
        
        import time
        for i in range(50):  # 5秒
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting)
                hex_str = ' '.join([f'{b:02X}' for b in data])
                print(f"[{i}] 收到 {len(data)} 字节: {hex_str}")
            time.sleep(0.1)
        
        ser.close()
        print("\n✅ 调试完成")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    ports = list_ports()
    
    if not ports:
        print("未找到串口设备")
        exit(1)
    
    print(f"\n使用串口: {ports[0]}")
    print("尝试波特率: 921600")
    debug_serial(ports[0], 921600)
