import { useParams } from 'react-router-dom';
import { useAttempt, useSubmitAttempt } from '@/api/attempts';
import { ErrorAlert, PageLoader } from '@/shared/components';
import { AttemptResult } from './AttemptResult';
import { AttemptRunner } from './AttemptRunner';

/** Administrator's view of an attempt: a running one shows the questions; a scored one the result and review. */
export function AttemptPage() {
  const attemptId = Number(useParams().attemptId);
  const { data, isLoading, error } = useAttempt(attemptId);
  const submit = useSubmitAttempt(attemptId);

  if (isLoading) return <PageLoader />;
  if (error || !data)
    return <ErrorAlert error={error ?? 'Attempt not found'} title={`Could not load attempt #${attemptId}`} />;

  return data.attempt?.status === 'STARTED' ? (
    <AttemptRunner
      testName={data.testName || `Test #${data.attempt?.testId}`}
      answerCardinality={data.answerCardinality}
      questions={data.questions ?? []}
      storageKey={`kg-attempt-${attemptId}`}
      submitting={submit.isPending}
      onSubmit={(input, onDone) => submit.mutate(input, { onSuccess: onDone })}
    />
  ) : (
    <AttemptResult detail={data} />
  );
}
