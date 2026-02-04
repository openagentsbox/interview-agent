import { Play } from "lucide-react";

interface AudioPlayerProps {
  duration: string;
  variant?: "light" | "dark";
  barHeights?: number[];
}

const defaultLightBars = [8, 16, 24, 12, 20, 28, 14, 22, 10, 18, 26, 8, 16, 22];
const defaultDarkBars = [10, 20, 14, 26, 8, 18, 24, 12, 22, 16, 28, 10];

export function AudioPlayer({ duration, variant = "light", barHeights }: AudioPlayerProps) {
  const bars = barHeights ?? (variant === "light" ? defaultLightBars : defaultDarkBars);
  const isLight = variant === "light";

  return (
    <div className="flex w-full items-center gap-3">
      {/* Play Button */}
      <button
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isLight ? "bg-[var(--color-dark)]" : "bg-white/20"
        }`}
      >
        <Play size={16} className="text-white" />
      </button>

      {/* Waveform */}
      <div className="flex flex-1 items-center gap-[3px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-sm ${isLight ? "bg-[#C5C3BF]" : "bg-white/40"}`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Duration */}
      <span className={`shrink-0 text-[12px] font-medium ${isLight ? "text-[var(--color-text-secondary)]" : "text-white/60"}`}>
        {duration}
      </span>
    </div>
  );
}
