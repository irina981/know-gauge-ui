import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { ManualQuestionInput } from './types';
import { testKeys } from './tests';

export function useTestQuestions(testId: number) {
  return useQuery({
    queryKey: testKeys.questions(testId),
    queryFn: () => unwrap(api.GET('/api/tests/{id}/questions', { params: { path: { id: testId } } })),
  });
}

export function useQuestionVersions(testId: number, questionId: number | undefined) {
  return useQuery({
    queryKey: testKeys.versions(testId, questionId ?? -1),
    enabled: questionId != null,
    queryFn: () =>
      unwrap(
        api.GET('/api/tests/{testId}/questions/{questionId}/versions', {
          params: { path: { testId, questionId: questionId! } },
        }),
      ),
  });
}

export function useTestEvents(testId: number) {
  return useQuery({
    queryKey: testKeys.events(testId),
    queryFn: () => unwrap(api.GET('/api/tests/{testId}/events', { params: { path: { testId } } })),
  });
}

export function useGenerationRuns(testId: number) {
  return useQuery({
    queryKey: testKeys.runs(testId),
    queryFn: () => unwrap(api.GET('/api/tests/{testId}/generation-runs', { params: { path: { testId } } })),
  });
}

interface ReviewAction {
  questionId: number;
  /** The version the user was looking at. The server rejects the action (409) if it is no longer current. */
  expectedCurrentVersionId: number;
  comment?: string;
}

/**
 * Accept fix, regenerate and manual replace all create a new question version.
 * Afterwards everything about the test may have changed (question, status, history), so refresh it all,
 * also after a 409 so the user sees the latest version.
 */
function useReviewMutation<TVars extends ReviewAction>(
  testId: number,
  call: (vars: TVars) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSettled: () => queryClient.invalidateQueries({ queryKey: testKeys.detail(testId) }),
  });
}

export function useAcceptFix(testId: number) {
  return useReviewMutation(testId, ({ questionId, ...body }: ReviewAction) =>
    unwrap(
      api.POST('/api/tests/{testId}/questions/{questionId}/accept-fix', {
        params: { path: { testId, questionId } },
        body,
      }),
    ),
  );
}

export function useRegenerateQuestion(testId: number) {
  return useReviewMutation(testId, ({ questionId, ...body }: ReviewAction) =>
    unwrap(
      api.POST('/api/tests/{testId}/questions/{questionId}/regenerate', {
        params: { path: { testId, questionId } },
        body,
      }),
    ),
  );
}

export function useManualReplace(testId: number) {
  return useReviewMutation(
    testId,
    ({ questionId, ...body }: ReviewAction & Omit<ManualQuestionInput, 'expectedCurrentVersionId'>) =>
      unwrap(
        api.POST('/api/tests/{testId}/questions/{questionId}/manual-replace', {
          params: { path: { testId, questionId } },
          body,
        }),
      ),
  );
}
