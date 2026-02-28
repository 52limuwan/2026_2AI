// Xiaozhi WebSocket 语音通话工具
// 基于 test 文件夹中的实现，简化为 Vue 组件可用的版本

import { getUserSettings as getClientSettings } from '@/api/client';
import { getUserSettings as getGuardianSettings } from '@/api/guardian';
import { getUserSettings as getGovSettings } from '@/api/gov';

// 获取 Opus Module 实例
function getOpusModule() {
  try {
    // 检查 Module 是否存在
    if (typeof Module === 'undefined') {
      return null;
    }

    // 尝试使用 Module.instance（libopus.js 最后一行导出方式）
    if (typeof Module.instance !== 'undefined' && typeof Module.instance._opus_encoder_get_size === 'function') {
      return Module.instance;
    }

    // 如果没有 Module.instance，检查全局 Module
    if (typeof Module._opus_encoder_get_size === 'function') {
      return Module;
    }

    return null;
  } catch (err) {
    console.error('获取 Opus Module 失败:', err);
    return null;
  }
}

// 根据角色获取用户设置
async function getUserSettingsByRole(role) {
  try {
    let getSettings;
    if (role === 'guardian') {
      getSettings = getGuardianSettings;
    } else if (role === 'gov') {
      getSettings = getGovSettings;
    } else {
      getSettings = getClientSettings;
    }
    
    const res = await getSettings();
    console.log('xiaozhi-websocket 获取设置响应:', res);
    console.log('res.data:', res.data);
    
    // 注意：API返回的是Axios响应，实际数据在res.data中
    const apiResponse = res.data;
    
    if (apiResponse.code === 0 && apiResponse.data?.settings) {
      console.log('成功获取用户设置:', apiResponse.data.settings);
      return apiResponse.data.settings;
    } else {
      console.error('获取设置失败，响应码:', apiResponse.code);
      return null;
    }
  } catch (error) {
    console.error('获取用户设置失败:', error);
  }
  return null;
}

class AudioRecorder {
  constructor() {
    this.isRecording = false;
    this.audioContext = null;
    this.audioProcessor = null;
    this.audioWorkletNode = null;
    this.audioSource = null;
    this.opusEncoder = null;
    this.pcmDataBuffer = new Int16Array();
    this.websocket = null;
    this.useWorklet = false; // 是否使用 AudioWorklet
  }

