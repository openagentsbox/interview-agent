import { useState } from "react";
import { Plus, PanelLeftClose, Sparkles, ScanSearch, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Application } from "../../types/resume";
import type { MatchAnalysisResult } from "../../services/api";

interface LeftSidebarProps {
  companies: Application[];
  loadingCompanies?: boolean;
  activeCompanyId?: string;
  onSelectCompany?: (id: string) => void;
  onDeleteCompany?: (id: string) => void;
  onCollapse?: () => void;
  onAddCompany?: () => void;
  fitAnalysis?: MatchAnalysisResult | null;
  fitAnalysisLoading?: boolean;
  onAnalyzeFit?: () => void;
}

/** Generate a deterministic color from company name */
function nameToColor(name: string): string {
  const colors = [
    "#4285F4", "#E50914", "#0A66C2", "#1DB954",
    "#FF6900", "#7B61FF", "#00B4D8", "#E63946",
    "#2A9D8F", "#F77F00", "#6A4C93", "#1D3557",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function LeftSidebar({
  companies,
  loadingCompanies,
  activeCompanyId,
  onSelectCompany,
  onDeleteCompany,
  onCollapse,
  onAddCompany,
  fitAnalysis,
  fitAnalysisLoading,
  onAnalyzeFit,
}: LeftSidebarProps) {
  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">Applications</span>
        <button
          onClick={onCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]"
        >
          <PanelLeftClose size={18} className="text-[var(--color-text-secondary)]" />
        </button>
      </div>
      <div className="mx-4 border-b border-[var(--color-border)]" />

      {/* Add Company */}
      <div className="px-4 py-3">
        <button
          onClick={onAddCompany}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-dark)] text-white"
        >
          <Plus size={16} />
          <span className="text-[14px] font-medium">Add Company</span>
        </button>
      </div>

      {/* Companies List */}
      <div className="flex flex-1 flex-col gap-1 overflow-auto px-3 py-2">
        {loadingCompanies && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        )}

        {!loadingCompanies && companies.length === 0 && (
          <p className="py-6 text-center text-[12px] text-[var(--color-text-muted)]">
            No companies yet. Add one to start practicing!
          </p>
        )}

        {companies.map((app) => {
          const color = nameToColor(app.company_name);
          const initial = app.company_name.charAt(0).toUpperCase();
          const isActive = app.id === activeCompanyId;

          return (
            <div
              key={app.id}
              className={`group flex h-14 w-full items-center gap-3 rounded-xl px-3.5 py-3 ${
                isActive ? "bg-[var(--color-hover)]" : "hover:bg-[var(--color-hover)]"
              }`}
            >
              <button
                className="flex flex-1 items-center gap-3 text-left"
                onClick={() => onSelectCompany?.(app.id)}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-[16px] font-semibold">{initial}</span>
                </div>
                <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                  <span className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                    {app.company_name}
                  </span>
                  <span className="truncate text-[12px] text-[var(--color-text-secondary)]">
                    {app.job_title}
                  </span>
                </div>
              </button>
              {/* Delete button — visible on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCompany?.(app.id);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-100"
                title="Delete"
              >
                <Trash2 size={13} className="text-[var(--color-text-muted)] hover:text-red-500" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Company Fit Analysis */}
      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-amber-400" />
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Company Fit</span>
        </div>

        {fitAnalysisLoading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
            <span className="text-[12px] text-[var(--color-text-muted)]">Analyzing fit...</span>
          </div>
        ) : !fitAnalysis ? (
          <>
            <button
              onClick={onAnalyzeFit}
              disabled={!activeCompanyId}
              className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-dark)] text-white disabled:opacity-40"
            >
              <ScanSearch size={15} />
              <span className="text-[13px] font-medium">Analyze Company Fit</span>
            </button>
            <p className="mt-2 text-center text-[11px] text-[var(--color-text-muted)]">
              Compare your resume with the job description
            </p>
          </>
        ) : (
          <FitResult data={fitAnalysis} onReanalyze={onAnalyzeFit} />
        )}
      </div>
    </div>
  );
}

function FitResult({ data, onReanalyze }: { data: MatchAnalysisResult; onReanalyze?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const pct = (data.score / 10) * 100;

  // Get label color based on score
  const getLabelStyle = () => {
    if (data.score >= 8) return "bg-green-100 text-green-600";
    if (data.score >= 6) return "bg-blue-100 text-blue-600";
    if (data.score >= 4) return "bg-amber-100 text-amber-600";
    return "bg-red-100 text-red-600";
  };

  const getBarColor = () => {
    if (data.score >= 8) return "bg-[var(--color-green)]";
    if (data.score >= 6) return "bg-blue-500";
    if (data.score >= 4) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Score Card */}
      <div className="rounded-xl bg-[var(--color-bg)] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[28px] font-bold text-[var(--color-text-primary)]">{data.score}</span>
            <span className="text-[14px] font-medium text-[var(--color-text-muted)]">/10</span>
          </div>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${getLabelStyle()}`}>
            {data.label}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--color-border)]">
          <div className={`h-1.5 rounded-full ${getBarColor()}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Expandable Reason */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]"
      >
        <span>View Analysis</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="rounded-lg bg-[var(--color-bg)] p-3">
          <p className="text-[11px] leading-[1.5] text-[var(--color-text-secondary)]">
            {data.score_reason}
          </p>
        </div>
      )}

      {/* Reanalyze Button */}
      <button
        onClick={onReanalyze}
        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]"
      >
        <ScanSearch size={12} />
        Reanalyze
      </button>
    </div>
  );
}
