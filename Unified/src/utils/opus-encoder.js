// Opus 编码器封装
export class OpusEncoder {
  constructor() {
    this.encoder = null
    this.encoderPtr = null
    this.module = null
    this.sampleRate = 16000
    this.channels = 1
    this.frameSize = 960
    this.maxPacketSize = 4000
  }
  
  async init() {
    // 等待 libopus.js 加载
    let attempts = 0
    while (typeof window.Module === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    if (typeof window.Module === 'undefined') {
      throw new Error('libopus.js 未加载')
    }
    
    const mod = window.Module.instance || window.Module
    this.module = mod
    
    // 创建编码器
    const encoderSize = mod._opus_encoder_get_size(this.channels)
    console.log(`Opus编码器大小: ${encoderSize}字节`)
    
    this.encoderPtr = mod._malloc(encoderSize)
    if (!this.encoderPtr) {
      throw new Error('无法分配编码器内存')
    }
    
    const err = mod._opus_encoder_init(
      this.encoderPtr,
      this.sampleRate,
      this.channels,
      2048 // OPUS_APPLICATION_VOIP
    )
    
    if (err < 0) {
      this.destroy()
      throw new Error(`Opus编码器初始化失败: ${err}`)
    }
    
    // 设置参数
    mod._opus_encoder_ctl(this.encoderPtr, 4002, 16000) // OPUS_SET_BITRATE: 16kbps
    mod._opus_encoder_ctl(this.encoderPtr, 4010, 5)     // OPUS_SET_COMPLEXITY: 5
    mod._opus_encoder_ctl(this.encoderPtr, 4016, 1)     // OPUS_SET_DTX: 启用
    
    console.log('Opus编码器初始化成功')
  }
  
  encode(pcmData) {
    if (!this.encoderPtr || !this.module) {
      throw new Error('编码器未初始化')
    }
    
    const mod = this.module
    
    // 分配 PCM 内存
    const pcmPtr = mod._malloc(pcmData.length * 2)
    for (let i = 0; i < pcmData.length; i++) {
      mod.HEAP16[(pcmPtr >> 1) + i] = pcmData[i]
    }
    
    // 分配输出内存
    const outPtr = mod._malloc(this.maxPacketSize)
    
    // 编码
    const encodedLen = mod._opus_encode(
      this.encoderPtr,
      pcmPtr,
      this.frameSize,
      outPtr,
      this.maxPacketSize
    )
    
    if (encodedLen < 0) {
      mod._free(pcmPtr)
      mod._free(outPtr)
      throw new Error(`Opus编码失败: ${encodedLen}`)
    }
    
    // 复制编码后的数据
    const opusData = new Uint8Array(encodedLen)
    for (let i = 0; i < encodedLen; i++) {
      opusData[i] = mod.HEAPU8[outPtr + i]
    }
    
    // 释放内存
    mod._free(pcmPtr)
    mod._free(outPtr)
    
    return opusData
  }
  
  destroy() {
    if (this.encoderPtr && this.module) {
      this.module._free(this.encoderPtr)
      this.encoderPtr = null
    }
  }
}

// Opus 解码器封装
export class OpusDecoder {
  constructor() {
    this.decoderPtr = null
    this.module = null
    this.sampleRate = 16000
    this.channels = 1
    this.frameSize = 960
  }
  
  async init() {
    // 等待 libopus.js 加载
    let attempts = 0
    while (typeof window.Module === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    if (typeof window.Module === 'undefined') {
      throw new Error('libopus.js 未加载')
    }
    
    const mod = window.Module.instance || window.Module
    this.module = mod
    
    // 创建解码器
    const decoderSize = mod._opus_decoder_get_size(this.channels)
    console.log(`Opus解码器大小: ${decoderSize}字节`)
    
    this.decoderPtr = mod._malloc(decoderSize)
    if (!this.decoderPtr) {
      throw new Error('无法分配解码器内存')
    }
    
    const err = mod._opus_decoder_init(
      this.decoderPtr,
      this.sampleRate,
      this.channels
    )
    
    if (err < 0) {
      this.destroy()
      throw new Error(`Opus解码器初始化失败: ${err}`)
    }
    
    console.log('Opus解码器初始化成功')
  }
  
  decode(opusData) {
    if (!this.decoderPtr || !this.module) {
      throw new Error('解码器未初始化')
    }
    
    const mod = this.module
    
    try {
      // 分配 Opus 数据内存
      const opusPtr = mod._malloc(opusData.length)
      mod.HEAPU8.set(opusData, opusPtr)
      
      // 分配 PCM 输出内存
      const pcmPtr = mod._malloc(this.frameSize * 2)
      
      // 解码
      const decodedSamples = mod._opus_decode(
        this.decoderPtr,
        opusPtr,
        opusData.length,
        pcmPtr,
        this.frameSize,
        0
      )
      
      if (decodedSamples < 0) {
        mod._free(opusPtr)
        mod._free(pcmPtr)
        throw new Error(`Opus解码失败: ${decodedSamples}`)
      }
      
      // 复制解码后的数据
      const decodedData = new Int16Array(decodedSamples)
      for (let i = 0; i < decodedSamples; i++) {
        decodedData[i] = mod.HEAP16[(pcmPtr >> 1) + i]
      }
      
      // 释放内存
      mod._free(opusPtr)
      mod._free(pcmPtr)
      
      return decodedData
    } catch (error) {
      console.error('Opus解码错误:', error)
      return new Int16Array(0)
    }
  }
  
  destroy() {
    if (this.decoderPtr && this.module) {
      this.module._free(this.decoderPtr)
      this.decoderPtr = null
    }
  }
}
