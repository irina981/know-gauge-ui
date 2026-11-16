import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconArrowBackUp, IconArrowLeft, IconLock, IconSend } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import {
  useAcceptFix,
  useDismissFlags,
  usePublishTest,
  useRegenerateQuestion,
  useTestHasAttempts,
  useTestQuestions,
  useUnpublishTest,
} from '@/api/review';
import { isGenerating, testKeys, useTest } from '@/api/tests';
import { topicPathLabel, useTopicTree } from '@/api/topics';
import type { TestQuestionDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageLoader, StatusBadge } from '@/shared/components';
import { humanize, PUBLISHABLE_TEST_STATUSES, REVIEWABLE_TEST_STATUSES, testStatus } from '@/shared/enums';
import { formatDateTime, formatDuration } from '@/shared/format';
import { useNow } from '@/shared/useNow';
import { CommentActionModal } from './CommentActionModal';
import { EventTimeline } from './EventTimeline';
import { GenerationRunsPanel } from './GenerationRunsPanel';
import { ManualEditModal } from './ManualEditModal';
import { QuestionCard, type ReviewActionKind } from './QuestionCard';
import { VersionHistoryDrawer } from './VersionHistoryDrawer';

type ConfirmKind = 'accept-fix' | 'keep' | 'regenerate';
type Pending = { kind: ConfirmKind; question: TestQuestionDto } | null;

/** Dialog texts and success message of the confirmed review actions. */
const CONFIRM_TEXT: Record<ConfirmKind, { title: string; description: string; label: string; done: string }> =
  {
    'accept-fix': {
      title: 'Accept suggested fix',
      description:
        'The flagged options are replaced by the verifier’s suggested texts. This creates a new version.',
      label: 'Accept fix',
      done: 'fix accepted',
    },
    keep: {
      title: 'Keep question as is',
      description:
        'The question stays exactly as it is and the verifier’s flags are dismissed. This creates a new version. Say why the flags are wrong.',
      label: 'Keep as is',
      done: 'kept as is',
    },
    regenerate: {
      title: 'Regenerate question',
      description: 'A new question is written from the same source material. This creates a new version.',
      label: 'Regenerate',
      done: 'regenerated',
    },
  };

