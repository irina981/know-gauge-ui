import { Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useUpdateTestDetails } from '@/api/review';
import type { TestDto } from '@/api/types';
import { ErrorAlert } from '@/shared/components';

/** Edit the name and description of a test that is not published yet. */
export function TestDetailsModal({
  test,
  opened,
  onClose,
}: {
  test: TestDto;
  opened: boolean;
  onClose: () => void;
}) {
  const update = useUpdateTestDetails(test.id!);
  const form = useForm({
    initialValues: { name: test.name ?? '', description: test.description ?? '' },
    validate: {
      name: (v) => (v.trim() ? null : 'Enter a name for the test'),
    },
  });

  // Start from the current values every time the dialog opens.
  useEffect(() => {
    if (opened) {
      form.setValues({ name: test.name ?? '', description: test.description ?? '' });
      form.resetDirty();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const save = form.onSubmit((values) =>
    update.mutate(
      { name: values.name.trim(), description: values.description.trim() || undefined },
      {
        onSuccess: () => {
          notifications.show({ color: 'teal', message: 'Test details saved' });
          onClose();
        },
      },
    ),
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Edit test details" size="lg">
      <form onSubmit={save}>
        <Stack>
          <TextInput label="Name" withAsterisk maxLength={200} {...form.getInputProps('name')} />
          <Textarea
            label="Description"
            description="Optional. For example who the test is for or which chapters it covers."
            autosize
            minRows={2}
            maxRows={8}
            maxLength={2000}
            {...form.getInputProps('description')}
          />
          {update.error && <ErrorAlert error={update.error} title="Could not save the details" />}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={update.isPending} disabled={!form.isDirty()}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
