"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reverseAudioBuffer, audioBufferToWavBlob } from "@/lib/audio";

type RecordingState = "idle" | "recording" | "processing" | "ready";

export default function Recorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reversedUrl, setReversedUrl] = useState<string | null>(null);

  const [canRecord, setCanRecord] = useState(false);
  useEffect(() => {
    setCanRecord(!!navigator.mediaDevices?.getUserMedia);
  }, []);

  const cleanupMedia = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
      if (reversedUrl) URL.revokeObjectURL(reversedUrl);
    };
  }, [cleanupMedia, reversedUrl]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setRecordingState("recording");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size) {
          chunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = () => {
        void processChunks();
      };
      mediaRecorder.start();
    } catch (err) {
      console.error(err);
      setErrorMessage("Microphone access failed. Please allow mic permissions.");
      setRecordingState("idle");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      cleanupMedia();
    }
  }, [cleanupMedia]);

  const processChunks = useCallback(async () => {
    setRecordingState("processing");
    try {
      const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" });
      chunksRef.current = [];

      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const reversed = reverseAudioBuffer(audioBuffer);
      const wavBlob = audioBufferToWavBlob(reversed);
      if (reversedUrl) URL.revokeObjectURL(reversedUrl);
      const reversedObjectUrl = URL.createObjectURL(wavBlob);
      setReversedUrl(reversedObjectUrl);
      setRecordingState("ready");
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to process audio. Try again or use a different browser.");
      setRecordingState("idle");
    }
  }, [reversedUrl]);

  const toggleRecording = useCallback(() => {
    if (recordingState === "recording") {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  const playReversed = useCallback(() => {
    if (!reversedUrl) return;
    const audio = new Audio(reversedUrl);
    audio.play().catch(() => {});
  }, [reversedUrl]);

  const burstAt = useCallback((event: React.MouseEvent<HTMLButtonElement>, color: string) => {
    const x = event.clientX;
    const y = event.clientY;
    const el = document.createElement("span");
    el.className = "burst-overlay";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.background = color;
    document.body.appendChild(el);
    setTimeout(() => {
      document.body.removeChild(el);
    }, 1200);
  }, []);

  return (
    <div className="w-full py-16 flex items-center justify-center bg-white text-black">
      <div className="flex items-center gap-6">
        <button
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).classList.remove("animate-pop");
            // restart animation
            void e.currentTarget.offsetWidth;
            (e.currentTarget as HTMLButtonElement).classList.add("animate-pop");
            burstAt(e, recordingState === "recording" ? "#dc2626" : getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#4f46e5");
            toggleRecording();
          }}
          disabled={!canRecord || recordingState === "processing"}
          className={
            "h-20 w-20 rounded-full border transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm animate-pop " +
            (recordingState === "recording" ? " bg-red-600 text-white border-red-700" : " bg-accent text-accent-foreground border-accent hover:opacity-90")
          }
          aria-label={recordingState === "recording" ? "Stop recording" : "Start recording"}
          title={recordingState === "recording" ? "Stop recording" : "Start recording"}
        >
          <span className="text-2xl" role="img" aria-hidden>
            {recordingState === "recording" ? "■" : "🎙️"}
          </span>
        </button>

        <button
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).classList.remove("animate-pop");
            void e.currentTarget.offsetWidth;
            (e.currentTarget as HTMLButtonElement).classList.add("animate-pop");
            burstAt(e, getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#4f46e5");
            playReversed();
          }}
          disabled={!reversedUrl}
          className="h-12 px-5 rounded-full border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-40 animate-pop"
          aria-label="Play reversed audio"
          title="Play reversed audio"
        >
          Play reversed
        </button>
      </div>

      {errorMessage && (
        <span className="sr-only">{errorMessage}</span>
      )}
    </div>
  );
}

function getSupportedMimeType(): string | null {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return null;
}