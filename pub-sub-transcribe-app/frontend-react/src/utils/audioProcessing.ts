export const blobToBase64 = (blob: Blob): Promise<string> => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise((resolve) => {
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
  });
};

export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(blob);
  });
}

export function pcmBufferToFloat32Array(pcmBuffer: ArrayBuffer): Float32Array {
  const dataView = new DataView(pcmBuffer);
  const numSamples = pcmBuffer.byteLength / 2;
  const audioFloat32Array = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const intVal = dataView.getInt16(i * 2, true);
    audioFloat32Array[i] = intVal / 32768.0;
  }

  return audioFloat32Array;
}

export function calculateRMSAmplitude(audioSamples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < audioSamples.length; i++) {
    sum += audioSamples[i] ** 2;
  }
  return Math.sqrt(sum / audioSamples.length);
}

export async function processAudioBlob(blob: Blob): Promise<number> {
  try {
    const arrayBuffer = await blobToArrayBuffer(blob);
    const audioSamples = pcmBufferToFloat32Array(arrayBuffer);
    return calculateRMSAmplitude(audioSamples);
  } catch (error) {
    console.error('Error processing audio blob:', error);
    throw error;
  }
}