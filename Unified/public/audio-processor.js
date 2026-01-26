// AudioWorklet 处理器 - 用于音频录制
class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Int16Array(960) // 一帧的大小
    this.bufferIndex = 0
    this.isRecording = false
    
    this.port.onmessage = (event) => {
      if (event.data.command === 'start') {
        this.isRecording = true
        this.bufferIndex = 0
      } else if (event.data.command === 'stop') {
        this.isRecording = false
        
        // 发送剩余数据
        if (this.bufferIndex > 0) {
          const finalBuffer = this.buffer.slice(0, this.bufferIndex)
          this.port.postMessage({
            type: 'audiodata',
            buffer: finalBuffer
          })
          this.bufferIndex = 0
        }
      }
    }
  }
  
  process(inputs, outputs, parameters) {
    if (!this.isRecording) {
      return true
    }
    
    const input = inputs[0]
    if (!input || !input[0]) {
      return true
    }
    
    const inputChannel = input[0]
    
    // 将 Float32 转换为 Int16 并缓冲
    for (let i = 0; i < inputChannel.length; i++) {
      if (this.bufferIndex >= 960) {
        // 缓冲区满了，发送数据
        this.port.postMessage({
          type: 'audiodata',
          buffer: this.buffer.slice(0)
        })
        this.bufferIndex = 0
      }
      
      // Float32 (-1.0 到 1.0) 转换为 Int16 (-32768 到 32767)
      const sample = Math.max(-1, Math.min(1, inputChannel[i]))
      this.buffer[this.bufferIndex++] = Math.floor(sample * 32767)
    }
    
    return true
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor)
