import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  fetchChatHistory,
  sendMessage,
  startInterview,
  type ChatHistoryResult,
  type ChatMessage,
} from '../services/api';

export function useChatHistory(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.chat.history(sessionId!),
    queryFn: () => fetchChatHistory(sessionId!),
    enabled: !!sessionId,
    staleTime: 0,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      sendMessage(sessionId, message),
    onMutate: async ({ sessionId, message }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.chat.history(sessionId) });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<ChatHistoryResult>(
        queryKeys.chat.history(sessionId),
      );

      // Optimistically add user message
      queryClient.setQueryData<ChatHistoryResult>(
        queryKeys.chat.history(sessionId),
        (old) => ({
          messages: [...(old?.messages ?? []), { role: 'user' as const, content: message }],
          total_round: old?.total_round ?? 0,
        }),
      );

      return { previous, sessionId };
    },
    onSuccess: (result, { sessionId }) => {
      // Append AI response
      queryClient.setQueryData<ChatHistoryResult>(
        queryKeys.chat.history(sessionId),
        (old) => ({
          messages: [
            ...(old?.messages ?? []),
            { role: 'assistant' as const, content: result.response },
          ],
          total_round: result.total_round,
        }),
      );
    },
    onError: (_err, { sessionId }, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.chat.history(sessionId),
          context.previous,
        );
      }
    },
  });
}

export function useStartInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => startInterview(sessionId),
    onSuccess: (result, sessionId) => {
      // Set initial chat history with first AI message
      const initial: ChatHistoryResult = {
        messages: [{ role: 'assistant', content: result.response }],
        total_round: result.total_round,
      };
      queryClient.setQueryData(queryKeys.chat.history(sessionId), initial);
    },
  });
}

/** Helper to read current chat data from cache without a hook */
export function getChatMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
): ChatMessage[] {
  const data = queryClient.getQueryData<ChatHistoryResult>(
    queryKeys.chat.history(sessionId),
  );
  return data?.messages ?? [];
}
