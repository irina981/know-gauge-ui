import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, unwrapVoid } from './client';
import type { TenantInviteInput } from './types';

/**
 * The signed-in user's own organization workspace, for its tenant admins (ADR016): its users, the invitations that
 * bring more, and its configuration. Not the admin's view of other workspaces (`admin.ts`, `workspaces.ts`).
 */
export const organizationKeys = {
  users: ['workspace', 'users'] as const,
  invitations: ['workspace', 'invitations'] as const,
  settings: ['workspace', 'settings'] as const,
};

/** The users of the workspace with their roles, by name. */
export function useOrganizationUsers() {
  return useQuery({
    queryKey: organizationKeys.users,
    queryFn: () => unwrap(api.GET('/api/tenant/users')),
  });
}

/** The workspace's invitations, oldest first, with the role each gives. */
export function useOrganizationInvitations() {
  return useQuery({
    queryKey: organizationKeys.invitations,
    queryFn: () => unwrap(api.GET('/api/tenant/invitations')),
  });
}

/** Invites people with one role; someone invited before gets their link again with the new role. */
export function useInviteToOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TenantInviteInput) => unwrap(api.POST('/api/tenant/invitations', { body: input })),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: organizationKeys.invitations }),
  });
}

export function useResendOrganizationInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) =>
      unwrap(
        api.POST('/api/tenant/invitations/{invitationId}/resend', { params: { path: { invitationId } } }),
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: organizationKeys.invitations }),
  });
}

export function useRevokeOrganizationInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) =>
      unwrapVoid(
        api.DELETE('/api/tenant/invitations/{invitationId}', { params: { path: { invitationId } } }),
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: organizationKeys.invitations }),
  });
}

/** The workspace's configuration (CONFIG settings only; its limits are an application admin's). */
export function useOrganizationSettings() {
  return useQuery({
    queryKey: organizationKeys.settings,
    queryFn: () => unwrap(api.GET('/api/tenant/settings')),
  });
}

/** Saves the workspace's own values; an empty value goes back to the system value. */
export function useSaveOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string>) =>
      unwrap(api.PUT('/api/tenant/settings', { body: { values } })),
    onSuccess: (settings) => {
      queryClient.setQueryData(organizationKeys.settings, settings);
      // New tests start from these values (Generate test form).
      void queryClient.invalidateQueries({ queryKey: ['tests', 'defaults'] });
    },
  });
}

/** Removes the workspace's own configuration values, so the system values apply again. */
export function useResetOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/tenant/settings')),
    onSuccess: (settings) => {
      queryClient.setQueryData(organizationKeys.settings, settings);
      // New tests start from these values (Generate test form).
      void queryClient.invalidateQueries({ queryKey: ['tests', 'defaults'] });
    },
  });
}
