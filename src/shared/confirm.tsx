import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';

/** Red "are you sure?" dialog for destructive actions; the button says `confirmLabel` (Delete by default). */
export function confirmDelete({
  title,
  message,
  onConfirm,
  confirmLabel = 'Delete',
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  modals.openConfirmModal({
    title,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: confirmLabel, cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm,
  });
}
