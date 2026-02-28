// AudioWorklet 处理器 - 用于录音
class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];
        
        // 当缓冲区满时，发送数据
        if (this.bufferIndex >= this.bufferSize) {
          // 转换为 Int16
          const int16Buffer = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            int16Buffer[j] = Math.max(-32768, Math.min(32767, Math.floor(this.buffer[j] * 32767)));
          }
          
          // 发送到主线程
          this.port.postMessage(int16Buffer.buffer, [int16Buffer.buffer]);
          
          // 重置缓冲区
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // 保持处理器活跃
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
