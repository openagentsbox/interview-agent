import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TopNavBar } from "../components/layout/TopNavBar";
import { LeftSidebar } from "../components/layout/LeftSidebar";
import { LeftSidebarCollapsed } from "../components/layout/LeftSidebarCollapsed";
import { RightSidebar } from "../components/layout/RightSidebar";
import { RightSidebarCollapsed } from "../components/layout/RightSidebarCollapsed";
import { ChatHeader } from "../components/layout/ChatHeader";
import { SessionTabBar } from "../components/layout/SessionTabBar";
import { AIMessage } from "../components/chat/AIMessage";
import { UserMessage } from "../components/chat/UserMessage";
import { ChatInput } from "../components/chat/ChatInput";
import { CallInterface } from "../components/chat/CallInterface";
import { SessionEnded } from "../components/chat/SessionEnded";
import { NewSessionModal } from "../components/modals/NewSessionModal";
import { AddCompanyModal } from "../components/modals/AddCompanyModal";
import type { Application, Session, InterviewType, SessionMode } from "../types/resume";
import {
  getGrammarFeedback,
  getScoreFeedback,
  getApiKey,
  synthesizeSpeech,
  transcribeAudio,
  type GrammarResult,
  type ScoreResult,
} from "../services/api";
import { useMatchAnalysis, useAnalyzeMatch, invalidateMatchCache } from "../hooks/useMatchQueries";
import { useApplications, useDeleteApplication } from "../hooks/useApplicationQueries";
import { useSessions, useCreateSession, useDeleteSession } from "../hooks/useSessionQueries";
import { useChatHistory, useSendMessage, useStartInterview, getChatMessages } from "../hooks/useChatQueries";
import { queryKeys } from "../hooks/queryKeys";

const TYPE_LABELS: Record<InterviewType, string> = {
  recruiter: "Recruiter",
  technical: "Technical",
  hiring_manager: "Hiring Mgr",
  behavioral: "Behavioral",
};

