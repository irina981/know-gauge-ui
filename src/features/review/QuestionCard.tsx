import { Button, Card, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconHistory, IconPencil, IconRefresh } from '@tabler/icons-react';
import type { TestQuestionDto } from '@/api/types';
import { StatusBadge } from '@/shared/components';
import { questionStatus, versionOrigin } from '@/shared/enums';
import { OptionList } from './OptionList';

export type ReviewActionKind = 'accept-fix' | 'regenerate' | 'edit' | 'history';

/** One question with its options and the review buttons. The parent page runs the actions. */
export function QuestionCard({
  question,
  canReview,
  busy,
  onAction,
}: {
  question: TestQuestionDto;
  canReview: boolean;
  busy: boolean;
  onAction: (kind: ReviewActionKind, question: TestQuestionDto) => void;
}) {
  const hasSuggestion = Object.values(question.options ?? {}).some((o) => o.flagged && o.suggestedText);
  const origin = versionOrigin(question.origin);

  return (
    <Card radius="md" padding="lg">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Group gap="xs">
          <Text fw={600}>Question {(question.questionIndex ?? 0) + 1}</Text>
          <StatusBadge info={questionStatus(question.status)} />
          <Text size="xs" c="dimmed">
            v{question.versionNo} · {origin.label}
          </Text>
        </Group>
        <Group gap={6}>
          <Tooltip
            label={hasSuggestion ? 'Apply the suggested texts of the flagged options' : 'No suggested fix'}
          >
            <Button
              size="xs"
              variant="light"
              color="teal"
              leftSection={<IconCheck size={14} />}
              disabled={!canReview || busy || !hasSuggestion}
              onClick={() => onAction('accept-fix', question)}
            >
              Accept fix
            </Button>
          </Tooltip>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconRefresh size={14} />}
            disabled={!canReview || busy}
            onClick={() => onAction('regenerate', question)}
          >
            Regenerate
          </Button>
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<IconPencil size={14} />}
            disabled={!canReview || busy}
            onClick={() => onAction('edit', question)}
          >
            Edit
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconHistory size={14} />}
            onClick={() => onAction('history', question)}
          >
            History
          </Button>
        </Group>
      </Group>

      <Stack gap="sm">
        <Text style={{ whiteSpace: 'pre-wrap' }}>{question.questionText}</Text>
        <OptionList options={question.options} />
        {question.explanation && (
          <Text size="sm" c="dimmed">
            <Text span fw={500} size="sm">
              Explanation:{' '}
            </Text>
            {question.explanation}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
