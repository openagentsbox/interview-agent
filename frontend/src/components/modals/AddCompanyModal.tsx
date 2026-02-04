import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import type { Application } from "../../types/resume";
import { createApplication } from "../../services/api";

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (app: Application) => void;
}

export function AddCompanyModal({ open, onClose, onAdded }: AddCompanyModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const canSubmit = companyName.trim() && jobTitle.trim();

  function reset() {
    setCompanyName("");
    setJobTitle("");
    setIndustry("");
    setJobDescription("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const app = await createApplication({
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        industry: industry.trim() || undefined,
        job_description: jobDescription.trim() || undefined,
      });
      onAdded(app);
      reset();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add company");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-transparent" onClick={handleClose} />

      {/* Modal */}
      <div className="relative flex w-[480px] flex-col gap-5 rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_8px_40px_#00000020]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[18px] font-semibold text-[var(--color-text-primary)]">Add Company</span>
          <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]">
            <X size={18} className="text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <span className="text-[14px] text-[var(--color-text-secondary)]">
          Add a target company to practice interviews for
        </span>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</div>
        )}

        {/* Fields */}
        <div className="flex flex-col gap-4">
          {/* Company Name */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Company Name <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Google, Microsoft, Amazon"
              className="h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
            />
          </div>

          {/* Job Title */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Job Title <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer, Product Manager"
              className="h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
            />
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Industry</span>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Technology"
              className="h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
            />
          </div>

          {/* Job Description */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Job Description</span>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here to help tailor your interview practice..."
              className="h-[120px] resize-none rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-[13px] leading-[1.4] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
            />
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-dark)] text-white disabled:opacity-40"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          <span className="text-[15px] font-semibold">{submitting ? "Adding..." : "Add Company"}</span>
        </button>
      </div>
    </div>
  );
}
