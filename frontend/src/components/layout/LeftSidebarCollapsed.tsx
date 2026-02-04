import { PanelLeft, Plus, Music } from "lucide-react";

interface LeftSidebarCollapsedProps {
  onExpand?: () => void;
}

export function LeftSidebarCollapsed({ onExpand }: LeftSidebarCollapsedProps) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <button onClick={onExpand} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]">
        <PanelLeft size={18} className="text-[var(--color-text-secondary)]" />
      </button>
      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-dark)]">
        <Plus size={16} className="text-white" />
      </button>
      <div className="h-px w-6 bg-[var(--color-border)]" />
      <div className="flex flex-col items-center gap-2">
        {[
          { letter: "G", color: "#4285F4" },
          { letter: "N", color: "#E50914" },
          { letter: "in", color: "#0A66C2" },
          { letter: "", color: "#1DB954", isIcon: true },
        ].map((c, i) => (
          <div
            key={i}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: c.color }}
          >
            {c.isIcon ? <Music size={14} /> : <span className={`font-semibold ${c.letter.length > 1 ? "text-[12px]" : "text-[14px]"}`}>{c.letter}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
