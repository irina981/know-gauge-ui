import { useLayoutEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useMe } from '@/api/account';
import { useTenant } from '@/api/admin';
import { setViewedTenant } from '@/api/client';
import { ErrorAlert, PageLoader } from '@/shared/components';
import { queryClient } from './queryClient';
import { ViewedWorkspaceContext, type ViewedWorkspace } from './viewedWorkspace';
import { WorkspaceViewBar } from './WorkspaceViewBar';

/** Cached topics, tests and attempts belong to one workspace: forget them on the way in and out. */
function forgetWorkspaceData() {
  queryClient.removeQueries({ predicate: (query) => !['me', 'admin'].includes(String(query.queryKey[0])) });
}

/**
 * Route element of `/admin/workspaces/:tenantId/*`: API reads of its pages carry the X-KG-Tenant header, and a bar
 * says whose workspace this is. The own and the shared library are not viewed this way.
 */
export function WorkspaceScope() {
  const tenantId = Number(useParams().tenantId);
  const { data: me } = useMe();
  const { data: tenant, isLoading, error } = useTenant(tenantId);
  const [ready, setReady] = useState<number | null>(null);

  useLayoutEffect(() => {
    setViewedTenant(tenantId);
    forgetWorkspaceData();
    setReady(tenantId);
    return () => {
      setViewedTenant(undefined);
      forgetWorkspaceData();
    };
  }, [tenantId]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert error={error} title="Could not load the workspace" />;
  if (!tenant || tenant.type === 'LIBRARY' || tenant.tenantId === me?.tenantId) {
    return <Navigate to={tenant ? '/library' : '/admin/workspaces'} replace />;
  }
  if (ready !== tenantId) return <PageLoader />;
  const viewed: ViewedWorkspace = {
    tenantId,
    name: tenant.name ?? `Workspace ${tenantId}`,
    basePath: `/admin/workspaces/${tenantId}`,
  };
  return (
    <ViewedWorkspaceContext.Provider value={viewed}>
      <WorkspaceViewBar name={viewed.name} basePath={viewed.basePath} />
      <Outlet />
    </ViewedWorkspaceContext.Provider>
  );
}
