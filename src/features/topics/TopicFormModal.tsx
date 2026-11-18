import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useMemo } from 'react';
import { topicPathLabel, useCreateTopic, useTopicTree, useUpdateTopic } from '@/api/topics';
import type { TopicNode } from '@/api/types';

/**
 * One dialog for both "new topic" and "rename topic":
 *  - mode "create": `parent` preselects the parent topic; the user can pick another one or clear it
 *    (no parent = new root topic).
 *  - mode "edit":   topic is the one being renamed.
 */
export type TopicFormTarget = { mode: 'create'; parent?: TopicNode } | { mode: 'edit'; topic: TopicNode };

interface Props {
  target: TopicFormTarget | null;
  onClose: () => void;
  onSaved?: (id: number) => void;
}

interface FormValues {
  name: string;
  description: string;
  parentId: string | null;
}

export function TopicFormModal({ target, onClose, onSaved }: Props) {
  const create = useCreateTopic();
  const update = useUpdateTopic();
  const { data: tree } = useTopicTree();
  const form = useForm<FormValues>({
    initialValues: { name: '', description: '', parentId: null },
    validate: { name: (v) => (v.trim() ? null : 'Name is required') },
  });

  // Every topic the user may add to, as "Parent › Child" for the parent picker (not the read-only library).
  const parentOptions = useMemo(
    () =>
      tree
        ? [...tree.byId.values()]
            .filter((t) => !t.readOnly)
            .map((t) => ({ value: String(t.id), label: topicPathLabel(tree, t.id) }))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [],
    [tree],
  );

  // Fill the form whenever the dialog opens for a different topic.
  useEffect(() => {
    if (target?.mode === 'edit') {
      form.setValues({
        name: target.topic.name,
        description: target.topic.description ?? '',
        parentId: null,
      });
    } else {
      form.setValues({
        name: '',
        description: '',
        parentId: target?.parent && !target.parent.readOnly ? String(target.parent.id) : null,
      });
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const title = target?.mode === 'edit' ? 'Rename topic' : 'New topic';

  // Errors are shown as a notification by the global handler; the dialog stays open.
  const submit = form.onSubmit(({ name, description, parentId }) => {
    if (!target) return;
    const body = { name: name.trim(), description: description.trim() || undefined };
    const done = { onSuccess: (saved: { id?: number }) => (onSaved?.(saved.id!), onClose()) };
    if (target.mode === 'edit') update.mutate({ id: target.topic.id, ...body }, done);
    else create.mutate({ ...body, parentId: parentId ? Number(parentId) : undefined }, done);
  });

  return (
    <Modal opened={target != null} onClose={onClose} title={title}>
      <form onSubmit={submit}>
        <Stack>
          {target?.mode === 'create' && (
            <Select
              label="Parent topic"
              description="Leave empty to create a top-level topic."
              placeholder="None (top-level topic)"
              data={parentOptions}
              searchable
              clearable
              {...form.getInputProps('parentId')}
            />
          )}
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