export function InterviewCoach() {
  const queryClient = useQueryClient();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [hideInterviewer, setHideInterviewer] = useState(false);

  // Selection state (kept local — not server state)
  const [activeCompanyId, setActiveCompanyId] = useState<string | undefined>();
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [deletingSessionId, setDeletingSessionId] = useState<string | undefined>();

  // React Query hooks
  const { data: companies = [], isLoading: loadingCompanies } = useApplications();
  const { data: sessions = [] } = useSessions(activeCompanyId);
  const { data: chatData } = useChatHistory(activeSessionId);
  const messages = chatData?.messages ?? [];
  const totalRound = chatData?.total_round ?? 0;

  const deleteAppMutation = useDeleteApplication();
  const createSessionMutation = useCreateSession();
  const startInterviewMutation = useStartInterview();
  const deleteSessionMutation = useDeleteSession();
  const sendMutation = useSendMessage();

  // Match analysis
  const { data: fitAnalysis } = useMatchAnalysis(activeCompanyId);
  const analyzeMatchMutation = useAnalyzeMatch();

  const sending = sendMutation.isPending;
  const initializing = startInterviewMutation.isPending;

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const ttsCacheRef = useRef<Map<string, Blob>>(new Map());

  // Audio playback state
  const [audioPlayingIdx, setAudioPlayingIdx] = useState<number | null>(null);
  const [audioStateType, setAudioStateType] = useState<"loading" | "playing" | null>(null);

  // Feedback state per message index
  const [grammarMap, setGrammarMap] = useState<Record<number, GrammarResult>>({});
  const [grammarLoading, setGrammarLoading] = useState<Record<number, boolean>>({});
  const [scoreMap, setScoreMap] = useState<Record<number, ScoreResult>>({});
  const [scoreLoading, setScoreLoading] = useState<Record<number, boolean>>({});
  const [expandedGrammar, setExpandedGrammar] = useState<number | null>(null);
  const [expandedScore, setExpandedScore] = useState<number | null>(null);

  // Topic per AI message index (for accurate feedback context)
  const [topicMap, setTopicMap] = useState<Record<number, { topic: string; instruction: string }>>({});

  // Call duration for real mode
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-select first company when companies load and none selected
  useEffect(() => {
    if (companies.length > 0 && !activeCompanyId) {
      setActiveCompanyId(companies[0].id);
    }
  }, [companies, activeCompanyId]);

  // Auto-select first session when sessions load and none selected (or active gone)
  useEffect(() => {
    if (sessions.length > 0) {
      if (!activeSessionId || !sessions.some((s) => s.id === activeSessionId)) {
        setActiveSessionId(sessions[0].id);
      }
    } else {
      setActiveSessionId(undefined);
    }
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset feedback state when active session changes
  useEffect(() => {
    setGrammarMap({});
    setScoreMap({});
    setTopicMap({});
    setExpandedGrammar(null);
    setExpandedScore(null);
  }, [activeSessionId]);


  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Call duration timer for real mode - only reset on session change
  useEffect(() => {
    // Reset timer when session changes
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [activeSessionId]);

  // Start timer when real mode session gets first message
  useEffect(() => {
    const session = sessions.find((s) => s.id === activeSessionId);
    const isReal = session?.mode === "real" && session?.status !== "completed";

    if (isReal && messages.length > 0 && !callTimerRef.current) {
      // Start timer only once when first message arrives
      callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }

    // Stop timer if session completed
    if (session?.status === "completed" && callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, [activeSessionId, sessions, messages.length]);

  // ─── Handlers ───

  function handleCompanyAdded(app: Application) {
    queryClient.setQueryData<Application[]>(
      queryKeys.applications.list(),
      (old) => [app, ...(old ?? [])],
    );
    setActiveCompanyId(app.id);
  }

  function handleDeleteCompany(id: string) {
    deleteAppMutation.mutate(id, {
      onSuccess: () => {
        // Clear match cache for deleted company
        invalidateMatchCache(queryClient, id);
        if (activeCompanyId === id) {
          const remaining = companies.filter((c) => c.id !== id);
          setActiveCompanyId(remaining.length > 0 ? remaining[0].id : undefined);
        }
      },
    });
  }

  function handleAnalyzeFit() {
    if (!activeCompanyId || analyzeMatchMutation.isPending) return;
    if (!getApiKey()) {
      alert("Please set your OpenAI API Key in the right sidebar before analyzing.");
      return;
    }
    analyzeMatchMutation.mutate(activeCompanyId, {
      onError: (e) => {
        alert(e instanceof Error ? e.message : "Analysis failed");
      },
    });
  }

  async function handleStartSession(data: {
    type: InterviewType;
    mode: SessionMode;
    interviewerName: string;
    notes: string;
    mustAskQuestions: string[];
  }) {
    if (!activeCompanyId) return;
    if (!getApiKey()) {
      alert("Please set your OpenAI API Key in the right sidebar before starting an interview.");
      return;
    }

    createSessionMutation.mutate(
      {
        application_id: activeCompanyId,
        type: data.type,
        mode: data.mode,
        interviewer_name: data.interviewerName || undefined,
        additional_notes: data.notes || undefined,
        must_ask_questions: data.mustAskQuestions.length > 0 ? data.mustAskQuestions : undefined,
      },
      {
        onSuccess: (session) => {
          setActiveSessionId(session.id);
          setSessionModalOpen(false);

          // Auto-send START to initialize graph and get first AI message
          startInterviewMutation.mutate(session.id, {
            onSuccess: (result) => {
              // Store topic for first AI message (index 0)
              setTopicMap({ 0: { topic: result.task_topic, instruction: result.task_instruction } });
              // Always play in real mode, otherwise respect autoSpeak setting
              if (session.mode === "real" || autoSpeak) playText(result.response, 0);
            },
            onError: () => {
              // Set error message in chat cache
              queryClient.setQueryData(queryKeys.chat.history(session.id), {
                messages: [{ role: "assistant" as const, content: "Failed to initialize interview. Please try again." }],
                total_round: 0,
              });
            },
          });
        },
      },
    );
  }

  function handleDeleteSession(sessionId: string) {
    if (deletingSessionId) return;
    if (!activeCompanyId) return;
    setDeletingSessionId(sessionId);

    deleteSessionMutation.mutate(
      { sessionId, applicationId: activeCompanyId },
      {
        onSuccess: () => {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (activeSessionId === sessionId) {
            setActiveSessionId(remaining.length > 0 ? remaining[0].id : undefined);
          }
        },
        onSettled: () => {
          setDeletingSessionId(undefined);
        },
      },
    );
  }

  // ─── TTS playback (streaming) ───
  function stopAudio() {
    currentReaderRef.current?.cancel().catch(() => {});
    currentReaderRef.current = null;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setAudioPlayingIdx(null);
    setAudioStateType(null);
  }

  function playFromBlob(blob: Blob, audio: HTMLAudioElement, msgIndex?: number) {
    const objectUrl = URL.createObjectURL(blob);
    audio.src = objectUrl;
    currentAudioRef.current = audio;

    if (msgIndex !== undefined) setAudioStateType("playing");

    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(objectUrl);
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
        setAudioPlayingIdx(null);
        setAudioStateType(null);
      }
    });
    audio.play().catch(() => {});
  }

  async function playText(text: string, msgIndex?: number) {
    stopAudio();

    if (msgIndex !== undefined) {
      setAudioPlayingIdx(msgIndex);
      setAudioStateType("loading");
    }

    try {
      // Cache hit -> instant playback
      const cached = ttsCacheRef.current.get(text);
      if (cached) {
        playFromBlob(cached, new Audio(), msgIndex);
        return;
      }

      // Cache miss -> fetch (streaming when possible)
      const res = await synthesizeSpeech(text);

      const canStream =
        typeof MediaSource !== "undefined" &&
        MediaSource.isTypeSupported("audio/mpeg") &&
        res.body != null;

      if (canStream) {
        const mediaSource = new MediaSource();
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(mediaSource);
        audio.src = objectUrl;
        currentAudioRef.current = audio;

        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(objectUrl);
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
            currentReaderRef.current = null;
            setAudioPlayingIdx(null);
            setAudioStateType(null);
          }
        });

        mediaSource.addEventListener("sourceopen", async () => {
          const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
          const reader = res.body!.getReader();
          currentReaderRef.current = reader;
          let started = false;
          const allChunks: Uint8Array[] = [];

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (mediaSource.readyState !== "open") break;

              allChunks.push(value);

              if (sourceBuffer.updating) {
                await new Promise<void>((r) =>
                  sourceBuffer.addEventListener("updateend", () => r(), { once: true })
                );
              }
              sourceBuffer.appendBuffer(value);

              if (!started) {
                started = true;
                if (msgIndex !== undefined) setAudioStateType("playing");
                audio.play().catch(() => {});
              }
            }

            if (sourceBuffer.updating) {
              await new Promise<void>((r) =>
                sourceBuffer.addEventListener("updateend", () => r(), { once: true })
              );
            }
            if (mediaSource.readyState === "open") {
              mediaSource.endOfStream();
            }

            if (allChunks.length > 0) {
              ttsCacheRef.current.set(text, new Blob(allChunks, { type: "audio/mpeg" }));
            }
          } catch {
            // Stream cancelled
          }
        });
      } else {
        const blob = await res.blob();
        ttsCacheRef.current.set(text, blob);
        playFromBlob(blob, new Audio(), msgIndex);
      }
    } catch {
      setAudioPlayingIdx(null);
      setAudioStateType(null);
    }
  }

  // ─── STT transcription handler ───
  async function handleTranscribe(audioBlob: Blob): Promise<string> {
    return transcribeAudio(audioBlob);
  }

  // ─── Send message ───
  function handleSendMessage(text: string) {
    if (!activeSessionId || sending) return;
    if (!getApiKey()) {
      alert("Please set your OpenAI API Key in the right sidebar before sending messages.");
      return;
    }

    const currentMessages = getChatMessages(queryClient, activeSessionId);
    const aiMsgIdx = currentMessages.length + 1; // user msg added optimistically, AI goes after

    sendMutation.mutate(
      { sessionId: activeSessionId, message: text },
      {
        onSuccess: (result) => {
          // Store topic for AI message (for accurate feedback context)
          setTopicMap(prev => ({ ...prev, [aiMsgIdx]: { topic: result.task_topic, instruction: result.task_instruction } }));

          // Always play in real mode, otherwise respect autoSpeak setting
          if (isRealMode || autoSpeak) playText(result.response, aiMsgIdx);

          // Interview ended -> update local session status in cache
          if (result.finished) {
            queryClient.setQueryData<Session[]>(
              queryKeys.sessions.list(activeCompanyId!),
              (old) =>
                (old ?? []).map((s) =>
                  s.id === activeSessionId ? { ...s, status: "completed" as const } : s
                ),
            );
          }
        },
      },
    );
  }

  // ─── Feedback ───
  function getAiMsgIndexForUserMsg(msgIndex: number): number {
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  }

  function getQuestionForUserMsg(msgIndex: number): string {
    const aiIdx = getAiMsgIndexForUserMsg(msgIndex);
    return aiIdx >= 0 ? messages[aiIdx].content : "";
  }

  async function handleGrammarFeedback(msgIndex: number) {
    if (grammarMap[msgIndex] || grammarLoading[msgIndex]) return;
    setGrammarLoading((prev) => ({ ...prev, [msgIndex]: true }));
    try {
      const result = await getGrammarFeedback(messages[msgIndex].content);
      setGrammarMap((prev) => ({ ...prev, [msgIndex]: result }));
    } catch {
      // silently fail
    } finally {
      setGrammarLoading((prev) => ({ ...prev, [msgIndex]: false }));
    }
  }

  async function handleScoreFeedback(msgIndex: number) {
    if (scoreMap[msgIndex] || scoreLoading[msgIndex] || !activeSessionId) return;
    setScoreLoading((prev) => ({ ...prev, [msgIndex]: true }));
    try {
      const aiMsgIdx = getAiMsgIndexForUserMsg(msgIndex);
      const question = aiMsgIdx >= 0 ? messages[aiMsgIdx].content : "";
      const topicInfo = aiMsgIdx >= 0 ? topicMap[aiMsgIdx] : undefined;

      const result = await getScoreFeedback(
        activeSessionId,
        question,
        messages[msgIndex].content,
        topicInfo?.topic,
        topicInfo?.instruction
      );
      setScoreMap((prev) => ({ ...prev, [msgIndex]: result }));
    } catch {
      // silently fail
    } finally {
      setScoreLoading((prev) => ({ ...prev, [msgIndex]: false }));
    }
  }

  function toggleGrammar(msgIndex: number) {
    if (!grammarMap[msgIndex]) {
      handleGrammarFeedback(msgIndex);
    }
    setExpandedGrammar((prev) => (prev === msgIndex ? null : msgIndex));
    setExpandedScore(null);
  }

  function toggleScore(msgIndex: number) {
    if (!scoreMap[msgIndex]) {
      handleScoreFeedback(msgIndex);
    }
    setExpandedScore((prev) => (prev === msgIndex ? null : msgIndex));
    setExpandedGrammar(null);
  }

  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  const chatHeaderLabel = activeCompany
    ? `${activeCompany.company_name} - ${activeCompany.job_title}`
    : "Select a company";

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const isRealMode = activeSession?.mode === "real";

  const tabs = sessions.map((s) => ({
    id: s.id,
    label: TYPE_LABELS[s.type] || s.type,
    active: s.id === activeSessionId,
  }));

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)]">
      <TopNavBar />

      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        {/* Left Sidebar */}
        {leftOpen ? (
          <LeftSidebar
            companies={companies}
            loadingCompanies={loadingCompanies}
            activeCompanyId={activeCompanyId}
            onSelectCompany={setActiveCompanyId}
            onDeleteCompany={handleDeleteCompany}
            onCollapse={() => setLeftOpen(false)}
            onAddCompany={() => setCompanyModalOpen(true)}
            fitAnalysis={fitAnalysis ?? null}
            fitAnalysisLoading={analyzeMatchMutation.isPending}
            onAnalyzeFit={handleAnalyzeFit}
          />
        ) : (
          <LeftSidebarCollapsed onExpand={() => setLeftOpen(true)} />
        )}

        {/* Middle Column */}
        <div className="flex flex-1 flex-col rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <ChatHeader
            company={chatHeaderLabel}
            onToggleLeft={() => setLeftOpen(!leftOpen)}
            onToggleRight={() => setRightOpen(!rightOpen)}
          />
          <SessionTabBar
            tabs={tabs}
            deletingId={deletingSessionId}
            onNewTab={() => setSessionModalOpen(true)}
            onSelectTab={(id) => setActiveSessionId(id)}
            onCloseTab={(id) => handleDeleteSession(id)}
          />

          {/* No session selected */}
          {!activeSession && (
            <div className="flex flex-1 items-center justify-center rounded-b-[16px] bg-[var(--color-bg)]">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[14px] text-[var(--color-text-muted)]">
                  {activeCompanyId
                    ? "No sessions yet. Click + to start a new interview."
                    : "Select a company to begin."}
                </span>
              </div>
            </div>
          )}

          {/* Chat area */}
          {activeSession && (
            <>
              {/* Real Interview Mode - Call Interface */}
              {isRealMode && activeSession.status !== "completed" ? (
                initializing ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-b-[16px] bg-[var(--color-bg)]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-[var(--color-green)]" />
                    <span className="mt-4 text-[13px] text-[var(--color-text-muted)]">
                      Connecting your call...
                    </span>
                  </div>
                ) : (
                  <CallInterface
                    interviewerName={activeSession.interviewer_name || "Interviewer"}
                    isSpeaking={audioStateType === "playing"}
                    isThinking={sending || audioStateType === "loading"}
                    disabled={sending || initializing}
                    callDuration={callDuration}
                    onSend={handleSendMessage}
                    onTranscribe={handleTranscribe}
                  />
                )
              ) : (
                /* Practice Mode - Normal Chat */
                <>
                  <div className="flex flex-1 flex-col gap-5 overflow-auto rounded-b-[16px] bg-[var(--color-bg)] p-6 px-8">
                    {/* Loading states */}
                    {initializing && messages.length === 0 && (
                      <div className="flex flex-1 flex-col items-center justify-center gap-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-[var(--color-green)]" />
                        <span className="text-[13px] text-[var(--color-text-muted)]">
                          Setting up your interview...
                        </span>
                      </div>
                    )}

                    {!initializing && messages.length === 0 && (
                      <div className="flex flex-1 items-center justify-center">
                        <span className="text-[14px] text-[var(--color-text-muted)]">
                          Send a message to start the interview.
                        </span>
                      </div>
                    )}

                    {messages.map((msg, i) =>
                      msg.role === "assistant" ? (
                        <AIMessage
                          key={i}
                          text={msg.content}
                          hidden={hideInterviewer}
                          audioState={audioPlayingIdx === i ? audioStateType ?? undefined : undefined}
                          onPlay={() => playText(msg.content, i)}
                          onStop={stopAudio}
                        />
                      ) : (
                        <UserMessage
                          key={i}
                          text={msg.content}
                          onGrammar={() => toggleGrammar(i)}
                          onScore={() => toggleScore(i)}
                          grammarExpanded={expandedGrammar === i}
                          scoreExpanded={expandedScore === i}
                          grammarContent={
                            grammarMap[i] ? (
                              <div className="mt-1 flex flex-col gap-2 rounded-xl bg-[#22C55E15] p-3">
                                <span className="text-[12px] font-semibold text-[var(--color-green)]">Grammar Correction</span>
                                <p className="text-[13px] leading-[1.5] text-white/90">
                                  {grammarMap[i].corrected_version}
                                </p>
                              </div>
                            ) : grammarLoading[i] ? (
                              <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#22C55E15] p-3">
                                <span className="text-[12px] text-white/60">Checking...</span>
                              </div>
                            ) : null
                          }
                          scoreContent={
                            scoreMap[i] ? (
                              <div className="mt-1 flex flex-col gap-3 rounded-xl bg-[var(--color-yellow-light)] p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[12px] font-semibold text-[var(--color-yellow)]">Score</span>
                                  <span className="rounded-md bg-[var(--color-yellow)] px-2 py-0.5 text-[11px] font-bold text-black">
                                    {scoreMap[i].score}/10
                                  </span>
                                </div>
                                <p className="text-[12px] leading-[1.5] text-white/80">
                                  {scoreMap[i].reasoning}
                                </p>
                                <div className="h-px bg-white/10" />
                                <div className="flex flex-col gap-1">
                                  <span className="text-[12px] font-semibold text-[var(--color-blue)]">Better Response</span>
                                  <p className="text-[12px] italic leading-[1.5] text-white/70">
                                    {scoreMap[i].better_version}
                                  </p>
                                </div>
                              </div>
                            ) : scoreLoading[i] ? (
                              <div className="mt-1 flex items-center gap-2 rounded-xl bg-[var(--color-yellow-light)] p-3">
                                <span className="text-[12px] text-white/60">Analyzing...</span>
                              </div>
                            ) : null
                          }
                        />
                      )
                    )}

                    {/* Typing indicator */}
                    {sending && (
                      <div className="flex w-full gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-dark)]">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:300ms]" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-[16px] bg-[var(--color-surface)] px-4 py-3 shadow-[0_2px_8px_#0000000a]">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-[var(--color-green)]" />
                          <span className="text-[14px] text-[var(--color-text-muted)]">Thinking...</span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Ended -> SessionEnded, Active -> ChatInput */}
                  {activeSession.status === "completed" ? (
                    <SessionEnded questions={totalRound} />
                  ) : (
                    <ChatInput
                      autoSpeak={autoSpeak}
                      hideInterviewer={hideInterviewer}
                      disabled={sending || initializing}
                      onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
                      onToggleHide={() => setHideInterviewer(!hideInterviewer)}
                      onSend={handleSendMessage}
                      onTranscribe={handleTranscribe}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar */}
        {rightOpen ? (
          <RightSidebar onCollapse={() => setRightOpen(false)} />
        ) : (
          <RightSidebarCollapsed onExpand={() => setRightOpen(true)} />
        )}
      </div>

      {/* Modals */}
      <NewSessionModal
        open={sessionModalOpen}
        applicationId={activeCompanyId}
        onClose={() => setSessionModalOpen(false)}
        onStart={handleStartSession}
      />
      <AddCompanyModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        onAdded={handleCompanyAdded}
      />

    </div>
  );
}
