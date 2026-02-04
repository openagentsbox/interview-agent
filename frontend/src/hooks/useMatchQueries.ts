import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { getMatchAnalysis, analyzeMatch, type MatchAnalysisResult } from '../services/api';

export function useMatchAnalysis(applicationId?: string) {
  return useQuery({
    queryKey: queryKeys.match.detail(applicationId!),
    queryFn: () => getMatchAnalysis(applicationId!),
    enabled: !!applicationId,
    staleTime: Infinity, // Never stale unless manually invalidated
  });
}

export function useAnalyzeMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => analyzeMatch(applicationId),
    onSuccess: (result: MatchAnalysisResult, applicationId: string) => {
      // Update cache with new result
      queryClient.setQueryData(
        queryKeys.match.detail(applicationId),
        result,
      );
    },
  });
}

// Helper to invalidate match cache when application is deleted
export function invalidateMatchCache(queryClient: ReturnType<typeof useQueryClient>, applicationId: string) {
  queryClient.removeQueries({
    queryKey: queryKeys.match.detail(applicationId),
  });
}
