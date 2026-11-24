import { Badge, Group, Paper, Table, Text } from '@mantine/core';
import { IconBuildingWarehouse, IconChevronRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/api/account';
import { useTenants } from '@/api/admin';
import type { TenantSummaryDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatDateTime } from '@/shared/format';

/**
 * Admins only (ADR013): every workspace (tenant). Opening another user's workspace shows their library, tests and
 * attempts, read-only, on pages of their own. The admin's own and the shared library open the normal Library.
 */
export function WorkspacesPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: tenants, isLoading, error } = useTenants();

  // The own and the shared library open the normal Library; any other workspace its own read-only pages.
  const open = (tenant: TenantSummaryDto) =>
    navigate(
      tenant.type === 'LIBRARY' || tenant.tenantId === me?.tenantId
        ? '/library'
        : `/admin/workspaces/${tenant.tenantId}/library`,
    );

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Workspaces"
        description="Every user's workspace and the shared library. Open one to look through its library, tests and attempts, read-only."
        icon={IconBuildingWarehouse}
      />
      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the workspaces" />}
      {tenants && tenants.length === 0 && (
        <EmptyState title="No workspaces yet">Nobody has signed in yet.</EmptyState>
      )}
      {tenants && tenants.length > 0 && (
        <Paper p="sm">
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Workspace</Table.Th>
                  <Table.Th>Topics</Table.Th>
                  <Table.Th>Documents</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tenants.map((tenant) => (
                  <Table.Tr key={tenant.tenantId} className="kg-doc-row" onClick={() => open(tenant)}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" fw={500}>
                          {tenant.name}
                        </Text>
                        {tenant.type === 'LIBRARY' && (
                          <Badge variant="light" color="gray" size="sm">
                            Shared library
                          </Badge>
                        )}
                        {tenant.tenantId === me?.tenantId && (
                          <Badge variant="light" size="sm">
                            You
                          </Badge>
                        )}
                      </Group>
                      {tenant.ownerEmail && (
                        <Text size="xs" c="dimmed">
                          {tenant.ownerEmail}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>{tenant.topics}</Table.Td>
                    <Table.Td>{tenant.documents}</Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Text size="sm">{formatDateTime(tenant.createdAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}
    </div>
  );
}
