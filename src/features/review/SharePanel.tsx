import {
  ActionIcon,
  Badge,
  Button,
  CopyButton,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconMail,
  IconMailForward,
  IconRefresh,
  IconSend,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useInvitations, useInvite, useResendInvitation } from '@/api/invitations';
import { useCreateSharedLink } from '@/api/tests';
import type { TestInvitationDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageLoader } from '@/shared/components';
import { formatDateTime } from '@/shared/format';
import { scoreColor } from '@/features/attempts/attemptUtils';

/**
 * How participants reach a published test (ADR009): the shared link (name + email, no attempt limit)
 * and personal invitations sent by email (one link per address, usable once).
 */
export function SharePanel({ testId, publicToken }: { testId: number; publicToken?: string }) {
  const link = publicToken ? `${window.location.origin}/t/${publicToken}` : '';
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: invitations, isLoading, error } = useInvitations(testId);
  const resend = useResendInvitation(testId);
  const createLink = useCreateSharedLink(testId);

  const confirmRegenerate = () =>
    modals.openConfirmModal({
      title: 'Regenerate the shared link?',
      children: (
        <Text size="sm">
          The current link stops working at once, for everyone who has it. People who already started the test
          can still finish it. Personal invitations are not affected.
        </Text>
      ),
      labels: { confirm: 'Regenerate', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        createLink.mutate(undefined, {
          onSuccess: () =>
            notifications.show({ color: 'teal', message: 'New link created. The old link no longer works.' }),
        }),
    });

  return (
    <Stack gap="lg">
      <Paper p="lg">
        <Title order={3} fz="lg" mb={4}>
          Shared link
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          Anyone with this link can take the test, as often as they like, after entering their name and email.
        </Text>
        {createLink.error && <ErrorAlert error={createLink.error} title="Could not create the link" />}
        {publicToken ? (
          <Group gap="xs" wrap="nowrap">
            <TextInput value={link} readOnly style={{ flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
            <CopyLinkButton value={link} />
            <Tooltip label="Open as a participant">
              <ActionIcon
                component="a"
                href={link}
                target="_blank"
                rel="noreferrer"
                variant="default"
                size="lg"
                aria-label="Open the shared link"
              >
                <IconExternalLink size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Replace with a new link; the current one stops working">
              <Button
                variant="default"
                leftSection={<IconRefresh size={16} />}
                loading={createLink.isPending}
                onClick={confirmRegenerate}
              >
                Regenerate
              </Button>
            </Tooltip>
          </Group>
        ) : (
          <Button
            variant="light"
            leftSection={<IconLink size={16} />}
            loading={createLink.isPending}
            onClick={() => createLink.mutate()}
          >
            Create shared link
          </Button>
        )}
      </Paper>

      <Paper p="lg">
        <Group justify="space-between" align="flex-start" mb="sm">
          <div>
            <Title order={3} fz="lg" mb={4}>
              Personal invitations
            </Title>
            <Text size="sm" c="dimmed">
              Each address gets its own link by email. It can be used for one attempt, and the attempt is
              recorded under that address.
            </Text>
          </div>
          <Button leftSection={<IconMail size={16} />} variant="gradient" onClick={() => setInviteOpen(true)}>
            Invite by email
          </Button>
        </Group>

        {isLoading && <PageLoader />}
        {error && <ErrorAlert error={error} title="Could not load invitations" />}
        {invitations && invitations.length === 0 && (
          <EmptyState title="No invitations yet" icon={IconMail}>
            Invite people by email to give each of them a personal link.
          </EmptyState>
        )}
        {invitations && invitations.length > 0 && (
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Last sent</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {invitations.map((inv) => (
                  <Table.Tr key={inv.id}>
                    <Table.Td>
                      <Text size="sm">{inv.email}</Text>
                      {inv.participantName && (
                        <Text size="xs" c="dimmed">
                          {inv.participantName}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <InvitationStatus invitation={inv} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{inv.sentAt ? formatDateTime(inv.sentAt) : '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <CopyLinkButton value={inv.link ?? ''} label="Copy personal link" small />
                        {!inv.attemptStatus && (
                          <Tooltip label="Send the link again">
                            <ActionIcon
                              variant="subtle"
                              aria-label="Resend invitation"
                              loading={resend.isPending && resend.variables === inv.id}
                              onClick={() =>
                                resend.mutate(inv.id!, {
                                  onSuccess: (r) =>
                                    notifications.show(
                                      r.sendError
                                        ? { color: 'red', title: 'Not sent', message: r.sendError }
                                        : { color: 'teal', message: `Invitation sent to ${r.email}` },
                                    ),
                                })
                              }
                            >
                              <IconMailForward size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      <InviteModal testId={testId} opened={inviteOpen} onClose={() => setInviteOpen(false)} />
    </Stack>
  );
}

function InvitationStatus({ invitation: inv }: { invitation: TestInvitationDto }) {
  if (inv.attemptStatus === 'SCORED')
    return (
      <Badge color={scoreColor(inv.scorePercent)} variant="light" tt="none">
        Completed · {inv.scorePercent}%
      </Badge>
    );
  if (inv.attemptStatus)
    return (
      <Badge color="blue" variant="light" tt="none">
        In progress
      </Badge>
    );
  if (inv.sendError)
    return (
      <Tooltip label={inv.sendError} multiline w={320}>
        <Badge color="red" variant="light" tt="none">
          Not delivered
        </Badge>
      </Tooltip>
    );
  return (
    <Badge color={inv.sentAt ? 'gray' : 'yellow'} variant="light" tt="none">
      {inv.sentAt ? 'Sent' : 'Not sent'}
    </Badge>
  );
}

function CopyLinkButton({
  value,
  label = 'Copy link',
  small = false,
}: {
  value: string;
  label?: string;
  small?: boolean;
}) {
  return (
    <CopyButton value={value}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? 'Copied' : label}>
          <ActionIcon
            variant={small ? 'subtle' : 'default'}
            size={small ? 'md' : 'lg'}
            color={copied ? 'teal' : undefined}
            onClick={copy}
            aria-label={label}
          >
            {copied ? <IconCheck size={small ? 16 : 18} /> : <IconCopy size={small ? 16 : 18} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}

/** Addresses separated by commas, semicolons, spaces or new lines. */
function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function InviteModal({ testId, opened, onClose }: { testId: number; opened: boolean; onClose: () => void }) {
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const invite = useInvite(testId);
  const parsed = parseEmails(emails);
  const unique = new Set(parsed.map((e) => e.toLowerCase())).size;

  const close = () => {
    invite.reset();
    onClose();
  };

  const send = () =>
    invite.mutate(
      { emails: parsed, message: message.trim() || undefined },
      {
        onSuccess: (result) => {
          const failed = result.filter((r) => r.sendError).length;
          const used = result.filter((r) => r.attemptStatus).length;
          const sent = result.length - failed - used;
          notifications.show({
            color: failed ? 'orange' : 'teal',
            title: failed ? 'Some invitations were not delivered' : 'Invitations sent',
            message: [
              `${sent} sent`,
              failed ? `${failed} failed (resend them from the list)` : null,
              used ? `${used} already used, not sent again` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          });
          setEmails('');
          setMessage('');
          close();
        },
      },
    );

  return (
    <Modal opened={opened} onClose={close} title="Invite by email" size="lg">
      <Stack>
        <Textarea
          label="Email addresses"
          description="Separate them with commas or new lines. Each address gets its own link, usable once. People who were already invited get their link again."
          placeholder={'ana@example.com\nmarko@example.com'}
          autosize
          minRows={4}
          maxRows={10}
          value={emails}
          onChange={(e) => setEmails(e.currentTarget.value)}
        />
        <Textarea
          label="Message (optional)"
          description="Added to the email."
          autosize
          minRows={2}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
        />
        {invite.error && <ErrorAlert error={invite.error} title="Could not send the invitations" />}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {unique} address{unique === 1 ? '' : 'es'}
          </Text>
          <Group gap="xs">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              leftSection={<IconSend size={16} />}
              disabled={unique === 0}
              loading={invite.isPending}
              onClick={send}
            >
              Send invitations
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
