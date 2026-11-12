import { MutationCache, QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { ApiError } from '@/api/client';

const TITLES: Record<number, string> = {
  400: 'Invalid request',
  404: 'Not found',
  409: 'Conflict',
  502: 'AI provider error',
  503: 'Service unavailable',
};

/**
 * Every failed mutation (create, upload, ingest, review action, ...) shows a notification with the
 * backend's message, so individual screens don't need their own error handling.
 * Failed queries (loading data) are shown inline by each page instead.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      const status = error instanceof ApiError ? error.status : undefined;
      notifications.show({
        color: 'red',
        title: (status && TITLES[status]) ?? 'Request failed',
        message: error.message,
        autoClose: 8000,
      });
    },
  }),
});
