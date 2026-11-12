import { Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { useCreateTopic, useUpdateTopic } from '@/api/topics';
import type { TopicNode } from '@/api/types';

/**
 * One dialog for both "new topic" and "rename topic":
 *  - mode "create": parentId undefined = new root topic, otherwise a sub-topic.
 *  - mode "edit":   topic is the one being renamed.
 */
export type TopicFormTarget = { mode: 'create'; parent?: TopicNode } | { mode: 'edit'; topic: TopicNode };

interface Props {
  target: TopicFormTarget | null;
  onClose: () => void;
  onSaved?: (id: number) => void;
}

export function TopicFormModal({ target, onClose, onSaved }: Props) {
  const create = useCreateTopic();
  const update = useUpdateTopic();
  const form = useForm({
    initialValues: { name: '', description: '' },
    validate: { name: (v) => (v.trim() ? null : 'Name is required') },
  });

  // Fill the form whenever the dialog opens for a different topic.
  useEffect(() => {
    if (target?.mode === 'edit') {
      form.setValues({ name: target.topic.name, description: target.topic.description ?? '' });
    } else {
      form.setValues({ name: '', description: '' });
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const title =
    target?.mode === 'edit'
      ? 'Rename topic'
      : target?.parent
        ? `New sub-topic of "${target.parent.name}"`
        : 'New topic';

  // Errors are shown as a notification by the global handler; the dialog stays open.
  const submit = form.onSubmit(({ name, description }) => {
    if (!target) return;
    const body = { name: name.trim(), description: description.trim() || undefined };
    const done = { onSuccess: (saved: { id?: number }) => (onSaved?.(saved.id!), onClose()) };
    if (target.mode === 'edit') update.mutate({ id: target.topic.id, ...body }, done);
    else create.mutate({ ...body, parentId: target.parent?.id }, done);
  });

  return (
    <Modal opened={target != null} onClose={onClose} title={title}>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Name" data-autofocus withAsterisk {...form.getInputProps('name')} />
          <Textarea label="Description" autosize minRows={2} {...form.getInputProps('description')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