  setWebSocket(ws) {
    this.websocket = ws;
  }

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
    }
    return this.audioContext;
  }

  async start() {
    if (this.isRecording) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      this.audioContext = this.getAudioContext();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.audioSource = this.audioContext.createMediaStreamSource(stream);
      
      // 尝试使用 AudioWorklet（现代方式）
      try {
        if (this.audioContext.audioWorklet) {
          await this.audioContext.audioWorklet.addModule('/audio-recorder-processor.js');
          this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
          
          // 监听来自 worklet 的消息
          this.audioWorkletNode.port.onmessage = (event) => {
            if (!this.isRecording) return;
            const buffer = new Int16Array(event.data);
            this.processPCMBuffer(buffer);
          };
          
          this.audioSource.connect(this.audioWorkletNode);
          this.audioWorkletNode.connect(this.audioContext.destination);
          this.useWorklet = true;
          console.log('使用 AudioWorklet 录音');
        }
      } catch (workletError) {
        console.warn('AudioWorklet 不可用，使用 ScriptProcessor:', workletError);
        this.useWorklet = false;
      }
      
      // 如果 AudioWorklet 不可用，回退到 ScriptProcessor
      if (!this.useWorklet) {
        const bufferSize = 4096;
        this.audioProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        this.audioProcessor.onaudioprocess = (event) => {
          if (!this.isRecording) return;
          
          const input = event.inputBuffer.getChannelData(0);
          const buffer = new Int16Array(input.length);
          
          for (let i = 0; i < input.length; i++) {
            buffer[i] = Math.max(-32768, Math.min(32767, Math.floor(input[i] * 32767)));
          }
          
          this.processPCMBuffer(buffer);
        };

        this.audioSource.connect(this.audioProcessor);
        this.audioProcessor.connect(this.audioContext.destination);
        console.log('使用 ScriptProcessor 录音');
      }

      this.pcmDataBuffer = new Int16Array();
      this.isRecording = true;

      console.log('录音已开始');
      return true;
    } catch (error) {
      console.error('启动录音失败:', error);
      this.isRecording = false;
      return false;
    }
  }

  processPCMBuffer(buffer) {
    if (!this.isRecording) return;

    const newBuffer = new Int16Array(this.pcmDataBuffer.length + buffer.length);
    newBuffer.set(this.pcmDataBuffer);
    newBuffer.set(buffer, this.pcmDataBuffer.length);
    this.pcmDataBuffer = newBuffer;

    const samplesPerFrame = 960; // 60ms @ 16kHz
    while (this.pcmDataBuffer.length >= samplesPerFrame) {
      const frameData = this.pcmDataBuffer.slice(0, samplesPerFrame);
      this.pcmDataBuffer = this.pcmDataBuffer.slice(samplesPerFrame);
      this.sendPCMData(frameData);
    }
  }

  sendPCMData(pcmData) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // 获取 Opus Module
      const mod = getOpusModule();
      
      if (!mod) {
        // Opus 不可用，直接发送 PCM（服务器应该能处理）
        console.warn('⚠️ Opus 编码器不可用，发送 PCM 数据');
        this.websocket.send(pcmData.buffer);
        return;
      }
      
      // 使用 Opus 编码
      try {
        // 初始化 Opus 编码器（如果还没有）
        if (!this.opusEncoder) {
          const encoderSize = mod._opus_encoder_get_size(1); // 单声道
          const encoderPtr = mod._malloc(encoderSize);
          
          // 使用正确的参数：16kHz, 单声道, VOIP应用
          const err = mod._opus_encoder_init(encoderPtr, 16000, 1, 2048);
          
          if (err === 0) {
            // 设置编码器参数以提高质量
            mod._opus_encoder_ctl(encoderPtr, 4002, 64000); // 设置比特率为 64kbps
            mod._opus_encoder_ctl(encoderPtr, 4010, 10); // 设置复杂度为 10（最高质量）
            
            this.opusEncoder = {
              ptr: encoderPtr,
              mod: mod
            };
            console.log('✅ Opus 编码器初始化成功，比特率: 64kbps');
          } else {
            console.error('❌ Opus 编码器初始化失败:', err);
            this.opusEncoder = null;
          }
        }
        
        // 编码并发送
        if (this.opusEncoder) {
          const pcmPtr = mod._malloc(pcmData.length * 2);
          
          // 使用 HEAP16 复制数据
          for (let i = 0; i < pcmData.length; i++) {
            mod.HEAP16[(pcmPtr >> 1) + i] = pcmData[i];
          }
          
          const maxPacketSize = 4000;
          const opusPtr = mod._malloc(maxPacketSize);
          
          const encodedLength = mod._opus_encode(
            this.opusEncoder.ptr,
            pcmPtr,
            pcmData.length,
            opusPtr,
            maxPacketSize
          );
          
          mod._free(pcmPtr);
          
          if (encodedLength > 0) {
            const opusData = new Uint8Array(encodedLength);
            for (let i = 0; i < encodedLength; i++) {
              opusData[i] = mod.HEAPU8[opusPtr + i];
            }
            mod._free(opusPtr);
            
            // 发送 Opus 编码的数据
            this.websocket.send(opusData.buffer);
            // console.log(`发送 Opus 数据: ${encodedLength} 字节`);
          } else {
            mod._free(opusPtr);
            console.error('❌ Opus 编码失败:', encodedLength);
            // 回退到 PCM
            this.websocket.send(pcmData.buffer);
          }
        } else {
          // 回退到 PCM
          console.warn('⚠️ Opus 编码器未初始化，发送 PCM 数据');
          this.websocket.send(pcmData.buffer);
        }
      } catch (error) {
        console.error('❌ Opus 编码错误:', error);
        // 回退到 PCM
        this.websocket.send(pcmData.buffer);
      }
    }
  }

  stop() {
    if (!this.isRecording) return false;

    try {
      console.log('停止录音，清理资源');
      this.isRecording = false;

      // 断开 AudioWorklet
      if (this.audioWorkletNode) {
        this.audioWorkletNode.disconnect();
        this.audioWorkletNode.port.close();
        this.audioWorkletNode = null;
      }

      // 断开 ScriptProcessor
      if (this.audioProcessor) {
        this.audioProcessor.disconnect();
        this.audioProcessor.onaudioprocess = null;
        this.audioProcessor = null;
      }

      // 断开音频源并停止所有轨道
      if (this.audioSource) {
        this.audioSource.disconnect();
        const stream = this.audioSource.mediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('音频轨道已停止:', track.label);
          });
        }
        this.audioSource = null;
      }

      // 发送剩余的PCM数据（如果有）
      if (this.pcmDataBuffer.length > 0) {
        const samplesPerFrame = 960;
        if (this.pcmDataBuffer.length < samplesPerFrame) {
          // 填充到完整帧
          const paddedBuffer = new Int16Array(samplesPerFrame);
          paddedBuffer.set(this.pcmDataBuffer);
          this.sendPCMData(paddedBuffer);
        } else {
          this.sendPCMData(this.pcmDataBuffer.slice(0, samplesPerFrame));
        }
        this.pcmDataBuffer = new Int16Array(0);
      }

      // 清理 Opus 编码器
      if (this.opusEncoder && this.opusEncoder.ptr) {
        const mod = getOpusModule();
        if (mod) {
          mod._free(this.opusEncoder.ptr);
        }
        this.opusEncoder = null;
        console.log('✅ Opus 编码器已清理');
      }

      // 发送结束信号
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const emptyFrame = new Uint8Array(0);
        this.websocket.send(emptyFrame);
        console.log('📤 已发送录音停止信号');
      }

      // 关闭 AudioContext（可选，如果不需要保持）
      if (this.audioContext && this.audioContext.state !== 'closed') {
        // 暂停而不是关闭，以便下次可以重用
        this.audioContext.suspend();
        console.log('AudioContext 已暂停');
      }

      console.log('🎤 录音已停止，所有资源已清理');
      return true;
    } catch (error) {
      console.error('❌ 停止录音失败:', error);
      return false;
    }
  }
}

