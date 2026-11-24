import {
  Badge,
  Group,
  Pagination,
  Paper,
  Select,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconBuildingWarehouse,
  IconChevronRight,
  IconSearch,
} from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/api/account';
import { useTenantList } from '@/api/admin';
import type { TenantSummaryDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatDateTime } from '@/shared/format';

const PAGE_SIZE = 20;

/** Tenant types as the UI names them (a tenant is a "library" there, its owner's "workspace"). */
const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Personal',
  ORGANIZATION: 'Organization',
  LIBRARY: 'Shared library',
};

type SortKey = 'name' | 'type' | 'owner' | 'topics' | 'documents' | 'createdAt';

interface SortState {
  key: SortKey;
  ascending: boolean;
}

/** A column header that sorts the list on the server; a second click turns the order around. */
function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: ReactNode;
  column: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === column;
  const Icon = !active ? IconArrowsSort : sort.ascending ? IconArrowUp : IconArrowDown;
  return (
    <Table.Th>
      <UnstyledButton onClick={() => onSort(column)} aria-label={`Sort by ${label}`}>
        <Group gap={4} wrap="nowrap">
          <Text size="sm" fw={600}>
            {label}
          </Text>
          <Icon size={14} color={active ? undefined : 'var(--mantine-color-dimmed)'} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

/**
 * Admins only (ADR013): every workspace (tenant), filtered, sorted and paged on the server. Opening another user's
 * workspace shows their library, tests and attempts, read-only, on pages of their own. The admin's own and the
 * shared library open the normal Library.
 */
export function WorkspacesPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);
  const [type, setType] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'name', ascending: true });
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching, error } = useTenantList({
    search: debouncedSearch,
    type: type ?? undefined,
    page,
    size: PAGE_SIZE,
    sort: `${sort.key},${sort.ascending ? 'asc' : 'desc'}`,
  });

  // A new filter or order starts at the first page.
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const changeType = (value: string | null) => {
    setType(value);
    setPage(0);
  };
  const changeSort = (key: SortKey) => {
    setSort((current) => ({ key, ascending: current.key === key ? !current.ascending : true }));
    setPage(0);
  };

  // The own and the shared library open the normal Library; any other workspace its own read-only pages.
  const open = (tenant: TenantSummaryDto) =>
    navigate(
      tenant.type === 'LIBRARY' || tenant.tenantId === me?.tenantId
        ? '/library'
        : `/admin/workspaces/${tenant.tenantId}/library`,
    );

  const tenants = data?.content ?? [];
  const total = data?.page.totalElements ?? 0;
  const filtered = !!debouncedSearch || !!type;

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Workspaces"
        description="Every workspace: users' personal ones, organizations and the shared library. Open one to look through its library, tests and attempts, read-only."
        icon={IconBuildingWarehouse}
      />

      <Group gap="sm" mb="md" align="flex-end">
        <TextInput
          label="Search"
          placeholder="Name or owner's email"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => changeSearch(event.currentTarget.value)}
          style={{ flex: '1 1 260px', maxWidth: 420 }}
        />
        <Select
          label="Type"
          placeholder="All types"
          clearable
          data={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          value={type}
          onChange={changeType}
          w={200}
        />
      </Group>

      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the workspaces" />}
      {data && tenants.length === 0 && (
        <EmptyState title={filtered ? 'No matching workspaces' : 'No workspaces yet'}>
          {filtered ? 'Try another search or type.' : 'Nobody has signed in yet.'}
        </EmptyState>
      )}
      {data && tenants.length > 0 && (
        <Paper p="sm" style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity 120ms ease' }}>
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <SortHeader label="Workspace" column="name" sort={sort} onSort={changeSort} />
                  <SortHeader label="Type" column="type" sort={sort} onSort={changeSort} />
                  <SortHeader label="Owner" column="owner" sort={sort} onSort={changeSort} />
                  <SortHeader label="Topics" column="topics" sort={sort} onSort={changeSort} />
                  <SortHeader label="Documents" column="documents" sort={sort} onSort={changeSort} />
                  <SortHeader label="Created" column="createdAt" sort={sort} onSort={changeSort} />
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
                        {tenant.tenantId === me?.tenantId && (
                          <Badge variant="light" size="sm">
                            You
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={
                          tenant.type === 'LIBRARY'
                            ? 'gray'
                            : tenant.type === 'ORGANIZATION'
                              ? 'violet'
                              : 'brand'
                        }
                        size="sm"
                      >
                        {TYPE_LABELS[tenant.type ?? ''] ?? tenant.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {tenant.ownerName || tenant.ownerEmail ? (
                        <>
                          <Text size="sm">{tenant.ownerName ?? tenant.ownerEmail}</Text>
                          {tenant.ownerName && tenant.ownerEmail && (
                            <Text size="xs" c="dimmed">
                              {tenant.ownerEmail}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
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
          <Group justify="space-between" mt="sm" px="xs">
            <Text size="sm" c="dimmed">
              {total} {total === 1 ? 'workspace' : 'workspaces'}
            </Text>
            {(data.page.totalPages ?? 0) > 1 && (
              <Pagination
                total={data.page.totalPages ?? 1}
                value={page + 1}
                onChange={(p) => setPage(p - 1)}
                size="sm"
              />
            )}
          </Group>
        </Paper>
      )}
    </div>
  );
}
