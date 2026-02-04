import { Bot, Github } from "lucide-react";

export function TopNavBar() {
  return (
    <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-green)]">
          <Bot size={16} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          AI Interview Coach
        </span>
      </div>

      {/* Right: GitHub + User */}
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/openagentsbox/interview-agent"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <Github size={20} />
        </a>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            Guest
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-text-muted)]">
            <span className="text-[13px] font-semibold text-white">G</span>
          </div>
        </div>
      </div>
    </div>
  );
}
