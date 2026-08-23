import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "finished";
export type RecordingMode = "screen" | "camera" | "both";
export type BubbleShape = "circle" | "square";
export interface PipRect {
  xPct: number; // 0-1, left edge as fraction of frame width
  yPct: number; // 0-1, top edge as fraction of frame height
  wPct: number; // 0-1, square size as fraction of frame width
  shape: BubbleShape;
  borderColor: string;
}

const DEFAULT_PIP_RECT: PipRect = { xPct: 0.74, yPct: 0.68, wPct: 0.18, shape: "circle", borderColor: "#00d4ff" };

function drawRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dx: number, dy: number, dw: number, dh: number
) {
  const vw = video.videoWidth || 4;
  const vh = video.videoHeight || 3;
  const vAspect = vw / vh;
  const dAspect = dw / dh;
  let sx: number, sy: number, sw: number, sh: number;
  if (vAspect > dAspect) {
    sh = vh; sw = vh * dAspect; sx = (vw - sw) / 2; sy = 0;
  } else {
    sw = vw; sh = vw / dAspect; sx = 0; sy = (vh - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function useRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<RecordingMode>("screen");
  const [camPreviewStream, setCamPreviewStream] = useState<MediaStream | null>(null);
  const [pipRect, setPipRectState] = useState<PipRect>(DEFAULT_PIP_RECT);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // display (screen) stream
  const camStreamRef = useRef<MediaStream | null>(null); // webcam stream
  const micStreamRef = useRef<MediaStream | null>(null);
  const compositeCleanupRef = useRef<(() => void) | null>(null);
  const recordingMimeTypeRef = useRef<string>("video/webm");
  const pipRectRef = useRef<PipRect>(DEFAULT_PIP_RECT);

  const setPipRect = useCallback((update: PipRect | ((prev: PipRect) => PipRect)) => {
    setPipRectState(prev => {
      const next = typeof update === "function" ? (update as (p: PipRect) => PipRect)(prev) : update;
      pipRectRef.current = next;
      return next;
    });
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const pauseTimer = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  const startRecording = useCallback(async (recordMode: RecordingMode = "screen") => {
    console.log("Starting recording process...", recordMode);
    setMode(recordMode);
    try {
      if (!navigator.mediaDevices) {
        throw new Error(
          "Media Devices API is not available. This usually happens if you are not using a Secure Context (HTTPS or localhost). " +
          "Current origin: " + window.location.origin
        );
      }

      let displayStream: MediaStream | null = null;
      let camStream: MediaStream | null = null;

      // Screen source
      if (recordMode === "screen" || recordMode === "both") {
        const videoConstraints: any = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        };
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { ...videoConstraints, displaySurface: "monitor" },
            audio: true,
          });
        } catch (audioErr) {
          console.warn("Retrying without system audio...", audioErr);
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: videoConstraints,
            audio: false,
          });
        }
        if (!displayStream || displayStream.getVideoTracks().length === 0) {
          throw new Error("No video tracks obtained from display media");
        }
        streamRef.current = displayStream;
      }

      // Camera source
      if (recordMode === "camera" || recordMode === "both") {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        });
        camStreamRef.current = camStream;
        setCamPreviewStream(camStream);
      }

      // Resolve the video track that will actually be recorded
      let finalVideoTrack: MediaStreamTrack;

      if (recordMode === "screen") {
        finalVideoTrack = displayStream!.getVideoTracks()[0];
      } else if (recordMode === "camera") {
        finalVideoTrack = camStream!.getVideoTracks()[0];
      } else {
        // "both" — composite screen + webcam PiP bubble onto a live canvas
        const screenVideo = document.createElement("video");
        screenVideo.srcObject = displayStream!;
        screenVideo.muted = true;
        await screenVideo.play();

        const camVideo = document.createElement("video");
        camVideo.srcObject = camStream!;
        camVideo.muted = true;
        await camVideo.play();

        const canvas = document.createElement("canvas");
        canvas.width = screenVideo.videoWidth || 1920;
        canvas.height = screenVideo.videoHeight || 1080;
        const ctx = canvas.getContext("2d")!;
        let raf: number;

        const draw = () => {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

          // Live-draggable/resizable webcam bubble — reads the current
          // position/size/shape every frame so on-screen drags move it in real time.
          const rect = pipRectRef.current;
          const size = canvas.width * rect.wPct;
          const pipX = rect.xPct * canvas.width;
          const pipY = rect.yPct * canvas.height;
          const isCircle = rect.shape === "circle";
          const radius = isCircle ? size / 2 : size * 0.14;

          const clipPath = () => {
            if (isCircle) {
              ctx.beginPath();
              ctx.arc(pipX + size / 2, pipY + size / 2, size / 2, 0, Math.PI * 2);
              ctx.closePath();
            } else {
              drawRoundedRectPath(ctx, pipX, pipY, size, size, radius);
            }
          };

          ctx.save();
          clipPath();
          ctx.clip();
          drawCoverImage(ctx, camVideo, pipX, pipY, size, size);
          ctx.restore();

          ctx.lineWidth = Math.max(3, size * 0.015);
          ctx.strokeStyle = rect.borderColor;
          clipPath();
          ctx.stroke();

          raf = requestAnimationFrame(draw);
        };
        draw();

        compositeCleanupRef.current = () => {
          cancelAnimationFrame(raf);
          screenVideo.pause();
          camVideo.pause();
        };

        const canvasStream = canvas.captureStream(30);
        finalVideoTrack = canvasStream.getVideoTracks()[0];
      }

      // Microphone (shared across all modes)
      let micStream: MediaStream | null = null;
      if (!isMuted) {
        try {
          console.log("Requesting microphone media...");
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
        } catch (micErr) {
          console.warn("Microphone access denied, recording without mic audio", micErr);
        }
      }

      const combinedStream = new MediaStream();
      combinedStream.addTrack(finalVideoTrack);

      const systemAudioTracks = displayStream?.getAudioTracks() ?? [];

      if (systemAudioTracks.length > 0 || micStream) {
        try {
          const audioContext = new AudioContext();
          const destination = audioContext.createMediaStreamDestination();

          if (systemAudioTracks.length > 0) {
            const systemSource = audioContext.createMediaStreamSource(
              new MediaStream(systemAudioTracks)
            );
            systemSource.connect(destination);
          }

          if (micStream) {
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);
          }

          destination.stream.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
        } catch (audioErr) {
          console.error("Failed to merge audio streams:", audioErr);
          systemAudioTracks.forEach(track => combinedStream.addTrack(track));
          micStream?.getAudioTracks().forEach(track => combinedStream.addTrack(track));
        }
      }

      // Prefer hardware-accelerated H.264 (matches native macOS encoder quality)
      // before falling back to software VP9/VP8.
      const mimeTypes = [
        "video/mp4;codecs=avc1.640028",
        "video/webm;codecs=h264,opus",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || "";
      console.log("Initializing MediaRecorder with mimeType:", mimeType || "default");

      const recorder = new MediaRecorder(combinedStream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 20_000_000,
        audioBitsPerSecond: 192_000,
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        console.log("MediaRecorder stopped. Chunks:", chunksRef.current.length);
        const outputType = mimeType || "video/webm";
        recordingMimeTypeRef.current = outputType;
        const blob = new Blob(chunksRef.current, { type: outputType });
        setVideoUrl(URL.createObjectURL(blob));
        setState("finished");
        stopTimer();

        compositeCleanupRef.current?.();
        compositeCleanupRef.current = null;

        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        camStreamRef.current?.getTracks().forEach(t => t.stop());
        camStreamRef.current = null;
        setCamPreviewStream(null);
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      };

      recorder.start(1000); // collect data every second for smooth pausing
      mediaRecorderRef.current = recorder;
      setState("recording");
      setElapsed(0);
      startTimer();
      console.log("Recording started successfully.");

      // Handle user stopping share via browser UI (or unplugging the camera)
      finalVideoTrack.onended = () => {
        console.log("Source track ended by user.");
        if (recorder.state !== "inactive") recorder.stop();
      };
    } catch (err) {
      console.error("Failed to start recording:", err);
      compositeCleanupRef.current?.();
      compositeCleanupRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
      setCamPreviewStream(null);
      setState("idle");
    }
  }, [isMuted, startTimer, stopTimer]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
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
    const ext = recordingMimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `1clickcapture-recording.${ext}`;
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
    compositeCleanupRef.current?.();
    streamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return {
    state, elapsed, isMuted, videoUrl, mode,
    camPreviewStream, pipRect, setPipRect,
    startRecording, stopRecording, pauseRecording, resumeRecording,
    toggleMute, downloadVideo, reset, formatTime,
    setVideoUrl, setState
  };
}
