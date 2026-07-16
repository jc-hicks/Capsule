import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

import Button from "react-bootstrap/Button";

import "./VoiceRecorder.css";

const MAX_SECONDS = 60;

// Records a short voice note in the browser with the MediaRecorder API and
// hands the finished audio Blob back to the parent via onRecorded.
export default function VoiceRecorder({ onRecorded, existingLabel = "" }) {
  const [status, setStatus] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setStatus("recorded");
        onRecorded(blob);
        stopStream();
      };

      recorder.start();
      setStatus("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      setError(
        "Microphone access was blocked. Check your browser permissions."
      );
      setStatus("error");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setSeconds(0);
    setStatus("idle");
    onRecorded(null);
  };

  const mmss = (total) => {
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="voice-recorder">
      {status === "recording" ? (
        <div className="voice-recorder-live">
          <span className="voice-recorder-dot" aria-hidden="true" />
          <span className="voice-recorder-time">{mmss(seconds)}</span>
          <Button variant="outline-danger" size="sm" onClick={stopRecording}>
            Stop
          </Button>
          <span className="voice-recorder-hint">Max {MAX_SECONDS}s</span>
        </div>
      ) : status === "recorded" ? (
        <div className="voice-recorder-preview">
          <audio src={previewUrl} controls />
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={resetRecording}
          >
            Re-record
          </Button>
        </div>
      ) : (
        <div className="voice-recorder-start">
          <Button variant="outline-primary" size="sm" onClick={startRecording}>
            ● Record a voice note
          </Button>
          {existingLabel && (
            <span className="voice-recorder-hint">{existingLabel}</span>
          )}
        </div>
      )}
      {error && <p className="voice-recorder-error">{error}</p>}
    </div>
  );
}

VoiceRecorder.propTypes = {
  onRecorded: PropTypes.func.isRequired,
  existingLabel: PropTypes.string
};
