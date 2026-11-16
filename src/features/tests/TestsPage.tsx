import { ActionIcon, Button, Chip, Group, Paper, SimpleGrid, Table, Text, Tooltip } from '@mantine/core';
import {
  IconAlertTriangle,
  IconChecklist,
  IconListCheck,
  IconShare,
  IconSend,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isGenerating, useDeleteTest, useTests } from '@/api/tests';
import { topicPathLabel, useTopicTree } from '@/api/topics';
import { EmptyState, ErrorAlert, PageHeader, PageLoader, StatTile, StatusBadge } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';
import { humanize, TEST_STATUSES, testStatus } from '@/shared/enums';
import { formatDateTime, formatDuration } from '@/shared/format';
import { useNow } from '@/shared/useNow';

/** All tests, newest first, filterable by status. The filter lives in the URL (?status=...). */
export function TestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? undefined;
  const { data: tests, isLoading, error } = useTests(status);
  const { data: tree } = useTopicTree();
  const remove = useDeleteTest();
  const navigate = useNavigate();

  // All tests (not filtered), for the numbers at the top.
  const { data: allTests } = useTests();
  const count = (s: string) => allTests?.filter((t) => t.status === s).length ?? 0;
  const questionTotal =
    allTests?.filter((t) => t.status !== 'FAILED').reduce((sum, t) => sum + (t.questionCount ?? 0), 0) ?? 0;

  const sorted = [...(tests ?? [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  // Ticks every second while a test is generating, for the "running 2m 10s" label.
  const now = useNow(sorted.some(isGenerating));

  return (
    <>
      <PageHeader
        eyebrow="Assessments"
        title="Tests"
        description="Every test generated from your library: review the flagged answers, then publish."
        icon={IconChecklist}
        actions={
          <Button
            component={Link}
            to="/tests/new"
            variant="gradient"
            leftSection={<IconSparkles size={16} />}
          >
            Generate test
          </Button>
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

      <Paper>
        {isLoading && <PageLoader />}
        {error && <ErrorAlert error={error} title="Could not load tests" />}
        {tests && sorted.length === 0 && (
          <EmptyState title="No tests" icon={IconChecklist}>
            {status ? 'No tests with this status.' : 'Generate a test from a topic in the Library.'}
          </EmptyState>
        )}
        {sorted.length > 0 && (
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Test</Table.Th>
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
                    <Table.Td maw={360}>
                      {/* Name first; the source underneath. Older tests have no name. */}
                      <Text size="sm" fw={600} truncate title={t.name}>
                        {t.name || `Test #${t.id}`}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {t.topicIds?.length
                          ? t.topicIds.map((id) => topicPathLabel(tree, id)).join(', ')
                          : `${t.documentIds?.length ?? 0} document(s)`}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge info={testStatus(t.status)} busy={isGenerating(t)} />
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
                        {isGenerating(t)
                          ? `running ${formatDuration(t.generationStartedAt, new Date(now).toISOString()) ?? ''}`
                          : formatDuration(
                              t.generationStartedAt,
                              t.generationFinishedAt ?? t.generationFailedAt,
                            )}
                      </Text>
                    </Table.Td>
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Group gap={4} wrap="nowrap" justify="flex-end">
                        {/* Only published tests can be taken: the Share tab has the link and the invitations. */}
                        {t.status === 'PUBLISHED' && (
                          <Button
                            component={Link}
                            to={`/tests/${t.id}?tab=share`}
                            size="xs"
                            variant="light"
                            leftSection={<IconShare size={14} />}
                          >
                            Share
                          </Button>
                        )}
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
                      </Group>
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
