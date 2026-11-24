import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Pagination,
  Paper,
  Popover,
  Progress,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue, useLocalStorage } from '@mantine/hooks';
import {
  IconAdjustmentsHorizontal,
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconBuildingWarehouse,
  IconChevronRight,
  IconColumns3,
  IconSearch,
} from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/api/account';
import { useTenantList } from '@/api/admin';
import type { TenantSummaryDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatBytes, formatDateTime } from '@/shared/format';
import { WorkspaceLimitsModal } from './WorkspaceLimitsModal';

const PAGE_SIZE = 20;

/** Tenant types as the UI names them (a tenant is a "library" there, its owner's "workspace"). */
const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Personal',
  ORGANIZATION: 'Organization',
  LIBRARY: 'Shared library',
};

type SortKey = 'name' | 'type' | 'owner' | 'topics' | 'documents' | 'storage' | 'usage' | 'createdAt';

interface SortState {
  key: SortKey;
  ascending: boolean;
}

const numberFormat = new Intl.NumberFormat();

/** Columns an admin may hide; the workspace name always shows. */
type ColumnKey = Exclude<SortKey, 'name'>;

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'type', label: 'Type' },
  { key: 'owner', label: 'Owner' },
  { key: 'topics', label: 'Topics' },
  { key: 'documents', label: 'Documents' },
  { key: 'storage', label: 'Storage' },
  { key: 'usage', label: 'AI tokens this month' },
  { key: 'createdAt', label: 'Created' },
];

/** The hidden columns are kept per browser; a column added later shows until it is hidden. */
const HIDDEN_COLUMNS_KEY = 'kg.admin.workspaces.hidden-columns';

/** Checkboxes that show or hide the table's columns. */
function ColumnPicker({
  hidden,
  onChange,
}: {
  hidden: ColumnKey[];
  onChange: (hidden: ColumnKey[]) => void;
}) {
  const visible = COLUMNS.filter((c) => !hidden.includes(c.key)).map((c) => c.key);
  return (
    <Popover position="bottom-end" shadow="md" withinPortal>
      <Popover.Target>
        <Button
          variant="default"
          leftSection={<IconColumns3 size={16} />}
          rightSection={
            hidden.length > 0 ? (
              <Badge size="xs" variant="light" circle>
                {COLUMNS.length - hidden.length}
              </Badge>
            ) : undefined
          }
        >
          Columns
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Checkbox.Group
          value={visible}
          onChange={(values) => onChange(COLUMNS.map((c) => c.key).filter((key) => !values.includes(key)))}
        >
          <Stack gap="xs">
            {COLUMNS.map((c) => (
              <Checkbox key={c.key} value={c.key} label={c.label} size="sm" />
            ))}
          </Stack>
        </Checkbox.Group>
        <Group justify="space-between" mt="sm" gap="xs">
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => onChange([])}
            disabled={hidden.length === 0}
          >
            Show all
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * An amount against its limit: red once the limit is reached (the work it limits is refused then), yellow from 80 %.
 * Without a limit just the amount.
 */
function LimitCell({
  used,
  limit,
  format,
  limitName,
  reachedHint,
}: {
  used: number;
  limit: number | null;
  format: (value: number) => string;
  limitName: string;
  reachedHint: string;
}) {
  if (limit == null) {
    return (
      <div>
        <Text size="sm">{format(used)}</Text>
        <Text size="xs" c="dimmed">
          no limit
        </Text>
      </div>
    );
  }
  const share = limit > 0 ? (used / limit) * 100 : 100;
  const reached = used >= limit;
  const color = reached ? 'red' : share >= 80 ? 'yellow' : undefined;
  // "<1 %" rather than "0 %" while something is used, so a small amount does not read as none.
  const percent = used > 0 && share < 1 ? '<1 %' : `${Math.round(share)} %`;
  // Any amount above zero shows at least a sliver of the bar.
  const bar = used > 0 ? Math.max(2, Math.min(100, share)) : 0;
  return (
    <Tooltip label={reached ? reachedHint : `${percent} of the ${limitName}`}>
      <div style={{ minWidth: 120 }}>
        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={reached ? 700 : undefined} c={reached ? 'red' : undefined}>
            {format(used)}
          </Text>
          {reached && (
            <Badge size="xs" color="red" variant="light">
              Limit
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          of {format(limit)} · {percent}
        </Text>
        <Progress value={bar} color={color ?? 'teal'} size={4} mt={4} />
      </div>
    </Tooltip>
  );
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
  const [limitsOf, setLimitsOf] = useState<TenantSummaryDto | null>(null);
  const [hiddenColumns, setHiddenColumns] = useLocalStorage<ColumnKey[]>({
    key: HIDDEN_COLUMNS_KEY,
    defaultValue: [],
    getInitialValueInEffect: false,
  });
  const shown = (key: ColumnKey) => !hiddenColumns.includes(key);

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
        <ColumnPicker hidden={hiddenColumns} onChange={setHiddenColumns} />
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
          <Table.ScrollContainer minWidth={260 + 120 * (COLUMNS.length - hiddenColumns.length)}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <SortHeader label="Workspace" column="name" sort={sort} onSort={changeSort} />
                  {COLUMNS.filter((c) => shown(c.key)).map((c) => (
                    <SortHeader key={c.key} label={c.label} column={c.key} sort={sort} onSort={changeSort} />
                  ))}
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
                        {tenant.ownLimits && (
                          <Tooltip label="This workspace has limits of its own, which win over the System settings">
                            <Badge variant="light" color="violet" size="sm">
                              Own limits
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    {shown('type') && (
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
                    )}
                    {shown('owner') && (
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
                    )}
                    {shown('topics') && <Table.Td>{tenant.topics}</Table.Td>}
                    {shown('documents') && <Table.Td>{tenant.documents}</Table.Td>}
                    {shown('storage') && (
                      <Table.Td>
                        <LimitCell
                          used={tenant.storageBytes ?? 0}
                          limit={tenant.storageLimitBytes ?? null}
                          format={formatBytes}
                          limitName="storage limit"
                          reachedHint="Storage limit reached: new uploads are refused until documents are deleted"
                        />
                      </Table.Td>
                    )}
                    {shown('usage') && (
                      <Table.Td>
                        <LimitCell
                          used={tenant.tokensThisMonth ?? 0}
                          limit={tenant.tokenLimit ?? null}
                          format={numberFormat.format}
                          limitName="monthly limit"
                          reachedHint="Monthly limit reached: new tests and regenerations are refused until next month"
                        />
                      </Table.Td>
                    )}
                    {shown('createdAt') && (
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        <Text size="sm">{formatDateTime(tenant.createdAt)}</Text>
                      </Table.Td>
                    )}
                    <Table.Td>
                      <Group gap={4} wrap="nowrap" justify="flex-end">
                        <Tooltip label="Limits of this workspace">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={`Limits of ${tenant.name}`}
                            onClick={(event) => {
                              // The row opens the workspace; this opens its limits instead.
                              event.stopPropagation();
                              setLimitsOf(tenant);
                            }}
                          >
                            <IconAdjustmentsHorizontal size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                      </Group>
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
      <WorkspaceLimitsModal tenant={limitsOf} onClose={() => setLimitsOf(null)} />
    </div>
  );
}
