export function reverseAudioBuffer(source: AudioBuffer): AudioBuffer {
  const numChannels = source.numberOfChannels;
  const sampleRate = source.sampleRate;
  const length = source.length;
  const context = new (window.AudioContext || (window as any).webkitAudioContext)();
  const reversed = context.createBuffer(numChannels, length, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const src = source.getChannelData(channel);
    const dst = reversed.getChannelData(channel);
    for (let i = 0, j = length - 1; i < length; i++, j--) {
      dst[i] = src[j];
    }
  }
  return reversed;
}

export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const samples = interleaveChannels(buffer, bitDepth);
  const header = createWavHeader(samples.byteLength, numChannels, sampleRate, bitDepth, format);
  const wavBuffer = new Uint8Array(header.byteLength + samples.byteLength);
  wavBuffer.set(new Uint8Array(header), 0);
  wavBuffer.set(new Uint8Array(samples), header.byteLength);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function interleaveChannels(buffer: AudioBuffer, bitDepth: number): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const out = new ArrayBuffer(length * numChannels * bytesPerSample);
  const view = new DataView(out);
  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  return out;
}

function createWavHeader(dataSize: number, numChannels: number, sampleRate: number, bitDepth: number, format: number): ArrayBuffer {
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}


