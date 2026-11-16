import { Alert, Anchor, Badge, Button, Group, List, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconPlayerPlay } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStartAttempt } from '@/api/attempts';
import { useTest } from '@/api/tests';
import { ErrorAlert, PageLoader } from '@/shared/components';
import { humanize } from '@/shared/enums';

/** Intro screen before taking a published test: what to expect, then "Start test". */
export function TakeTestPage() {
  const testId = Number(useParams().testId);
  const navigate = useNavigate();
  const { data: test, isLoading, error } = useTest(testId);
  const start = useStartAttempt();

  if (isLoading) return <PageLoader />;
  if (error || !test)
    return <ErrorAlert error={error ?? 'Test not found'} title={`Could not load test #${testId}`} />;

  const multiple = test.answerCardinality === 'MULTIPLE_CORRECT';
  const published = test.status === 'PUBLISHED';

  return (
    <Stack maw={760} mx="auto" gap="lg">
      <Anchor component={Link} to="/tests" size="sm" c="dimmed">
        <Group gap={4}>
          <IconArrowLeft size={14} /> All tests
        </Group>
      </Anchor>

      <Paper p={{ base: 'lg', sm: 'xl' }} className="kg-ai-edge" style={{ overflow: 'hidden' }}>
        <Text
          size="xs"
          fw={800}
          tt="uppercase"
          className="kg-gradient-text"
          style={{ letterSpacing: '0.12em' }}
        >
          Take test
        </Text>
        <Title order={1} fz={{ base: 24, sm: 28 }} mt={4}>
          {test.name || `Test #${test.id}`}
        </Title>
        {test.description && (
          <Text c="dimmed" mt="xs" style={{ whiteSpace: 'pre-wrap' }}>
            {test.description}
          </Text>
        )}

        <Group gap={6} mt="md">
          {[
            `${test.questionCount} questions`,
            multiple ? 'Multiple correct answers' : 'One correct answer',
            test.difficulty && humanize(test.difficulty),
          ]
            .filter(Boolean)
            .map((label) => (
              <Badge key={label} variant="default" radius="sm" tt="none" fw={500}>
                {label}
              </Badge>
            ))}
        </Group>

        <List mt="lg" spacing={6} size="sm">
          <List.Item>
            {multiple
              ? 'Each question can have more than one correct answer. Select all that apply.'
              : 'Each question has exactly one correct answer.'}
          </List.Item>
          <List.Item>You can change your answers until you submit.</List.Item>
          <List.Item>
            A question counts as correct only if your selection matches the answer key exactly; unanswered
            questions count as wrong.
          </List.Item>
          <List.Item>
            After submitting you see your score, the correct answers and their explanations.
          </List.Item>
        </List>

        {!published && (
          <Alert color="orange" variant="light" mt="lg" icon={<IconAlertCircle size={18} />}>
            Only published tests can be taken. This test is {humanize(test.status ?? 'unknown').toLowerCase()}
            .
          </Alert>
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="default" component={Link} to="/tests">
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="md"
            leftSection={<IconPlayerPlay size={18} />}
            disabled={!published}
            loading={start.isPending}
            onClick={() =>
              start.mutate(testId, {
                onSuccess: (detail) => navigate(`/attempts/${detail.attempt!.id}`, { replace: true }),
              })
            }
          >
            Start test
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
