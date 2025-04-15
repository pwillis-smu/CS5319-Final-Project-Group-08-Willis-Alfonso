import React, { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "hooks/useWebSocket";
import { useMediaRecorder } from "hooks/useMediaRecorder";
import { useTranscription } from "hooks/useTranscription";
import { useEventBus } from "hooks/useEventBus";
import { TOPICS } from "utils/topics";
import { TranscriptionStatus } from "types/websocket";
import { uuidv4 } from "utils/uuid";
import "./TranscriptionApp.css";

const WS_URL = "ws://localhost:3001";

const TranscriptionApp: React.FC = () => {
  const [sessionId] = useState<string>(uuidv4());
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const { publish, subscribe } = useEventBus();
  const { isConnected } = useWebSocket(WS_URL, sessionId);
  const { transcript, partialTranscript, errorMessage, resetTranscript } =
    useTranscription();
  const { startRecording, stopRecording } = useMediaRecorder();

  useEffect(() => {
    const errorUnsubscribe = subscribe(TOPICS.TRANSCRIPTION_ERROR, () => {
      setStatus("error");
    });

    const startUnsubscribe = subscribe(TOPICS.RECORDING_STARTED, () => {
      setStatus("recording");
    });

    const stopUnsubscribe = subscribe(TOPICS.RECORDING_STOPPED, () => {
      setStatus("completed");
    });

    return () => {
      errorUnsubscribe();
      startUnsubscribe();
      stopUnsubscribe();
    };
  }, [subscribe]);

  const startTranscription = async () => {
    resetTranscript();
    setStatus("recording");

    try {
      await startRecording();
    } catch (error) {
      publish(TOPICS.TRANSCRIPTION_ERROR, {
        message: "Could not start transcription. Please check your microphone.",
      });
    }
  };

  const stopTranscription = () => {
    stopRecording();
    setStatus("completed");
  };

  const resetTranscriptionState = useCallback(() => {
    setStatus("idle");
    publish(TOPICS.UI_RESET, {});
  }, [publish]);

  const copyToClipboard = useCallback(() => {
    if (navigator.clipboard && transcript) {
      navigator.clipboard
        .writeText(transcript)
        .then(() => alert("Transcript copied to clipboard!"))
        .catch((err) => console.error("Failed to copy: ", err));
    }
  }, [transcript]);

  return (
    <main className="main">
      <div className="container">
        <h1 className="title">
          <span className="pinkSpan">Pub-Sub + Pipe-and-Filter</span>{" "}
          Transcription App
        </h1>

        <div className="connectionStatus">
          <div
            className={`statusIndicator ${
              isConnected ? "connected" : "disconnected"
            }`}
          ></div>
          <span>
            {isConnected ? "Connected to server" : "Disconnected from server"}
          </span>
        </div>

        <div className="twoBoxLayout">
          <div className="box">
            <h3 className="boxTitle">Audio Recorder</h3>

            <div className="boxContent">
              {status === "idle" && (
                <button
                  className="recordButton"
                  onClick={startTranscription}
                  disabled={!isConnected}
                >
                  Start Recording
                </button>
              )}

              {status === "recording" && (
                <div className="recordingState">
                  <div className="recordingIndicator"></div>
                  <span>Recording in progress...</span>
                  <button className="stopButton" onClick={stopTranscription}>
                    Stop Recording
                  </button>
                </div>
              )}

              {errorMessage && <div className="errorText">{errorMessage}</div>}
            </div>
          </div>

          <div className="box resultBox">
            <h3 className="boxTitle">Transcription Results</h3>

            <div className="boxContent">
              {status === "completed" || status === "recording" ? (
                <>
                  <div className="transcriptContainer">
                    <div className="transcriptText">
                      {transcript}
                      {status === "recording" && (
                        <span className="processingText">
                          {transcript.length > 0 ? " " : ""}
                          Processing audio
                          <span className="processingDots"></span>
                        </span>
                      )}
                    </div>
                  </div>

                  {status === "completed" && (
                    <div className="resultActions">
                      <button
                        className="actionButton"
                        onClick={copyToClipboard}
                      >
                        Copy to Clipboard
                      </button>

                      <button
                        className="actionButton"
                        onClick={resetTranscriptionState}
                      >
                        New Recording
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="emptyState">
                  <p>Record audio to see transcription results here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TranscriptionApp;
