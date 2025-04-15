export interface UseMediaRecorderProps {
  onAudioData: (data: string) => void;
  onError: (error: string) => void;
}

export interface MediaRecorderInstance {
  stream: MediaStream;
  mimeType: string;
  audioChannels: number;
  start: (timeslice?: number) => void;
  stop: () => void;
  ondataavailable: (event: Blob) => void;
}

// Declare the MediaStreamRecorder type from the MSR library
declare global {
  interface Window {
    MediaStreamRecorder: any;
  }
}