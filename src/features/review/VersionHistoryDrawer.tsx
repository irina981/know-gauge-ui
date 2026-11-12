import { Accordion, Badge, Drawer, Group, Stack, Text } from '@mantine/core';
import { useQuestionVersions } from '@/api/review';
import type { TestQuestionDto } from '@/api/types';
import { ErrorAlert, PageLoader, StatusBadge } from '@/shared/components';
import { versionOrigin } from '@/shared/enums';
import { formatDateTime } from '@/shared/format';
import { OptionList } from './OptionList';

/** All versions of one question, newest first. Versions are immutable; each review action adds one. */
export function VersionHistoryDrawer({
  testId,
  question,
  onClose,
}: {
  testId: number;
  question: TestQuestionDto | null;
  onClose: () => void;
}) {
  const { data: versions, isLoading, error } = useQuestionVersions(testId, question?.id);
  const newestFirst = [...(versions ?? [])].reverse();

  return (
    <Drawer
      opened={question != null}
      onClose={onClose}
      position="right"
      size="xl"
      title={question ? `History of question ${(question.questionIndex ?? 0) + 1}` : ''}
    >
      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} />}
      {versions && (
        <Accordion variant="separated" defaultValue={String(newestFirst[0]?.id)}>
          {newestFirst.map((v) => (
            <Accordion.Item key={v.id} value={String(v.id)}>
              <Accordion.Control>
                <Group gap="xs">
                  <Text fw={600} size="sm">
                    v{v.versionNo}
                  </Text>
                  <StatusBadge info={versionOrigin(v.origin)} />
                  {v.id === question?.currentVersionId && (
                    <Badge size="xs" variant="outline">
                      current
                    </Badge>
                  )}
                  <Text size="xs" c="dimmed">
                    {formatDateTime(v.createdAt)}
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {v.questionText}
                  </Text>
                  <OptionList options={v.options} />
                  {v.explanation && (
                    <Text size="xs" c="dimmed">
                      Explanation: {v.explanation}
                    </Text>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Drawer>
  );
}
