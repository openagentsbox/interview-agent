import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, ArrowUp, Volume2, EyeOff, Loader2, Check, X } from "lucide-react";

interface ChatInputProps {
  showToggles?: boolean;
  autoSpeak?: boolean;
  hideInterviewer?: boolean;
  disabled?: boolean;
  voiceOnly?: boolean; // Real mode: only show microphone, no text input
  onToggleAutoSpeak?: () => void;
  onToggleHide?: () => void;
  onSend?: (message: string) => void;
  onTranscribe?: (audio: Blob) => Promise<string>;
}

export function ChatInput({
  showToggles = true,
  autoSpeak = true,
  hideInterviewer = false,
  disabled = false,
  voiceOnly = false,
  onToggleAutoSpeak,
  onToggleHide,
  onSend,
  onTranscribe,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Recording state: "idle" | "recording" | "transcribing"
  const [micState, setMicState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duration timer
  useEffect(() => {
    if (micState === "recording") {
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [micState]);

  // Auto-resize textarea
  function autoResize() {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"; // Max 200px
    }
  }

  // Auto-resize when value changes (e.g., from voice transcription)
  useEffect(() => {
    autoResize();
  }, [value]);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled || micState !== "idle") return;
    onSend?.(trimmed);
    setValue("");
    // Reset height after send
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      inputRef.current?.focus();
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (micState !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setMicState("recording");
    } catch {
      // Microphone access denied or unavailable
    }
  }, [micState]);

  // Confirm recording → stop + transcribe
  const handleConfirmRecording = useCallback(() => {
    if (micState !== "recording" || !mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      // Release mic
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      if (blob.size > 0 && onTranscribe) {
        setMicState("transcribing");
        try {
          const text = await onTranscribe(blob);
          if (text.trim()) {
            // In voiceOnly mode, send directly; otherwise fill input
            if (voiceOnly) {
              onSend?.(text.trim());
            } else {
              setValue(text.trim());
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }
        } catch {
          // transcription failed
        } finally {
          setMicState("idle");
        }
      } else {
        setMicState("idle");
      }
    };

    recorder.stop();
  }, [micState, onTranscribe, voiceOnly, onSend]);

  // Cancel recording → discard
  const handleCancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setMicState("idle");
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-2 bg-[var(--color-bg)] px-8 pb-4 pt-3">
      {/* Input Container */}
      {micState === "recording" ? (
        /* ── Recording Mode: entire row transforms ── */
        <div className="flex min-h-14 items-center gap-3 rounded-[16px] border border-red-500/50 bg-[var(--color-surface)] px-5 py-2 pr-2 shadow-[0_2px_12px_#00000008]">
          {/* Red pulsing dot + label + timer */}
          <div className="flex flex-1 items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-[14px] font-medium text-red-400">Recording...</span>
            <span className="text-[13px] tabular-nums text-[var(--color-text-muted)]">{formatTime(recordSeconds)}</span>
          </div>
          {/* Confirm & Cancel */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelRecording}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-hover)] hover:bg-red-500/20 transition-colors"
            >
              <X size={20} className="text-[var(--color-text-muted)]" />
            </button>
            <button
              onClick={handleConfirmRecording}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-green)] hover:opacity-90 transition-opacity"
            >
              <Check size={20} className="text-white" />
            </button>
          </div>
        </div>
      ) : micState === "transcribing" ? (
        /* ── Transcribing Mode ── */
        <div className="flex min-h-14 items-center justify-center gap-3 rounded-[16px] border border-[var(--color-green)]/40 bg-[var(--color-surface)] px-5 py-2 shadow-[0_2px_12px_#00000008]">
          <Loader2 size={20} className="animate-spin text-[var(--color-green)]" />
          <span className="text-[14px] text-[var(--color-text-muted)]">Transcribing your speech...</span>
        </div>
      ) : (
        /* ── Normal Input Mode ── */
        voiceOnly ? (
          /* Voice Only Mode: Large mic button only */
          <div className="flex min-h-14 items-center justify-center rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 shadow-[0_2px_12px_#00000008]">
            <button
              onClick={handleStartRecording}
              disabled={disabled}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-green)] hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {disabled ? (
                <Loader2 size={28} className="animate-spin text-white" />
              ) : (
                <Mic size={28} className="text-white" />
              )}
            </button>
          </div>
        ) : (
          /* Text + Voice Mode */
          <div className="flex flex-col rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_12px_#00000008]">
            {/* Text input row */}
            <div className="flex min-h-[48px] items-end gap-3 px-5 py-3 pr-2">
              <textarea
                ref={inputRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  autoResize();
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder="Type your response..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-[14px] leading-[1.5] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:opacity-50"
                style={{ minHeight: "24px", maxHeight: "200px" }}
              />
              <div className="flex items-center gap-2 pb-0.5">
                <button
                  onClick={handleStartRecording}
                  disabled={disabled}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-green-bg)] disabled:opacity-40"
                >
                  <Mic size={20} className="text-[var(--color-green)]" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={disabled || !value.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-dark)] disabled:opacity-40"
                >
                  {disabled ? (
                    <Loader2 size={20} className="animate-spin text-white" />
                  ) : (
                    <ArrowUp size={20} className="text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Toggles row - inside input box, left aligned */}
            {showToggles && (
              <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-4 py-2">
                <button
                  onClick={onToggleAutoSpeak}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${
                    autoSpeak
                      ? "bg-[var(--color-green-bg)] text-[var(--color-green)]"
                      : "hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <Volume2 size={14} />
                  <span className="text-[11px] font-medium">Auto Speak</span>
                </button>

                <button
                  onClick={onToggleHide}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${
                    hideInterviewer
                      ? "bg-[var(--color-dark)] text-white"
                      : "hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <EyeOff size={14} />
                  <span className="text-[11px] font-medium">Hide Text</span>
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* Only show hints for recording and voiceOnly modes */}
      {(micState === "recording" || voiceOnly) && (
        <span className="text-center text-[11px] text-[var(--color-text-muted)]">
          {micState === "recording"
            ? "Click ✓ to confirm, ✕ to cancel"
            : "Click the microphone to record your answer"}
        </span>
      )}
    </div>
  );
}
