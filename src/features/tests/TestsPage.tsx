import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconChecklist,
  IconListCheck,
  IconShare,
  IconSend,
  IconSparkles,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isGenerating, useDeleteTest, useTests } from '@/api/tests';
import { useViewedWorkspace, useWorkspacePath } from '@/app/viewedWorkspace';
import { topicPathLabel, useTopicTree } from '@/api/topics';
import { EmptyState, ErrorAlert, PageHeader, PageLoader, StatTile, StatusBadge } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';
import { humanize, TEST_STATUSES, testStatus } from '@/shared/enums';
import { formatDateTime, formatDuration } from '@/shared/format';
import { sortRows, usePagedRows, useSort, type SortValue } from '@/shared/table/sorting';
import { ColumnHeader, ColumnPicker, TablePager } from '@/shared/table/TableControls';
import { useTableLayout, type TableColumn } from '@/shared/table/useTableLayout';
import { useNow } from '@/shared/useNow';
import type { TestDto } from '@/api/types';

type ColumnKey = 'id' | 'name' | 'status' | 'questions' | 'settings' | 'generated';

/** The test's name always shows. */
const COLUMNS: TableColumn<ColumnKey>[] = [
  { key: 'id', label: '#', width: 70, min: 50 },
  { key: 'name', label: 'Test', width: 320, min: 160, hideable: false },
  { key: 'status', label: 'Status', width: 150, min: 100 },
  { key: 'questions', label: 'Questions', width: 120, min: 80 },
  { key: 'settings', label: 'Settings', width: 200, min: 100 },
  { key: 'generated', label: 'Generated', width: 190, min: 120 },
];

/** The last column, with Share and Delete, keeps its width. */
const ACTIONS_WIDTH = 140;

const settingsLabel = (t: TestDto) =>
  [t.difficulty, t.answerCardinality]
    .filter(Boolean)
    .map((v) => humanize(v!))
    .join(' · ');

const generatedAt = (t: TestDto) => t.generationFinishedAt ?? t.generationFailedAt ?? t.generationStartedAt;

const sortValue = (t: TestDto, key: ColumnKey): SortValue => {
  switch (key) {
    case 'id':
      return t.id;
    case 'name':
      return t.name || `Test #${t.id}`;
    case 'status':
      return testStatus(t.status).label;
    case 'questions':
      return t.questionCount;
    case 'settings':
      return settingsLabel(t);
    case 'generated':
      return generatedAt(t);
  }
};

/**
 * All tests, newest first until sorted by a column, filterable by status (in the URL, ?status=...) and paged in the
 * browser. The columns shown, their widths and the rows per page are kept per browser.
 */
