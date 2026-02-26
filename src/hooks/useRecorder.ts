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

  const startRecording = useCallback(async () => {
    console.log("Starting recording process...");
    try {
      if (!navigator.mediaDevices) {
        throw new Error(
          "Media Devices API is not available. This usually happens if you are not using a Secure Context (HTTPS or localhost). " +
          "Current origin: " + window.location.origin
        );
      }

      // Get screen capture stream
      console.log("Requesting display media (monitor preferred)...");
      let displayStream: MediaStream;

      const videoConstraints: any = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      };

      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            ...videoConstraints,
            displaySurface: "monitor",
          },
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
      console.log("Display media stream obtained:", displayStream.id);

      // Try to get microphone audio
      let micStream: MediaStream | null = null;
      if (!isMuted && navigator.mediaDevices) {
        try {
          console.log("Requesting microphone media...");
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          console.log("Microphone media granted:", micStream.id);
        } catch (micErr) {
          // Mic access denied — continue without mic
          console.warn("Microphone access denied, recording without mic audio", micErr);
        }
      }

      // Merge all tracks into a single stream
      const combinedStream = new MediaStream();

      // Add video track from display
      displayStream.getVideoTracks().forEach(track => {
        console.log("Adding video track:", track.label);
        combinedStream.addTrack(track);
      });

      // Add audio tracks — prefer combining system + mic via AudioContext
      const systemAudioTracks = displayStream.getAudioTracks();

      if (systemAudioTracks.length > 0 || micStream) {
        try {
          console.log("Initializing AudioContext for merging...");
          // Resume AudioContext if it's suspended
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }

          // System audio (if available from getDisplayMedia)
          if (systemAudioTracks.length > 0) {
            console.log("Adding system audio track to merge:", systemAudioTracks[0].label);
            const systemSource = audioContext.createMediaStreamSource(
              new MediaStream(systemAudioTracks)
            );
            systemSource.connect(destination);
          }

          // Mic audio
          if (micStream) {
            console.log("Adding mic audio track to merge:", micStream.getAudioTracks()[0]?.label);
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);
          }

          // Add merged audio track
          destination.stream.getAudioTracks().forEach(track => {
            console.log("Adding merged audio track:", track.label);
            combinedStream.addTrack(track);
          });
        } catch (audioErr) {
          console.error("Failed to merge audio streams:", audioErr);
          // Fallback: just add original audio tracks if merging fails
          systemAudioTracks.forEach(track => {
            console.log("Fallback: adding system audio track directly");
            combinedStream.addTrack(track);
          });
          micStream?.getAudioTracks().forEach(track => {
            console.log("Fallback: adding mic audio track directly");
            combinedStream.addTrack(track);
          });
        }
      }

      streamRef.current = displayStream;

      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || "";
      console.log("Initializing MediaRecorder with mimeType:", mimeType || "default");

      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : {});
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        console.log("MediaRecorder stopped. Chunks:", chunksRef.current.length);
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
      console.log("Recording started successfully.");

      // Handle user stopping share via browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        console.log("Display stream ended by user.");
        if (recorder.state !== "inactive") recorder.stop();
      };
    } catch (err) {
      console.error("Failed to start recording:", err);
      setState("idle");
    }
  }, [isMuted, startTimer, stopTimer]);

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
    setVideoUrl, setState
  };
}
