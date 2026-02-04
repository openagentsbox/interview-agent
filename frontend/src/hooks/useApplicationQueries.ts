import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchApplications, deleteApplication } from '../services/api';
import type { Application } from '../types/resume';

export function useApplications() {
  return useQuery({
    queryKey: queryKeys.applications.list(),
    queryFn: fetchApplications,
    staleTime: Infinity,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ app }: { app: Application }) => {
      // The app was already created by AddCompanyModal which calls createApplication directly.
      // We just need to update the cache.
      return Promise.resolve(app);
    },
    onSuccess: (app: Application) => {
      queryClient.setQueryData<Application[]>(
        queryKeys.applications.list(),
        (old) => [app, ...(old ?? [])],
      );
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => deleteApplication(applicationId),
    onSuccess: (_data, applicationId) => {
      queryClient.setQueryData<Application[]>(
        queryKeys.applications.list(),
        (old) => (old ?? []).filter((c) => c.id !== applicationId),
      );
      // Remove all session caches for this application
      queryClient.removeQueries({
        queryKey: queryKeys.sessions.list(applicationId),
      });
    },
  });
}
