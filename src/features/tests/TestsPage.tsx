import { ActionIcon, Button, Chip, Group, Paper, Table, Text, Title, Tooltip } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDeleteTest, useTests } from '@/api/tests';
import { topicPathLabel, useTopicTree } from '@/api/topics';
import { EmptyState, ErrorAlert, PageLoader, StatusBadge } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';
import { humanize, TEST_STATUSES, testStatus } from '@/shared/enums';
import { formatDateTime, formatDuration } from '@/shared/format';

/** All tests, newest first, filterable by status. The filter lives in the URL (?status=...). */
export function TestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? undefined;
  const { data: tests, isLoading, error } = useTests(status);
  const { data: tree } = useTopicTree();
  const remove = useDeleteTest();
  const navigate = useNavigate();

  const sorted = [...(tests ?? [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Tests</Title>
        <Button component={Link} to="/tests/new" leftSection={<IconPlus size={16} />}>
          Generate test
        </Button>
      </Group>

      <Chip.Group
        value={status ?? 'ALL'}
        onChange={(v) => setSearchParams(v === 'ALL' ? {} : { status: v as string })}
      >
        <Group gap="xs" mb="md">
          <Chip value="ALL" size="sm">
            All
          </Chip>
          {Object.entries(TEST_STATUSES).map(([value, info]) => (
            <Chip key={value} value={value} size="sm" color={info.color}>
              {info.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      <Paper radius="md">
        {isLoading && <PageLoader />}
        {error && <ErrorAlert error={error} title="Could not load tests" />}
        {tests && sorted.length === 0 && (
          <EmptyState title="No tests">
            {status ? 'No tests with this status.' : 'Generate a test from a topic in the Library.'}
          </EmptyState>
        )}
        {sorted.length > 0 && (
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Questions</Table.Th>
                  <Table.Th>Settings</Table.Th>
                  <Table.Th>Generated</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sorted.map((t) => (
                  <Table.Tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tests/${t.id}`)}
                  >
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {t.id}
                      </Text>
                    </Table.Td>
                    <Table.Td maw={280}>
                      <Text size="sm" truncate>
                        {t.topicIds?.length
                          ? t.topicIds.map((id) => topicPathLabel(tree, id)).join(', ')
                          : `${t.documentIds?.length ?? 0} document(s)`}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge info={testStatus(t.status)} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{t.questionCount}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {[t.difficulty, t.answerCardinality]
                          .filter(Boolean)
                          .map((v) => humanize(v!))
                          .join(' · ')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {formatDateTime(
                          t.generationFinishedAt ?? t.generationFailedAt ?? t.generationStartedAt,
                        )}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDuration(
                          t.generationStartedAt,
                          t.generationFinishedAt ?? t.generationFailedAt,
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td onClick={(e) => e.stopPropagation()}>
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
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </>
  );
}
