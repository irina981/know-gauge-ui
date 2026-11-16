import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  RingProgress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AttemptDetailDto, AttemptQuestionDto } from '@/api/types';
import { EmptyState } from '@/shared/components';
import { formatDateTime, formatDuration } from '@/shared/format';
import { optionLetters, participantLabel, scoreColor } from './attemptUtils';

/** Score summary and a question-by-question review of a scored attempt. */
export function AttemptResult({ detail }: { detail: AttemptDetailDto }) {
  const attempt = detail.attempt!;
  const [filter, setFilter] = useState<'all' | 'wrong'>('all');
  const questions = [...(detail.questions ?? [])].sort(
    (a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0),
  );
  const visible = filter === 'wrong' ? questions.filter((q) => !q.correct) : questions;
  const percent = attempt.scorePercent ?? 0;
  const color = scoreColor(percent);

  return (
    <Stack gap="lg" maw={960} mx="auto">
      <Paper p={{ base: 'lg', sm: 'xl' }} className="kg-ai-edge" style={{ overflow: 'hidden' }}>
        <Group justify="space-between" align="center" gap="xl">
          <div style={{ flex: 1, minWidth: 260 }}>
            <Text
              size="xs"
              fw={800}
              tt="uppercase"
              className="kg-gradient-text"
              style={{ letterSpacing: '0.12em' }}
            >
              Result
            </Text>
            <Title order={1} fz={{ base: 22, sm: 26 }} mt={4}>
              {detail.testName || `Test #${attempt.testId}`}
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Attempt #{attempt.id} · {participantLabel(attempt)} · submitted{' '}
              {formatDateTime(attempt.submittedAt)}
              {formatDuration(attempt.startedAt, attempt.submittedAt) &&
                ` · took ${formatDuration(attempt.startedAt, attempt.submittedAt)}`}
            </Text>
            <SimpleGrid cols={2} mt="lg" maw={360}>
              <Stat label="Correct" value={attempt.correctCount} color="teal" />
              <Stat label="Wrong or unanswered" value={attempt.wrongCount} color="red" />
            </SimpleGrid>
            <Group gap="xs" mt="lg">
              <Button component={Link} to={`/attempts?testId=${attempt.testId}`} variant="default">
                All attempts at this test
              </Button>
            </Group>
          </div>
          <RingProgress
            size={170}
            thickness={14}
            roundCaps
            sections={[{ value: percent, color }]}
            label={
              <Stack gap={0} align="center">
                <Text fz={32} fw={800} ff="heading" lh={1}>
                  {percent}%
                </Text>
                <Text size="xs" c="dimmed">
                  {attempt.correctCount} of {attempt.totalQuestions}
                </Text>
              </Stack>
            }
          />
        </Group>
      </Paper>

      <Group justify="space-between">
        <Title order={2} fz={20}>
          Review
        </Title>
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={(v) => setFilter(v as 'all' | 'wrong')}
          data={[
            { value: 'all', label: `All (${questions.length})` },
            { value: 'wrong', label: `Wrong (${questions.filter((q) => !q.correct).length})` },
          ]}
        />
      </Group>

      {visible.length === 0 && <EmptyState title="No wrong answers" icon={IconCheck} />}
      {visible.map((q) => (
        <ReviewCard key={q.questionId} question={q} number={questions.indexOf(q) + 1} />
      ))}
    </Stack>
  );
}

function Stat({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <div>
      <Text fz={26} fw={800} ff="heading" c={color} lh={1.1}>
        {value ?? 0}
      </Text>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
        {label}
      </Text>
    </div>
  );
}

/** One question with the user's choice and the answer key. */
function ReviewCard({ question, number }: { question: AttemptQuestionDto; number: number }) {
  const chosen = question.chosenOptions ?? [];
  const correctOptions = question.correctOptions ?? [];
  return (
    <Card padding="lg">
      <Group gap="xs" mb="sm">
        <Text fw={700}>Question {number}</Text>
        <Badge
          color={question.correct ? 'teal' : 'red'}
          variant="light"
          tt="none"
          leftSection={question.correct ? <IconCheck size={12} /> : <IconX size={12} />}
        >
          {question.correct ? 'Correct' : chosen.length ? 'Wrong' : 'Not answered'}
        </Badge>
      </Group>
      <Text mb="md" style={{ whiteSpace: 'pre-wrap' }}>
        {question.questionText}
      </Text>
      <Stack gap={6}>
        {optionLetters(question.options).map((l) => {
          const isCorrect = correctOptions.includes(l);
          const isChosen = chosen.includes(l);
          const tone = isCorrect ? 'teal' : isChosen ? 'red' : undefined;
          return (
            <Paper
              key={l}
              px="sm"
              py={8}
              radius="sm"
              style={{
                borderColor: tone ? `var(--mantine-color-${tone}-5)` : undefined,
                background: tone ? `var(--mantine-color-${tone}-light)` : undefined,
              }}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <ThemeIcon size="sm" radius="xl" variant={tone ? 'filled' : 'default'} color={tone ?? 'gray'}>
                  {/* The letter is in the text next to it; the icon only marks correct and wrong. */}
                  {isCorrect ? <IconCheck size={12} /> : isChosen ? <IconX size={12} /> : null}
                </ThemeIcon>
                <Text size="sm" style={{ flex: 1 }}>
                  <Text span fw={700} mr={6}>
                    {l}
                  </Text>
                  {question.options?.[l]}
                </Text>
                {isChosen && (
                  <Badge size="xs" variant="outline" color={tone ?? 'gray'} tt="none">
                    Your answer
                  </Badge>
                )}
              </Group>
            </Paper>
          );
        })}
      </Stack>
      {question.explanation && (
        <Text size="sm" c="dimmed" mt="md">
          <Text span fw={600} size="sm">
            Explanation:{' '}
          </Text>
          {question.explanation}
        </Text>
      )}
    </Card>
  );
}
