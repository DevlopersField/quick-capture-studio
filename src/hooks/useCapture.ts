import { useCallback, useState } from "react";

export type CaptureMode = "screen" | "camera" | "both";

async function streamToCanvas(stream: MediaStream): Promise<HTMLCanvasElement> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => { video.onloadeddata = () => resolve(); });
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  return canvas;
}

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => t.stop());
}

async function captureScreen(): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const canvas = await streamToCanvas(stream);
  stopStream(stream);
  return canvas.toDataURL("image/png");
}

async function captureCamera(): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const canvas = await streamToCanvas(stream);
  stopStream(stream);
  return canvas.toDataURL("image/png");
}

async function captureBoth(): Promise<string> {
  const [screenStream, camStream] = await Promise.all([
    navigator.mediaDevices.getDisplayMedia({ video: true }),
    navigator.mediaDevices.getUserMedia({ video: true }),
  ]);
  const [screenCanvas, camCanvas] = await Promise.all([
    streamToCanvas(screenStream),
    streamToCanvas(camStream),
  ]);
  stopStream(screenStream);
  stopStream(camStream);

  const combined = document.createElement("canvas");
  combined.width = screenCanvas.width;
  combined.height = screenCanvas.height;
  const ctx = combined.getContext("2d")!;
  ctx.drawImage(screenCanvas, 0, 0);

  const pipWidth = combined.width * 0.22;
  const pipHeight = pipWidth * (camCanvas.height / camCanvas.width);
  const pad = 24;
  const pipX = combined.width - pipWidth - pad;
  const pipY = combined.height - pipHeight - pad;
  const radius = 14;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pipX + radius, pipY);
  ctx.arcTo(pipX + pipWidth, pipY, pipX + pipWidth, pipY + pipHeight, radius);
  ctx.arcTo(pipX + pipWidth, pipY + pipHeight, pipX, pipY + pipHeight, radius);
  ctx.arcTo(pipX, pipY + pipHeight, pipX, pipY, radius);
  ctx.arcTo(pipX, pipY, pipX + pipWidth, pipY, radius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(camCanvas, pipX, pipY, pipWidth, pipHeight);
  ctx.restore();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#00d4ff";
  ctx.stroke();

  return combined.toDataURL("image/png");
}

const runners: Record<CaptureMode, () => Promise<string>> = {
  screen: captureScreen,
  camera: captureCamera,
  both: captureBoth,
};

export function useCapture() {
  const [capturing, setCapturing] = useState<CaptureMode | null>(null);

  const capture = useCallback(async (mode: CaptureMode): Promise<string | null> => {
    setCapturing(mode);
    try {
      return await runners[mode]();
    } catch {
      return null; // permission denied or cancelled
    } finally {
      setCapturing(null);
    }
  }, []);

  return { capturing, capture };
}
