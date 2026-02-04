import { useState, useRef } from "react";
import {
  PanelRightClose,
  Key,
  Upload,
  Plus,
  Pencil,
  Save,
  X,
  Loader2,
  AlertCircle,
  Lightbulb,
  Trash2,
} from "lucide-react";
import type {
  ResumeData,
  BasicInfo,
  DeepDiveTopic,
  WorkExperience,
  Project,
  Education,
} from "../../types/resume";
import { useResume, useUploadResume, useUpdateResume } from "../../hooks/useResumeQueries";
import { getApiKey, setApiKey, clearApiKey, verifyApiKey } from "../../services/api";

interface RightSidebarProps {
  onCollapse?: () => void;
}

const emptyBasicInfo: BasicInfo = {
  name: "",
  location: "",
  languages: [],
  hard_skills: [],
  soft_skills: [],
};

const emptyResume: ResumeData = {
  id: "",
  basic_info: { ...emptyBasicInfo },
  professional_summary: "",
  interview_hooks: [],
  work_experience: [],
  projects: [],
  education: [],
  status: "pending",
};

export function RightSidebar({ onCollapse }: RightSidebarProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key state
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyStored, setApiKeyStored] = useState(() => getApiKey() !== "");
  const [apiKeyVerifying, setApiKeyVerifying] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  async function handleSaveApiKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setApiKeyError(null);
    setApiKeyVerifying(true);
    try {
      const valid = await verifyApiKey(trimmed);
      if (valid) {
        setApiKey(trimmed);
        setApiKeyStored(true);
        setApiKeyInput("");
      } else {
        setApiKeyError("Invalid API key");
      }
    } catch {
      setApiKeyError("Connection failed");
    } finally {
      setApiKeyVerifying(false);
    }
  }

  function handleClearApiKey() {
    clearApiKey();
    setApiKeyStored(false);
    setApiKeyInput("");
    setApiKeyError(null);
  }

  const storedKey = getApiKey();
  const maskedKey = storedKey
    ? `${storedKey.slice(0, 3)}${"•".repeat(8)}${storedKey.slice(-4)}`
    : "";

  // React Query hooks
  const { data: resume = emptyResume, isLoading: loading } = useResume();
  const uploadMutation = useUploadResume();
  const updateMutation = useUpdateResume();
  const uploading = uploadMutation.isPending;
  const saving = updateMutation.isPending;

  // Draft state — all mutable copies while editing
  const [draftBasicInfo, setDraftBasicInfo] = useState<BasicInfo>({ ...emptyBasicInfo });
  const [draftSummary, setDraftSummary] = useState("");
  const [draftHooks, setDraftHooks] = useState<DeepDiveTopic[]>([]);
  const [draftWorkExp, setDraftWorkExp] = useState<WorkExperience[]>([]);
  const [draftProjects, setDraftProjects] = useState<Project[]>([]);
  const [draftEducation, setDraftEducation] = useState<Education[]>([]);

  function syncDrafts(data: typeof resume) {
    setDraftBasicInfo(data.basic_info ?? { ...emptyBasicInfo });
    setDraftSummary(data.professional_summary ?? "");
    setDraftHooks(data.interview_hooks ?? []);
    setDraftWorkExp(data.work_experience ?? []);
    setDraftProjects(data.projects ?? []);
    setDraftEducation(data.education ?? []);
  }

  function handleUpload(file: File) {
    setError(null);
    uploadMutation.mutate(file, {
      onSuccess: (data) => {
        syncDrafts(data);
        setEditing(false);
      },
      onError: (e) => {
        setError(e instanceof Error ? e.message : "Upload failed");
      },
    });
  }

  function enterEdit() {
    syncDrafts(resume);
    setEditing(true);
  }

  function cancelEdit() {
    syncDrafts(resume);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    updateMutation.mutate(
      {
        basic_info: draftBasicInfo,
        professional_summary: draftSummary,
        interview_hooks: draftHooks,
        work_experience: draftWorkExp,
        projects: draftProjects,
        education: draftEducation,
      },
      {
        onSuccess: (data) => {
          syncDrafts(data);
          setEditing(false);
        },
        onError: (e) => {
          setError(e instanceof Error ? e.message : "Save failed");
        },
      },
    );
  }

  // Data accessors — show draft when editing, resume when viewing
  const basicInfo = editing ? draftBasicInfo : resume.basic_info;
  const summary = editing ? draftSummary : resume.professional_summary;
  const hooks = editing ? draftHooks : resume.interview_hooks;
  const workExps = editing ? draftWorkExp : resume.work_experience;
  const projects = editing ? draftProjects : resume.projects;
  const education = editing ? draftEducation : resume.education;
  const hasData = resume.status === "completed";

  return (
    <div className="flex w-[320px] shrink-0 flex-col rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">Settings</span>
        <button onClick={onCollapse} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-hover)]">
          <PanelRightClose size={18} className="text-[var(--color-text-secondary)]" />
        </button>
      </div>
      <div className="mx-4 border-b border-[var(--color-border)]" />

      {/* Scrollable Content */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* API Key Card */}
        <div className="flex flex-col gap-4 rounded-[16px] bg-[var(--color-surface)] p-4 shadow-[0_2px_8px_#0000000a]">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">API Key</span>
            <Key size={16} className="text-[var(--color-text-secondary)]" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">OpenAI API Key</span>
            {apiKeyStored ? (
              <>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3">
                  <Key size={14} className="text-[var(--color-text-muted)]" />
                  <span className="flex-1 text-[13px] text-[var(--color-text-secondary)]">{maskedKey}</span>
                  <button
                    onClick={handleClearApiKey}
                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-red-100"
                    title="Clear API Key"
                  >
                    <Trash2 size={13} className="text-[var(--color-text-muted)] hover:text-red-500" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-green)]" />
                  <span className="text-[12px] text-[var(--color-green)]">Connected</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-1">
                  <Key size={14} className="ml-2 shrink-0 text-[var(--color-text-muted)]" />
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKeyInput}
                    disabled={apiKeyVerifying}
                    onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveApiKey(); }}
                    className="h-full flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim() || apiKeyVerifying}
                    className="mr-1 flex items-center gap-1 rounded-md bg-[var(--color-dark)] px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                  >
                    {apiKeyVerifying && <Loader2 size={11} className="animate-spin" />}
                    {apiKeyVerifying ? "Verifying" : "Connect"}
                  </button>
                </div>
                {apiKeyError ? (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={12} className="text-red-400" />
                    <span className="text-[12px] text-red-400">{apiKeyError}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <span className="text-[12px] text-red-400">Not Connected</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="flex flex-col gap-3 rounded-[16px] bg-[var(--color-surface)] p-4 shadow-[0_2px_8px_#0000000a]">
          {/* Profile Header */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">Profile</span>
            <div className="flex items-center gap-1.5">
              {editing ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 rounded-md bg-[var(--color-hover)] px-2.5 py-1"
                  >
                    <X size={13} className="text-[var(--color-text-secondary)]" />
                    <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-md bg-[var(--color-dark)] px-2.5 py-1 text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span className="text-[12px] font-medium">{saving ? "Saving..." : "Save"}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={enterEdit}
                  className="flex items-center gap-1 rounded-md bg-[var(--color-hover)] px-2.5 py-1"
                >
                  <Pencil size={13} className="text-[var(--color-text-secondary)]" />
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Edit</span>
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Resume — only in edit mode */}
          {editing && (
            <>
              <div className="flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-dark)] text-white disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span className="text-[13px] font-medium">
                    {uploading ? "Parsing Resume..." : "Upload Resume to Auto-fill"}
                  </span>
                </button>
                <span className="text-center text-[11px] text-[var(--color-text-muted)]">Supports PDF</span>
              </div>
              <div className="h-px bg-[var(--color-border)]" />
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          )}

          {/* Resume Content */}
          {!loading && (
            <>
              {/* Basic Info */}
              <div className="flex flex-col gap-2">
                <InputField
                  label="Name"
                  value={basicInfo.name || (editing ? "" : "—")}
                  editing={editing}
                  onChange={(v) => setDraftBasicInfo({ ...draftBasicInfo, name: v })}
                />
                <InputField
                  label="Location"
                  value={basicInfo.location || (editing ? "" : "—")}
                  editing={editing}
                  onChange={(v) => setDraftBasicInfo({ ...draftBasicInfo, location: v })}
                />
                <TextareaField
                  label="Professional Summary"
                  value={summary || (editing ? "" : "—")}
                  editing={editing}
                  onChange={setDraftSummary}
                />
              </div>

              <div className="h-px bg-[var(--color-border)]" />

              {/* Interview Hooks */}
              <SectionWithAdd
                title="Interview Hooks"
                icon={<Lightbulb size={13} className="text-[var(--color-yellow)]" />}
                editing={editing}
                renderForm={(onCancel) => (
                  <AddHookForm
                    onCancel={onCancel}
                    onAdd={(hook) => {
                      setDraftHooks([...draftHooks, hook]);
                      onCancel();
                    }}
                  />
                )}
              >
                {hooks.map((hook, i) => (
                  <HookCard
                    key={i}
                    hook={hook}
                    editing={editing}
                    onDelete={() => setDraftHooks(draftHooks.filter((_, j) => j !== i))}
                  />
                ))}
                {hooks.length === 0 && !hasData && <EmptyHint text="Upload your resume to auto-fill" />}
              </SectionWithAdd>

              <div className="h-px bg-[var(--color-border)]" />

              {/* Work Experience */}
              <SectionWithAdd
                title="Work Experience"
                editing={editing}
                renderForm={(onCancel) => (
                  <AddWorkForm
                    onCancel={onCancel}
                    onAdd={(exp) => {
                      setDraftWorkExp([...draftWorkExp, exp]);
                      onCancel();
                    }}
                  />
                )}
              >
                {workExps.map((exp, i) => (
                  <WorkExpCard
                    key={i}
                    exp={exp}
                    editing={editing}
                    onDelete={() => setDraftWorkExp(draftWorkExp.filter((_, j) => j !== i))}
                  />
                ))}
                {workExps.length === 0 && !hasData && <EmptyHint text="Upload your resume to auto-fill" />}
              </SectionWithAdd>

              <div className="h-px bg-[var(--color-border)]" />

              {/* Projects */}
              <SectionWithAdd
                title="Projects"
                editing={editing}
                renderForm={(onCancel) => (
                  <AddProjectForm
                    onCancel={onCancel}
                    onAdd={(proj) => {
                      setDraftProjects([...draftProjects, proj]);
                      onCancel();
                    }}
                  />
                )}
              >
                {projects.map((proj, i) => (
                  <ProjectCard
                    key={i}
                    project={proj}
                    editing={editing}
                    onDelete={() => setDraftProjects(draftProjects.filter((_, j) => j !== i))}
                  />
                ))}
                {projects.length === 0 && !hasData && <EmptyHint text="Upload your resume to auto-fill" />}
              </SectionWithAdd>

              <div className="h-px bg-[var(--color-border)]" />

              {/* Education */}
              <SectionWithAdd
                title="Education"
                editing={editing}
                renderForm={(onCancel) => (
                  <AddEducationForm
                    onCancel={onCancel}
                    onAdd={(edu) => {
                      setDraftEducation([...draftEducation, edu]);
                      onCancel();
                    }}
                  />
                )}
              >
                {education.map((edu, i) => (
                  <EducationCard
                    key={i}
                    edu={edu}
                    editing={editing}
                    onDelete={() => setDraftEducation(draftEducation.filter((_, j) => j !== i))}
                  />
                ))}
                {education.length === 0 && !hasData && <EmptyHint text="Upload your resume to auto-fill" />}
              </SectionWithAdd>

              <div className="h-px bg-[var(--color-border)]" />

              {/* Skills */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">Skills</span>
                <TagGroup
                  label="Languages"
                  tags={basicInfo.languages}
                  editing={editing}
                  onAdd={(t) => setDraftBasicInfo({ ...draftBasicInfo, languages: [...draftBasicInfo.languages, t] })}
                  onRemove={(t) => setDraftBasicInfo({ ...draftBasicInfo, languages: draftBasicInfo.languages.filter((x) => x !== t) })}
                />
                <TagGroup
                  label="Hard Skills"
                  tags={basicInfo.hard_skills}
                  editing={editing}
                  onAdd={(t) => setDraftBasicInfo({ ...draftBasicInfo, hard_skills: [...draftBasicInfo.hard_skills, t] })}
                  onRemove={(t) => setDraftBasicInfo({ ...draftBasicInfo, hard_skills: draftBasicInfo.hard_skills.filter((x) => x !== t) })}
                />
                <TagGroup
                  label="Soft Skills"
                  tags={basicInfo.soft_skills}
                  editing={editing}
                  onAdd={(t) => setDraftBasicInfo({ ...draftBasicInfo, soft_skills: [...draftBasicInfo.soft_skills, t] })}
                  onRemove={(t) => setDraftBasicInfo({ ...draftBasicInfo, soft_skills: draftBasicInfo.soft_skills.filter((x) => x !== t) })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Display Cards (with editing delete button)
   ═══════════════════════════════════════════ */

function EmptyHint({ text }: { text: string }) {
  return <span className="py-2 text-center text-[11px] text-[var(--color-text-muted)]">{text}</span>;
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-red-100"
      title="Delete"
    >
      <X size={12} className="text-[var(--color-text-muted)] hover:text-red-500" />
    </button>
  );
}

function HookCard({ hook, editing, onDelete }: { hook: DeepDiveTopic; editing: boolean; onDelete: () => void }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{hook.topic_name}</span>
        <div className="flex items-center gap-1">
          <span className="rounded bg-[var(--color-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
            {hook.source_type}
          </span>
          {editing && <DeleteBtn onClick={onDelete} />}
        </div>
      </div>
      <span className="text-[11px] leading-[1.4] text-[var(--color-text-secondary)]">{hook.key_details}</span>
    </div>
  );
}

function WorkExpCard({ exp, editing, onDelete }: { exp: WorkExperience; editing: boolean; onDelete: () => void }) {
  return (
    <div className="flex gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{exp.company || "—"}</span>
        <span className="text-[11px] text-[var(--color-text-secondary)]">{exp.role || "—"}</span>
        {exp.date_range && <span className="text-[11px] text-[var(--color-text-muted)]">{exp.date_range}</span>}
        {exp.responsibilities_and_achievements && (
          <span className="mt-0.5 text-[11px] leading-[1.4] text-[var(--color-text-secondary)]">
            {exp.responsibilities_and_achievements}
          </span>
        )}
      </div>
      {editing && <DeleteBtn onClick={onDelete} />}
    </div>
  );
}

function ProjectCard({ project, editing, onDelete }: { project: Project; editing: boolean; onDelete: () => void }) {
  return (
    <div className="flex gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{project.name || "—"}</span>
          {project.type && project.type !== "Unknown" && (
            <span className="rounded bg-[var(--color-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
              {project.type}
            </span>
          )}
        </div>
        {project.description && (
          <span className="text-[11px] leading-[1.4] text-[var(--color-text-secondary)]">{project.description}</span>
        )}
        {project.tech_or_tools.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {project.tech_or_tools.map((t) => (
              <span key={t} className="rounded bg-[var(--color-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {editing && <DeleteBtn onClick={onDelete} />}
    </div>
  );
}

function EducationCard({ edu, editing, onDelete }: { edu: Education; editing: boolean; onDelete: () => void }) {
  return (
    <div className="flex gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{edu.school || "—"}</span>
        <span className="text-[11px] text-[var(--color-text-secondary)]">{edu.degree || "—"}</span>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {[edu.major, edu.graduation_year].filter(Boolean).join(" · ") || "—"}
        </span>
      </div>
      {editing && <DeleteBtn onClick={onDelete} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Shared Sub-components
   ═══════════════════════════════════════════ */

function InputField({
  label, value, editing, onChange,
}: {
  label: string; value: string; editing: boolean; onChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</span>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex h-9 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-[12px] text-[var(--color-text-primary)] outline-none"
        />
      ) : (
        <span className="text-[12px] text-[var(--color-text-primary)]">{value}</span>
      )}
    </div>
  );
}

function TextareaField({
  label, value, editing, onChange,
}: {
  label: string; value: string; editing: boolean; onChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</span>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 text-[12px] leading-[1.4] text-[var(--color-text-primary)] outline-none resize-none"
          rows={3}
        />
      ) : (
        <span className="text-[12px] leading-[1.4] text-[var(--color-text-primary)]">{value}</span>
      )}
    </div>
  );
}

function SectionWithAdd({
  title, icon, children, editing, renderForm,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  editing: boolean;
  renderForm?: (onCancel: () => void) => React.ReactNode;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{title}</span>
        </div>
        {editing && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-md bg-[var(--color-hover)] px-2 py-0.5"
          >
            <Plus size={12} className="text-[var(--color-text-secondary)]" />
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Add</span>
          </button>
        )}
      </div>
      {children}
      {adding && renderForm?.(() => setAdding(false))}
    </div>
  );
}

function TagGroup({
  label, tags, editing, onAdd, onRemove,
}: {
  label: string;
  tags: string[];
  editing: boolean;
  onAdd?: (tag: string) => void;
  onRemove?: (tag: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd?.(trimmed);
    }
    setInput("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</span>
      <div className="flex flex-wrap gap-1">
        {tags.length > 0 ? (
          tags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-md bg-[var(--color-hover)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
              {t}
              {editing && (
                <button onClick={() => onRemove?.(t)} className="hover:text-red-500">
                  <X size={10} className="text-[var(--color-text-muted)]" />
                </button>
              )}
            </span>
          ))
        ) : (
          !editing && <span className="text-[11px] text-[var(--color-text-muted)]">—</span>
        )}
        {editing && !adding && (
          <button
            onClick={() => {
              setAdding(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="flex items-center gap-1 rounded-md bg-[var(--color-hover)] px-2 py-0.5"
          >
            <Plus size={10} className="text-[var(--color-text-muted)]" />
            <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Add</span>
          </button>
        )}
        {editing && adding && (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setInput(""); }
              }}
              placeholder="Type & Enter"
              className="h-6 w-24 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 text-[11px] text-[var(--color-text-primary)] outline-none"
              autoFocus
            />
            <button onClick={handleAdd} className="rounded bg-[var(--color-dark)] px-1.5 py-0.5 text-[10px] text-white">
              OK
            </button>
            <button onClick={() => { setAdding(false); setInput(""); }}>
              <X size={12} className="text-[var(--color-text-muted)]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Inline Add Forms (with real state & onAdd)
   ═══════════════════════════════════════════ */

function FormField({
  label, required, placeholder, multiline, value, onChange,
}: {
  label: string; required?: boolean; placeholder: string; multiline?: boolean;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
        {label}{required && <span className="text-red-400"> *</span>}
      </span>
      {multiline ? (
        <textarea
          placeholder={placeholder}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 text-[12px] leading-[1.4] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none resize-none"
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
        />
      )}
    </div>
  );
}

function FormTagInput({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
      }
      setInput("");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-md bg-[var(--color-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
            {t}
            <button onClick={() => onRemove(t)}>
              <X size={10} className="text-[var(--color-text-muted)] cursor-pointer hover:text-red-500" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type & press Enter to add"
        className="h-[30px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-[11px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
      />
    </div>
  );
}

function FormButtons({ onCancel, onSubmit, addLabel, disabled }: { onCancel: () => void; onSubmit: () => void; addLabel: string; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={onCancel}
        className="rounded-lg border border-[var(--color-border)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)]"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="flex items-center gap-1 rounded-lg bg-[var(--color-dark)] px-3.5 py-1.5 text-white disabled:opacity-40"
      >
        <Plus size={13} />
        <span className="text-[12px] font-medium">{addLabel}</span>
      </button>
    </div>
  );
}

/* ── Add Hook Form ── */
function AddHookForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (h: DeepDiveTopic) => void }) {
  const [topicName, setTopicName] = useState("");
  const [sourceType, setSourceType] = useState("Work Experience");
  const [keyDetails, setKeyDetails] = useState("");

  const canSubmit = topicName.trim() && keyDetails.trim();

  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <FormField label="Topic Name" required placeholder="e.g., Real-time ML Pipeline" value={topicName} onChange={setTopicName} />
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Source Type <span className="text-red-400">*</span></span>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className="h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-[12px] text-[var(--color-text-primary)] outline-none"
        >
          <option>Work Experience</option>
          <option>Personal Project</option>
          <option>Academic</option>
          <option>Competition</option>
        </select>
      </div>
      <FormField label="Key Details" required placeholder="Tools used, metrics, outcomes..." value={keyDetails} onChange={setKeyDetails} multiline />
      <FormButtons
        onCancel={onCancel}
        onSubmit={() => onAdd({ topic_name: topicName.trim(), source_type: sourceType, key_details: keyDetails.trim() })}
        addLabel="Add Hook"
        disabled={!canSubmit}
      />
    </div>
  );
}

/* ── Add Work Form ── */
function AddWorkForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (e: WorkExperience) => void }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [resp, setResp] = useState("");

  const canSubmit = company.trim() && role.trim();

  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <FormField label="Company" required placeholder="e.g., Google, Microsoft" value={company} onChange={setCompany} />
      <FormField label="Role" required placeholder="e.g., Senior Software Engineer" value={role} onChange={setRole} />
      <FormField label="Date Range" placeholder="e.g., 2021 - Present" value={dateRange} onChange={setDateRange} />
      <FormField label="Responsibilities & Achievements" placeholder="Summarize your core scope and main contributions..." multiline value={resp} onChange={setResp} />
      <FormButtons
        onCancel={onCancel}
        onSubmit={() => onAdd({
          company: company.trim(),
          role: role.trim(),
          date_range: dateRange.trim() || undefined,
          responsibilities_and_achievements: resp.trim() || undefined,
        })}
        addLabel="Add Experience"
        disabled={!canSubmit}
      />
    </div>
  );
}

/* ── Add Project Form ── */
function AddProjectForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Personal");
  const [description, setDescription] = useState("");
  const [techTags, setTechTags] = useState<string[]>([]);

  const canSubmit = name.trim();

  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <FormField label="Project Name" required placeholder="e.g., ML Recommendation Engine" value={name} onChange={setName} />
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-[12px] text-[var(--color-text-primary)] outline-none"
        >
          <option>Personal</option>
          <option>Academic</option>
          <option>Freelance</option>
          <option>Competition</option>
          <option>Work</option>
        </select>
      </div>
      <FormField label="Description" placeholder="Brief project description..." multiline value={description} onChange={setDescription} />
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Tech / Tools</span>
        <FormTagInput tags={techTags} onAdd={(t) => setTechTags([...techTags, t])} onRemove={(t) => setTechTags(techTags.filter((x) => x !== t))} />
      </div>
      <FormButtons
        onCancel={onCancel}
        onSubmit={() => onAdd({
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          tech_or_tools: techTags,
        })}
        addLabel="Add Project"
        disabled={!canSubmit}
      />
    </div>
  );
}

/* ── Add Education Form ── */
function AddEducationForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (e: Education) => void }) {
  const [school, setSchool] = useState("");
  const [degree, setDegree] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");

  const canSubmit = school.trim() && degree.trim();

  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <FormField label="School" required placeholder="e.g., Stanford University" value={school} onChange={setSchool} />
      <FormField label="Degree" required placeholder="e.g., Master of Science" value={degree} onChange={setDegree} />
      <FormField label="Major" placeholder="e.g., Computer Science" value={major} onChange={setMajor} />
      <FormField label="Graduation Year" placeholder="e.g., 2021" value={gradYear} onChange={setGradYear} />
      <FormButtons
        onCancel={onCancel}
        onSubmit={() => onAdd({
          school: school.trim(),
          degree: degree.trim(),
          major: major.trim() || undefined,
          graduation_year: gradYear.trim() || undefined,
        })}
        addLabel="Add Education"
        disabled={!canSubmit}
      />
    </div>
  );
}
