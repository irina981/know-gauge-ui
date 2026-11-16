import { Anchor, Badge, Button, Group, Paper, Select, Stack, Table, Text } from '@mantine/core';
import { IconClipboardCheck, IconFilterOff } from '@tabler/icons-react';
import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAttempts } from '@/api/attempts';
import { useTests } from '@/api/tests';
import type { AttemptDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatDateTime, formatDuration } from '@/shared/format';
import { scoreColor, userLabel } from './attemptUtils';

/**
 * Finished (scored) attempts grouped by test, newest test activity first.
 * Filters live in the URL (?testId=…&userId=…), so they can be linked to.
 */
export function AttemptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const testFilter = searchParams.get('testId');
  const userFilter = searchParams.get('userId');
  const navigate = useNavigate();

  const { data: attempts, isLoading, error } = useAttempts();
  const { data: tests } = useTests();
  const testName = (id?: number) => tests?.find((t) => t.id === id)?.name || `Test #${id}`;

  const finished = useMemo(() => (attempts ?? []).filter((a) => a.status === 'SCORED'), [attempts]);
  const inProgress = (attempts ?? []).length - finished.length;

  const userOptions = useMemo(
    () =>
      [...new Set(finished.map((a) => a.userId))]
        .filter((id): id is number => id != null)
        .sort((a, b) => a - b)
        .map((id) => ({ value: String(id), label: userLabel(id) })),
    [finished],
  );
  const testOptions = useMemo(
    () =>
      [...new Set(finished.map((a) => a.testId))]
        .filter((id): id is number => id != null)
        .map((id) => ({ value: String(id), label: testName(id) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finished, tests],
  );

  const visible = finished.filter(
    (a) =>
      (!testFilter || String(a.testId) === testFilter) && (!userFilter || String(a.userId) === userFilter),
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

  const setFilter = (key: 'testId' | 'userId', value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
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

      <Group gap="sm" mb="lg" align="flex-end">
        <Select
          label="User"
          placeholder="All users"
          data={userOptions}
          value={userFilter}
          onChange={(v) => setFilter('userId', v)}
          clearable
          w={220}
        />
        <Select
          label="Test"
          placeholder="All tests"
          data={testOptions}
          value={testFilter}
          onChange={(v) => setFilter('testId', v)}
          clearable
          searchable
          w={360}
        />
        {(testFilter || userFilter) && (
          <Button
            variant="subtle"
            leftSection={<IconFilterOff size={16} />}
            onClick={() => setSearchParams({})}
          >
            Clear filters
          </Button>
        )}
      </Group>

      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load attempts" />}
      {attempts && groups.length === 0 && (
        <Paper p="xl">
          <EmptyState title="No attempts yet" icon={IconClipboardCheck}>
            {testFilter || userFilter
              ? 'No submitted attempts match these filters.'
              : 'Publish a test, then use "Take test" on the Tests page.'}
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
                  <Anchor component={Link} to={`/tests/${testId}`} fw={700} fz="lg">
                    {testName(testId)}
                  </Anchor>
                  <Text size="sm" c="dimmed">
                    {list.length} attempt{list.length === 1 ? '' : 's'} · average {average}% · best{' '}
                    {Math.max(...scores)}%
                  </Text>
                </div>
                <Button component={Link} to={`/tests/${testId}/take`} variant="light" size="xs">
                  Take test
                </Button>
              </Group>
              <Table.ScrollContainer minWidth={640}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Attempt</Table.Th>
                      <Table.Th>User</Table.Th>
                      <Table.Th>Submitted</Table.Th>
                      <Table.Th>Duration</Table.Th>
                      <Table.Th>Correct</Table.Th>
                      <Table.Th>Score</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {list.map((a) => (
                      <Table.Tr
                        key={a.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/attempts/${a.id}`)}
                      >
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            #{a.id}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{userLabel(a.userId)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDateTime(a.submittedAt)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDuration(a.startedAt, a.submittedAt) ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {a.correctCount} / {a.totalQuestions}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={scoreColor(a.scorePercent)} variant="light" tt="none" size="lg">
                            {a.scorePercent}%
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
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
