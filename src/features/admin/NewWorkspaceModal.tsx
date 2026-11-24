import {
  Alert,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useCreateWorkspace } from '@/api/workspaces';
import { ErrorAlert } from '@/shared/components';
import { countUnique, parseEmails } from '@/shared/emails';

type WorkspaceType = 'PERSONAL' | 'ORGANIZATION' | 'LIBRARY';

const TYPES: { value: WorkspaceType; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'LIBRARY', label: 'Shared library' },
];

/** What each type is, under the type picker. */
const TYPE_HINTS: Record<WorkspaceType, string> = {
  ORGANIZATION:
    'A workspace several people share. Everyone you invite becomes one of its administrators when they accept.',
  PERSONAL: 'A workspace for one person, who becomes its owner when they accept.',
  LIBRARY:
    'Content every user can read and generate tests from. It has no members and no limits; you fill it from the Library page.',
};

const EMPTY = { type: 'ORGANIZATION' as WorkspaceType, name: '', email: '', emails: '', message: '' };

/**
 * Creates a workspace of any type (ADR015): an organization with at least one invitee, a personal workspace with
 * exactly one, a shared library with none. Invitations go out by email when it is created.
 */
export function NewWorkspaceModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const create = useCreateWorkspace();
  const form = useForm({
    initialValues: EMPTY,
    validate: {
      name: (v) => (v.trim() ? null : 'Enter a name for the workspace'),
      email: (v, values) =>
        values.type === 'PERSONAL' && !v.trim() ? 'Enter the email of the person the workspace is for' : null,
      emails: (v, values) =>
        values.type === 'ORGANIZATION' && parseEmails(v).length === 0
          ? 'Invite at least one person to administer the organization'
          : null,
    },
  });
  const type = form.values.type;
  const organizationEmails = parseEmails(form.values.emails);

  // Start empty every time the dialog opens.
  useEffect(() => {
    if (opened) {
      form.setValues(EMPTY);
      form.resetDirty();
      form.clearErrors();
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const submit = form.onSubmit((values) => {
    const emails =
      values.type === 'PERSONAL'
        ? [values.email.trim()]
        : values.type === 'ORGANIZATION'
          ? parseEmails(values.emails)
          : [];
    create.mutate(
      {
        type: values.type,
        name: values.name.trim(),
        emails,
        message: values.type === 'LIBRARY' ? undefined : values.message.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          const failed = result.invitations?.filter((i) => i.sendError).length ?? 0;
          const sent = (result.invitations?.length ?? 0) - failed;
          notifications.show({
            color: failed ? 'orange' : 'teal',
            title: failed
              ? `${result.tenant?.name} created, some invitations not delivered`
              : `${result.tenant?.name} created`,
            message:
              values.type === 'LIBRARY'
                ? 'Add topics to it from the Library page.'
                : [
                    `${sent} invitation${sent === 1 ? '' : 's'} sent`,
                    failed ? `${failed} failed (resend from the workspace's invitations)` : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
          });
          onClose();
        },
      },
    );
  });

  return (
    <Modal opened={opened} onClose={onClose} title="New workspace" size="lg">
      <form onSubmit={submit}>
        <Stack>
          <div>
            <Text size="sm" fw={500} mb={4}>
              Type
            </Text>
            <SegmentedControl
              fullWidth
              data={TYPES}
              value={type}
              onChange={(value) => {
                form.setFieldValue('type', value as WorkspaceType);
                form.clearErrors();
              }}
            />
            <Text size="xs" c="dimmed" mt={6}>
              {TYPE_HINTS[type]}
            </Text>
          </div>
          <TextInput
            label="Name"
            withAsterisk
            maxLength={200}
            placeholder={
              type === 'PERSONAL' ? 'Ana Petrović' : type === 'LIBRARY' ? 'Java samples' : 'Acme Training'
            }
            {...form.getInputProps('name')}
          />
          {type === 'PERSONAL' && (
            <TextInput
              label="Email of the owner"
              description="They get an email with a link to accept. If they already use KnowGauge, accepting moves them here; their current workspace keeps its content."
              withAsterisk
              type="email"
              placeholder="ana@example.com"
              {...form.getInputProps('email')}
            />
          )}
          {type === 'ORGANIZATION' && (
            <Textarea
              label="Invite administrators"
              description="Separate the addresses with commas or new lines. Each gets their own link. People who already use KnowGauge move to this workspace when they accept; their current workspace keeps its content."
              withAsterisk
              placeholder={'ana@example.com\nmarko@example.com'}
              autosize
              minRows={3}
              maxRows={8}
              {...form.getInputProps('emails')}
            />
          )}
          {type !== 'LIBRARY' && (
            <Textarea
              label="Message (optional)"
              description="Added to the invitation email."
              autosize
              minRows={2}
              maxLength={2000}
              {...form.getInputProps('message')}
            />
          )}
          {type === 'LIBRARY' && (
            <Alert variant="light" icon={<IconInfoCircle size={18} />}>
              Every user sees it under Shared library as soon as it has topics.
            </Alert>
          )}
          {create.error && <ErrorAlert error={create.error} title="Could not create the workspace" />}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {type === 'ORGANIZATION' &&
                `${countUnique(organizationEmails)} address${countUnique(organizationEmails) === 1 ? '' : 'es'}`}
            </Text>
            <Group gap="xs">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" loading={create.isPending}>
                {type === 'LIBRARY' ? 'Create library' : 'Create and invite'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
