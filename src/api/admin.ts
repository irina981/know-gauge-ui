import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, unwrapVoid } from './client';
import type { Page, TenantSummaryDto, TokenPriceInput } from './types';

/** Query of the admin tenant list: all optional; `sort` is `property,asc|desc`. */
export interface TenantListParams {
  search?: string;
  type?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const adminKeys = {
  tenants: ['admin', 'tenants'] as const,
  tenantList: (params: TenantListParams) => ['admin', 'tenants', 'list', params] as const,
  tenant: (id: number) => ['admin', 'tenants', 'one', id] as const,
  tenantSettings: (id: number) => ['admin', 'tenants', 'settings', id] as const,
};

/** One page of tenants (user workspaces and libraries), filtered and sorted on the server. ADMIN only (ADR013). */
export function useTenantList(params: TenantListParams) {
  return useQuery({
    queryKey: adminKeys.tenantList(params),
    queryFn: async () => {
      const query = new URLSearchParams({ page: String(params.page ?? 0), size: String(params.size ?? 20) });
      if (params.sort) query.set('sort', params.sort);
      if (params.search) query.set('search', params.search);
      if (params.type) query.set('type', params.type);
      const data = await unwrap(
        api.GET('/api/admin/tenants', {
          params: { query: { pageable: {} } },
          // Spring reads page, size, sort and the filters as plain query parameters.
          querySerializer: () => query.toString(),
        }),
      );
      return data as unknown as Page<TenantSummaryDto>;
    },
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/** A shared library an admin may add topics to (ADR015). */
export interface LibraryChoice {
  id: number;
  name: string;
}

/** Every shared library, by name, for the admin's Library page; `enabled` is false for everyone else. */
export function useLibraries(enabled: boolean) {
  return useQuery({
    queryKey: [...adminKeys.tenants, 'libraries'] as const,
    queryFn: async (): Promise<LibraryChoice[]> => {
      const query = new URLSearchParams({ type: 'LIBRARY', size: '200', sort: 'name,asc' });
      const data = (await unwrap(
        api.GET('/api/admin/tenants', {
          params: { query: { pageable: {} } },
          querySerializer: () => query.toString(),
        }),
      )) as unknown as Page<TenantSummaryDto>;
      return data.content.map((t) => ({ id: t.tenantId!, name: t.name ?? `Library ${t.tenantId}` }));
    },
    enabled,
  });
}

/** One tenant with its type, owner and content counts. ADMIN only (ADR013). */
export function useTenant(tenantId: number) {
  return useQuery({
    queryKey: adminKeys.tenant(tenantId),
    queryFn: () => unwrap(api.GET('/api/admin/tenants/{id}', { params: { path: { id: tenantId } } })),
  });
}

/** A workspace's own settings (for now its limits) next to the system values (ADR014). ADMIN only. */
export function useWorkspaceSettings(tenantId: number | null) {
  return useQuery({
    queryKey: adminKeys.tenantSettings(tenantId ?? 0),
    queryFn: () =>
      unwrap(api.GET('/api/admin/tenants/{id}/settings', { params: { path: { id: tenantId ?? 0 } } })),
    enabled: tenantId != null,
  });
}

/**
 * Saves a workspace's own values: an empty value goes back to the system value, 0 means no limit. The list and the
 * usage (the admin's own workspace may be the one changed) show the new limits.
 */
export function useSaveWorkspaceSettings(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string>) =>
      unwrap(
        api.PUT('/api/admin/tenants/{id}/settings', { params: { path: { id: tenantId } }, body: { values } }),
      ),
    onSuccess: (settings) => {
      queryClient.setQueryData(adminKeys.tenantSettings(tenantId), settings);
      void queryClient.invalidateQueries({ queryKey: adminKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: ['me', 'usage'] });
    },
  });
}

/** Removes all of a workspace's own values, so the system values apply to it again. */
export function useResetWorkspaceSettings(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.DELETE('/api/admin/tenants/{id}/settings', { params: { path: { id: tenantId } } })),
    onSuccess: (settings) => {
      queryClient.setQueryData(adminKeys.tenantSettings(tenantId), settings);
      void queryClient.invalidateQueries({ queryKey: adminKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: ['me', 'usage'] });
    },
  });
}

export const settingsKeys = {
  values: ['admin', 'settings', 'values'] as const,
  tokenPrices: ['admin', 'settings', 'token-prices'] as const,
  embedding: ['admin', 'settings', 'embedding'] as const,
};

/** The embedding model, read-only: its vector size, catalog price and stored embeddings per model. ADMIN only. */
export function useEmbeddingInfo() {
  return useQuery({
    queryKey: settingsKeys.embedding,
    queryFn: () => unwrap(api.GET('/api/admin/settings/embedding')),
  });
}

/** The system settings: defaults from the properties files, overrides saved here, values in effect. ADMIN only. */
export function useSystemSettings() {
  return useQuery({
    queryKey: settingsKeys.values,
    queryFn: () => unwrap(api.GET('/api/admin/settings/values')),
  });
}

/** The page's Save: stores all changed values at once (nothing if one does not fit) and applies them. */
export function useSaveSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string>) =>
      unwrap(api.PUT('/api/admin/settings/values', { body: { values } })),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.values, settings);
      // The usage page and the workspace list show the limits, the price list the models in effect.
      void queryClient.invalidateQueries({ queryKey: ['me', 'usage'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: settingsKeys.tokenPrices });
    },
  });
}

/** Reset to defaults: removes every saved value from the database, so the properties files apply again. */
export function useResetSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/admin/settings/values')),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.values, settings);
      void queryClient.invalidateQueries({ queryKey: ['me', 'usage'] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: settingsKeys.tokenPrices });
    },
  });
}

/** The token prices, and the model names to offer when adding one. ADMIN only. */
export function useTokenPrices() {
  return useQuery({
    queryKey: settingsKeys.tokenPrices,
    queryFn: () => unwrap(api.GET('/api/admin/settings/token-prices')),
  });
}

/** Adds or changes a model's price. */
export function useSetTokenPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ model, ...input }: TokenPriceInput & { model: string }) =>
      unwrap(
        api.PUT('/api/admin/settings/token-prices/{model}', { params: { path: { model } }, body: input }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.tokenPrices });
      void queryClient.invalidateQueries({ queryKey: ['me', 'usage'] });
    },
  });
}

export function useDeleteTokenPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (model: string) =>
      unwrapVoid(api.DELETE('/api/admin/settings/token-prices/{model}', { params: { path: { model } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.tokenPrices });
      void queryClient.invalidateQueries({ queryKey: ['me', 'usage'] });
    },
  });
}

/** Looks a model up in the price catalog. Nothing is saved. */
export function useSuggestTokenPrice() {
  return useMutation({
    mutationFn: (model: string) =>
      unwrap(api.POST('/api/admin/settings/token-prices/suggestion', { params: { query: { model } } })),
  });
}
