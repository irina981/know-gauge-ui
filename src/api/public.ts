import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { SubmitAttemptInput } from './types';

/**
 * What participants call (ADR009): everything by random token, and only the score comes back,
 * never the answer key.
 */
export const publicKeys = {
  test: (token: string) => ['public', 'test', token] as const,
  invitation: (token: string) => ['public', 'invitation', token] as const,
  attempt: (token: string) => ['public', 'attempt', token] as const,
};

/** A link is either valid or not; retrying a 404 only delays the message. */
const noRetry = { retry: false } as const;

export function usePublicTest(token: string) {
  return useQuery({
    queryKey: publicKeys.test(token),
    queryFn: () =>
      unwrap(api.GET('/api/public/tests/{testToken}', { params: { path: { testToken: token } } })),
    ...noRetry,
  });
}

export function usePublicInvitation(token: string) {
  return useQuery({
    queryKey: publicKeys.invitation(token),
    queryFn: () =>
      unwrap(
        api.GET('/api/public/invitations/{invitationToken}', {
          params: { path: { invitationToken: token } },
        }),
      ),
    ...noRetry,
  });
}

export function usePublicAttempt(token: string) {
  return useQuery({
    queryKey: publicKeys.attempt(token),
    queryFn: () =>
      unwrap(api.GET('/api/public/attempts/{attemptToken}', { params: { path: { attemptToken: token } } })),
    ...noRetry,
  });
}

/** Shared link: name and email entered by the participant. */
export function useStartFromLink(testToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { participantName: string; participantEmail: string }) =>
      unwrap(api.POST('/api/public/tests/{testToken}/attempts', { params: { path: { testToken } }, body })),
    onSuccess: (attempt) => queryClient.setQueryData(publicKeys.attempt(attempt.attemptToken!), attempt),
  });
}

/** Personal invitation: only the name; the email is the invited address. */
export function useStartFromInvitation(invitationToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantName: string) =>
      unwrap(
        api.POST('/api/public/invitations/{invitationToken}/attempt', {
          params: { path: { invitationToken } },
          body: { participantName },
        }),
      ),
    onSuccess: (attempt) => queryClient.setQueryData(publicKeys.attempt(attempt.attemptToken!), attempt),
  });
}

export function useSubmitPublicAttempt(attemptToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitAttemptInput) =>
      unwrap(
        api.POST('/api/public/attempts/{attemptToken}/submit', { params: { path: { attemptToken } }, body }),
      ),
    onSuccess: (attempt) => queryClient.setQueryData(publicKeys.attempt(attemptToken), attempt),
    onError: () => queryClient.invalidateQueries({ queryKey: publicKeys.attempt(attemptToken) }),
  });
}
