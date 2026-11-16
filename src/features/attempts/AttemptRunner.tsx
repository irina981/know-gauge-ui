import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Paper,
  Progress,
  Radio,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconSend } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useSubmitAttempt } from '@/api/attempts';
import type { AttemptDetailDto } from '@/api/types';
import { optionLetters } from './attemptUtils';

type Answers = Record<number, string[]>;

/** Answers are kept in the browser while the attempt runs, so a page reload doesn't lose them. */
const storageKey = (attemptId: number) => `kg-attempt-${attemptId}`;

function loadAnswers(attemptId: number): Answers {
  try {
    return JSON.parse(localStorage.getItem(storageKey(attemptId)) ?? '{}') as Answers;
  } catch {
    return {};
  }
}

/** The questions of a running attempt, with Submit at the bottom. */
export function AttemptRunner({ detail }: { detail: AttemptDetailDto }) {
  const attemptId = detail.attempt!.id!;
  const multiple = detail.answerCardinality === 'MULTIPLE_CORRECT';
  const questions = [...(detail.questions ?? [])].sort(
    (a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0),
  );
  const submit = useSubmitAttempt(attemptId);

  const [answers, setAnswers] = useState<Answers>(() => loadAnswers(attemptId));
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(attemptId), JSON.stringify(answers));
    } catch {
      // storage unavailable: answers just aren't kept across reloads
    }
  }, [attemptId, answers]);

  const setAnswer = (questionId: number, letters: string[]) =>
    setAnswers((current) => ({ ...current, [questionId]: letters }));

  const answeredCount = questions.filter((q) => (answers[q.questionId!] ?? []).length > 0).length;
  const total = questions.length;

  const send = () =>
    submit.mutate(
      {
        answers: questions.map((q) => ({
          questionId: q.questionId!,
          chosenOptions: answers[q.questionId!] ?? [],
        })),
      },
      {
        onSuccess: () => {
          try {
            localStorage.removeItem(storageKey(attemptId));
          } catch {
            // ignore
          }
          window.scrollTo({ top: 0 });
        },
      },
    );

  const confirmSubmit = () =>
    modals.openConfirmModal({
      title: 'Submit your answers?',
      children: (
        <Text size="sm">
          {answeredCount < total
            ? `You answered ${answeredCount} of ${total} questions. Unanswered questions count as wrong.`
            : `You answered all ${total} questions.`}{' '}
          You can't change your answers after submitting.
        </Text>
      ),
      labels: { confirm: 'Submit', cancel: 'Keep answering' },
      onConfirm: send,
    });

  return (
    <Stack gap="lg" maw={860} mx="auto">
      <Paper p="lg" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
        <Text
          size="xs"
          fw={800}
          tt="uppercase"
          className="kg-gradient-text"
          style={{ letterSpacing: '0.12em' }}
        >
          Test in progress
        </Text>
        <Title order={1} fz={{ base: 22, sm: 26 }} mt={4}>
          {detail.testName || `Test #${detail.attempt?.testId}`}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {multiple
            ? 'Select all correct answers for each question.'
            : 'Select one answer for each question.'}
        </Text>
        <Group justify="space-between" mt="md" mb={6}>
          <Text size="sm" fw={600}>
            Answered {answeredCount} of {total}
          </Text>
        </Group>
        <Progress value={total ? (answeredCount / total) * 100 : 0} radius="xl" />
      </Paper>

      {questions.map((q, i) => {
        const letters = optionLetters(q.options);
        const chosen = answers[q.questionId!] ?? [];
        return (
          <Card key={q.questionId} padding="lg">
            <Group gap="xs" mb="sm">
              <Badge variant="light" radius="sm" tt="none">
                Question {i + 1} of {total}
              </Badge>
              {chosen.length > 0 && (
                <Badge variant="dot" color="teal" tt="none">
                  Answered
                </Badge>
              )}
            </Group>
            <Text fw={600} mb="md" style={{ whiteSpace: 'pre-wrap' }}>
              {q.questionText}
            </Text>
            {multiple ? (
              <Checkbox.Group value={chosen} onChange={(v) => setAnswer(q.questionId!, v)}>
                <Stack gap="xs">
                  {letters.map((l) => (
                    <Checkbox.Card key={l} value={l} radius="md" p="sm" className="kg-option-card">
                      <Group wrap="nowrap" align="flex-start">
                        <Checkbox.Indicator />
                        <OptionText letter={l} text={q.options?.[l]} />
                      </Group>
                    </Checkbox.Card>
                  ))}
                </Stack>
              </Checkbox.Group>
            ) : (
              <Radio.Group value={chosen[0] ?? null} onChange={(v) => setAnswer(q.questionId!, [v])}>
                <Stack gap="xs">
                  {letters.map((l) => (
                    <Radio.Card key={l} value={l} radius="md" p="sm" className="kg-option-card">
                      <Group wrap="nowrap" align="flex-start">
                        <Radio.Indicator />
                        <OptionText letter={l} text={q.options?.[l]} />
                      </Group>
                    </Radio.Card>
                  ))}
                </Stack>
              </Radio.Group>
            )}
          </Card>
        );
      })}

      {/* Stays in view at the bottom of the window while scrolling through the questions. */}
      <Box className="kg-submit-bar">
        <Paper p="md" shadow="md">
          <Group justify="space-between">
            <Text size="sm">
              <Text span fw={700}>
                {answeredCount}
              </Text>{' '}
              of {total} answered
            </Text>
            <Button
              variant="gradient"
              leftSection={<IconSend size={16} />}
              loading={submit.isPending}
              onClick={confirmSubmit}
            >
              Submit test
            </Button>
          </Group>
        </Paper>
      </Box>
    </Stack>
  );
}

function OptionText({ letter, text }: { letter: string; text?: string }) {
  return (
    <Text size="sm" style={{ flex: 1 }}>
      <Text span fw={700} mr={6}>
        {letter}
      </Text>
      {text}
    </Text>
  );
}
