import { Button, Card, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconCircleCheck, IconHistory, IconPencil, IconSparkles } from '@tabler/icons-react';
import type { TestQuestionDto } from '@/api/types';
import { StatusBadge } from '@/shared/components';
import { questionStatus, versionOrigin } from '@/shared/enums';
import { OptionList } from './OptionList';

export type ReviewActionKind = 'accept-fix' | 'keep' | 'regenerate' | 'edit' | 'history';

const textKey = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Why Accept fix is not possible, or undefined when it is. Same rules as the backend
 * (TestQuestionVersion.isFixApplicable): every flagged option needs a suggestion, and no suggestion may repeat
 * an option's text or another suggestion, as that would create duplicate options.
 */
function acceptFixBlockedReason(question: TestQuestionDto): string | undefined {
  const options = Object.values(question.options ?? {});
  const flagged = options.filter((o) => o.flagged);
  if (!flagged.length) return 'No flagged options';
  if (flagged.some((o) => !o.suggestedText?.trim())) return 'No suggested fix for every flagged option';
  const taken = new Set(options.map((o) => textKey(o.text ?? '')));
  for (const o of flagged) {
    const key = textKey(o.suggestedText ?? '');
    if (taken.has(key)) {
      return 'The suggested text repeats an existing option. Edit or regenerate the question.';
    }
    taken.add(key);
  }
  return undefined;
}

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
  const fixBlockedReason = acceptFixBlockedReason(question);
  const hasFlags = Object.values(question.options ?? {}).some((o) => o.flagged);
  const origin = versionOrigin(question.origin);

  return (
    <Card padding="lg">
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
            label={fixBlockedReason ?? 'Apply the suggested texts of the flagged options'}
          >
            {/* The wrapper keeps the tooltip working on a disabled button. */}
            <span>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconCheck size={14} />}
                disabled={!canReview || busy || !!fixBlockedReason}
                onClick={() => onAction('accept-fix', question)}
              >
                Accept fix
              </Button>
            </span>
          </Tooltip>
          <Tooltip label={hasFlags ? 'Keep the question as it is and dismiss the flags' : 'No flagged options'}>
            <span>
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconCircleCheck size={14} />}
                disabled={!canReview || busy || !hasFlags}
                onClick={() => onAction('keep', question)}
              >
                Keep as is
              </Button>
            </span>
          </Tooltip>
          <Button
            size="xs"
            variant="light"
            color="violet"
            leftSection={<IconSparkles size={14} />}
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
