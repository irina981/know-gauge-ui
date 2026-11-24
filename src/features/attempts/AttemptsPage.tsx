import { Anchor, Badge, Button, Group, Paper, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconClipboardCheck, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspacePath } from '@/app/viewedWorkspace';
import { useAttempts } from '@/api/attempts';
import { useTests } from '@/api/tests';
import type { AttemptDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatDateTime, formatDuration } from '@/shared/format';
import { sortRows, usePagedRows, useSort, type SortState, type SortValue } from '@/shared/table/sorting';
import { ColumnHeader, ColumnPicker, TablePager } from '@/shared/table/TableControls';
import { useTableLayout, type TableColumn, type TableLayout } from '@/shared/table/useTableLayout';
import { participantLabel, scoreColor } from './attemptUtils';

type ColumnKey = 'id' | 'participant' | 'submitted' | 'duration' | 'correct' | 'score';

/** The attempt number always shows. */
const COLUMNS: TableColumn<ColumnKey>[] = [
  { key: 'id', label: 'Attempt', width: 100, min: 70, hideable: false },
  { key: 'participant', label: 'Participant', width: 280, min: 120 },
  { key: 'submitted', label: 'Submitted', width: 190, min: 120 },
  { key: 'duration', label: 'Duration', width: 120, min: 80 },
  { key: 'correct', label: 'Correct', width: 110, min: 80 },
  { key: 'score', label: 'Score', width: 110, min: 80 },
];

const durationMs = (a: AttemptDto) =>
  a.startedAt && a.submittedAt ? Date.parse(a.submittedAt) - Date.parse(a.startedAt) : null;

const sortValue = (a: AttemptDto, key: ColumnKey): SortValue => {
  switch (key) {
    case 'id':
      return a.id;
    case 'participant':
      return participantLabel(a);
    case 'submitted':
      return a.submittedAt;
    case 'duration':
      return durationMs(a);
    case 'correct':
      return a.correctCount;
    case 'score':
      return a.scorePercent;
  }
};

