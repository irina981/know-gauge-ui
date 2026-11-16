import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { SubmitAttemptInput } from './types';

/**
 * Taking published tests: start an attempt, submit the answers (scored at once) and list attempts.
 * The answer key is only returned once an attempt is scored.
 */
export const attemptKeys = {
  all: ['attempts'] as const,
  list: (testId?: number, userId?: number) => ['attempts', 'list', testId ?? 'ALL', userId ?? 'ALL'] as const,
  detail: (id: number) => ['attempts', id] as const,
};

/** Attempts, newest first; both filters are optional. */
export function useAttempts(filters: { testId?: number; userId?: number } = {}) {
  return useQuery({
    queryKey: attemptKeys.list(filters.testId, filters.userId),
    queryFn: () =>
      unwrap(
        api.GET('/api/attempts', { params: { query: { testId: filters.testId, userId: filters.userId } } }),
      ),
  });
}

export function useAttempt(id: number) {
  return useQuery({
    queryKey: attemptKeys.detail(id),
    queryFn: () => unwrap(api.GET('/api/attempts/{attemptId}', { params: { path: { attemptId: id } } })),
  });
}

/** Starts an attempt on a published test for the current user. */
export function useStartAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId: number) =>
      unwrap(api.POST('/api/tests/{testId}/attempts', { params: { path: { testId } } })),
    onSuccess: (detail) => {
      queryClient.setQueryData(attemptKeys.detail(detail.attempt!.id!), detail);
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
    },
  });
}

/** Submits the answers; the response is the scored attempt with the full review. */
export function useSubmitAttempt(attemptId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitAttemptInput) =>
      unwrap(api.POST('/api/attempts/{attemptId}/submit', { params: { path: { attemptId } }, body: input })),
    onSuccess: (detail) => {
      queryClient.setQueryData(attemptKeys.detail(attemptId), detail);
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
    },
    // Already submitted (409) or a validation error: reload the attempt as the server sees it.
    onError: () => queryClient.invalidateQueries({ queryKey: attemptKeys.detail(attemptId) }),
  });
}
