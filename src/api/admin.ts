import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { Page, TenantSummaryDto } from './types';

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

/** One tenant with its type, owner and content counts. ADMIN only (ADR013). */
export function useTenant(tenantId: number) {
  return useQuery({
    queryKey: adminKeys.tenant(tenantId),
    queryFn: () => unwrap(api.GET('/api/admin/tenants/{id}', { params: { path: { id: tenantId } } })),
  });
}
