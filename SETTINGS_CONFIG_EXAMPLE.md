# 设置配置示例

## 配置项说明

### 设备配置

#### 1. 设备 MAC (device_mac)
- **用途**: 设备的唯一硬件标识符
- **格式**: MAC 地址格式（例如：AA:BB:CC:DD:EE:FF）
- **是否必填**: 可选
- **默认值**: 自动生成（web_mac_随机字符串）
- **示例**:
  ```
  AA:BB:CC:DD:EE:FF
  00:11:22:33:44:55
  ```

#### 2. 设备 ID (device_id)
- **用途**: 客户端的唯一标识符，用于区分不同的客户端
- **格式**: 字符串
- **是否必填**: 可选
- **默认值**: 自动生成（web_client_时间戳）
- **示例**:
  ```
  web_client_001
  my_device_001
  tablet_kitchen
  ```

#### 3. 设备名称 (device_name)
- **用途**: 设备的显示名称，方便识别
- **格式**: 字符串（最长 50 字符）
- **是否必填**: 可选
- **默认值**: "Web客户端"
- **示例**:
  ```
  我的平板电脑
  厨房设备
  客厅智能音箱
  张三的手机
  ```

### 连接配置

#### 4. OTA 服务器 (ota_url)
- **用途**: OTA（Over-The-Air）服务器地址，用于设备配置和更新
- **格式**: HTTP/HTTPS URL
- **是否必填**: 可选（如果直接使用 WebSocket 地址）
- **默认值**: 空
- **示例**:
  ```
  http://127.0.0.1:8002/xiaozhi/ota/
  http://192.168.1.100:8002/xiaozhi/ota/
  https://ota.example.com/xiaozhi/ota/
  ```

#### 5. WebSocket 地址 (ws_url)
- **用途**: 语音通话功能的 WebSocket 服务器地址
- **格式**: WebSocket URL（ws:// 或 wss://）
- **是否必填**: 必填（使用语音通话功能时）
- **默认值**: 空
- **示例**:
  ```
  ws://localhost:8080
  ws://127.0.0.1:8080
  ws://192.168.1.100:8080
  wss://voice.example.com/ws
  ```

## 配置场景示例

### 场景 1：本地开发测试

```json
{
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "device_id": "dev_test_001",
  "device_name": "开发测试设备",
  "ota_url": "http://127.0.0.1:8002/xiaozhi/ota/",
  "ws_url": "ws://localhost:8080"
}
```

**说明**:
- 使用本地 localhost 地址
- 适合开发人员在本机测试
- 设备名称标识为测试设备

### 场景 2：局域网部署

```json
{
  "device_mac": "00:11:22:33:44:55",
  "device_id": "kitchen_tablet_001",
  "device_name": "厨房平板",
  "ota_url": "http://192.168.1.100:8002/xiaozhi/ota/",
  "ws_url": "ws://192.168.1.100:8080"
}
```

**说明**:
- 使用局域网 IP 地址
- 适合家庭或办公室内部网络
- 设备名称标识具体位置

### 场景 3：生产环境（HTTPS）

```json
{
  "device_mac": "AA:BB:CC:11:22:33",
  "device_id": "prod_client_001",
  "device_name": "生产客户端",
  "ota_url": "https://ota.example.com/xiaozhi/ota/",
  "ws_url": "wss://voice.example.com/ws"
}
```

**说明**:
- 使用 HTTPS 和 WSS 加密连接
- 适合生产环境部署
- 使用域名而非 IP 地址

### 场景 4：最小配置（仅语音通话）

```json
{
  "ws_url": "ws://localhost:8080"
}
```

**说明**:
- 只配置 WebSocket 地址
- 其他配置项使用默认值
- 适合快速测试语音通话功能

### 场景 5：多设备管理

#### 客厅设备
```json
{
  "device_mac": "AA:BB:CC:DD:EE:01",
  "device_id": "living_room_001",
  "device_name": "客厅智能音箱",
  "ws_url": "ws://192.168.1.100:8080"
}
```

#### 卧室设备
```json
{
  "device_mac": "AA:BB:CC:DD:EE:02",
  "device_id": "bedroom_001",
  "device_name": "卧室平板",
  "ws_url": "ws://192.168.1.100:8080"
}
```

