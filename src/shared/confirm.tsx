import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';

/** Red "are you sure?" dialog for destructive actions. */
export function confirmDelete({
  title,
  message,
  onConfirm,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    title,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm,
  });
}
