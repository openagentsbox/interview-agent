import type { ResumeData, Application, Session, InterviewType, SessionMode } from "../types/resume";

const API_BASE = import.meta.env.PROD
  ? "https://interview-agent-production-1cd9.up.railway.app"
  : "http://localhost:8000";

const USER_STORAGE_KEY = "jiaf_user_id";

function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_STORAGE_KEY, id);
  }
  return id;
}

const USER_ID = getOrCreateUserId();

export { USER_ID };

/* ═══════════════════════════════════════════
   OpenAI API Key management (localStorage)
   ═══════════════════════════════════════════ */

const STORAGE_KEY = "openai_api_key";

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = getApiKey();
  return { ...(key ? { "X-OpenAI-Key": key } : {}), ...extra };
}

/** POST /api/key/verify — validate an OpenAI API key (zero token cost) */
export async function verifyApiKey(key: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/key/verify`, {
    method: "POST",
    headers: { "X-OpenAI-Key": key },
  });
  return res.ok;
}

/** GET /api/resume/{user_id} */
export async function fetchResume(): Promise<ResumeData> {
  const res = await fetch(`${API_BASE}/api/resume/${USER_ID}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch resume: ${res.status}`);
  }
  return res.json();
}

/** POST /api/resume?user_id=... (upload PDF) */
export async function uploadResume(file: File): Promise<ResumeData> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/resume?user_id=${USER_ID}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload failed: ${detail}`);
  }
  return res.json();
}

/** PUT /api/resume/{user_id} (manual update) */
export async function updateResume(
  data: Partial<Pick<ResumeData, "basic_info" | "professional_summary" | "interview_hooks" | "work_experience" | "projects" | "education">>
): Promise<ResumeData> {
  const res = await fetch(`${API_BASE}/api/resume/${USER_ID}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Update failed: ${detail}`);
  }
  return res.json();
}

/* ═══════════════════════════════════════════
   Company / Application API
   ═══════════════════════════════════════════ */

/** GET /api/company/user/{user_id} */
export async function fetchApplications(): Promise<Application[]> {
  const res = await fetch(`${API_BASE}/api/company/user/${USER_ID}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch applications: ${res.status}`);
  }
  return res.json();
}

/** POST /api/company */
export async function createApplication(data: {
  company_name: string;
  job_title: string;
  job_description?: string;
  industry?: string;
  job_grade?: string;
}): Promise<Application> {
  const res = await fetch(`${API_BASE}/api/company`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ user_id: USER_ID, ...data }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Create failed: ${detail}`);
  }
  return res.json();
}

/** DELETE /api/company/{application_id} */
export async function deleteApplication(applicationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/company/${applicationId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Delete failed: ${detail}`);
  }
}

/* ═══════════════════════════════════════════
   Session API
   ═══════════════════════════════════════════ */

/** GET /api/session/application/{application_id} */
export async function fetchSessions(applicationId: string): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/api/session/application/${applicationId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sessions: ${res.status}`);
  }
  return res.json();
}

/** POST /api/session */
export async function createSession(data: {
  application_id: string;
  type: InterviewType;
  mode: SessionMode;
  technical_level?: string;
  interviewer_name?: string;
  additional_notes?: string;
  must_ask_questions?: string[];
}): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/session`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ user_id: USER_ID, ...data }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Create session failed: ${detail}`);
  }
  return res.json();
}

/** DELETE /api/session/{session_id} */
export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Delete session failed: ${detail}`);
  }
}

/* ═══════════════════════════════════════════
   Chat API
   ═══════════════════════════════════════════ */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** POST /api/chat/{session_id}/start — initialize graph, returns first AI message */
export async function startInterview(sessionId: string): Promise<ChatResult> {
  const res = await fetch(`${API_BASE}/api/chat/${sessionId}/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Start interview failed: ${detail}`);
  }
  return res.json();
}

export interface ChatResult {
  response: string;
  finished: boolean;
  total_round: number;
  task_topic: string;
  task_instruction: string;
}

export interface ChatHistoryResult {
  messages: ChatMessage[];
  total_round: number;
}

/** POST /api/chat/{session_id} */
export async function sendMessage(sessionId: string, message: string): Promise<ChatResult> {
  const res = await fetch(`${API_BASE}/api/chat/${sessionId}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Chat failed: ${detail}`);
  }
  return res.json();
}

/** GET /api/chat/{session_id}/history */
export async function fetchChatHistory(sessionId: string): Promise<ChatHistoryResult> {
  const res = await fetch(`${API_BASE}/api/chat/${sessionId}/history`);
  if (!res.ok) {
    throw new Error(`Failed to fetch chat history: ${res.status}`);
  }
  const data = await res.json();
  return { messages: data.messages, total_round: data.total_round ?? 0 };
}

/* ═══════════════════════════════════════════
   Speech API (TTS / STT)
   ═══════════════════════════════════════════ */

/** POST /api/speech/synthesize — TTS: text → streaming MP3 response */
export async function synthesizeSpeech(text: string): Promise<Response> {
  const res = await fetch(`${API_BASE}/api/speech/synthesize`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Speech synthesis failed: ${detail}`);
  }
  return res;
}

/** POST /api/speech/transcribe — STT: audio blob → text */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audio, "recording.webm");

  const res = await fetch(`${API_BASE}/api/speech/transcribe`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Transcription failed: ${detail}`);
  }
  const data = await res.json();
  return data.text;
}

/* ═══════════════════════════════════════════
   Feedback API
   ═══════════════════════════════════════════ */

export interface GrammarResult {
  corrected_version: string;
}

export interface ScoreResult {
  score: number;
  reasoning: string;
  better_version: string;
}

/** POST /api/feedback/grammar — grammar correction */
export async function getGrammarFeedback(text: string): Promise<GrammarResult> {
  const res = await fetch(`${API_BASE}/api/feedback/grammar`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Grammar feedback failed: ${detail}`);
  }
  return res.json();
}

/** POST /api/feedback/score — score and better version */
export async function getScoreFeedback(
  sessionId: string,
  question: string,
  answer: string,
  taskTopic?: string,
  taskInstruction?: string
): Promise<ScoreResult> {
  const res = await fetch(`${API_BASE}/api/feedback/score`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      session_id: sessionId,
      question,
      answer,
      task_topic: taskTopic || "",
      task_instruction: taskInstruction || "",
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Score feedback failed: ${detail}`);
  }
  return res.json();
}

/* ═══════════════════════════════════════════
   Match Analysis API
   ═══════════════════════════════════════════ */

export interface MatchAnalysisResult {
  score: number;
  label: string;
  score_reason: string;
}

/** GET /api/match/{application_id} — get existing match analysis */
export async function getMatchAnalysis(applicationId: string): Promise<MatchAnalysisResult | null> {
  const res = await fetch(`${API_BASE}/api/match/${applicationId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data || null;
}

/** POST /api/match — analyze resume-job fit */
export async function analyzeMatch(applicationId: string): Promise<MatchAnalysisResult> {
  const res = await fetch(`${API_BASE}/api/match`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ user_id: USER_ID, application_id: applicationId }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Match analysis failed: ${detail}`);
  }
  return res.json();
}
