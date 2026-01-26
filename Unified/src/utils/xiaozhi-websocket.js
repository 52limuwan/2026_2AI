// AI顾问 WebSocket 连接管理（基于 test 文件夹的实现）
import { useUserStore } from '../stores/user'
import { OpusEncoder, OpusDecoder } from './opus-encoder'

class XiaozhiWebSocket {
  constructor() {
    this.websocket = null
    this.isConnected = false
    this.currentSessionId = null
    this.isRemoteSpeaking = false
    this.messageHandlers = []
    this.connectionStateHandlers = []
    this.sessionStateHandlers = []
    this.audioDataHandlers = []
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.isVoiceMode = false // 是否为语音模式（默认为文本模式）
    
    // 音频录制相关
    this.isRecording = false
    this.isRecordingPaused = false // 录音是否暂停
    this.audioContext = null
    this.audioSource = null
    this.audioProcessor = null
    this.audioProcessorType = null // 'worklet' 或 'script'
    this.audioStream = null
    this.pcmDataBuffer = new Int16Array()
    this.opusEncoder = null // Opus 编码器
    this.opusDecoder = null // Opus 解码器
    
    // 音频播放相关
    this.audioQueue = []
    this.isPlayingAudio = false
    this.audioScheduledTime = 0 // 音频调度时间
    this.audioBufferQueue = [] // 音频缓冲队列
    
    // 日志标志
    this._hasLoggedFirstFrame = false // 是否已记录首次发送日志
    this._hasLoggedFirstPlayback = false // 是否已记录首次播放日志
  }

  // 连接到 WebSocket（通过 OTA 接口或直接连接）
  async connect(otaUrl, deviceConfig, directWsUrl = null) {
    try {
      let wsUrl
      
      // 如果提供了直接 WebSocket URL，跳过 OTA
      if (directWsUrl) {
        wsUrl = new URL(directWsUrl)
        
        // 添加设备认证参数
        wsUrl.searchParams.append('device-id', deviceConfig.deviceId)
        wsUrl.searchParams.append('client-id', deviceConfig.clientId)
        if (deviceConfig.token) {
          const token = deviceConfig.token.startsWith('Bearer ')
            ? deviceConfig.token
            : `Bearer ${deviceConfig.token}`
          wsUrl.searchParams.append('authorization', token)
        }
      } else {
        // 发送 OTA 请求获取 WebSocket 信息
        const otaResult = await this.sendOTA(otaUrl, deviceConfig)
        if (!otaResult || !otaResult.websocket || !otaResult.websocket.url) {
          throw new Error('无法从 OTA 服务器获取 WebSocket 信息')
        }

        // 构建 WebSocket URL
        wsUrl = new URL(otaResult.websocket.url)
        
        // 添加 token 参数
        if (otaResult.websocket.token) {
          const token = otaResult.websocket.token.startsWith('Bearer ')
            ? otaResult.websocket.token
            : `Bearer ${otaResult.websocket.token}`
          wsUrl.searchParams.append('authorization', token)
        }

        // 添加设备认证参数
        wsUrl.searchParams.append('device-id', deviceConfig.deviceId)
        wsUrl.searchParams.append('client-id', deviceConfig.clientId)
      }

      // 创建 WebSocket 连接
      this.websocket = new WebSocket(wsUrl.toString())
      this.websocket.binaryType = 'arraybuffer'

      // 设置事件处理器
      this.setupEventHandlers()

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('WebSocket 连接超时')
          this.websocket.close()
          reject(new Error('连接超时'))
        }, 30000) // 增加到 30 秒

        this.websocket.onopen = async () => {
          clearTimeout(timeout)
          this.isConnected = true
          this.reconnectAttempts = 0
          this.notifyConnectionState(true)
          console.log('WebSocket 已连接，准备发送 hello 握手')

          // 发送 hello 握手消息
          const success = await this.sendHelloMessage(deviceConfig)
          if (success) {
            console.log('握手成功，连接建立完成')
            resolve(true)
          } else {
            console.error('握手失败')
            reject(new Error('握手失败'))
          }
        }

