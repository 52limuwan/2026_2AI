import struct

# 原始十六进制数据（已去除空格）
hex_data = "A8A8A8A816A56EBF385FFCBD8DB05C415D2E9742CDCC0C3FA7C1B142B6B6B6B6A8A8A8A8B1A180BF81192CBDDDB05C415D2E9742CDCC0C3FFFC5B142B6B6B6B6A8A8A8A86D6187BFDF7E2B3D8DB05C415D2E9742CDCC0C3FF3D5B142B6B6B6B6A8A8A8A8C02B8DBF5FF9FE3D8DB05C415D2E9742CDCC0C3F18E9B142B6B6B6B6A8A8A8A89C8D96BFFF9E1F3E8DB05C415D2E9742CDCC0C3FC7D3B142B6B6B6B6A8A8A8A8C18E9BBF72FC993ED11F55413277A142CDCC0C3F8860BB42B6B6B6B6A8A8A8A86D7599BFD7BB153FD11F55413277A1420000003FCEE0BB42B6B6B6B6A8A8A8A8B9989ABF11474A3FD11F55413277A1420000003F5745BC42B6B6B6B6A8A8A8A89AC49BBFFD71593FD11F55413277A1420000003FFE5EBC42B6B6B6B6A8A8A8A8D93D9ABF5F2B503FD11F55413277A1420000003F8C52BC42B6B6B6B6A8A8A8A8D8F896BFCF1C1F3FD11F55413277A1420000003F82FDBB42B6B6B6B6A8A8A8A80F7391BF1D0F923ED11F55413277A1420000003F6F67BB42B6B6B6B6A8A8A8A8F1838BBF82B309BED11F55413277A1420000003F43A8BA42B6B6B6B6A8A8A8A8848784BF48CF0BBFD11F55413277A1420000003F70F1B942B6B6B6B6A8A8A8A812C076BFCFDB59BFD11F55413277A1420000003FF479B942B6B6B6B6A8A8A8A8538C61BF211E7DBFE2B6574198EE9E420000003F1F28B742B6B6B6B6A8A8A8A8AA8447BF64F66DBFE2B6574198EE9E420000003F7E7AB742B6B6B6B6A8A8A8A8F0AC28BF1DB836BFE2B6574198EE9E420000003FAA26B842B6B6B6B6A8A8A8A85EFB14BF8949BCBEE2B6574198EE9E420000003F34FFB842B6B6B6B6"

# 转换为字节串
data = bytes.fromhex(hex_data)

def parse_radar_frames(raw_data):
    """解析多帧雷达数据"""
    frames = []
    pos = 0
    frame_size = 36  # 4(头)+28(数据)+4(尾)
    
    while pos + frame_size <= len(raw_data):
        # 检查帧头和帧尾
        if raw_data[pos:pos+4] != b'\xa8\xa8\xa8\xa8':
            pos += 1
            continue
        if raw_data[pos+32:pos+36] != b'\xb6\xb6\xb6\xb6':
            pos += 1
            continue
        
        # 提取28字节有效载荷（7个float）
        payload = raw_data[pos+4:pos+32]
        
        # 解析5个关键参数（小端序float）
        Bwave = struct.unpack('<f', payload[0:4])[0]
        Hwave = struct.unpack('<f', payload[4:8])[0]
        BR = struct.unpack('<f', payload[8:12])[0]  # 呼吸率
        HR = struct.unpack('<f', payload[12:16])[0]  # 心率
        distance = struct.unpack('<f', payload[16:20])[0]  # 距离
        
        frames.append({
            'Bwave': Bwave,
            'Hwave': Hwave,
            'BR': BR,
            'HR': HR,
            'distance': distance
        })
        
        pos += frame_size  # 跳到下一帧
    
    return frames

# 执行解析
frames = parse_radar_frames(data)

# 输出结果
print(f"✅ 成功解析 {len(frames)} 帧数据\n")
print(f"{'帧序号':<6} {'心率(BPM)':<12} {'呼吸率(BPM)':<13} {'距离(m)':<10} {'B波':<10} {'H波':<10}")
print("-" * 55)
for i, f in enumerate(frames, 1):
    print(f"{i:<6} {f['HR']:<12.1f} {f['BR']:<13.1f} {f['distance']:<10.2f} {f['Bwave']:<10.2f} {f['Hwave']:<10.2f}")