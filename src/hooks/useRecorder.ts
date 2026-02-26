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
  const micStreamRef = useRef<MediaStream | null>(null);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const pauseTimer = () => {
    stopTimer();
  };

  const startRecording = useCallback(async () => {
    try {
      // Get screen capture stream
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true, // system audio if supported
      });

      // Try to get microphone audio
      let micStream: MediaStream | null = null;
      if (!isMuted) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
        } catch {
          // Mic access denied — continue without mic
          console.warn("Microphone access denied, recording without mic audio");
        }
      }

      // Merge all tracks into a single stream
      const combinedStream = new MediaStream();

      // Add video track from display
      displayStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

      // Add audio tracks — prefer combining system + mic via AudioContext
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // System audio (if available from getDisplayMedia)
      const systemAudioTracks = displayStream.getAudioTracks();
      if (systemAudioTracks.length > 0) {
        const systemSource = audioContext.createMediaStreamSource(
          new MediaStream(systemAudioTracks)
        );
        systemSource.connect(destination);
      }

      // Mic audio
      if (micStream) {
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);
      }

      // Add merged audio track
      destination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));

      streamRef.current = displayStream;

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setState("finished");
        stopTimer();

        // Clean up mic stream
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      };

      recorder.start(1000); // collect data every second for smooth pausing
      mediaRecorderRef.current = recorder;
      setState("recording");
      setElapsed(0);
      startTimer();

      // Handle user stopping share via browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };
    } catch {
      // User cancelled the screen share dialog
    }
  }, [isMuted]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
      pauseTimer();
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setState("recording");
      startTimer();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(p => {
      const newMuted = !p;
      // Toggle mic tracks in real time
      micStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
      return newMuted;
    });
  }, []);

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

  useEffect(() => () => {
    stopTimer();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return {
    state, elapsed, isMuted, videoUrl,
    startRecording, stopRecording, pauseRecording, resumeRecording,
    toggleMute, downloadVideo, reset, formatTime,
  };
}
