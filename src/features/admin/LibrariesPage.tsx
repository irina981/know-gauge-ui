import { Badge, Group, Paper, Table, Text } from '@mantine/core';
import { IconBuildingWarehouse, IconChevronRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/api/account';
import { useTenants } from '@/api/admin';
import type { TenantSummaryDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatDateTime } from '@/shared/format';

/**
 * Admins only (ADR013): every library (tenant). Opening one shows it like the normal Library page, read-only. The
 * admin's own library and the shared library open the normal Library page.
 */
export function LibrariesPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: tenants, isLoading, error } = useTenants();

  const open = (tenant: TenantSummaryDto) => {
    if (tenant.type === 'LIBRARY' || tenant.tenantId === me?.tenantId) navigate('/library');
    else navigate(`/admin/libraries/${tenant.tenantId}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Libraries"
        description="Every user's library and the shared library. Open one to look through its topics and documents, read-only."
        icon={IconBuildingWarehouse}
      />
      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the libraries" />}
      {tenants && tenants.length === 0 && (
        <EmptyState title="No libraries yet">Nobody has signed in yet.</EmptyState>
      )}
      {tenants && tenants.length > 0 && (
        <Paper p="sm">
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Library</Table.Th>
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
                            Shared
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
