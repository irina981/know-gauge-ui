import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useMemo } from 'react';
import { topicPathLabel, useCreateTopic, useTopicTree, useUpdateTopic } from '@/api/topics';
import type { LibraryChoice } from '@/api/admin';
import type { TopicNode } from '@/api/types';
import { LibrarySelect } from './LibrarySelect';

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
  /**
   * Set for an admin working on the shared libraries (ADR015): parents are library topics, and a top-level topic
   * goes into the chosen library. Otherwise parents are the user's own topics and a top-level one is theirs.
   */
  libraries?: LibraryChoice[];
}

interface FormValues {
  name: string;
  description: string;
  parentId: string | null;
  libraryId: string | null;
}

export function TopicFormModal({ target, onClose, onSaved, libraries }: Props) {
  const inLibrary = libraries != null;
  const create = useCreateTopic();
  const update = useUpdateTopic();
  const { data: tree } = useTopicTree();
  const form = useForm<FormValues>({
    initialValues: { name: '', description: '', parentId: null, libraryId: null },
    validate: {
      name: (v) => (v.trim() ? null : 'Name is required'),
      libraryId: (v, values) =>
        inLibrary && target?.mode === 'create' && !values.parentId && !v ? 'Choose the library' : null,
    },
  });

  // Every topic the user may add to, as "Parent › Child" for the parent picker: in the libraries for an admin
  // working on them, else in the user's own library.
  const parentOptions = useMemo(
    () =>
      tree
        ? [...tree.byId.values()]
            .filter((t) => !t.readOnly && t.shared === inLibrary)
            .map((t) => ({ value: String(t.id), label: topicPathLabel(tree, t.id) }))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [],
    [tree, inLibrary],
  );

  // Fill the form whenever the dialog opens for a different topic.
  useEffect(() => {
    if (target?.mode === 'edit') {
      form.setValues({
        name: target.topic.name,
        description: target.topic.description ?? '',
        parentId: null,
        libraryId: null,
      });
    } else {
      form.setValues({
        name: '',
        description: '',
        parentId:
          target?.parent && !target.parent.readOnly && target.parent.shared === inLibrary
            ? String(target.parent.id)
            : null,
        // With one library there is nothing to choose.
        libraryId: libraries?.length === 1 ? String(libraries[0].id) : null,
      });
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const title = target?.mode === 'edit' ? 'Rename topic' : 'New topic';

  // Errors are shown as a notification by the global handler; the dialog stays open.
  const submit = form.onSubmit(({ name, description, parentId, libraryId }) => {
    if (!target) return;
    const body = { name: name.trim(), description: description.trim() || undefined };
    const done = { onSuccess: (saved: { id?: number }) => (onSaved?.(saved.id!), onClose()) };
    if (target.mode === 'edit') update.mutate({ id: target.topic.id, ...body }, done);
    else
      create.mutate(
        {
          ...body,
          parentId: parentId ? Number(parentId) : undefined,
          libraryTenantId: inLibrary && !parentId && libraryId ? Number(libraryId) : undefined,
        },
        done,
      );
  });

  return (
    <Modal opened={target != null} onClose={onClose} title={title}>
      <form onSubmit={submit}>
        <Stack>
          {target?.mode === 'create' && (
            <Select
              label="Parent topic"
              description={
                inLibrary
                  ? 'Leave empty to create a top-level topic in a library.'
                  : 'Leave empty to create a top-level topic.'
              }
              placeholder="None (top-level topic)"
              data={parentOptions}
              searchable
              clearable
              {...form.getInputProps('parentId')}
            />
          )}
          {target?.mode === 'create' && inLibrary && !form.values.parentId && (
            <LibrarySelect
              libraries={libraries}
              value={form.values.libraryId}
              onChange={(value) => form.setFieldValue('libraryId', value)}
              error={form.errors.libraryId as string | undefined}
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