/** The attempts at one test, in the page's order, paged on their own. */
function AttemptTable({
  attempts,
  layout,
  sort,
  onSort,
  resetKey,
}: {
  attempts: AttemptDto[];
  layout: TableLayout<ColumnKey>;
  sort: SortState<ColumnKey>;
  onSort: (key: ColumnKey) => void;
  resetKey: string;
}) {
  const navigate = useNavigate();
  const wp = useWorkspacePath();
  const { shown, truncate } = layout;
  const paged = usePagedRows(attempts, layout.pageSize, resetKey);
  return (
    <>
      <Table.ScrollContainer minWidth={layout.scrollMinWidth}>
        <Table verticalSpacing="sm" highlightOnHover {...layout.tableProps}>
          <Table.Thead>
            <Table.Tr>
              {layout.visibleColumns.map((c) => (
                <ColumnHeader key={c.key} column={c} layout={layout} sort={sort} onSort={onSort} />
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paged.rows.map((a) => (
              <Table.Tr
                key={a.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(wp(`/attempts/${a.id}`))}
              >
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    #{a.id}
                  </Text>
                </Table.Td>
                {shown('participant') && (
                  <Table.Td>
                    <Text size="sm" truncate={truncate} title={participantLabel(a)}>
                      {participantLabel(a)}
                    </Text>
                    {a.participantEmail && (
                      <Text size="xs" c="dimmed" truncate={truncate} title={a.participantEmail}>
                        {a.participantEmail}
                        {a.invitationId != null && ' · invited'}
                      </Text>
                    )}
                  </Table.Td>
                )}
                {shown('submitted') && (
                  <Table.Td>
                    <Text size="sm">{formatDateTime(a.submittedAt)}</Text>
                  </Table.Td>
                )}
                {shown('duration') && (
                  <Table.Td>
                    <Text size="sm">{formatDuration(a.startedAt, a.submittedAt) ?? '—'}</Text>
                  </Table.Td>
                )}
                {shown('correct') && (
                  <Table.Td>
                    <Text size="sm">
                      {a.correctCount} / {a.totalQuestions}
                    </Text>
                  </Table.Td>
                )}
                {shown('score') && (
                  <Table.Td>
                    <Badge color={scoreColor(a.scorePercent)} variant="light" tt="none" size="lg">
                      {a.scorePercent}%
                    </Badge>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <TablePager layout={layout} page={paged.page} pageCount={paged.pageCount} onPage={paged.setPage} />
    </>
  );
}

/**
 * Finished (scored) attempts grouped by test, newest test activity first, searchable by participant. The test filter
 * lives in the URL (?testId=…), so it can be linked to. One choice of columns, widths, rows per page and order (newest
 * first until sorted by a column) applies to every test's table; each table is paged on its own.
 */
export function AttemptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const testFilter = searchParams.get('testId');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search.trim().toLowerCase(), 200);
  const wp = useWorkspacePath();
  const layout = useTableLayout({ storageKey: 'kg.attempts', columns: COLUMNS });
  const { sort, changeSort } = useSort<ColumnKey>({ key: 'submitted', ascending: false });
  // A new filter, order or page size starts each table at its first page.
  const resetKey = `${testFilter}|${debouncedSearch}|${sort.key}|${sort.ascending}|${layout.pageSize}`;

  const { data: attempts, isLoading, error } = useAttempts();
  const { data: tests } = useTests();
  const testName = (id?: number) => tests?.find((t) => t.id === id)?.name || `Test #${id}`;

  const finished = useMemo(() => (attempts ?? []).filter((a) => a.status === 'SCORED'), [attempts]);
  const inProgress = (attempts ?? []).length - finished.length;

  const testOptions = useMemo(
    () =>
      [...new Set(finished.map((a) => a.testId))]
        .filter((id): id is number => id != null)
        .map((id) => ({ value: String(id), label: testName(id) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finished, tests],
  );

  // The search matches the participant's name or email.
  const matchesSearch = (a: AttemptDto) =>
    !debouncedSearch ||
    [participantLabel(a), a.participantEmail].some((text) => text?.toLowerCase().includes(debouncedSearch));
  const visible = finished.filter(
    (a) => (!testFilter || String(a.testId) === testFilter) && matchesSearch(a),
  );

  // Group by test; groups ordered by their most recent attempt (the list is already newest first).
  const groups = useMemo(() => {
    const byTest = new Map<number, AttemptDto[]>();
    for (const a of visible) {
      const list = byTest.get(a.testId!) ?? [];
      list.push(a);
      byTest.set(a.testId!, list);
    }
    return [...byTest.entries()];
  }, [visible]);

  const setTestFilter = (value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('testId', value);
    else next.delete('testId');
    setSearchParams(next);
  };

  return (
    <>
      <PageHeader
        eyebrow="Assessments"
        title="Attempts"
        description="Submitted attempts at published tests, grouped by test. Open one to see the answers and the review."
        icon={IconClipboardCheck}
      />

      <Group gap="sm" mb="md" align="flex-end">
        <TextInput
          label="Search"
          placeholder="Participant's name or email"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          style={{ flex: '1 1 260px', maxWidth: 420 }}
        />
        <Select
          label="Test"
          placeholder="All tests"
          data={testOptions}
          value={testFilter}
          onChange={setTestFilter}
          clearable
          searchable
          w={260}
        />
        <ColumnPicker layout={layout} />
      </Group>

      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load attempts" />}
      {attempts && groups.length === 0 && (
        <Paper p="xl">
          <EmptyState title="No attempts yet" icon={IconClipboardCheck}>
            {testFilter || debouncedSearch
              ? 'No submitted attempts match these filters.'
              : 'Publish a test and share its link from the Share tab of the test.'}
          </EmptyState>
        </Paper>
      )}

      <Stack gap="lg">
        {groups.map(([testId, list]) => {
          const scores = list.map((a) => a.scorePercent ?? 0);
          const average = Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10;
          return (
            <Paper key={testId} p="lg">
              <Group justify="space-between" align="flex-start" mb="sm">
                <div>
                  <Anchor component={Link} to={wp(`/tests/${testId}`)} fw={700} fz="lg">
                    {testName(testId)}
                  </Anchor>
                  <Text size="sm" c="dimmed">
                    {list.length} attempt{list.length === 1 ? '' : 's'} · average {average}% · best{' '}
                    {Math.max(...scores)}%
                  </Text>
                </div>
                <Button component={Link} to={wp(`/tests/${testId}`)} variant="light" size="xs">
                  Open test
                </Button>
              </Group>
              <AttemptTable
                attempts={sortRows(list, sort, sortValue)}
                layout={layout}
                sort={sort}
                onSort={changeSort}
                resetKey={resetKey}
              />
            </Paper>
          );
        })}
      </Stack>

      {inProgress > 0 && (
        <Text size="xs" c="dimmed" mt="md">
          {inProgress} attempt{inProgress === 1 ? ' is' : 's are'} still in progress and not shown.
        </Text>
      )}
    </>
  );
}