        this.websocket.onerror = (error) => {
          clearTimeout(timeout)
          console.error('WebSocket 连接错误:', error)
          reject(error)
        }
      })
    } catch (error) {
      console.error('连接失败:', error)
      throw error
    }
  }

  // 发送 OTA 请求
  async sendOTA(otaUrl, deviceConfig) {
    try {
      const response = await fetch(otaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Device-Id': deviceConfig.deviceId,
          'Client-Id': deviceConfig.clientId
        },
        body: JSON.stringify({
          version: 0,
          uuid: '',
          application: {
            name: 'xiaozhi-web-client',
            version: '1.0.0',
            compile_time: new Date().toISOString(),
            idf_version: '4.4.3',
            elf_sha256: '1234567890abcdef1234567890abcdef1234567890abcdef'
          },
          ota: { label: 'xiaozhi-web-client' },
          board: {
            type: 'xiaozhi-web-client',
            ssid: 'web-client',
            rssi: 0,
            channel: 0,
            ip: '192.168.1.1',
            mac: deviceConfig.deviceMac
          },
          flash_size: 0,
          minimum_free_heap_size: 0,
          mac_address: deviceConfig.deviceMac,
          chip_model_name: 'web',
          chip_info: { model: 0, cores: 0, revision: 0, features: 0 },
          partition_table: []
        })
      })

      if (!response.ok) {
        throw new Error(`OTA 请求失败: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('OTA 请求错误:', error)
      throw error
    }
  }

  // 发送 hello 握手消息
  async sendHelloMessage(deviceConfig) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      const helloMessage = {
        type: 'hello',
        device_id: deviceConfig.deviceId,
        device_name: deviceConfig.deviceName,
        device_mac: deviceConfig.deviceMac,
        token: deviceConfig.token || '',
        features: {
          mcp: false // 前端不需要 MCP 功能
        }
      }

      this.websocket.send(JSON.stringify(helloMessage))

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('等待 hello 响应超时')
          resolve(false)
        }, 5000)

        const onMessageHandler = (event) => {
          try {
            const response = JSON.parse(event.data)
            if (response.type === 'hello' && response.session_id) {
              console.log('服务器握手成功，会话ID:', response.session_id)
              this.currentSessionId = response.session_id
              clearTimeout(timeout)
              this.websocket.removeEventListener('message', onMessageHandler)
              resolve(true)
            }
          } catch (e) {
            // 忽略非 JSON 消息
          }
        }

        this.websocket.addEventListener('message', onMessageHandler)
      })
    } catch (error) {
      console.error('发送 hello 消息错误:', error)
      return false
    }
  }

  // 设置事件处理器
  setupEventHandlers() {
    this.websocket.onclose = () => {
      console.log('WebSocket 连接已关闭')
      this.isConnected = false
      this.notifyConnectionState(false)
      this.attemptReconnect()
    }

    this.websocket.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      this.isConnected = false
      this.notifyConnectionState(false)
    }

    this.websocket.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data)
          this.handleTextMessage(message)
        } else {
          this.handleBinaryMessage(event.data)
        }
      } catch (error) {
        console.error('消息处理错误:', error)
      }
    }
  }

  // 处理文本消息
  handleTextMessage(message) {
    console.log('收到消息:', message)

    // 通知所有消息处理器
    this.messageHandlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('消息处理器错误:', error)
      }
    })

    // 处理 TTS 消息 - 控制录音状态
    if (message.type === 'tts') {
      if (message.state === 'start') {
        // AI 开始说话，暂停录音
        this.isRemoteSpeaking = true
        this.notifySessionState(true)
        
        // 如果正在录音且处于语音模式，暂停录音
        if (this.isRecording && this.isVoiceMode) {
          console.log('AI 开始说话，暂停录音')
          this.pauseRecording()
        }
      } else if (message.state === 'stop') {
        // AI 说话结束，清空音频缓冲并恢复录音
        this.isRemoteSpeaking = false
        this.notifySessionState(false)
        
        // 清空所有音频缓冲
        console.log('AI 说话结束，清空音频缓冲')
        this.clearAllAudio()
        
        // 如果处于语音模式且之前暂停了录音，恢复录音
        if (this.isVoiceMode && this.isRecordingPaused) {
          console.log('恢复录音')
          this.resumeRecording()
        }
      }
    }
  }

  // 处理二进制消息（音频数据）
  async handleBinaryMessage(data) {
    // 如果不是语音模式，忽略音频数据
    if (!this.isVoiceMode) {
      return
    }
    
    try {
      let arrayBuffer
      if (data instanceof ArrayBuffer) {
        arrayBuffer = data
      } else if (data instanceof Blob) {
        arrayBuffer = await data.arrayBuffer()
      } else {
        console.warn('未知的二进制数据类型:', typeof data)
        return
      }

      const audioData = new Uint8Array(arrayBuffer)
      
      // 播放接收到的音频数据
      if (audioData.length > 0) {
        this.playAudioData(audioData)
      }
      
      // 通知所有音频数据处理器
      this.audioDataHandlers.forEach(handler => {
        try {
          handler(audioData)
        } catch (error) {
          console.error('音频数据处理器错误:', error)
        }
      })
    } catch (error) {
      console.error('处理二进制消息错误:', error)
    }
  }
  
  // 播放音频数据（Opus 解码后播放）
  async playAudioData(audioData) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000
        })
      }
      
      // 恢复音频上下文
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      
      // 初始化 Opus 解码器
      if (!this.opusDecoder) {
        this.opusDecoder = new OpusDecoder()
        await this.opusDecoder.init()
      }
      
      // 解码 Opus 数据为 PCM
      const pcmData = this.opusDecoder.decode(audioData)
      
      if (pcmData.length === 0) {
        return
      }
      
      // 转换为 Float32Array
      const float32Data = new Float32Array(pcmData.length)
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0
      }
      
      // 创建音频缓冲区
      const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 16000)
      audioBuffer.getChannelData(0).set(float32Data)
      
      // 添加到播放队列
      this.audioBufferQueue.push(audioBuffer)
      
      // 如果没有正在播放，开始播放
      if (!this.isPlayingAudio) {
        this.isPlayingAudio = true
        this.audioScheduledTime = this.audioContext.currentTime
        this.playNextBuffer()
      }
      
      // 只在首次播放时记录日志
      if (!this._hasLoggedFirstPlayback) {
        console.log(`开始播放 AI 语音（解码后：${pcmData.length} 采样点）`)
        this._hasLoggedFirstPlayback = true
      }
    } catch (error) {
      console.error('播放音频错误:', error)
    }
  }
  
  // 播放下一个缓冲区
  playNextBuffer() {
    if (this.audioBufferQueue.length === 0) {
      this.isPlayingAudio = false
      return
    }
    
    const audioBuffer = this.audioBufferQueue.shift()
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.audioContext.destination)
    
    // 计算播放时间，确保连续播放
    const now = this.audioContext.currentTime
    const playTime = Math.max(now, this.audioScheduledTime)
    
    source.start(playTime)
    
    // 更新下一个音频的调度时间
    this.audioScheduledTime = playTime + audioBuffer.duration
    
    // 在当前音频播放完成后播放下一个
    source.onended = () => {
      this.playNextBuffer()
    }
  }

  // 发送文本消息
  sendTextMessage(text) {
    if (!text || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      // 如果对方正在说话，先发送打断消息
      if (this.isRemoteSpeaking && this.currentSessionId) {
        const abortMessage = {
          session_id: this.currentSessionId,
          type: 'abort',
          reason: 'user_interrupt'
        }
        this.websocket.send(JSON.stringify(abortMessage))
      }

      // 发送文本消息
      const listenMessage = {
        type: 'listen',
        mode: 'manual',
        state: 'detect',
        text: text
      }

      this.websocket.send(JSON.stringify(listenMessage))
      console.log('发送文本消息:', text)
      return true
    } catch (error) {
      console.error('发送消息错误:', error)
      return false
    }
  }

  // 发送音频数据
  sendAudioData(audioData) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      this.websocket.send(audioData)
      return true
    } catch (error) {
      console.error('发送音频数据错误:', error)
      return false
    }
  }

  // 开始录音会话
  startAudioSession() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      const message = {
        type: 'listen',
        mode: 'manual',
        state: 'start'
      }
      this.websocket.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('开始录音会话错误:', error)
      return false
    }
  }

  // 结束录音会话
  stopAudioSession() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      const message = {
        type: 'listen',
        mode: 'manual',
        state: 'stop'
      }
      this.websocket.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('结束录音会话错误:', error)
      return false
    }
  }

  // 断开连接
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // 停止录音
    this.stopRecording()

    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    this.isConnected = false
    this.currentSessionId = null
    this.isRemoteSpeaking = false
    this.notifyConnectionState(false)
  }

  // 尝试重连
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连')
      return
    }

    if (this.reconnectTimer) {
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    console.log(`将在 ${delay}ms 后尝试重连...`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectAttempts++
      // 重连逻辑需要外部提供配置
      console.log('需要外部触发重连')
    }, delay)
  }

  // 注册消息处理器
  onMessage(handler) {
    this.messageHandlers.push(handler)
    return () => {
      const index = this.messageHandlers.indexOf(handler)
      if (index > -1) {
        this.messageHandlers.splice(index, 1)
      }
    }
  }

  // 注册连接状态处理器
  onConnectionStateChange(handler) {
    this.connectionStateHandlers.push(handler)
    return () => {
      const index = this.connectionStateHandlers.indexOf(handler)
      if (index > -1) {
        this.connectionStateHandlers.splice(index, 1)
      }
    }
  }

  // 注册会话状态处理器
  onSessionStateChange(handler) {
    this.sessionStateHandlers.push(handler)
    return () => {
      const index = this.sessionStateHandlers.indexOf(handler)
      if (index > -1) {
        this.sessionStateHandlers.splice(index, 1)
      }
    }
  }

  // 注册音频数据处理器
  onAudioData(handler) {
    this.audioDataHandlers.push(handler)
    return () => {
      const index = this.audioDataHandlers.indexOf(handler)
      if (index > -1) {
        this.audioDataHandlers.splice(index, 1)
      }
    }
  }

  // 通知连接状态变化
  notifyConnectionState(isConnected) {
    this.connectionStateHandlers.forEach(handler => {
      try {
        handler(isConnected)
      } catch (error) {
        console.error('连接状态处理器错误:', error)
      }
    })
  }

  // 通知会话状态变化
  notifySessionState(isActive) {
    this.sessionStateHandlers.forEach(handler => {
      try {
        handler(isActive)
      } catch (error) {
        console.error('会话状态处理器错误:', error)
      }
    })
  }

  // 获取连接状态
  getConnectionState() {
    return this.isConnected
  }

  // 获取会话状态
  getSessionState() {
    return this.isRemoteSpeaking
  }
  
  // 设置语音模式
  setVoiceMode(enabled) {
    this.isVoiceMode = enabled
    console.log(`语音模式: ${enabled ? '开启' : '关闭'}`)
  }
  
  // 获取语音模式状态
  getVoiceMode() {
    return this.isVoiceMode
  }
  
  // 创建音频处理器（优先使用 AudioWorklet）
  async createAudioProcessor() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      })
    }
    
    try {
      // 尝试使用 AudioWorklet
      await this.audioContext.audioWorklet.addModule('/audio-processor.js')
      
      const workletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor')
      
      // 监听来自 worklet 的消息
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audiodata') {
          this.processPCMBuffer(event.data.buffer)
        }
      }
      
      // 连接到静音输出（避免回声）
      const silent = this.audioContext.createGain()
      silent.gain.value = 0
      workletNode.connect(silent)
      silent.connect(this.audioContext.destination)
      
      console.log('使用 AudioWorklet 处理音频')
      return { node: workletNode, type: 'worklet' }
      
    } catch (error) {
      // AudioWorklet 不可用，回退到 ScriptProcessor
      console.warn('AudioWorklet 不可用，使用 ScriptProcessor:', error.message)
      return this.createScriptProcessor()
    }
  }
  
  // 创建 ScriptProcessor（回退方案）
  createScriptProcessor() {
    const bufferSize = 4096
    const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)
    
    processor.onaudioprocess = (event) => {
      if (!this.isRecording) return
      
      const input = event.inputBuffer.getChannelData(0)
      const buffer = new Int16Array(input.length)
      
      // 转换为 16-bit PCM
      for (let i = 0; i < input.length; i++) {
        buffer[i] = Math.max(-32768, Math.min(32767, Math.floor(input[i] * 32767)))
      }
      
      this.processPCMBuffer(buffer)
    }
    
    // 连接到静音输出（避免回声）
    const silent = this.audioContext.createGain()
    silent.gain.value = 0
    processor.connect(silent)
    silent.connect(this.audioContext.destination)
    
    console.log('使用 ScriptProcessor 处理音频（已废弃）')
    return { node: processor, type: 'script' }
  }
  
  // 处理 PCM 缓冲数据
  processPCMBuffer(buffer) {
    if (!this.isRecording || this.isRecordingPaused) return
    
    // 将新数据添加到缓冲区
    const newBuffer = new Int16Array(this.pcmDataBuffer.length + buffer.length)
    newBuffer.set(this.pcmDataBuffer)
    newBuffer.set(buffer, this.pcmDataBuffer.length)
    this.pcmDataBuffer = newBuffer
    
    // 每 960 个采样点（60ms @ 16kHz）发送一次
    const samplesPerFrame = 960
    
    while (this.pcmDataBuffer.length >= samplesPerFrame) {
      const frameData = this.pcmDataBuffer.slice(0, samplesPerFrame)
      this.pcmDataBuffer = this.pcmDataBuffer.slice(samplesPerFrame)
      
      // 发送所有数据，让 Opus DTX 处理静音
      this.sendPCMFrame(frameData)
    }
  }
  
  // 发送 PCM 帧（使用 Opus 编码）
  sendPCMFrame(pcmData) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return
    }
    
    try {
      // 使用 Opus 编码
      const opusData = this.opusEncoder.encode(pcmData)
      
      // 发送 Opus 数据
      this.websocket.send(opusData.buffer)
      // 只在首次发送时记录日志
      if (!this._hasLoggedFirstFrame) {
        console.log(`开始发送 Opus 音频帧（大小：${opusData.length} 字节）`)
        this._hasLoggedFirstFrame = true
      }
    } catch (error) {
      console.error('Opus 编码错误:', error)
    }
  }
  
  // 开始录音
  async startRecording() {
    if (this.isRecording) {
      console.log('已在录音中')
      return true
    }
    
    try {
      // 如果 AI 正在说话，发送打断消息
      if (this.isRemoteSpeaking && this.currentSessionId) {
        const abortMessage = {
          session_id: this.currentSessionId,
          type: 'abort',
          reason: 'user_interrupt'
        }
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify(abortMessage))
          console.log('发送打断消息')
        }
      }
      
      // 初始化 Opus 编码器
      if (!this.opusEncoder) {
        this.opusEncoder = new OpusEncoder()
        await this.opusEncoder.init()
      }
      
      // 请求麦克风权限
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1
        }
      })
      
      // 创建音频上下文
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000
        })
      }
      
      // 恢复音频上下文（如果被暂停）
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      
      // 创建音频处理器
      const processorResult = await this.createAudioProcessor()
      this.audioProcessor = processorResult.node
      this.audioProcessorType = processorResult.type
      
      // 创建音频源
      this.audioSource = this.audioContext.createMediaStreamSource(this.audioStream)
      
      // 连接音频流
      this.audioSource.connect(this.audioProcessor)
      
      // 重置缓冲区
      this.pcmDataBuffer = new Int16Array()
      
      // 重置日志标志
      this._hasLoggedFirstFrame = false
      
      // 标记为录音中
      this.isRecording = true
      
      // 如果使用 AudioWorklet，发送开始命令
      if (this.audioProcessorType === 'worklet') {
        this.audioProcessor.port.postMessage({ command: 'start' })
      }
      
      // 发送 listen start 消息
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const listenMessage = {
          type: 'listen',
          mode: 'manual',
          state: 'start'
        }
        this.websocket.send(JSON.stringify(listenMessage))
        console.log('发送录音开始消息')
      }
      
      console.log('开始录音')
      return true
      
    } catch (error) {
      console.error('启动录音失败:', error)
      return false
    }
  }
  
  // 停止录音
  stopRecording() {
    if (!this.isRecording) {
      return
    }
    
    try {
      this.isRecording = false
      this.isRecordingPaused = false
      
      // 如果使用 AudioWorklet，发送停止命令
      if (this.audioProcessorType === 'worklet' && this.audioProcessor) {
        this.audioProcessor.port.postMessage({ command: 'stop' })
      }
      
      // 发送剩余的数据
      if (this.pcmDataBuffer.length > 0) {
        // 填充到 960 采样点
        const samplesPerFrame = 960
        if (this.pcmDataBuffer.length < samplesPerFrame) {
          const paddedBuffer = new Int16Array(samplesPerFrame)
          paddedBuffer.set(this.pcmDataBuffer)
          this.sendPCMFrame(paddedBuffer)
        } else {
          this.sendPCMFrame(this.pcmDataBuffer)
        }
        this.pcmDataBuffer = new Int16Array()
      }
      
      // 发送空帧表示结束
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(new Uint8Array(0))
        
        // 发送 listen stop 消息
        const stopMessage = {
          type: 'listen',
          mode: 'manual',
          state: 'stop'
        }
        this.websocket.send(JSON.stringify(stopMessage))
        console.log('发送录音停止消息')
      }
      
      // 断开音频连接
      if (this.audioSource) {
        this.audioSource.disconnect()
        this.audioSource = null
      }
      
      if (this.audioProcessor) {
        this.audioProcessor.disconnect()
        this.audioProcessor = null
      }
      
      // 停止媒体流
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop())
        this.audioStream = null
      }
      
      // 清理编码器
      if (this.opusEncoder) {
        this.opusEncoder.destroy()
        this.opusEncoder = null
      }
      
      console.log('停止录音')
      
    } catch (error) {
      console.error('停止录音错误:', error)
    }
  }
  
  // 暂停录音（AI 说话时）
  pauseRecording() {
    if (!this.isRecording || this.isRecordingPaused) {
      return
    }
    
    this.isRecordingPaused = true
    console.log('录音已暂停')
  }
  
  // 恢复录音（AI 说话结束后）
  resumeRecording() {
    if (!this.isRecording || !this.isRecordingPaused) {
      return
    }
    
    this.isRecordingPaused = false
    console.log('录音已恢复')
  }
  
  // 清空所有音频缓冲
  clearAllAudio() {
    console.log('清空所有音频缓冲')
    this.audioBufferQueue = []
    this.isPlayingAudio = false
    this.audioScheduledTime = 0
  }
}

// 创建多个独立的实例（按角色类型）
const wsInstances = {
  client: null,
  guardian: null,
  gov: null
}

export function getXiaozhiWebSocket(roleType = 'client') {
  if (!wsInstances[roleType]) {
    wsInstances[roleType] = new XiaozhiWebSocket()
  }
  return wsInstances[roleType]
}

// 获取设备配置
export function getDeviceConfig() {
  const userStore = useUserStore()
  const userId = String(userStore.profile?.id || 'unknown')
  const userName = userStore.profile?.name || '用户'
  
  return {
    deviceId: `web_${userId}`,
    clientId: `web_client_${userId}`,
    deviceMac: `00:00:00:00:00:${userId.slice(-2).padStart(2, '0')}`,
    deviceName: `${userName}的设备`,
    token: userStore.token || ''
  }
}

// 根据端类型获取 OTA URL
export function getOtaUrl(roleType) {
  switch (roleType) {
    case 'client':
      return import.meta.env.VITE_CLIENT_OTA_URL || 'http://127.0.0.1:8002/xiaozhi/ota/'
    case 'guardian':
      return import.meta.env.VITE_GUARDIAN_OTA_URL || 'http://127.0.0.1:8002/xiaozhi/ota/'
    case 'gov':
      return import.meta.env.VITE_GOV_OTA_URL || 'http://127.0.0.1:8002/xiaozhi/ota/'
    default:
      return import.meta.env.VITE_CLIENT_OTA_URL || 'http://127.0.0.1:8002/xiaozhi/ota/'
  }
}

// 根据端类型获取 WebSocket URL（如果直接配置了 WS URL，则不使用 OTA）
export function getWebSocketUrl(roleType) {
  switch (roleType) {
    case 'client':
      return import.meta.env.VITE_CLIENT_WS_URL || ''
    case 'guardian':
      return import.meta.env.VITE_GUARDIAN_WS_URL || ''
    case 'gov':
      return import.meta.env.VITE_GOV_WS_URL || ''
    default:
      return ''
  }
}

// 默认 OTA URL（已废弃，保留向后兼容）
export const DEFAULT_OTA_URL = import.meta.env.VITE_OTA_URL || 'http://127.0.0.1:8002/xiaozhi/ota/'
