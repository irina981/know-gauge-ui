import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconAdjustmentsHorizontal,
  IconBuildingWarehouse,
  IconChevronRight,
  IconMailPlus,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/api/account';
import { useTenantList } from '@/api/admin';
import type { TenantSummaryDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatBytes, formatDateTime } from '@/shared/format';
import { useSort } from '@/shared/table/sorting';
import { ColumnHeader, ColumnPicker, TablePager } from '@/shared/table/TableControls';
import { useTableLayout, type TableColumn } from '@/shared/table/useTableLayout';
import { NewWorkspaceModal } from './NewWorkspaceModal';
import { WorkspaceInvitationsModal } from './WorkspaceInvitationsModal';
import { WorkspaceLimitsModal } from './WorkspaceLimitsModal';

/** Tenant types as the UI names them (a tenant is a "library" there, its owner's "workspace"). */
const TYPE_LABELS: Record<string, string> = {
  PERSONAL: 'Personal',
  ORGANIZATION: 'Organization',
  LIBRARY: 'Shared library',
};

/** The columns; the server sorts by each of them. */
type ColumnKey = 'name' | 'type' | 'owner' | 'topics' | 'documents' | 'storage' | 'usage' | 'createdAt';

const numberFormat = new Intl.NumberFormat();

/** The workspace name always shows. */
const COLUMNS: TableColumn<ColumnKey>[] = [
  { key: 'name', label: 'Workspace', width: 260, min: 140, hideable: false },
  { key: 'type', label: 'Type', width: 130, min: 80 },
  { key: 'owner', label: 'Owner', width: 220, min: 100 },
  { key: 'topics', label: 'Topics', width: 100, min: 70 },
  { key: 'documents', label: 'Documents', width: 120, min: 70 },
  { key: 'storage', label: 'Storage', width: 160, min: 120 },
  { key: 'usage', label: 'AI tokens this month', width: 190, min: 120 },
  { key: 'createdAt', label: 'Created', width: 170, min: 100 },
];

/** The last column, with the row's buttons, keeps its width. */
const ACTIONS_WIDTH = 120;

/**
 * Whether a row offers its invitations (ADR015): where some were sent, and where one can still be sent (an
 * organization, a personal workspace without an owner). Workspaces made at sign-up and libraries have none.
 */
function hasInvitations(tenant: TenantSummaryDto): boolean {
  if ((tenant.invitations ?? 0) > 0) return true;
  return tenant.type === 'ORGANIZATION' || (tenant.type === 'PERSONAL' && tenant.ownerUserId == null);
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
  const [page, setPage] = useState(0);
  // A new filter, order or page size starts at the first page.
  const { sort, changeSort } = useSort<ColumnKey>({ key: 'name', ascending: true }, () => setPage(0));
  const [limitsOf, setLimitsOf] = useState<TenantSummaryDto | null>(null);
  const [invitationsOf, setInvitationsOf] = useState<TenantSummaryDto | null>(null);
  const [creating, setCreating] = useState(false);
  const layout = useTableLayout({
    storageKey: 'kg.admin.workspaces',
    columns: COLUMNS,
    actionsWidth: ACTIONS_WIDTH,
  });
  const { shown, truncate } = layout;

  const { data, isLoading, isFetching, error } = useTenantList({
    search: debouncedSearch,
    type: type ?? undefined,
    page,
    size: layout.pageSize,
    sort: `${sort.key},${sort.ascending ? 'asc' : 'desc'}`,
  });

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const changeType = (value: string | null) => {
    setType(value);
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
        description="Every workspace: users' personal ones, organizations and the shared libraries. Open one to look through its library, tests and attempts, read-only, or create a new one and invite people to it."
        icon={IconBuildingWarehouse}
        actions={
          <Button variant="gradient" leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            New workspace
          </Button>
        }
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
        <ColumnPicker layout={layout} />
      </Group>

      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the workspaces" />}
      {data && tenants.length === 0 && (
        <EmptyState title={filtered ? 'No matching workspaces' : 'No workspaces yet'}>
          {filtered
            ? 'Try another search or type.'
            : 'Create one with New workspace, or wait for someone to sign in.'}
        </EmptyState>
      )}
      {data && tenants.length > 0 && (
        <Paper p="sm" style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity 120ms ease' }}>
          <Table.ScrollContainer minWidth={layout.scrollMinWidth}>
            <Table verticalSpacing="sm" highlightOnHover {...layout.tableProps}>
              <Table.Thead>
                <Table.Tr>
                  {layout.visibleColumns.map((c) => (
                    <ColumnHeader key={c.key} column={c} layout={layout} sort={sort} onSort={changeSort} />
                  ))}
                  <Table.Th style={layout.actionsStyle} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tenants.map((tenant) => (
                  <Table.Tr key={tenant.tenantId} className="kg-doc-row" onClick={() => open(tenant)}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" fw={500} truncate={truncate} title={tenant.name}>
                          {tenant.name}
                        </Text>
                        {tenant.tenantId === me?.tenantId && (
                          <Badge variant="light" size="sm" style={truncate ? { flexShrink: 0 } : undefined}>
                            You
                          </Badge>
                        )}
                        {tenant.ownLimits && (
                          <Tooltip label="This workspace has limits of its own, which win over the System settings">
                            <Badge
                              variant="light"
                              color="violet"
                              size="sm"
                              style={truncate ? { flexShrink: 0 } : undefined}
                            >
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
                            <Text size="sm" truncate={truncate} title={tenant.ownerName ?? tenant.ownerEmail}>
                              {tenant.ownerName ?? tenant.ownerEmail}
                            </Text>
                            {tenant.ownerName && tenant.ownerEmail && (
                              <Text size="xs" c="dimmed" truncate={truncate} title={tenant.ownerEmail}>
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
                        {hasInvitations(tenant) && (
                          <Tooltip label="Invitations to this workspace">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              aria-label={`Invitations to ${tenant.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setInvitationsOf(tenant);
                              }}
                            >
                              <IconMailPlus size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
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
          <TablePager
            layout={layout}
            page={page}
            pageCount={data.page.totalPages ?? 1}
            onPage={setPage}
            onPageSize={() => setPage(0)}
            summary={`${total} ${total === 1 ? 'workspace' : 'workspaces'}`}
          />
        </Paper>
      )}
      <WorkspaceLimitsModal tenant={limitsOf} onClose={() => setLimitsOf(null)} />
      <WorkspaceInvitationsModal tenant={invitationsOf} onClose={() => setInvitationsOf(null)} />
      <NewWorkspaceModal opened={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
