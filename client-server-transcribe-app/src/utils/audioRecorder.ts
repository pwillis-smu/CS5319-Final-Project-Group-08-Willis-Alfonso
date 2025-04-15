type RecorderState = {
  recordingMinutes: number;
  recordingSeconds: number;
  initRecording: boolean;
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  audio: string | null;
};

class AudioRecorder {
  private state: RecorderState = {
    recordingMinutes: 0,
    recordingSeconds: 0,
    initRecording: false,
    mediaStream: null,
    mediaRecorder: null,
    audio: null,
  };

  async start(): Promise<void> {
    if (this.state.initRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.state.mediaStream = stream;
      this.state.initRecording = true;
      
      const mediaRecorder = new MediaRecorder(stream);
      this.state.mediaRecorder = mediaRecorder;
      
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        this.state.audio = audioUrl;
      });
      
      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      this.state.initRecording = false;
    }
  }
  
  stop(): string | null {
    if (!this.state.mediaRecorder || !this.state.initRecording) return null;
    
    this.state.mediaRecorder.stop();
    this.state.mediaStream?.getTracks().forEach((track) => track.stop());
    this.state.initRecording = false;
    
    return this.state.audio;
  }
  
  getBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.state.audio) {
        resolve(null);
        return;
      }
      
      fetch(this.state.audio)
        .then(response => response.blob())
        .then(blob => resolve(blob))
        .catch(error => {
          console.error("Error converting audio URL to blob:", error);
          resolve(null);
        });
    });
  }
  
  reset(): void {
    if (this.state.mediaStream) {
      this.state.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    this.state = {
      recordingMinutes: 0,
      recordingSeconds: 0,
      initRecording: false,
      mediaStream: null,
      mediaRecorder: null,
      audio: null,
    };
  }
  
  isRecording(): boolean {
    return this.state.initRecording;
  }
  
  getAudioUrl(): string | null {
    return this.state.audio;
  }
}

export default AudioRecorder;