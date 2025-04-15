import { useState, useEffect } from "react";
import { MediaRecorderInstance } from "types/mediaRecorder";
import { blobToBase64 } from "utils/audioProcessing";
import EventBus from "utils/eventBus";
import { TOPICS } from "utils/topics";
// @ts-ignore
import MediaStreamRecorder from "msr";

export interface UseMediaRecorderResult {
  recording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  mediaRecorder: MediaRecorderInstance | null;
}

export const useMediaRecorder = (): UseMediaRecorderResult => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorderInstance | null>(null);
  const [recording, setRecording] = useState(false);
  const eventBus = EventBus.getInstance();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = {
        mimeType: "audio/webm;codecs=pcm",
        bitsPerSecond: 8000,
      };
      const mr = new MediaStreamRecorder(stream, options);
      mr.stream = stream;
      mr.mimeType = "audio/pcm";
      mr.audioChannels = 1;

      mr.ondataavailable = async function (event: Blob) {
        if (event) {
          try {
            const base64Data = await blobToBase64(event);
            eventBus.publish(TOPICS.AUDIO_DATA, { audioData: base64Data });
          } catch (err) {
            eventBus.publish(TOPICS.TRANSCRIPTION_ERROR, {
              message: "Error processing audio"
            });
          }
        }
      };

      mr.start(1);
      setMediaRecorder(mr);
      setRecording(true);
      eventBus.publish(TOPICS.RECORDING_STARTED, { timestamp: Date.now() });
    } catch (err) {
      eventBus.publish(TOPICS.TRANSCRIPTION_ERROR, {
        message: "Error accessing microphone"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
      setMediaRecorder(null);
      setRecording(false);
      eventBus.publish(TOPICS.RECORDING_STOPPED, { timestamp: Date.now() });
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorder) {
        mediaRecorder.stream
          .getTracks()
          .forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [mediaRecorder]);

  return {
    recording,
    startRecording,
    stopRecording,
    mediaRecorder,
  };
};