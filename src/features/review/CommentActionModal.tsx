import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useEffect, useState } from 'react';

/**
 * Confirmation dialog with a comment, used for the review actions and for publishing. The comment is stored
 * with the event. It is optional unless `commentRequired` is set (e.g. "Keep as is").
 */
export function CommentActionModal({
  opened,
  title,
  description,
  confirmLabel,
  loading,
  commentRequired = false,
  onConfirm,
  onClose,
}: {
  opened: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  commentRequired?: boolean;
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
          label={commentRequired ? 'Comment' : 'Comment (optional)'}
          withAsterisk={commentRequired}
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
          <Button
            loading={loading}
            disabled={commentRequired && !comment.trim()}
            onClick={() => onConfirm(comment.trim() || undefined)}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
