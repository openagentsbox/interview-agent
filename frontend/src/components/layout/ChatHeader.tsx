import { PanelLeft, PanelRight } from "lucide-react";

interface ChatHeaderProps {
  company: string;
  status?: string;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  badge?: React.ReactNode;
}

export function ChatHeader({ company, status = "Interview Session Active", onToggleLeft, onToggleRight, badge }: ChatHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between rounded-t-[16px] border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
      <div className="flex items-center gap-3">
        <button onClick={onToggleLeft} className="flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-[var(--color-hover)]">
          <PanelLeft size={20} className="text-[var(--color-text-secondary)]" />
        </button>
        <div className="flex flex-col gap-0.5">
          <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">{company}</span>
          <span className="text-[12px] text-[var(--color-text-secondary)]">{status}</span>
        </div>
        {badge}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onToggleRight} className="flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-[var(--color-hover)]">
          <PanelRight size={20} className="text-[var(--color-text-secondary)]" />
        </button>
      </div>
    </div>
  );
}

export function RealModeBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--color-green-light)] px-2.5 py-1">
      <span className="text-[12px] font-semibold text-[var(--color-green)]">🎤 Real Mode</span>
    </div>
  );
}