#### 厨房设备
```json
{
  "device_mac": "AA:BB:CC:DD:EE:03",
  "device_id": "kitchen_001",
  "device_name": "厨房显示屏",
  "ws_url": "ws://192.168.1.100:8080"
}
```

**说明**:
- 每个设备有唯一的 MAC 地址和 ID
- 设备名称标识具体位置
- 所有设备连接到同一个服务器

## 配置验证

### 1. MAC 地址格式验证

正确格式：
```
AA:BB:CC:DD:EE:FF
00:11:22:33:44:55
FF-EE-DD-CC-BB-AA
```

错误格式：
```
AABBCCDDEEFF (缺少分隔符)
AA:BB:CC:DD:EE (不完整)
GG:HH:II:JJ:KK:LL (包含非法字符)
```

### 2. URL 格式验证

#### OTA URL
正确格式：
```
http://127.0.0.1:8002/xiaozhi/ota/
https://ota.example.com/xiaozhi/ota/
```

错误格式：
```
127.0.0.1:8002 (缺少协议)
ftp://127.0.0.1:8002 (错误的协议)
```

#### WebSocket URL
正确格式：
```
ws://localhost:8080
wss://voice.example.com/ws
```

错误格式：
```
localhost:8080 (缺少协议)
http://localhost:8080 (错误的协议)
```

## 配置存储

### 数据库存储位置
- **表**: users
- **字段**: preferences (JSON 格式)
- **示例**:
```json
{
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "device_id": "web_client_001",
  "device_name": "我的设备",
  "ota_url": "http://127.0.0.1:8002/xiaozhi/ota/",
  "ws_url": "ws://localhost:8080"
}
```

### API 端点
- **获取设置**: `GET /client/settings` (或 /guardian/settings, /gov/settings)
- **更新设置**: `PUT /client/settings` (或 /guardian/settings, /gov/settings)

## 常见问题

### Q1: 为什么需要配置设备 MAC 地址？
A: MAC 地址用于唯一标识设备，xiaozhi 服务器可以根据 MAC 地址识别不同的设备，实现设备管理和会话管理。

### Q2: 设备 ID 和设备 MAC 有什么区别？
A: 
- **设备 MAC**: 硬件级别的唯一标识符，通常不会改变
- **设备 ID**: 应用级别的标识符，可以自定义，方便管理

### Q3: 可以不配置 OTA 服务器吗？
A: 可以。如果直接使用 WebSocket 地址连接，OTA 服务器是可选的。

### Q4: WebSocket 地址必须配置吗？
A: 如果要使用语音通话功能，必须配置 WebSocket 地址。

### Q5: 配置保存后需要重启应用吗？
A: 不需要。配置保存后会触发 `settings-updated` 事件，应用会自动使用新配置。但如果正在通话中，需要重新连接才能使用新配置。

### Q6: 多个用户可以使用相同的设备配置吗？
A: 不建议。每个用户应该有独立的设备配置，以便服务器正确识别和管理。

### Q7: 如何重置配置？
A: 在设置对话框中清空所有字段并保存，系统会使用默认值。

## 安全建议

1. **生产环境使用 HTTPS/WSS**
   - 使用加密连接保护数据传输
   - 避免使用 HTTP/WS 在公网传输

2. **设备 ID 不要包含敏感信息**
   - 不要使用真实姓名、电话号码等
   - 使用抽象的标识符

3. **定期更新配置**
   - 如果服务器地址变更，及时更新配置
   - 定期检查配置是否正确

4. **备份配置**
   - 记录重要的配置信息
   - 方便在需要时恢复

## 技术参考

### Hello 握手消息格式
```json
{
  "type": "hello",
  "device_id": "web_client_001",
  "device_name": "我的设备",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "token": "",
  "features": {
    "mcp": false
  }
}
```

### 服务器响应格式
```json
{
  "type": "hello",
  "session_id": "session_12345",
  "status": "connected"
}
```

## 相关文档

- [语音通话功能集成指南](VOICE_CALL_INTEGRATION.md)
- [快速更新指南](UPDATE_VOICE_CALL.md)
- [故障排查指南](TROUBLESHOOTING.md)
