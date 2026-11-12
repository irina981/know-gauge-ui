import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, unwrapVoid } from './client';
import type { TestInput } from './types';

export const testKeys = {
  all: ['tests'] as const,
  list: (status?: string) => ['tests', 'list', status ?? 'ALL'] as const,
  detail: (id: number) => ['tests', id] as const,
  questions: (id: number) => ['tests', id, 'questions'] as const,
  versions: (testId: number, questionId: number) => ['tests', testId, 'versions', questionId] as const,
  events: (id: number) => ['tests', id, 'events'] as const,
  runs: (id: number) => ['tests', id, 'runs'] as const,
};

export function useTests(status?: string) {
  return useQuery({
    queryKey: testKeys.list(status),
    queryFn: () => unwrap(api.GET('/api/tests', { params: { query: { status } } })),
  });
}

export function useTest(id: number) {
  return useQuery({
    queryKey: testKeys.detail(id),
    queryFn: () => unwrap(api.GET('/api/tests/{id}', { params: { path: { id } } })),
  });
}

/** Generation runs synchronously on the server and can take a minute or more. */
export function useGenerateTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TestInput) => unwrap(api.POST('/api/tests', { body: input })),
    // A failed generation still creates a FAILED test, so refresh the list either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: testKeys.all }),
  });
}

export function useDeleteTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      unwrapVoid(api.DELETE('/api/tests/{id}', { params: { path: { id } }, parseAs: 'text' })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: testKeys.all }),
  });
}
