import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchSessions, createSession, deleteSession } from '../services/api';
import type { Session, InterviewType, SessionMode } from '../types/resume';

export function useSessions(applicationId?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.list(applicationId!),
    queryFn: () => fetchSessions(applicationId!),
    enabled: !!applicationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      application_id: string;
      type: InterviewType;
      mode: SessionMode;
      technical_level?: string;
      interviewer_name?: string;
      additional_notes?: string;
      must_ask_questions?: string[];
    }) => createSession(data),
    onSuccess: (session: Session) => {
      queryClient.setQueryData<Session[]>(
        queryKeys.sessions.list(session.application_id),
        (old) => [session, ...(old ?? [])],
      );
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: string; applicationId: string }) =>
      deleteSession(sessionId),
    onSuccess: (_data, { sessionId, applicationId }) => {
      queryClient.setQueryData<Session[]>(
        queryKeys.sessions.list(applicationId),
        (old) => (old ?? []).filter((s) => s.id !== sessionId),
      );
      // Remove chat cache for this session
      queryClient.removeQueries({
        queryKey: queryKeys.chat.history(sessionId),
      });
    },
  });
}
