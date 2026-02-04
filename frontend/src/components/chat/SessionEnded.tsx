import { CircleCheck, MessageCircle, FileText } from "lucide-react";

interface SessionEndedProps {
  questions?: number;
  onGenerateReport?: () => void;
}

export function SessionEnded({ questions = 0, onGenerateReport }: SessionEndedProps) {
  return (
    <div className="flex flex-col items-center gap-4 bg-[var(--color-bg)] px-8 pb-8 pt-6">
      {/* Divider with badge */}
      <div className="flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-hover)] px-3 py-1">
          <CircleCheck size={14} className="text-[var(--color-green)]" />
          <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Interview Ended</span>
        </div>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Session info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <MessageCircle size={14} className="text-[var(--color-text-muted)]" />
          <span className="text-[13px] text-[var(--color-text-muted)]">Rounds: {questions}</span>
        </div>
      </div>

      {/* Generate Report Button */}
      <button
        onClick={onGenerateReport}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-dark)] text-white"
      >
        <FileText size={18} />
        <span className="text-[15px] font-semibold">Generate Evaluation Report</span>
      </button>
    </div>
  );
}