class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.opusDecoder = null;
    this.SAMPLE_RATE = 16000;
    this.CHANNELS = 1;
    this.FRAME_SIZE = 960; // 60ms at 16kHz
    this.nextStartTime = 0; // 用于音频连续播放
  }

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.SAMPLE_RATE,
        latencyHint: 'interactive'
      });
    }
    return this.audioContext;
  }

  // 初始化Opus解码器
  async initOpusDecoder() {
    if (this.opusDecoder) return this.opusDecoder;

    try {
      console.log('🔧 初始化 Opus 解码器...');
      
      // 等待libopus.js加载
      let attempts = 0;
      while (typeof Module === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (typeof Module === 'undefined') {
        throw new Error('libopus.js 未加载');
      }

      // 获取 Opus Module
      const mod = getOpusModule();
      if (!mod) {
        throw new Error('Opus 解码函数未找到，Module 结构不正确');
      }

      console.log('✅ 找到 Opus Module');

      this.opusDecoder = {
        channels: this.CHANNELS,
        rate: this.SAMPLE_RATE,
        frameSize: this.FRAME_SIZE,
        decoderPtr: null,

        init: function() {
          if (this.decoderPtr) return true;

          const decoderSize = mod._opus_decoder_get_size(this.channels);
          console.log(`Opus 解码器大小: ${decoderSize} 字节`);

          this.decoderPtr = mod._malloc(decoderSize);
          if (!this.decoderPtr) {
            throw new Error('无法分配解码器内存');
          }

          const err = mod._opus_decoder_init(
            this.decoderPtr,
            this.rate,
            this.channels
          );

          if (err !== 0) {
            mod._free(this.decoderPtr);
            this.decoderPtr = null;
            throw new Error(`Opus 解码器初始化失败: ${err}`);
          }

          console.log('Opus 解码器初始化成功');
          return true;
        },

        decode: function(opusData) {
          if (!this.decoderPtr) {
            throw new Error('解码器未初始化');
          }

          const opusPtr = mod._malloc(opusData.length);
          mod.HEAPU8.set(opusData, opusPtr);

          const pcmPtr = mod._malloc(this.frameSize * 2);

          const decodedSamples = mod._opus_decode(
            this.decoderPtr,
            opusPtr,
            opusData.length,
            pcmPtr,
            this.frameSize,
            0
          );

          mod._free(opusPtr);

          if (decodedSamples < 0) {
            mod._free(pcmPtr);
            throw new Error(`Opus 解码失败: ${decodedSamples}`);
          }

          const pcmData = new Int16Array(decodedSamples);
          for (let i = 0; i < decodedSamples; i++) {
            pcmData[i] = mod.HEAP16[(pcmPtr >> 1) + i];
          }

          mod._free(pcmPtr);
          return pcmData;
        },

        destroy: function() {
          if (this.decoderPtr) {
            mod._free(this.decoderPtr);
            this.decoderPtr = null;
          }
        }
      };

      if (!this.opusDecoder.init()) {
        throw new Error('Opus 解码器初始化失败');
      }

      console.log('Opus 解码器准备就绪');
      return this.opusDecoder;
    } catch (error) {
      console.error('Opus 解码器初始化失败:', error);
      this.opusDecoder = null;
      throw error;
    }
  }

  async playAudioData(opusData) {
    try {
      // 确保解码器已初始化
      if (!this.opusDecoder) {
        await this.initOpusDecoder();
      }

      // 解码Opus数据为PCM
      const pcmData = this.opusDecoder.decode(opusData);
      
      if (!pcmData || pcmData.length === 0) {
        return;
      }

      const audioContext = this.getAudioContext();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // 将PCM Int16数据转换为Float32并播放
      const audioBuffer = audioContext.createBuffer(1, pcmData.length, this.SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      // 计算开始时间，确保音频连续播放
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      
      source.start(startTime);
      
      // 更新下一个音频块的开始时间
      this.nextStartTime = startTime + audioBuffer.duration;
      
    } catch (error) {
      console.error('播放音频失败:', error);
    }
  }

  clearAllAudio() {
    this.audioQueue = [];
    this.nextStartTime = 0;
  }
}

class XiaozhiWebSocketHandler {
  constructor(wsUrl, deviceConfig = {}, otaUrl = null) {
    this.wsUrl = wsUrl;
    this.otaUrl = otaUrl;
    this.deviceConfig = {
      device_id: deviceConfig.device_id || 'web_client_' + Date.now(),
      device_name: deviceConfig.device_name || 'Web客户端',
      device_mac: deviceConfig.device_mac || 'web_mac',
      token: deviceConfig.token || ''
    };
    this.websocket = null;
    this.audioRecorder = new AudioRecorder();
    this.audioPlayer = new AudioPlayer();
    this.currentSessionId = null;
    this.isRemoteSpeaking = false;
    
    // 回调函数
    this.onConnectionStateChange = null;
    this.onSessionStateChange = null;
    this.onRecordButtonStateChange = null;
    this.onChatMessage = null;
  }

  // 通过 OTA 服务器获取 WebSocket 配置
  async fetchWebSocketFromOTA() {
    if (!this.otaUrl) {
      throw new Error('OTA URL 未配置');
    }

    try {
      console.log('正在从 OTA 服务器获取 WebSocket 配置...');
      
      const response = await fetch(this.otaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Device-Id': this.deviceConfig.device_mac,  // 使用MAC地址作为Device-Id
          'Client-Id': this.deviceConfig.device_id
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
            type: this.deviceConfig.device_name,
            ssid: 'xiaozhi-web-client',
            rssi: 0,
            channel: 0,
            ip: '192.168.1.1',
            mac: this.deviceConfig.device_mac
          },
          flash_size: 0,
          minimum_free_heap_size: 0,
          mac_address: this.deviceConfig.device_mac,
          chip_model_name: 'web',
          chip_info: { model: 0, cores: 0, revision: 0, features: 0 },
          partition_table: [{ label: '', type: 0, subtype: 0, address: 0, size: 0 }]
        })
      });

      if (!response.ok) {
        throw new Error(`OTA 请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.websocket || !result.websocket.url) {
        throw new Error('OTA 响应中缺少 WebSocket 信息');
      }

      console.log('从 OTA 获取到 WebSocket 配置:', result.websocket);
      
      // 保存 token
      if (result.websocket.token) {
        this.deviceConfig.token = result.websocket.token;
      }

      return result.websocket.url;
    } catch (error) {
      console.error('从 OTA 获取 WebSocket 配置失败:', error);
      throw error;
    }
  }

  async connect() {
    try {
      let wsServerUrl = this.wsUrl;

      // 如果配置了 OTA URL，优先使用 OTA 方式获取 WebSocket 地址
      if (this.otaUrl) {
        try {
          wsServerUrl = await this.fetchWebSocketFromOTA();
          console.log('使用 OTA 获取的 WebSocket 地址:', wsServerUrl);
        } catch (error) {
          console.warn('OTA 获取失败，使用配置的 WebSocket 地址:', this.wsUrl);
          wsServerUrl = this.wsUrl;
        }
      }
      
      // 解析 WebSocket URL
      // 如果是 HTTP URL，需要转换为 WebSocket URL
      if (wsServerUrl.startsWith('http://')) {
        wsServerUrl = wsServerUrl.replace('http://', 'ws://');
      } else if (wsServerUrl.startsWith('https://')) {
        wsServerUrl = wsServerUrl.replace('https://', 'wss://');
      }

      // 确保 URL 格式正确
      if (!wsServerUrl.startsWith('ws://') && !wsServerUrl.startsWith('wss://')) {
        wsServerUrl = 'ws://' + wsServerUrl;
      }

      // 添加认证参数
      const connUrl = new URL(wsServerUrl);
      
      // 添加 token（如果有）
      if (this.deviceConfig.token) {
        const token = this.deviceConfig.token.startsWith('Bearer ') 
          ? this.deviceConfig.token 
          : 'Bearer ' + this.deviceConfig.token;
        connUrl.searchParams.append('authorization', token);
      }
      
      // 添加设备信息
      connUrl.searchParams.append('device-id', this.deviceConfig.device_mac);  // 使用MAC地址
      connUrl.searchParams.append('client-id', this.deviceConfig.device_id);

      const finalWsUrl = connUrl.toString();
      console.log('连接到:', finalWsUrl);

      this.websocket = new WebSocket(finalWsUrl);
      this.websocket.binaryType = 'arraybuffer';

      // 设置录音器的 WebSocket
      this.audioRecorder.setWebSocket(this.websocket);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('连接超时'));
        }, 10000);

        this.websocket.onopen = async () => {
          clearTimeout(timeout);
          console.log('WebSocket 已连接');

          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(true);
          }

          // 发送 hello 握手消息
          await this.sendHelloMessage();
          resolve(true);
        };

        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket 错误:', error);
          reject(new Error('连接失败'));
        };

        this.websocket.onclose = () => {
          console.log('WebSocket 已断开');
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false);
          }
          this.audioRecorder.stop();
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event);
        };
      });
    } catch (error) {
      console.error('连接错误:', error);
      throw error;
    }
  }

  async sendHelloMessage() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const helloMessage = {
        type: 'hello',
        device_id: this.deviceConfig.device_id,
        device_name: this.deviceConfig.device_name,
        device_mac: this.deviceConfig.device_mac,
        token: this.deviceConfig.token,
        features: {
          mcp: false
        }
      };

      console.log('发送 hello 消息:', helloMessage);
      this.websocket.send(JSON.stringify(helloMessage));

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('hello 响应超时');
          resolve(false);
        }, 5000);

        const onMessageHandler = (event) => {
          try {
            if (typeof event.data === 'string') {
              const response = JSON.parse(event.data);
              if (response.type === 'hello' && response.session_id) {
                console.log('握手成功，会话ID:', response.session_id);
                clearTimeout(timeout);
                this.websocket.removeEventListener('message', onMessageHandler);
                resolve(true);
              }
            }
          } catch (e) {
            // 忽略非 JSON 消息
          }
        };

        this.websocket.addEventListener('message', onMessageHandler);
      });
    } catch (error) {
      console.error('发送 hello 消息失败:', error);
      return false;
    }
  }

  handleMessage(event) {
    try {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        this.handleTextMessage(message);
      } else {
        this.handleBinaryMessage(event.data);
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  }

  handleTextMessage(message) {
    console.log('收到消息:', message);

    if (message.type === 'hello') {
      console.log('服务器握手响应');
    } else if (message.type === 'tts') {
      this.handleTTSMessage(message);
    } else if (message.type === 'stt') {
      console.log('识别结果:', message.text);
      // 调用注册的消息处理器
      if (this.onChatMessage && message.text) {
        this.onChatMessage({ type: 'stt', text: message.text });
      }
    } else if (message.type === 'llm') {
      console.log('AI 回复:', message.text);
      // 调用注册的消息处理器
      if (this.onChatMessage && message.text) {
        this.onChatMessage({ type: 'llm', text: message.text });
      }
    }
  }

  handleTTSMessage(message) {
    if (message.state === 'start') {
      console.log('服务器开始发送语音');
      this.currentSessionId = message.session_id;
      this.isRemoteSpeaking = true;
      
      if (this.onSessionStateChange) {
        this.onSessionStateChange(true);
      }
      
      // 通知应用层 TTS 开始
      if (this.onChatMessage) {
        this.onChatMessage({ type: 'tts', state: 'start', session_id: message.session_id });
      }
    } else if (message.state === 'sentence_start') {
      console.log('语音段开始:', message.text);
      
      // 通知应用层 TTS 文本片段
      if (this.onChatMessage && message.text) {
        this.onChatMessage({ type: 'tts', state: 'sentence_start', text: message.text, session_id: message.session_id });
      }
    } else if (message.state === 'stop') {
      console.log('语音传输结束');
      this.isRemoteSpeaking = false;
      
      if (this.onRecordButtonStateChange) {
        this.onRecordButtonStateChange(false);
      }
      
      if (this.onSessionStateChange) {
        this.onSessionStateChange(false);
      }

      this.audioPlayer.clearAllAudio();
      
      // 通知应用层 TTS 结束
      if (this.onChatMessage) {
        this.onChatMessage({ type: 'tts', state: 'stop', session_id: message.session_id });
      }
    }
  }

  async handleBinaryMessage(data) {
    try {
      // 获取Opus编码的音频数据
      const arrayBuffer = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
      const opusData = new Uint8Array(arrayBuffer);
      
      if (opusData.length > 0) {
        // 直接传递Opus数据给播放器，播放器会负责解码
        await this.audioPlayer.playAudioData(opusData);
      }
    } catch (error) {
      console.error('处理音频数据失败:', error);
    }
  }

  disconnect() {
    console.log('断开 WebSocket 连接');
    
    // 停止录音
    if (this.audioRecorder && this.audioRecorder.isRecording) {
      this.audioRecorder.stop();
    }
    
    // 清理音频播放器
    if (this.audioPlayer) {
      this.audioPlayer.clearAllAudio();
    }
    
    // 关闭 WebSocket 连接
    if (this.websocket) {
      // 移除事件监听器，避免触发 onclose 回调
      this.websocket.onopen = null;
      this.websocket.onclose = null;
      this.websocket.onerror = null;
      this.websocket.onmessage = null;
      
      // 关闭连接
      if (this.websocket.readyState === WebSocket.OPEN || 
          this.websocket.readyState === WebSocket.CONNECTING) {
        this.websocket.close();
      }
      
      this.websocket = null;
    }
    
    // 重置状态
    this.currentSessionId = null;
    this.isRemoteSpeaking = false;
    
    console.log('WebSocket 连接已关闭');
  }

  isConnected() {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }

  // 注册消息处理器（用于AIAssistant.vue）
  onMessage(callback) {
    // 直接设置回调函数
    this.onChatMessage = callback;
  }

  // 设置语音模式（用于AIAssistant.vue）
  setVoiceMode(enabled) {
    // 语音模式始终启用，这个方法主要是为了兼容
    console.log('语音模式:', enabled ? '启用' : '禁用');
  }

  // 开始音频会话（启动录音）
  async startAudioSession(chatHistory = []) {
    console.log('开始音频会话，历史消息数:', chatHistory.length);
    
    // 如果有历史消息，可以发送给服务器作为上下文
    if (chatHistory.length > 0) {
      const contextMessage = {
        type: 'context',
        messages: chatHistory
      };
      
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(contextMessage));
      }
    }
    
    // 发送 listen start 消息（关键！）
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const listenMessage = {
        type: 'listen',
        state: 'start'
      };
      this.websocket.send(JSON.stringify(listenMessage));
      console.log('已发送 listen start 消息');
    }
    
    // 启动录音
    const started = await this.audioRecorder.start();
    if (!started) {
      throw new Error('无法启动录音');
    }
    
    return true;
  }

  // startRecording 是 startAudioSession 的别名（兼容性）
  async startRecording() {
    return await this.startAudioSession();
  }

  // 停止音频会话（停止录音）
  stopAudioSession() {
    console.log('停止音频会话');
    console.trace('stopAudioSession 调用堆栈'); // 添加堆栈追踪
    this.audioRecorder.stop();
  }

  // stopRecording 是 stopAudioSession 的别名（兼容性）
  stopRecording() {
    this.stopAudioSession();
  }

  // 发送文本消息
  sendTextMessage(text) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket 未连接');
      return;
    }

    const message = {
      type: 'text',
      text: text
    };

    console.log('发送文本消息:', message);
    this.websocket.send(JSON.stringify(message));
  }
}

// 单例实例管理（每个角色一个实例）
const wsHandlerInstances = {};

export async function getXiaozhiWebSocket(role = 'client') {
  // 获取用户设置中的 WebSocket URL 和设备配置
  const settings = await getUserSettingsByRole(role);
  
  if (!settings) {
    throw new Error('无法获取用户设置');
  }
  
  const wsUrl = settings.ws_url;
  const otaUrl = settings.ota_url;
  
  if (!wsUrl && !otaUrl) {
    throw new Error('请先在设置中配置 WebSocket 地址或 OTA 服务器地址');
  }

  // 设备配置
  const deviceConfig = {
    device_id: settings.device_id || `web_${role}_${Date.now()}`,
    device_name: settings.device_name || `Web ${role} 客户端`,
    device_mac: settings.device_mac || 'web_mac_' + Math.random().toString(36).substr(2, 9),
    token: settings.token || ''
  };

  // 实例键
  const instanceKey = `${role}_${wsUrl}_${otaUrl}`;
  
  // 如果已有实例，先断开旧连接
  if (wsHandlerInstances[instanceKey]) {
    const oldInstance = wsHandlerInstances[instanceKey];
    if (oldInstance.isConnected()) {
      console.log('断开旧的 WebSocket 连接');
      oldInstance.disconnect();
    }
  }

  // 创建新实例
  console.log('创建新的 WebSocket 实例');
  wsHandlerInstances[instanceKey] = new XiaozhiWebSocketHandler(wsUrl, deviceConfig, otaUrl);
  return wsHandlerInstances[instanceKey];
}

export function getDeviceConfig(role = 'client') {
  // 这个函数保留用于向后兼容
  return {
    deviceId: `web_${role}_` + Date.now(),
    deviceName: `Web ${role} 客户端`,
    deviceMac: 'web_mac_' + Math.random().toString(36).substr(2, 9)
  };
}

export function getOtaUrl(role = 'client') {
  // 从设置中获取 OTA URL（如果需要）
  return '';
}