export function TestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? undefined;
  const { data: tests, isLoading, error } = useTests(status);
  const { data: tree } = useTopicTree();
  const remove = useDeleteTest();
  // An admin viewing another workspace only looks (ADR013).
  const viewed = useViewedWorkspace();
  const navigate = useNavigate();
  const wp = useWorkspacePath();

  // All tests (not filtered), for the numbers at the top.
  const { data: allTests } = useTests();
  const count = (s: string) => allTests?.filter((t) => t.status === s).length ?? 0;
  const questionTotal =
    allTests?.filter((t) => t.status !== 'FAILED').reduce((sum, t) => sum + (t.questionCount ?? 0), 0) ?? 0;

  const layout = useTableLayout({ storageKey: 'kg.tests', columns: COLUMNS, actionsWidth: ACTIONS_WIDTH });
  const { shown } = layout;
  const { sort, changeSort } = useSort<ColumnKey>({ key: 'id', ascending: false });
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search.trim().toLowerCase(), 200);
  const sourceLabel = (t: TestDto) =>
    t.topicIds?.length
      ? t.topicIds.map((id) => topicPathLabel(tree, id)).join(', ')
      : `${t.documentIds?.length ?? 0} document(s)`;
  // The search matches the name, the number or the topics a test was generated from.
  const matches = (t: TestDto) =>
    !debouncedSearch ||
    [t.name, `#${t.id}`, String(t.id), sourceLabel(t)].some((text) =>
      text?.toLowerCase().includes(debouncedSearch),
    );
  const sorted = sortRows((tests ?? []).filter(matches), sort, sortValue);
  // A new filter, order or page size starts at the first page.
  const paged = usePagedRows(
    sorted,
    layout.pageSize,
    `${status}|${debouncedSearch}|${sort.key}|${sort.ascending}|${layout.pageSize}`,
  );
  // Ticks every second while a test is generating, for the "running 2m 10s" label.
  const now = useNow(paged.rows.some(isGenerating));

  return (
    <>
      <PageHeader
        eyebrow="Assessments"
        title="Tests"
        description="Every test generated from your library: review the flagged answers, then publish."
        icon={IconChecklist}
        actions={
          viewed ? null : (
            <Button
              component={Link}
              to="/tests/new"
              variant="gradient"
              leftSection={<IconSparkles size={16} />}
            >
              Generate test
            </Button>
          )
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        <StatTile label="Tests" value={allTests?.length ?? '–'} icon={IconChecklist} />
        <StatTile
          label="Questions"
          value={allTests ? questionTotal : '–'}
          icon={IconListCheck}
          color="violet"
        />
        <StatTile
          label="Need review"
          value={allTests ? count('REQUIRES_REVIEW') : '–'}
          icon={IconAlertTriangle}
          color="orange"
        />
        <StatTile
          label="Published"
          value={allTests ? count('PUBLISHED') : '–'}
          icon={IconSend}
          color="needle"
        />
      </SimpleGrid>

      <Group gap="sm" mb="md" align="flex-end">
        <TextInput
          label="Search"
          placeholder="Name, number or topic"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          style={{ flex: '1 1 260px', maxWidth: 420 }}
        />
        <Select
          label="Status"
          placeholder="All statuses"
          clearable
          data={Object.entries(TEST_STATUSES).map(([value, info]) => ({ value, label: info.label }))}
          value={status ?? null}
          onChange={(v) => setSearchParams(v ? { status: v } : {})}
          w={200}
        />
        <ColumnPicker layout={layout} />
      </Group>

      <Paper>
        {isLoading && <PageLoader />}
        {error && <ErrorAlert error={error} title="Could not load tests" />}
        {tests && sorted.length === 0 && (
          <EmptyState title="No tests" icon={IconChecklist}>
            {status || debouncedSearch
              ? 'No tests match this search or status.'
              : 'Generate a test from a topic in the Library.'}
          </EmptyState>
        )}
        {sorted.length > 0 && (
          <>
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
                  {paged.rows.map((t) => (
                    <Table.Tr
                      key={t.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(wp(`/tests/${t.id}`))}
                    >
                      {shown('id') && (
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {t.id}
                          </Text>
                        </Table.Td>
                      )}
                      <Table.Td maw={layout.truncate ? undefined : 360}>
                        {/* Name first; the source underneath. Older tests have no name. */}
                        <Text size="sm" fw={600} truncate title={t.name}>
                          {t.name || `Test #${t.id}`}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {sourceLabel(t)}
                        </Text>
                      </Table.Td>
                      {shown('status') && (
                        <Table.Td>
                          <StatusBadge info={testStatus(t.status)} busy={isGenerating(t)} />
                        </Table.Td>
                      )}
                      {shown('questions') && (
                        <Table.Td>
                          <Text size="sm">{t.questionCount}</Text>
                        </Table.Td>
                      )}
                      {shown('settings') && (
                        <Table.Td>
                          <Text size="sm" truncate={layout.truncate}>
                            {settingsLabel(t)}
                          </Text>
                        </Table.Td>
                      )}
                      {shown('generated') && (
                        <Table.Td>
                          <Text size="sm">{formatDateTime(generatedAt(t))}</Text>
                          <Text size="xs" c="dimmed">
                            {isGenerating(t)
                              ? `running ${formatDuration(t.generationStartedAt, new Date(now).toISOString()) ?? ''}`
                              : formatDuration(
                                  t.generationStartedAt,
                                  t.generationFinishedAt ?? t.generationFailedAt,
                                )}
                          </Text>
                        </Table.Td>
                      )}
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Group gap={4} wrap="nowrap" justify="flex-end">
                          {/* Only published tests can be taken: the Share tab has the link and the invitations. */}
                          {t.status === 'PUBLISHED' && (
                            <Button
                              component={Link}
                              to={wp(`/tests/${t.id}?tab=share`)}
                              size="xs"
                              variant="light"
                              leftSection={<IconShare size={14} />}
                            >
                              Share
                            </Button>
                          )}
                          {!viewed && (
                            <Tooltip label="Delete test">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                aria-label="Delete test"
                                onClick={() =>
                                  confirmDelete({
                                    title: 'Delete test',
                                    message: `Delete test #${t.id} with all its questions and history?`,
                                    onConfirm: () => remove.mutate(t.id!),
                                  })
                                }
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Box pb="sm">
              <TablePager
                layout={layout}
                page={paged.page}
                pageCount={paged.pageCount}
                onPage={paged.setPage}
                summary={`${sorted.length} ${sorted.length === 1 ? 'test' : 'tests'}`}
              />
            </Box>
          </>
        )}
      </Paper>
    </>
  );
}
