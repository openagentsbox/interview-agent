import { useState, useEffect } from "react";
import { Bot, Volume2, Eye, EyeOff, Loader2, Square } from "lucide-react";

interface AIMessageProps {
  text: string;
  question?: string;
  hidden?: boolean;
  audioState?: "loading" | "playing";
  onPlay?: () => void;
  onStop?: () => void;
}

export function AIMessage({ text, question, hidden = false, audioState, onPlay, onStop }: AIMessageProps) {
  const [revealed, setRevealed] = useState(false);

  // Reset revealed when global hidden toggle changes
  useEffect(() => {
    setRevealed(false);
  }, [hidden]);

  const isHidden = hidden && !revealed;

  return (
    <div className="flex w-full gap-3">
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-dark)]">
        <Bot size={20} className="text-white" />
      </div>

      {/* Bubble */}
      <div className="flex w-[520px] flex-col gap-3 rounded-[16px] bg-[var(--color-surface)] p-4 shadow-[0_2px_8px_#0000000a]">
        {isHidden ? (
          <>
            {/* Blurred skeleton */}
            <div className="flex flex-col gap-2 opacity-15">
              <div className="h-3 w-full rounded bg-[var(--color-text-muted)]" />
              <div className="h-3 w-[78%] rounded bg-[var(--color-text-muted)]" />
              <div className="h-3 w-[86%] rounded bg-[var(--color-text-muted)]" />
              <div className="h-3 w-[57%] rounded bg-[var(--color-text-muted)]" />
            </div>
            <div className="flex items-center gap-2">
              {audioState === "loading" ? (
                <button disabled className="flex items-center gap-1.5 rounded-lg bg-[var(--color-hover)] px-3.5 py-0 h-8 w-fit opacity-70">
                  <Loader2 size={14} className="animate-spin text-[var(--color-text-secondary)]" />
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Loading...</span>
                </button>
              ) : audioState === "playing" ? (
                <button onClick={onStop} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-green)]/15 px-3.5 py-0 h-8 w-fit">
                  <Square size={12} className="text-[var(--color-green)] fill-[var(--color-green)]" />
                  <span className="text-[12px] font-medium text-[var(--color-green)]">Stop</span>
                </button>
              ) : (
                <button onClick={onPlay} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-hover)] px-3.5 py-0 h-8 w-fit">
                  <Volume2 size={14} className="text-[var(--color-text-secondary)]" />
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Play</span>
                </button>
              )}
              <button onClick={() => setRevealed(true)} className="flex items-center gap-1.5 rounded-lg px-2 py-0 h-8 w-fit hover:bg-[var(--color-hover)]">
                <Eye size={14} className="text-[var(--color-text-muted)]" />
                <span className="text-[12px] font-medium text-[var(--color-text-muted)]">Reveal</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[14px] leading-[1.5] text-[var(--color-text-primary)]">{text}</p>
            {question && (
              <p className="text-[14px] font-medium italic leading-[1.5] text-[var(--color-text-primary)]">
                {question}
              </p>
            )}
            <div className="flex items-center gap-2">
              {audioState === "loading" ? (
                <button disabled className="flex items-center gap-1.5 rounded-md bg-[var(--color-hover)] px-2.5 py-0 h-7 opacity-70">
                  <Loader2 size={14} className="animate-spin text-[var(--color-text-secondary)]" />
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Loading...</span>
                </button>
              ) : audioState === "playing" ? (
                <button onClick={onStop} className="flex items-center gap-1.5 rounded-md bg-[var(--color-green)]/15 px-2.5 py-0 h-7">
                  <Square size={12} className="text-[var(--color-green)] fill-[var(--color-green)]" />
                  <span className="text-[12px] font-medium text-[var(--color-green)]">Stop</span>
                </button>
              ) : (
                <button onClick={onPlay} className="flex items-center gap-1.5 rounded-md bg-[var(--color-hover)] px-2.5 py-0 h-7">
                  <Volume2 size={14} className="text-[var(--color-text-secondary)]" />
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Play</span>
                </button>
              )}
              {hidden && revealed && (
                <button onClick={() => setRevealed(false)} className="flex items-center gap-1.5 rounded-md px-2 py-0 h-7 hover:bg-[var(--color-hover)]">
                  <EyeOff size={14} className="text-[var(--color-text-muted)]" />
                  <span className="text-[12px] font-medium text-[var(--color-text-muted)]">Hide</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
