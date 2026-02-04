import { useState, useRef, useCallback, useEffect } from "react";
import { Phone, Mic, Check, X, Loader2 } from "lucide-react";

interface CallInterfaceProps {
  interviewerName?: string;
  isSpeaking: boolean; // AI is currently speaking
  isThinking: boolean; // AI is processing
  disabled?: boolean;
  callDuration: number; // seconds since call started
  onSend: (message: string) => void;
  onTranscribe: (audio: Blob) => Promise<string>;
}

export function CallInterface({
  interviewerName = "Interviewer",
  isSpeaking,
  isThinking,
  disabled = false,
  callDuration,
  onSend,
  onTranscribe,
}: CallInterfaceProps) {
  const [micState, setMicState] = useState<"idle" | "recording" | "transcribing" | "sent">("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset to idle when isThinking takes over from "sent" state
  useEffect(() => {
    if (micState === "sent" && isThinking) {
      setMicState("idle");
    }
  }, [micState, isThinking]);

  // Recording duration timer
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (micState !== "idle" || disabled) return;
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
      // Microphone access denied
    }
  }, [micState, disabled]);

  // Confirm recording
  const handleConfirmRecording = useCallback(() => {
    if (micState !== "recording" || !mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      if (blob.size > 0 && onTranscribe) {
        setMicState("transcribing");
        try {
          const text = await onTranscribe(blob);
          if (text.trim()) {
            onSend(text.trim());
            setMicState("sent"); // Wait for isThinking to take over
          } else {
            setMicState("idle");
          }
        } catch {
          setMicState("idle");
        }
      } else {
        setMicState("idle");
      }
    };

    recorder.stop();
  }, [micState, onTranscribe, onSend]);

  // Cancel recording
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

  const isActive = isSpeaking || isThinking || micState === "sent" || micState === "transcribing";

  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-b-[16px] bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)] p-8">
      {/* Call duration */}
      <div className="mb-6 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isActive ? "bg-[var(--color-green)] animate-pulse" : "bg-[var(--color-text-muted)]"}`} />
        <span className="text-[13px] tabular-nums text-[var(--color-text-secondary)]">
          {formatTime(callDuration)}
        </span>
      </div>

      {/* Phone avatar with pulse animation */}
      <div className="relative mb-6">
        {/* Pulse rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-green)]/20" style={{ animationDuration: "1.5s" }} />
            <div className="absolute -inset-4 animate-ping rounded-full bg-[var(--color-green)]/10" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
          </>
        )}

        {/* Avatar circle */}
        <div className={`relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300 ${
          isSpeaking
            ? "bg-[var(--color-green)] shadow-[0_0_40px_var(--color-green)]"
            : (isThinking || micState === "sent" || micState === "transcribing")
              ? "bg-[var(--color-dark)] animate-pulse"
              : "bg-[var(--color-dark)]"
        }`}>
          {(isThinking || micState === "sent") ? (
            <Loader2 size={48} className="text-white animate-spin" />
          ) : (
            <Phone
              size={48}
              className={`text-white transition-transform duration-150 ${isSpeaking ? "animate-[shake_0.15s_ease-in-out_infinite]" : ""}`}
            />
          )}
        </div>
      </div>

      {/* Interviewer name */}
      <h2 className="mb-2 text-[20px] font-semibold text-[var(--color-text-primary)]">
        {interviewerName}
      </h2>

      {/* Status text */}
      <p className="mb-8 text-[14px] text-[var(--color-text-secondary)]">
        {isSpeaking
          ? "Speaking..."
          : (isThinking || micState === "sent")
            ? "Thinking..."
            : micState === "transcribing"
              ? "Processing..."
              : micState === "recording"
                ? "Listening..."
                : "Your turn to speak"}
      </p>

      {/* Mic controls */}
      <div className="flex flex-col items-center gap-4">
        {micState === "idle" && !isThinking && !isSpeaking && (
          <button
            onClick={handleStartRecording}
            disabled={disabled}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-green)] shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-40 disabled:hover:scale-100"
          >
            <Mic size={36} className="text-white" />
          </button>
        )}

        {/* Show nothing for mic when thinking/sent - the avatar shows the spinner */}
        {(micState === "sent" || ((micState === "idle") && (isThinking || isSpeaking))) && (
          <div className="h-20" /> // Spacer to maintain layout
        )}

        {micState === "recording" && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancelRecording}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 transition-colors hover:bg-red-500/30"
            >
              <X size={24} className="text-red-400" />
            </button>

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 shadow-lg animate-pulse">
              <Mic size={36} className="text-white" />
            </div>

            <button
              onClick={handleConfirmRecording}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-green)]/20 transition-colors hover:bg-[var(--color-green)]/30"
            >
              <Check size={24} className="text-[var(--color-green)]" />
            </button>
          </div>
        )}

        {micState === "transcribing" && (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-dark)]">
            <Loader2 size={36} className="animate-spin text-white" />
          </div>
        )}

        {/* Helper text */}
        <span className="text-[12px] text-[var(--color-text-muted)]">
          {micState === "recording"
            ? `Recording ${formatTime(recordSeconds)} • Tap ✓ to send`
            : micState === "transcribing"
              ? "Processing your response..."
              : (micState === "sent" || isThinking)
                ? "Waiting for response..."
                : isSpeaking
                  ? "Interviewer is speaking"
                  : "Tap to speak"}
        </span>
      </div>
    </div>
  );
}
