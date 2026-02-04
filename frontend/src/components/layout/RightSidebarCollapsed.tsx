import { PanelRight, Settings, User } from "lucide-react";

interface RightSidebarCollapsedProps {
  onExpand?: () => void;
}

export function RightSidebarCollapsed({ onExpand }: RightSidebarCollapsedProps) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <button onClick={onExpand} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]">
        <PanelRight size={18} className="text-[var(--color-text-secondary)]" />
      </button>
      <div className="h-px w-6 bg-[var(--color-border)]" />
      <div className="flex flex-col items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]">
          <Settings size={18} className="text-[var(--color-text-secondary)]" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]">
          <User size={18} className="text-[var(--color-text-secondary)]" />
        </button>
      </div>
    </div>
  );
}
