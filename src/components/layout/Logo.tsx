import { Camera } from "lucide-react";

interface LogoProps {
  className?: string;
  isRecording?: boolean;
}

export function Logo({ className = "", isRecording = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
        <Camera size={16} className="text-primary-foreground" />
      </div>
      <span className="text-lg font-bold text-foreground tracking-tight">1ClickCapture</span>
    </div>
  );
}
