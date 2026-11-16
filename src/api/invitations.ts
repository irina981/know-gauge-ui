import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { InviteInput } from './types';

/** Personal invitations: one link per email, sent by the server, usable for one attempt. */
export const invitationKeys = {
  list: (testId: number) => ['invitations', testId] as const,
};

export function useInvitations(testId: number, enabled = true) {
  return useQuery({
    queryKey: invitationKeys.list(testId),
    queryFn: () => unwrap(api.GET('/api/tests/{testId}/invitations', { params: { path: { testId } } })),
    enabled,
  });
}

export function useInvite(testId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteInput) =>
      unwrap(api.POST('/api/tests/{testId}/invitations', { params: { path: { testId } }, body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: invitationKeys.list(testId) }),
  });
}

export function useResendInvitation(testId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) =>
      unwrap(
        api.POST('/api/tests/{testId}/invitations/{invitationId}/resend', {
          params: { path: { testId, invitationId } },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: invitationKeys.list(testId) }),
  });
}