export function TestReviewPage() {
  const testId = Number(useParams().testId);
  const { data: test, isLoading, error } = useTest(testId);
  const { data: questions, isLoading: questionsLoading } = useTestQuestions(testId);
  const { data: tree } = useTopicTree();

  const acceptFix = useAcceptFix(testId);
  const dismissFlags = useDismissFlags(testId);
  const regenerate = useRegenerateQuestion(testId);
  const publish = usePublishTest(testId);
  const [publishOpen, setPublishOpen] = useState(false);
  const unpublish = useUnpublishTest(testId);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const attempts = useTestHasAttempts(testId, test?.status === 'PUBLISHED');

  const [filter, setFilter] = useState<'all' | 'review'>('all');
  const [confirm, setConfirm] = useState<Pending>(null);
  const [editing, setEditing] = useState<TestQuestionDto | null>(null);
  const [historyOf, setHistoryOf] = useState<TestQuestionDto | null>(null);

  // While the test is generating, useTest polls it. When generation ends, load its questions and history.
  const generating = isGenerating(test);
  const now = useNow(generating);
  const queryClient = useQueryClient();
  const wasGenerating = useRef(generating);
  useEffect(() => {
    if (wasGenerating.current && !generating) {
      queryClient.invalidateQueries({ queryKey: testKeys.detail(testId) });
    }
    wasGenerating.current = generating;
  }, [generating, queryClient, testId]);

  if (isLoading) return <PageLoader />;
  if (error || !test) {
    return <ErrorAlert error={error ?? 'Test not found'} title={`Could not load test #${testId}`} />;
  }

  const canReview = REVIEWABLE_TEST_STATUSES.includes(test.status ?? '');
  const published = test.status === 'PUBLISHED';
  const sorted = [...(questions ?? [])].sort((a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0));
  const needsReview = sorted.filter((q) => q.status === 'NEEDS_REVIEW');
  const visible = filter === 'review' ? needsReview : sorted;

  // Same rule as the backend: GENERATED or REVIEWED, with questions and none of them needing review.
  const publishBlockedReason = !PUBLISHABLE_TEST_STATUSES.includes(test.status ?? '')
    ? 'Only generated or reviewed tests can be published'
    : sorted.length === 0
      ? 'The test has no questions'
      : needsReview.length > 0
        ? `Review the ${needsReview.length} flagged question(s) first`
        : undefined;

  // Same rule as the backend: only while nobody has taken the test. If the check itself fails, leave the
  // button enabled; the server checks again and refuses with a message.
  const unpublishBlockedReason = attempts.isPending
    ? 'Checking for attempts…'
    : attempts.data
      ? 'Someone has taken this test, so it can no longer be unpublished'
      : undefined;

  // The id of the question whose accept-fix / keep / regenerate call is running (regenerate takes a while).
  const busyQuestionId = acceptFix.isPending
    ? acceptFix.variables?.questionId
    : dismissFlags.isPending
      ? dismissFlags.variables?.questionId
      : regenerate.isPending
        ? regenerate.variables?.questionId
        : undefined;

  const handleAction = (kind: ReviewActionKind, question: TestQuestionDto) => {
    if (kind === 'edit') setEditing(question);
    else if (kind === 'history') setHistoryOf(question);
    else setConfirm({ kind, question });
  };

  const runConfirmed = (comment: string | undefined) => {
    if (!confirm) return;
    const { kind, question } = confirm;
    const vars = { questionId: question.id!, expectedCurrentVersionId: question.currentVersionId!, comment };
    const mutation = kind === 'accept-fix' ? acceptFix : kind === 'keep' ? dismissFlags : regenerate;
    mutation.mutate(vars, {
      onSuccess: () =>
        notifications.show({
          color: 'teal',
          message: `Question ${(question.questionIndex ?? 0) + 1}: ${CONFIRM_TEXT[kind].done}`,
        }),
      onError: (e) => {
        if (e instanceof ApiError && e.status === 409) {
          notifications.show({ color: 'yellow', message: 'The page was refreshed with the latest version.' });
        }
      },
    });
    setConfirm(null);
  };

  const source = test.topicIds?.length
    ? test.topicIds.map((id) => topicPathLabel(tree, id)).join(', ')
    : `Documents ${test.documentIds?.join(', ')}`;

  return (
    <Stack gap="lg">
      <Anchor component={Link} to="/tests" size="sm" c="dimmed">
        <Group gap={4}>
          <IconArrowLeft size={14} /> All tests
        </Group>
      </Anchor>

      <Paper p="lg" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group gap="sm" wrap="nowrap">
              <Title order={2} style={{ overflowWrap: 'anywhere' }}>
                {test.name || `Test #${test.id}`}
              </Title>
              <StatusBadge info={testStatus(test.status)} busy={generating} />
            </Group>
            <Text c="dimmed" size="sm" mt={4}>
              {test.name ? `Test #${test.id} · ` : ''}
              {source}
            </Text>
            {test.description && (
              <Text size="sm" mt="xs" maw={760} style={{ whiteSpace: 'pre-wrap' }}>
                {test.description}
              </Text>
            )}
          </div>
          <Stack gap={2} align="flex-end">
            {canReview && (
              <Tooltip label={publishBlockedReason} disabled={!publishBlockedReason}>
                {/* The wrapper keeps the tooltip working on a disabled button. */}
                <span>
                  <Button
                    color="violet"
                    leftSection={<IconSend size={16} />}
                    disabled={!!publishBlockedReason}
                    loading={publish.isPending}
                    onClick={() => setPublishOpen(true)}
                    mb="xs"
                  >
                    Publish
                  </Button>
                </span>
              </Tooltip>
            )}
            {published && (
              <Group gap="xs" mb="xs">
                {/* No "Take test" here: this page shows the answer key. Tests are taken from the Tests list. */}
                <Button component={Link} to={`/attempts?testId=${testId}`} variant="default">
                  Attempts
                </Button>
                <Tooltip label={unpublishBlockedReason} disabled={!unpublishBlockedReason}>
                  <span>
                    <Button
                      variant="default"
                      leftSection={<IconArrowBackUp size={16} />}
                      disabled={!!unpublishBlockedReason}
                      loading={unpublish.isPending}
                      onClick={() => setUnpublishOpen(true)}
                    >
                      Unpublish
                    </Button>
                  </span>
                </Tooltip>
              </Group>
            )}
            <Text size="sm">
              {formatDateTime(
                test.generationFinishedAt ?? test.generationFailedAt ?? test.generationStartedAt,
              )}
            </Text>
            <Text size="xs" c="dimmed">
              {formatDuration(
                test.generationStartedAt,
                test.generationFinishedAt ?? test.generationFailedAt,
              ) &&
                `took ${formatDuration(test.generationStartedAt, test.generationFinishedAt ?? test.generationFailedAt)}`}
            </Text>
          </Stack>
        </Group>
        <Group gap={6} mt="md">
          {[
            `${test.questionCount} questions`,
            test.difficulty && humanize(test.difficulty),
            test.answerCardinality && humanize(test.answerCardinality),
            test.coverageMode && humanize(test.coverageMode),
            test.generationModel,
          ]
            .filter(Boolean)
            .map((label) => (
              <Badge key={label} variant="default" radius="sm" tt="none" fw={400}>
                {label}
              </Badge>
            ))}
        </Group>
        {generating && (
          <Alert
            color="cyan"
            variant="light"
            mt="md"
            icon={<Loader size={16} color="cyan" />}
            title="Generating"
          >
            Running for {formatDuration(test.generationStartedAt, new Date(now).toISOString()) ?? '…'}.
            Questions appear here when generation finishes; this page updates by itself. If the backend was
            restarted meanwhile, the test stays in this state and can be deleted.
          </Alert>
        )}
        {published && (
          <Alert color="violet" variant="light" mt="md" icon={<IconLock size={18} />} title="Published">
            The questions are frozen. To change this test, you can unpublish it if nobody has taken it yet.
          </Alert>
        )}
        {test.status === 'FAILED' && test.generationErrorMessage && (
          <Alert
            color="red"
            variant="light"
            mt="md"
            icon={<IconAlertCircle size={18} />}
            title="Generation failed"
          >
            {test.generationErrorMessage}
          </Alert>
        )}
      </Paper>

      <Tabs defaultValue="questions" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="questions">
            Questions {questions && `(${questions.length})`}
            {needsReview.length > 0 && (
              <Badge size="xs" color="orange" ml={6} variant="filled">
                {needsReview.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="runs">LLM calls</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="questions" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <SegmentedControl
                size="xs"
                value={filter}
                onChange={(v) => setFilter(v as 'all' | 'review')}
                data={[
                  { value: 'all', label: 'All' },
                  { value: 'review', label: `Needs review (${needsReview.length})` },
                ]}
              />
              {!canReview && (
                <Text size="xs" c="dimmed">
                  {published
                    ? 'Published tests can’t be changed.'
                    : 'Review actions are available once the test is generated.'}
                </Text>
              )}
            </Group>
            {regenerate.isPending && (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Regenerating question… this can take up to a minute.
                </Text>
              </Group>
            )}
            {questionsLoading && <PageLoader />}
            {questions && visible.length === 0 && !generating && (
              <EmptyState title={filter === 'review' ? 'Nothing to review' : 'No questions'} />
            )}
            {visible.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                canReview={canReview}
                busy={busyQuestionId === q.id}
                onAction={handleAction}
              />
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="activity" pt="md">
          <EventTimeline testId={testId} questions={sorted} />
        </Tabs.Panel>

        <Tabs.Panel value="runs" pt="md">
          <GenerationRunsPanel testId={testId} />
        </Tabs.Panel>
      </Tabs>

      <CommentActionModal
        opened={confirm != null}
        title={confirm ? CONFIRM_TEXT[confirm.kind].title : ''}
        description={confirm ? CONFIRM_TEXT[confirm.kind].description : ''}
        confirmLabel={confirm ? CONFIRM_TEXT[confirm.kind].label : ''}
        commentRequired={confirm?.kind === 'keep'}
        loading={false}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      />
      <CommentActionModal
        opened={publishOpen}
        title="Publish test"
        description="Publishing freezes the questions: accept fix, regenerate and edit are no longer possible, and the test can be used for attempts."
        confirmLabel="Publish"
        loading={publish.isPending}
        onConfirm={(comment) =>
          publish.mutate(comment, {
            onSuccess: () => notifications.show({ color: 'violet', message: `Test #${testId} published` }),
            onSettled: () => setPublishOpen(false),
          })
        }
        onClose={() => setPublishOpen(false)}
      />
      <CommentActionModal
        opened={unpublishOpen}
        title="Unpublish test"
        description="The test goes back to review, so you can change its questions. Publish it again when you are done."
        confirmLabel="Unpublish"
        loading={unpublish.isPending}
        onConfirm={(comment) =>
          unpublish.mutate(comment, {
            onSuccess: () => notifications.show({ message: `Test #${testId} unpublished` }),
            onSettled: () => setUnpublishOpen(false),
          })
        }
        onClose={() => setUnpublishOpen(false)}
      />
      <ManualEditModal
        testId={testId}
        question={editing}
        multipleCorrect={test.answerCardinality === 'MULTIPLE_CORRECT'}
        onClose={() => setEditing(null)}
      />
      <VersionHistoryDrawer testId={testId} question={historyOf} onClose={() => setHistoryOf(null)} />
    </Stack>
  );
}
