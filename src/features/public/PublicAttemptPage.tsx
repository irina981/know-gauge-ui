import { Badge, Button, Card, Group, Paper, RingProgress, Stack, Text, Title } from '@mantine/core';
import { IconCheck, IconListCheck, IconX } from '@tabler/icons-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { usePublicAttempt, useSubmitPublicAttempt } from '@/api/public';
import type { AttemptQuestionDto, PublicAttemptDto } from '@/api/types';
import { ErrorAlert, PageLoader } from '@/shared/components';
import { AttemptRunner } from '@/features/attempts/AttemptRunner';
import { optionLetters, scoreColor } from '@/features/attempts/attemptUtils';

/** A participant's attempt /a/:token: the questions while it runs, then the score. */
export function PublicAttemptPage() {
  const token = useParams().token!;
  const { data, isLoading, error } = usePublicAttempt(token);
  const submit = useSubmitPublicAttempt(token);

  if (isLoading) return <PageLoader />;
  if (error || !data)
    return <ErrorAlert error={error ?? 'Attempt not found'} title="Could not load your test" />;

  return data.status === 'STARTED' ? (
    <AttemptRunner
      testName={data.testName ?? 'Test'}
      answerCardinality={data.answerCardinality}
      questions={data.questions ?? []}
      storageKey={`kg-public-attempt-${token}`}
      submitting={submit.isPending}
      onSubmit={(input, onDone) => submit.mutate(input, { onSuccess: onDone })}
    />
  ) : (
    <Score attempt={data} showDetailsLink />
  );
}

/**
 * Results page /r/:token, linked from the score screen and the result email: the participant's own answers
 * marked right or wrong. The correct options and explanations are never shown (ADR009).
 */
export function PublicResultsPage() {
  const token = useParams().token!;
  const { data, isLoading, error } = usePublicAttempt(token);

  if (isLoading) return <PageLoader />;
  if (error || !data)
    return <ErrorAlert error={error ?? 'Results not found'} title="Could not load your results" />;
  if (data.status === 'STARTED') return <Navigate to={`/a/${token}`} replace />;

  const questions = [...(data.questions ?? [])].sort(
    (a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0),
  );
  return (
    <Stack gap="lg" maw={860} mx="auto">
      <Score attempt={data} />
      <Text size="sm" c="dimmed" ta="center">
        Your answers are marked right or wrong. The correct answers are not shown, so the test stays fair for
        others.
      </Text>
      {questions.map((q, i) => (
        <AnsweredQuestion key={q.questionId} question={q} number={i + 1} total={questions.length} />
      ))}
    </Stack>
  );
}

function AnsweredQuestion({
  question: q,
  number,
  total,
}: {
  question: AttemptQuestionDto;
  number: number;
  total: number;
}) {
  const chosen = new Set(q.chosenOptions ?? []);
  const answered = chosen.size > 0;
  const color = q.correct ? 'teal' : 'red';
  return (
    <Card padding="lg">
      <Group gap="xs" mb="sm">
        <Badge variant="light" radius="sm" tt="none">
          Question {number} of {total}
        </Badge>
        <Badge
          color={color}
          variant="light"
          tt="none"
          leftSection={q.correct ? <IconCheck size={12} /> : <IconX size={12} />}
        >
          {q.correct ? 'Correct' : answered ? 'Wrong' : 'Not answered'}
        </Badge>
      </Group>
      <Text fw={600} mb="md" style={{ whiteSpace: 'pre-wrap' }}>
        {q.questionText}
      </Text>
      <Stack gap="xs">
        {optionLetters(q.options).map((l) => {
          const picked = chosen.has(l);
          return (
            <Paper
              key={l}
              withBorder
              p="sm"
              radius="md"
              style={
                picked
                  ? {
                      borderColor: `var(--mantine-color-${color}-6)`,
                      background: `var(--mantine-color-${color}-light)`,
                    }
                  : undefined
              }
            >
              <Group wrap="nowrap" align="flex-start" justify="space-between">
                <Text size="sm" style={{ flex: 1 }}>
                  <Text span fw={700} mr={6}>
                    {l}
                  </Text>
                  {q.options?.[l]}
                </Text>
                {picked && (
                  <Badge size="sm" color={color} variant="filled" tt="none">
                    Your answer
                  </Badge>
                )}
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Card>
  );
}

function Score({
  attempt,
  showDetailsLink = false,
}: {
  attempt: PublicAttemptDto;
  showDetailsLink?: boolean;
}) {
  const percent = attempt.scorePercent ?? 0;
  return (
    <Paper
      p="xl"
      maw={560}
      w="100%"
      mx="auto"
      ta="center"
      className="kg-ai-edge"
      style={{ overflow: 'hidden' }}
    >
      <Stack align="center" gap="xs">
        <Text
          size="xs"
          fw={800}
          tt="uppercase"
          className="kg-gradient-text"
          style={{ letterSpacing: '0.12em' }}
        >
          {showDetailsLink ? 'Test submitted' : 'Your results'}
        </Text>
        <Title order={1} fz={{ base: 22, sm: 26 }}>
          {attempt.testName}
        </Title>
        <RingProgress
          size={170}
          thickness={14}
          roundCaps
          sections={[{ value: percent, color: scoreColor(percent) }]}
          label={
            <Text ta="center" fw={800} fz={30}>
              {percent}%
            </Text>
          }
        />
        <Text>
          {attempt.correctCount} of {attempt.totalQuestions} questions correct.
        </Text>
        {showDetailsLink && (
          <>
            <Text size="sm" c="dimmed">
              Thank you{attempt.participantName ? `, ${attempt.participantName}` : ''}. Your result has been
              saved and sent to you by email.
            </Text>
            <Button
              component={Link}
              to={`/r/${attempt.attemptToken}`}
              variant="light"
              mt="sm"
              leftSection={<IconListCheck size={16} />}
            >
              See detailed results
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
