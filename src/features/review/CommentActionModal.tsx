import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useEffect, useState } from 'react';

/**
 * Confirmation dialog with an optional comment, used for "Accept fix" and "Regenerate".
 * The comment is stored with the review event.
 */
export function CommentActionModal({
  opened,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: {
  opened: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: (comment: string | undefined) => void;
  onClose: () => void;
}) {
  const [comment, setComment] = useState('');
  useEffect(() => {
    if (opened) setComment('');
  }, [opened]);

  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <Stack>
        <Text size="sm">{description}</Text>
        <Textarea
          label="Comment (optional)"
          maxLength={2000}
          autosize
          minRows={2}
          value={comment}
          onChange={(e) => setComment(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={() => onConfirm(comment.trim() || undefined)}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
