/**
 * The roles KnowGauge keeps (ADR012), with the names the UI shows. `ADMIN` is the application admin; the others are
 * roles in one workspace. The descriptions follow the permissions in ADR017; keep them in sync.
 */
export const ROLES: Record<string, { label: string; description: string; color: string }> = {
  ADMIN: {
    label: 'Application admin',
    description:
      'Administers KnowGauge: creates workspaces, sets their limits, changes the shared libraries and the system settings, and views any workspace without changing it.',
    color: 'violet',
  },
  TENANT_ADMIN: {
    label: 'Admin',
    description:
      'Does everything in the workspace: changes the library, creates and changes any test, invites people and changes the workspace settings.',
    color: 'brand',
  },
  TENANT_USER: {
    label: 'User',
    description:
      'Reads everything in the workspace, creates tests and changes, shares and deletes only their own, and takes tests. Cannot change the library.',
    color: 'teal',
  },
  TENANT_VIEWER: {
    label: 'Viewer',
    description: 'Reads the library, every test and every result, and changes nothing. Does not take tests.',
    color: 'gray',
  },
};

/** The roles an invitation to an organization workspace may give, in this order. */
export const INVITABLE_ROLES = ['TENANT_ADMIN', 'TENANT_USER', 'TENANT_VIEWER'] as const;

/** The UI name of a role; an unknown role shows its code. */
export function roleLabel(role?: string | null): string {
  return (role && ROLES[role]?.label) ?? role ?? '—';
}

/** Roles in a stable order: application admin first, then as in {@link ROLES}. */
export function sortRoles(roles: string[] = []): string[] {
  const order = Object.keys(ROLES);
  const rank = (r: string) => (order.indexOf(r) === -1 ? order.length : order.indexOf(r));
  return [...roles].sort((a, b) => rank(a) - rank(b));
}
