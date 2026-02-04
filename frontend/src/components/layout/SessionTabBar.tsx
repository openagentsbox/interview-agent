import { MessageCircle, Plus, Trash2, Loader2 } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  active?: boolean;
}

interface SessionTabBarProps {
  tabs: Tab[];
  deletingId?: string;
  onNewTab?: () => void;
  onCloseTab?: (id: string) => void;
  onSelectTab?: (id: string) => void;
}

export function SessionTabBar({ tabs, deletingId, onNewTab, onCloseTab, onSelectTab }: SessionTabBarProps) {
  return (
    <div className="flex h-11 items-end gap-1 bg-[var(--color-surface)] px-6">
      {tabs.map((tab) => {
        const isDeleting = deletingId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !isDeleting && onSelectTab?.(tab.id)}
            disabled={isDeleting}
            className={`group flex h-9 items-center gap-2 rounded-t-[10px] px-3.5 py-2 transition-opacity ${
              isDeleting
                ? "opacity-50"
                : tab.active
                  ? "bg-[var(--color-bg)]"
                  : "hover:bg-[var(--color-bg)]/50"
            }`}
          >
            <MessageCircle
              size={14}
              className={tab.active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}
            />
            <span
              className={`text-[13px] ${
                tab.active
                  ? "font-medium text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              {tab.label}
            </span>
            {tab.active && (
              isDeleting ? (
                <Loader2 size={14} className="animate-spin text-red-400" />
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onCloseTab?.(tab.id); }}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-red-500/20 transition-colors"
                  title="Delete session"
                >
                  <Trash2 size={13} className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors" />
                </button>
              )
            )}
          </button>
        );
      })}
      <button onClick={onNewTab} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]">
        <Plus size={16} className="text-[var(--color-text-secondary)]" />
      </button>
    </div>
  );
}
