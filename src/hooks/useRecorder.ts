import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "finished";

export function useRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: !isMuted,
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setState("finished");
        stopTimer();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
      setElapsed(0);
      startTimer();

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };
    } catch {
      // User cancelled
    }
  }, [isMuted]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const toggleMute = useCallback(() => setIsMuted(p => !p), []);

  const downloadVideo = useCallback(() => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "1clickcapture-recording.webm";
    a.click();
  }, [videoUrl]);

  const reset = useCallback(() => {
    setState("idle");
    setElapsed(0);
    setVideoUrl(null);
    stopTimer();
  }, []);

  useEffect(() => () => stopTimer(), []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return {
    state, elapsed, isMuted, videoUrl,
    startRecording, stopRecording, toggleMute,
    downloadVideo, reset, formatTime,
  };
}
