import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import styles from "./index.module.css";

type RecordingStatus =
  | "idle"
  | "recording"
  | "recorded"
  | "uploading"
  | "transcribing"
  | "completed";

export default function Home() {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobName, setJobName] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && status === "recording") {
        mediaRecorderRef.current.stop();
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, status]);

  // Poll for transcription status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (status === "transcribing" && jobName) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/status?jobName=${jobName}`);
          const data = await response.json();

          if (data.status === "COMPLETED") {
            setStatus("completed");
            setTranscript(data.transcript);
            setJobDetails(data.details);
            clearInterval(intervalId);
          } else if (data.status === "FAILED") {
            setStatus("idle");
            setErrorMessage("Transcription failed");
            setJobDetails(data.details);
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error("Error checking status:", error);
          setErrorMessage("Error checking transcription status");
          clearInterval(intervalId);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, jobName]);

  const startRecording = async () => {
    try {
      setStatus("recording");
      setErrorMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mpeg",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setStatus("recorded");

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      });

      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage("Could not access microphone");
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudio = async () => {
    if (!audioUrl) return;

    try {
      setStatus("uploading");

      // Fetch the Blob from the audioUrl
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.mp3");

      // Upload the audio file to S3 via our API
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadResponse.json();

      // Start transcription with the S3 URI
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          s3Uri: uploadData.s3Uri,
          jobName: uploadData.jobName,
        }),
      });

      if (!transcribeResponse.ok) {
        throw new Error("Transcription request failed");
      }

      const transcribeData = await transcribeResponse.json();
      setJobName(transcribeData.jobName);
      setStatus("transcribing");
    } catch (error) {
      console.error("Error uploading:", error);
      setErrorMessage("Upload or transcription request failed");
      setStatus("recorded"); // Revert to recorded state
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setStatus("idle");
    setAudioUrl(null);
    setTranscript(null);
    setErrorMessage(null);
    setJobName(null);
    setJobDetails(null);
  };

  return (
    <>
      <Head>
        <title>AWS Transcribe App</title>
        <meta
          name="description"
          content="Audio transcription app using AWS Transcribe"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>
            <span className={styles.pinkSpan}>Client-Server + Batch</span>{" "}
            Transcription App
          </h1>

          <div className={styles.twoBoxLayout}>
            {/* Top Box - Audio Recording Controls */}
            <div className={styles.box}>
              <h3 className={styles.boxTitle}>Audio Recorder</h3>

              <div className={styles.boxContent}>
                {status === "idle" && (
                  <button
                    className={styles.recordButton}
                    onClick={startRecording}
                  >
                    Start Recording
                  </button>
                )}

                {status === "recording" && (
                  <div className={styles.recordingState}>
                    <div className={styles.recordingIndicator}></div>
                    <span>Recording in progress...</span>
                    <button
                      className={styles.stopButton}
                      onClick={stopRecording}
                    >
                      Stop Recording
                    </button>
                  </div>
                )}

                {status === "recorded" && (
                  <>
                    <audio
                      src={audioUrl || ""}
                      controls
                      className={styles.audioPlayer}
                    />
                    <div className={styles.buttonGroup}>
                      <button
                        className={styles.submitButton}
                        onClick={uploadAudio}
                      >
                        Transcribe Audio
                      </button>
                      <button
                        className={styles.resetButton}
                        onClick={resetRecording}
                      >
                        Record Again
                      </button>
                    </div>
                  </>
                )}

                {(status === "uploading" || status === "transcribing") && (
                  <div className={styles.processingState}>
                    <div className={styles.spinner}></div>
                    <span className={styles.statusText}>
                      {status === "uploading"
                        ? "Uploading audio..."
                        : "Transcribing audio..."}
                    </span>
                  </div>
                )}

                {errorMessage && (
                  <div className={styles.errorText}>{errorMessage}</div>
                )}
              </div>
            </div>

            {/* Bottom Box - Transcription Results */}
            <div className={`${styles.box} ${styles.resultBox}`}>
              <h3 className={styles.boxTitle}>Transcription Results</h3>

              <div className={styles.boxContent}>
                {status === "completed" ? (
                  <>
                    <div className={styles.transcriptContainer}>
                      <div className={styles.transcriptText}>{transcript}</div>
                    </div>

                    <div className={styles.resultActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => {
                          const text = transcript || "";
                          if (navigator.clipboard && text) {
                            navigator.clipboard
                              .writeText(text)
                              .then(() =>
                                alert("Transcript copied to clipboard!")
                              )
                              .catch((err) =>
                                console.error("Failed to copy: ", err)
                              );
                          }
                        }}
                      >
                        Copy to Clipboard
                      </button>

                      <button
                        className={styles.actionButton}
                        onClick={resetRecording}
                      >
                        New Recording
                      </button>
                    </div>

                    {jobDetails && (
                      <div className={styles.jobDetails}>
                        <h4>Job Details:</h4>
                        <ul className={styles.detailsList}>
                          <li>
                            <strong>Job Name:</strong> {jobDetails.jobName}
                          </li>
                          <li>
                            <strong>Language:</strong> {jobDetails.languageCode}
                          </li>
                          <li>
                            <strong>Format:</strong> {jobDetails.mediaFormat}
                          </li>
                          {jobDetails.mediaSampleRateHertz && (
                            <li>
                              <strong>Sample Rate:</strong>{" "}
                              {jobDetails.mediaSampleRateHertz} Hz
                            </li>
                          )}
                          {jobDetails.startedAt && (
                            <li>
                              <strong>Started:</strong>{" "}
                              {new Date(jobDetails.startedAt).toLocaleString()}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <p>Record and transcribe audio to see results here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
