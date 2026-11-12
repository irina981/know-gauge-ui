import { Alert, Badge, Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { EnumInfo } from './enums';

/** Small reusable building blocks used across pages. */

/** Coloured status label. `busy` adds a small spinner, e.g. for a test that is still generating. */
export function StatusBadge({ info, busy = false }: { info: EnumInfo; busy?: boolean }) {
  return (
    <Badge
      color={info.color}
      variant="light"
      radius="sm"
      tt="none"
      style={{ minWidth: 'max-content' }}
      leftSection={busy ? <Loader size={10} color={info.color} /> : undefined}
    >
      {info.label}
    </Badge>
  );
}

export function ErrorAlert({ error, title = 'Something went wrong' }: { error: unknown; title?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Alert color="red" variant="light" title={title} icon={<IconAlertCircle size={18} />}>
      {message}
    </Alert>
  );
}

export function PageLoader() {
  return (
    <Center py="xl">
      <Loader />
    </Center>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack align="center" gap={4} py="xl">
      <Text fw={500}>{title}</Text>
      {children && (
        <Text c="dimmed" size="sm" ta="center">
          {children}
        </Text>
      )}
    </Stack>
  );
}
