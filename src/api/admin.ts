import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './client';

export const adminKeys = {
  tenants: ['admin', 'tenants'] as const,
};

/** Every tenant (user libraries and the shared one) with its owner and content counts. ADMIN only (ADR013). */
export function useTenants(enabled = true) {
  return useQuery({
    queryKey: adminKeys.tenants,
    queryFn: () => unwrap(api.GET('/api/admin/tenants')),
    enabled,
  });
}
