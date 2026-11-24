import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  CopyButton,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCopy,
  IconMailForward,
  IconSend,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useMe } from '@/api/account';
import {
  useInviteToOrganization,
  useOrganizationInvitations,
  useOrganizationUsers,
  useResendOrganizationInvitation,
  useRevokeOrganizationInvitation,
} from '@/api/organization';
import { InvitationStatus } from '@/features/admin/WorkspaceInvitationsModal';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';
import { countUnique, parseEmails } from '@/shared/emails';
import { formatDateTime } from '@/shared/format';
import { RoleBadges } from '@/shared/RoleBadges';
import { INVITABLE_ROLES, ROLES, roleLabel } from '@/shared/roles';

/**
 * The people of an organization workspace, for its tenant admins (ADR016): who works in it with which roles, and
 * the invitations that bring more, each as admin, user or viewer.
 */
export function WorkspaceUsersPage() {
  const { data: me } = useMe();
  const [inviting, { open, close }] = useDisclosure(false);
  return (
    <>
      <PageHeader
        eyebrow={me?.tenantName ? `${me.tenantName} workspace` : 'Workspace'}
        title="Users"
        description="The people who work in this workspace, their roles, and the invitations to it."
        icon={IconUsers}
        actions={
          <Button variant="gradient" leftSection={<IconUserPlus size={18} />} onClick={open}>
            Invite people
          </Button>
        }
      />
      <Stack gap="xl">
        <UsersSection myId={me?.userId} />
        <InvitationsSection />
      </Stack>
      <Modal opened={inviting} onClose={close} title="Invite people" size="lg" centered>
        <InviteForm onDone={close} />
      </Modal>
    </>
  );
}

function UsersSection({ myId }: { myId?: number }) {
  const { data: users, isLoading, error } = useOrganizationUsers();
  if (isLoading) return <PageLoader />;
  if (error || !users) return <ErrorAlert error={error} title="Could not load the users" />;
  return (
    <Paper p={0}>
      <Table.ScrollContainer minWidth={560}>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Roles</Table.Th>
              <Table.Th>Last seen</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => {
              const name = user.displayName ?? user.email ?? `User ${user.id}`;
              return (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar size={32} radius="xl" color="needle" name={name} />
                      <div style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                          <Text size="sm" fw={600} truncate="end">
                            {name}
                          </Text>
                          {user.id === myId && (
                            <Badge size="xs" variant="outline" tt="none">
                              You
                            </Badge>
                          )}
                        </Group>
                        {user.email && user.email !== name && (
                          <Text size="xs" c="dimmed" truncate="end">
                            {user.email}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <RoleBadges roles={user.roles} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{user.lastSeenAt ? formatDateTime(user.lastSeenAt) : '—'}</Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

function InvitationsSection() {
  const { data: invitations, isLoading, error } = useOrganizationInvitations();
  const resend = useResendOrganizationInvitation();
  const revoke = useRevokeOrganizationInvitation();
  // Accepted invitations are the users above; only the open ones are listed here.
  const pending = invitations?.filter((i) => !i.acceptedAt);

  return (
    <Stack gap="sm">
      <Title order={2} fz="lg">
        Invitations
      </Title>
      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the invitations" />}
      {pending && pending.length === 0 && (
        <Paper p="md">
          <EmptyState title="No open invitations" icon={IconMailForward}>
            Invite people to work in this workspace as an admin, a user or a viewer.
          </EmptyState>
        </Paper>
      )}
      {pending && pending.length > 0 && (
        <Paper p={0}>
          <Table.ScrollContainer minWidth={620}>
            <Table verticalSpacing="xs" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Last sent</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pending.map((inv) => (
                  <Table.Tr key={inv.id}>
                    <Table.Td>
                      <Text size="sm">{inv.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <RoleBadges roles={inv.role ? [inv.role] : []} />
                    </Table.Td>
                    <Table.Td>
                      <InvitationStatus invitation={inv} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{inv.sentAt ? formatDateTime(inv.sentAt) : '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <CopyButton value={inv.link ?? ''}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied' : 'Copy the link'}>
                              <ActionIcon
                                variant="subtle"
                                color={copied ? 'teal' : undefined}
                                onClick={copy}
                                aria-label="Copy the link"
                              >
                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                        <Tooltip label="Send the link again">
                          <ActionIcon
                            variant="subtle"
                            aria-label={`Resend the invitation to ${inv.email}`}
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
                        <Tooltip label="Revoke: the link stops working">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={`Revoke the invitation to ${inv.email}`}
                            onClick={() =>
                              confirmDelete({
                                title: 'Revoke invitation',
                                message: `Revoke the invitation to ${inv.email}? Their link stops working.`,
                                confirmLabel: 'Revoke',
                                onConfirm: () => revoke.mutate(inv.id!),
                              })
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}
    </Stack>
  );
}

/** Addresses, one role for all of them, and an optional note for the email. */
function InviteForm({ onDone }: { onDone: () => void }) {
  const invite = useInviteToOrganization();
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<string>('TENANT_USER');
  const [message, setMessage] = useState('');
  const parsed = parseEmails(emails);
  const unique = countUnique(parsed);

  const send = () =>
    invite.mutate(
      { emails: parsed, role, message: message.trim() || undefined },
      {
        onSuccess: (result) => {
          const failed = result.filter((r) => r.sendError).length;
          const joined = result.filter((r) => r.acceptedAt).length;
          const sent = result.length - failed - joined;
          notifications.show({
            color: failed ? 'orange' : 'teal',
            title: failed ? 'Some invitations were not delivered' : 'Invitations sent',
            message: [
              `${sent} sent as ${roleLabel(role).toLowerCase()}`,
              failed ? `${failed} failed (resend them from the list)` : null,
              joined ? `${joined} already joined` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          });
          onDone();
        },
      },
    );

  return (
    <Stack gap="md">
      <Textarea
        label="Email addresses"
        description="Separate them with commas or new lines. People who were already invited get their link again, with this role."
        placeholder={'ana@example.com\nmarko@example.com'}
        autosize
        minRows={2}
        maxRows={6}
        value={emails}
        onChange={(e) => setEmails(e.currentTarget.value)}
        data-autofocus
      />
      <Stack gap={6}>
        <Text size="sm" fw={500}>
          Role
        </Text>
        <SegmentedControl
          value={role}
          onChange={setRole}
          data={INVITABLE_ROLES.map((r) => ({ value: r, label: ROLES[r].label }))}
        />
        <Text size="xs" c="dimmed">
          {ROLES[role]?.description}
        </Text>
      </Stack>
      <Textarea
        label="Message"
        description="Optional; added to the email."
        autosize
        minRows={2}
        maxRows={5}
        maxLength={2000}
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
      />
      <Text size="xs" c="dimmed">
        Someone who accepts leaves the workspace they work in now and joins this one.
      </Text>
      {invite.error && <ErrorAlert error={invite.error} title="Could not send the invitations" />}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {unique} address{unique === 1 ? '' : 'es'}
        </Text>
        <Group gap="sm">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            leftSection={<IconSend size={16} />}
            disabled={unique === 0}
            loading={invite.isPending}
            onClick={send}
          >
            Send {unique === 1 ? 'invitation' : 'invitations'}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
