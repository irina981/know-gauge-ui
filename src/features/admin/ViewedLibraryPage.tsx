import { useLayoutEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useMe } from '@/api/account';
import { useTenants } from '@/api/admin';
import { setViewedTenant } from '@/api/client';
import { queryClient } from '@/app/queryClient';
import { LibraryPage } from '@/features/library/LibraryPage';
import { ErrorAlert, PageLoader } from '@/shared/components';

/** Cached topics and documents belong to one library: drop them when switching between libraries. */
function forgetLibraryContent() {
  queryClient.removeQueries({ queryKey: ['topics'] });
  queryClient.removeQueries({ queryKey: ['documents'] });
}

/**
 * An admin looking at another user's library (`/admin/libraries/:tenantId`, ADR013): the normal Library page,
 * read-only. While it is open, content requests carry the X-KG-Tenant header.
 */
export function ViewedLibraryPage() {
  const tenantId = Number(useParams().tenantId);
  const { data: me } = useMe();
  const { data: tenants, isLoading, error } = useTenants();
  const [ready, setReady] = useState<number | null>(null);

  useLayoutEffect(() => {
    setViewedTenant(tenantId);
    forgetLibraryContent();
    setReady(tenantId);
    return () => {
      setViewedTenant(undefined);
      forgetLibraryContent();
    };
  }, [tenantId]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert error={error} title="Could not load the library" />;
  const tenant = tenants?.find((t) => t.tenantId === tenantId);
  // The own and the shared library open the normal Library page.
  if (!tenant || tenant.type === 'LIBRARY' || tenant.tenantId === me?.tenantId) {
    return <Navigate to={tenant ? '/library' : '/admin/libraries'} replace />;
  }
  if (ready !== tenantId) return <PageLoader />;
  return <LibraryPage key={tenantId} viewed={{ tenantId, name: tenant.name ?? `Library ${tenantId}` }} />;
}
