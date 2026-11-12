import { Text, Timeline } from '@mantine/core';
import { useTestEvents } from '@/api/review';
import type { TestQuestionDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageLoader } from '@/shared/components';
import { eventType } from '@/shared/enums';
import { formatDateTime } from '@/shared/format';

/** Everything that happened to the test and its questions, newest first. */
export function EventTimeline({ testId, questions }: { testId: number; questions: TestQuestionDto[] }) {
  const { data: events, isLoading, error } = useTestEvents(testId);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert error={error} />;
  if (!events?.length) return <EmptyState title="No activity yet" />;

  const questionNo = new Map(questions.map((q) => [q.id, (q.questionIndex ?? 0) + 1]));
  const newestFirst = [...events].reverse();

  return (
    // Mantine only colours "active" items, so mark them all active to get the per-event colours.
    <Timeline bulletSize={14} lineWidth={2} mt="sm" active={newestFirst.length - 1}>
      {newestFirst.map((e) => {
        const info = eventType(e.eventType);
        return (
          <Timeline.Item
            key={e.id}
            color={info.color}
            title={
              <Text size="sm" fw={500}>
                {info.label}
                {e.questionId != null && (
                  <Text span size="sm" c="dimmed">
                    {' '}
                    · question {questionNo.get(e.questionId) ?? `#${e.questionId}`}
                  </Text>
                )}
              </Text>
            }
          >
            {e.comment && (
              <Text size="sm" mt={2}>
                “{e.comment}”
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={2}>
              {formatDateTime(e.createdAt)}
              {e.actorUserId != null ? ` · user ${e.actorUserId}` : ' · system'}
            </Text>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
