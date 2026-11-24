import { createContext, useCallback, useContext } from 'react';

/**
 * Another user's workspace an admin is looking at (ADR013): their library, tests and attempts, read-only, under
 * `/admin/workspaces/{tenantId}/...`. The admin's own pages (`/library`, `/tests`, ...) never change.
 */
export interface ViewedWorkspace {
  tenantId: number;
  name: string;
  /** Prefix of this workspace's pages, e.g. `/admin/workspaces/11`. */
  basePath: string;
}

export const ViewedWorkspaceContext = createContext<ViewedWorkspace | null>(null);

/** The workspace being viewed, or null on the user's own pages. */
export function useViewedWorkspace(): ViewedWorkspace | null {
  return useContext(ViewedWorkspaceContext);
}

/**
 * Turns an app path of the own workspace (`/tests/5`) into the same page of the viewed one
 * (`/admin/workspaces/11/tests/5`), so pages link within the workspace they show.
 */
export function useWorkspacePath(): (path: string) => string {
  const viewed = useViewedWorkspace();
  return useCallback((path: string) => (viewed ? `${viewed.basePath}${path}` : path), [viewed]);
}
