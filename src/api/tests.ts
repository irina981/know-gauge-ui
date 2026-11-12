import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { api, unwrap, unwrapVoid } from './client';
import type { TestDto, TestInput } from './types';

export const testKeys = {
  all: ['tests'] as const,
  list: (status?: string) => ['tests', 'list', status ?? 'ALL'] as const,
  detail: (id: number) => ['tests', id] as const,
  questions: (id: number) => ['tests', id, 'questions'] as const,
  versions: (testId: number, questionId: number) => ['tests', testId, 'versions', questionId] as const,
  events: (id: number) => ['tests', id, 'events'] as const,
  runs: (id: number) => ['tests', id, 'runs'] as const,
};

/** While a test is CREATED its generation is still running on the server. */
export const isGenerating = (test?: TestDto) => test?.status === 'CREATED';

/** How often lists and pages re-check a test that is still generating. */
const GENERATION_POLL_MS = 5000;

export function useTests(status?: string) {
  return useQuery({
    queryKey: testKeys.list(status),
    queryFn: () => unwrap(api.GET('/api/tests', { params: { query: { status } } })),
    // Keep refreshing while any test is still generating, so it turns into GENERATED/FAILED by itself.
    refetchInterval: (query) => (query.state.data?.some(isGenerating) ? GENERATION_POLL_MS : false),
  });
}

export function useTest(id: number) {
  return useQuery({
    queryKey: testKeys.detail(id),
    queryFn: () => unwrap(api.GET('/api/tests/{id}', { params: { path: { id } } })),
    refetchInterval: (query) => (isGenerating(query.state.data) ? GENERATION_POLL_MS : false),
  });
}

/**
 * Generation runs synchronously on the server and can take many minutes (each LLM call can time out and
 * be retried). The request keeps running even if the user leaves the page; the callbacks here still fire.
 */
export function useGenerateTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TestInput) => unwrap(api.POST('/api/tests', { body: input })),
    meta: { generationRequest: true },
    // The server stores the test as CREATED right away; refresh the list so it shows up as "Generating".
    onMutate: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: testKeys.all }), 2000);
    },
    onSuccess: (test) => {
      notifications.show({ color: 'teal', title: 'Test generated', message: `Test #${test.id} is ready.` });
    },
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
