import { MutationCache, QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { ApiError } from '@/api/client';

const TITLES: Record<number, string> = {
  400: 'Invalid request',
  404: 'Not found',
  409: 'Conflict',
  502: 'AI provider error',
  503: 'Service unavailable',
  504: 'Timed out',
};

/** The proxy gave up (504) or the connection broke (no HTTP status): the server may still be working. */
function isConnectionLost(error: Error): boolean {
  return error instanceof ApiError ? error.status === 504 : true;
}

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
    onError: (error, _variables, _context, mutation) => {
      const status = error instanceof ApiError ? error.status : undefined;
      let message = error.message;
      if (mutation.meta?.generationRequest && isConnectionLost(error)) {
        message +=
          ' The connection was lost, but generation may still be running on the server. Check the Tests page.';
      }
      notifications.show({
        color: 'red',
        title: (status && TITLES[status]) ?? 'Request failed',
        message,
        autoClose: 12000,
      });
    },
  }),
});
