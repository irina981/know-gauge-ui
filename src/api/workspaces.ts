import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from './admin';
import { api, unwrap, unwrapVoid } from './client';
import type { TenantCreateInput, WorkspaceInviteInput } from './types';

/** Workspaces an ADMIN creates and the invitations to them (ADR015). */
export const workspaceKeys = {
  invitations: (tenantId: number) => ['admin', 'tenants', 'invitations', tenantId] as const,
  preview: (token: string) => ['workspace-invitation', token] as const,
};

/** Creates a workspace and sends its invitations; the list shows it at once. ADMIN only. */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TenantCreateInput) => unwrap(api.POST('/api/admin/tenants', { body: input })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.tenants }),
  });
}

/** A workspace's invitations, oldest first. ADMIN only. */
export function useWorkspaceInvitations(tenantId: number | null) {
  return useQuery({
    queryKey: workspaceKeys.invitations(tenantId ?? 0),
    queryFn: () =>
      unwrap(api.GET('/api/admin/tenants/{id}/invitations', { params: { path: { id: tenantId ?? 0 } } })),
    enabled: tenantId != null,
  });
}

export function useInviteToWorkspace(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkspaceInviteInput) =>
      unwrap(
        api.POST('/api/admin/tenants/{id}/invitations', { params: { path: { id: tenantId } }, body: input }),
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: workspaceKeys.invitations(tenantId) }),
  });
}

export function useResendWorkspaceInvitation(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) =>
      unwrap(
        api.POST('/api/admin/tenants/{id}/invitations/{invitationId}/resend', {
          params: { path: { id: tenantId, invitationId } },
        }),
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: workspaceKeys.invitations(tenantId) }),
  });
}

export function useRevokeWorkspaceInvitation(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) =>
      unwrapVoid(
        api.DELETE('/api/admin/tenants/{id}/invitations/{invitationId}', {
          params: { path: { id: tenantId, invitationId } },
        }),
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: workspaceKeys.invitations(tenantId) }),
  });
}

/**
 * What an invitation link leads to; public, so the join page shows it before signing in. Once someone is signed in,
 * pass `enabled` only after /api/me has loaded: a first sign-in joins the invited workspace there, so the invitation
 * must be read after it.
 */
export function useWorkspaceInvitationPreview(token: string, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.preview(token),
    queryFn: () =>
      unwrap(api.GET('/api/public/workspace-invitations/{token}', { params: { path: { token } } })),
    retry: false,
    enabled,
  });
}

/**
 * Moves the signed-in user into the invited workspace. Everything cached belongs to the workspace they left, so the
 * whole cache is dropped.
 */
export function useAcceptWorkspaceInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.POST('/api/me/workspace-invitations/{token}/accept', { params: { path: { token } } })),
    onSuccess: () => queryClient.clear(),
  });
}
