# 防跌倒监护系统

基于雷达检测和 Web 平板的老人跌倒监护系统。

## 系统组成

### 检测端（服务器）
- `voice_alarm_server_simple.py` - 雷达检测服务器
- 功能：连接雷达设备，检测跌倒事件，通过 WebSocket 广播警报

### 监护端（Web 平板）
- `tablet_os.html` - 平板系统界面
- `tablet_app.js` - 平板应用逻辑
- `tablet_styles.css` - 平板样式
- 功能：接收警报，来电界面，TTS 语音播报

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动检测端

双击运行：
```
启动检测端_简化版.bat
```

或命令行：
```bash
python voice_alarm_server_simple.py
```

### 3. 打开监护端

用浏览器打开 `tablet_os.html`

默认连接到 `localhost:8765`

## 配置说明

### 修改检测端地址

1. 打开平板界面
2. 点击"系统设置"图标
3. 修改服务器地址和端口
4. 点击"保存并重连"

### 测试警报

在检测端控制台输入：
```
test
```

## 系统特性

### 检测端
- 雷达实时监测
- 可视化界面显示
- WebSocket 实时通信
- 测试模式（无雷达时可用）
- 简洁的日志输出
- 支持 Ctrl+C 退出

### 监护端
- Fluent Design 设计语言
- 仿真平板系统界面
- 来电界面（仿 Android 风格）
- 浏览器内置 TTS 语音播报
- 自定义服务器配置
- 8 个桌面应用图标

## 警报流程

1. 检测端检测到跌倒 → 发送警报
2. 监护端收到警报 → 显示来电界面
3. 用户接听 → 播放警报音 2 秒
4. 播放 TTS 语音 × 3 次
5. 自动挂断

## 文件说明

```
Drop-resistant/
├── Picture/                        # 壁纸资源
│   ├── Fluent-1.png
│   ├── Fluent-2.png
│   ├── Fluent-3.jpg
│   ├── Fluent-4.jpg
│   ├── Fluent-5.png
│   ├── Fluent-6.jpg
│   ├── Fluent-7.png
│   └── Fluent-8.png
├── voice_alarm_server_simple.py    # 检测端服务器
├── tablet_os.html                  # 平板界面
├── tablet_app.js                   # 平板逻辑
├── tablet_styles.css               # 平板样式
├── aviation-alarm.mp3              # 警报音
├── requirements.txt                # Python 依赖
├── 启动检测端_简化版.bat           # 启动脚本
├── 简化版日志更新说明.md           # 更新说明
└── README.md                       # 使用文档
```

## 技术栈

- Python 3.x
- WebSocket (websockets)
- matplotlib (可视化)
- pyserial (雷达通信)
- Web Speech API (TTS)
- Fluent Design (UI)

## 注意事项

1. 检测端需要 Python 环境
2. 监护端需要现代浏览器（支持 WebSocket 和 Web Speech API）
3. 局域网使用时，需要在监护端配置检测端的 IP 地址
4. 测试模式下可以使用 `test` 命令手动触发警报

## 命令说明

检测端控制台命令：
- `test` - 发送测试警报
- `status` - 查看系统状态
- `clients` - 查看连接数
- `history` - 查看报警历史
- `quit` / `exit` / `q` - 退出程序

## 版本信息

- 版本：v2.0 简化版
- 更新日期：2026-02-24
- 特点：简洁日志、优雅退出、Web 平板界面
