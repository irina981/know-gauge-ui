import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { UserPreferencesDto } from './types';

export const accountKeys = {
  me: ['me'] as const,
  preferences: ['me', 'preferences'] as const,
  usage: ['me', 'usage'] as const,
};

/** The signed-in user, their workspace and roles; `enabled` is false on public pages while nobody is signed in. */
export function useMe(enabled = true) {
  return useQuery({ queryKey: accountKeys.me, queryFn: () => unwrap(api.GET('/api/me')), enabled });
}

/** Settings the user chose; `enabled` is false where there is no user to keep them for (sign-in off). */
export function usePreferences(enabled = true) {
  return useQuery({
    queryKey: accountKeys.preferences,
    queryFn: () => unwrap(api.GET('/api/me/preferences')),
    enabled,
    staleTime: Infinity,
  });
}

/** Replaces all settings at once; the cache is updated first, so the page reacts at once. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserPreferencesDto) => unwrap(api.PUT('/api/me/preferences', { body: input })),
    onMutate: (input) => queryClient.setQueryData(accountKeys.preferences, input),
    onSuccess: (saved) => queryClient.setQueryData(accountKeys.preferences, saved),
  });
}

/** What the workspace holds and used this month. */
export function useUsage() {
  return useQuery({ queryKey: accountKeys.usage, queryFn: () => unwrap(api.GET('/api/me/usage')) });
}

/** A tenant admin of an organization workspace (ADR015), who sees its Users and Workspace settings. */
export function isOrganizationAdmin(me: { tenantType?: string; roles?: string[] } | undefined) {
  return me?.tenantType === 'ORGANIZATION' && !!me.roles?.includes('TENANT_ADMIN');
}

/**
 * What the signed-in user's role allows in their own workspace (ADR017), to hide what the server would refuse:
 * tenant admins (and application admins) change the library; users and admins create and take tests. A single test
 * says itself whether the user may change it (`TestDto.readOnly`: a user changes only their own).
 */
export function usePermissions() {
  const { data: me } = useMe();
  const roles = me?.roles ?? [];
  const admin = roles.includes('TENANT_ADMIN') || roles.includes('ADMIN');
  return {
    canChangeLibrary: admin,
    canCreateTests: admin || roles.includes('TENANT_USER'),
  };
}
