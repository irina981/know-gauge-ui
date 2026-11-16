import { useParams } from 'react-router-dom';
import { useAttempt } from '@/api/attempts';
import { ErrorAlert, PageLoader } from '@/shared/components';
import { AttemptResult } from './AttemptResult';
import { AttemptRunner } from './AttemptRunner';

/** A running attempt shows the questions; a scored one shows the result and review. */
export function AttemptPage() {
  const attemptId = Number(useParams().attemptId);
  const { data, isLoading, error } = useAttempt(attemptId);

  if (isLoading) return <PageLoader />;
  if (error || !data)
    return <ErrorAlert error={error ?? 'Attempt not found'} title={`Could not load attempt #${attemptId}`} />;

  return data.attempt?.status === 'STARTED' ? (
    <AttemptRunner detail={data} />
  ) : (
    <AttemptResult detail={data} />
  );
}
