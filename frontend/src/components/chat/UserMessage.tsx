import { SpellCheck, Sparkles } from "lucide-react";

interface UserMessageProps {
  text: string;
  initials?: string;
  onGrammar?: () => void;
  onScore?: () => void;
  grammarExpanded?: boolean;
  scoreExpanded?: boolean;
  grammarContent?: React.ReactNode;
  scoreContent?: React.ReactNode;
}

export function UserMessage({
  text,
  initials = "JD",
  onGrammar,
  onScore,
  grammarExpanded,
  scoreExpanded,
  grammarContent,
  scoreContent,
}: UserMessageProps) {
  return (
    <div className="flex w-full justify-end gap-3">
      {/* Bubble */}
      <div className="flex w-[480px] flex-col gap-3 rounded-[16px] bg-[var(--color-dark)] p-4">
        <p className="text-[14px] leading-[1.5] text-white">{text}</p>

        {/* Action Bar */}
        <div className="flex items-center gap-2">
          <button onClick={onGrammar} className="flex items-center gap-1.5 rounded-md bg-[#22C55E20] px-2.5 py-0 h-7">
            <SpellCheck size={14} className="text-[var(--color-green)]" />
            <span className="text-[12px] font-medium text-[var(--color-green)]">Grammar</span>
          </button>
          <button onClick={onScore} className="flex items-center gap-1.5 rounded-md bg-[var(--color-yellow-light)] px-2.5 py-0 h-7">
            <Sparkles size={14} className="text-[var(--color-yellow)]" />
            <span className="text-[12px] font-medium text-[var(--color-yellow)]">Score & Better</span>
          </button>
        </div>

        {/* Grammar Expanded Panel */}
        {grammarExpanded && grammarContent}

        {/* Score Expanded Panel */}
        {scoreExpanded && scoreContent}
      </div>

      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo)]">
        <span className="text-[14px] font-semibold text-white">{initials}</span>
      </div>
    </div>
  );
}

export function GrammarPanel() {
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl bg-[#22C55E15] p-3">
      <span className="text-[12px] font-semibold text-[var(--color-green)]">Grammar Correction</span>
      <p className="text-[13px] leading-[1.5] text-white/90">
        In my previous role, I worked on a recommendation system that needed to handle cold-start problems for new users...
      </p>
      <span className="text-[11px] italic text-white/50">No grammar issues found</span>
    </div>
  );
}

export function ScorePanel() {
  return (
    <div className="mt-1 flex flex-col gap-3 rounded-xl bg-[var(--color-yellow-light)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[var(--color-yellow)]">Score</span>
        <span className="rounded-md bg-[var(--color-yellow)] px-2 py-0.5 text-[11px] font-bold text-black">7.5/10</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[12px] text-white/80">✓ Clear problem identification</span>
        <span className="text-[12px] text-white/80">✓ Relevant experience mentioned</span>
        <span className="text-[12px] text-[var(--color-yellow)]">△ Could elaborate on specific techniques</span>
      </div>
      <div className="h-px bg-white/10" />
      <div className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-[var(--color-blue)]">Better Response</span>
        <p className="text-[12px] italic leading-[1.5] text-white/70">
          "In my previous role at X, I built a collaborative-filtering recommendation engine that addressed cold-start by leveraging user metadata and content-based features..."
        </p>
      </div>
    </div>
  );
}
