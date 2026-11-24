import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { UserPreferencesDto } from './types';

export const accountKeys = {
  me: ['me'] as const,
  preferences: ['me', 'preferences'] as const,
  usage: ['me', 'usage'] as const,
};

/** The signed-in user, their workspace and roles. */
export function useMe() {
  return useQuery({ queryKey: accountKeys.me, queryFn: () => unwrap(api.GET('/api/me')) });
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
