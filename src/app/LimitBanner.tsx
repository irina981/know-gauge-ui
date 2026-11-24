import { Alert, Anchor, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useUsage } from '@/api/account';
import { formatBytes } from '@/shared/format';

const numberFormat = new Intl.NumberFormat();

/**
 * Red notice above every page of the signed-in app while the user's workspace is at one of its limits (system
 * settings): the monthly AI tokens, until the first day of next month (UTC), or the storage, until documents are
 * deleted. It cannot be closed: generating or uploading would fail until then.
 */
export function LimitBanner() {
  const { data: usage } = useUsage();
  if (!usage) return null;

  const tokens = (usage.llmInputTokens ?? 0) + (usage.llmOutputTokens ?? 0);
  const tokenLimit = usage.llmTokenLimit ?? null;
  const tokensReached = tokenLimit != null && tokens >= tokenLimit;
  const storage = usage.storageBytes ?? 0;
  const storageLimit = usage.storageLimitBytes ?? null;
  const storageReached = storageLimit != null && storage >= storageLimit;
  if (!tokensReached && !storageReached) return null;

  // The month ends at midnight UTC; shown in the user's own time zone.
  const resetsAt = usage.periodEnd
    ? new Date(usage.periodEnd).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
    : 'the first day of next month';

  return (
    <Alert
      variant="light"
      color="red"
      radius="md"
      icon={<IconAlertTriangle size={18} />}
      title={
        tokensReached && storageReached
          ? 'Your workspace reached its limits'
          : 'Your workspace reached a limit'
      }
      mb="md"
      py={10}
      // The theme's light-variant red text is almost white in dark mode; the title and icon should read as red.
      styles={{
        title: { color: 'var(--mantine-color-red-text)' },
        icon: { color: 'var(--mantine-color-red-text)' },
      }}
    >
      <Stack gap={4}>
        {tokensReached && (
          <Text size="sm">
            <b>AI tokens:</b> {numberFormat.format(tokens)} of {numberFormat.format(tokenLimit)} used this
            month. New tests and regenerations are possible again from <b>{resetsAt}</b>.
          </Text>
        )}
        {storageReached && (
          <Text size="sm">
            <b>Storage:</b> {formatBytes(storage)} of {formatBytes(storageLimit)} in use. New uploads are
            refused until you delete documents you no longer need.
          </Text>
        )}
        <Anchor component={Link} to="/settings/usage" size="sm" fw={600}>
          See your usage
        </Anchor>
      </Stack>
    </Alert>
  );
}
