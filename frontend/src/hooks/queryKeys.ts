export const queryKeys = {
  resume: {
    detail: () => ['resume', 'detail'] as const,
  },
  applications: {
    list: () => ['applications', 'list'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    list: (appId: string) => ['sessions', 'list', appId] as const,
  },
  chat: {
    history: (sessionId: string) => ['chat', 'history', sessionId] as const,
  },
  match: {
    detail: (appId: string) => ['match', 'detail', appId] as const,
  },
};
