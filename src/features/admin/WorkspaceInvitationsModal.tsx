import {
  ActionIcon,
  Badge,
  Button,
  CopyButton,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconMailForward, IconSend, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { TenantSummaryDto, WorkspaceInvitationDto } from '@/api/types';
import {
  useInviteToWorkspace,
  useResendWorkspaceInvitation,
  useRevokeWorkspaceInvitation,
  useWorkspaceInvitations,
} from '@/api/workspaces';
import { EmptyState, ErrorAlert, PageLoader } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';
import { countUnique, parseEmails } from '@/shared/emails';
import { formatDateTime } from '@/shared/format';

function InvitationStatus({ invitation: inv }: { invitation: WorkspaceInvitationDto }) {
  if (inv.acceptedAt)
    return (
      <Tooltip label={`Joined ${formatDateTime(inv.acceptedAt)}`}>
        <Badge color="teal" variant="light" tt="none">
          Joined
        </Badge>
      </Tooltip>
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

/**
 * The invitations of a personal or organization workspace (ADR015): who joined, resend or revoke the others, and
 * invite more where the type allows it (any number to an organization, one to a personal workspace without an owner).
 */
export function WorkspaceInvitationsModal({
  tenant,
  onClose,
}: {
  tenant: TenantSummaryDto | null;
  onClose: () => void;
}) {
  return (
    <Modal
      opened={tenant != null}
      onClose={onClose}
      title={tenant ? `Invitations to ${tenant.name}` : 'Invitations'}
      size="xl"
      centered
    >
      {tenant && <InvitationsContent key={tenant.tenantId} tenant={tenant} />}
    </Modal>
  );
}

function InvitationsContent({ tenant }: { tenant: TenantSummaryDto }) {
  const tenantId = tenant.tenantId!;
  const { data: invitations, isLoading, error } = useWorkspaceInvitations(tenantId);
  const invite = useInviteToWorkspace(tenantId);
  const resend = useResendWorkspaceInvitation(tenantId);
  const revoke = useRevokeWorkspaceInvitation(tenantId);
  const [emails, setEmails] = useState('');
  const parsed = parseEmails(emails);
  const unique = countUnique(parsed);

  const personal = tenant.type === 'PERSONAL';
  const pendingPersonal = personal && invitations?.some((i) => !i.acceptedAt);
  // A personal workspace takes one invitee while it has no owner and no invitation to someone else.
  const canInvite = !personal || (tenant.ownerUserId == null && !pendingPersonal);

  const send = () =>
    invite.mutate(
      { emails: parsed },
      {
        onSuccess: (result) => {
          const failed = result.filter((r) => r.sendError).length;
          const joined = result.filter((r) => r.acceptedAt).length;
          const sent = result.length - failed - joined;
          notifications.show({
            color: failed ? 'orange' : 'teal',
            title: failed ? 'Some invitations were not delivered' : 'Invitations sent',
            message: [
              `${sent} sent`,
              failed ? `${failed} failed (resend them from the list)` : null,
              joined ? `${joined} already joined` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          });
          setEmails('');
        },
      },
    );

  return (
    <Stack>
      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the invitations" />}
      {invitations && invitations.length === 0 && (
        <EmptyState title="No invitations">
          {personal ? 'Invite the person this workspace is for.' : 'Invite the people who administer it.'}
        </EmptyState>
      )}
      {invitations && invitations.length > 0 && (
        <Table.ScrollContainer minWidth={560}>
          <Table verticalSpacing="xs">
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
                  </Table.Td>
                  <Table.Td>
                    <InvitationStatus invitation={inv} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{inv.sentAt ? formatDateTime(inv.sentAt) : '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {!inv.acceptedAt && (
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
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {canInvite && invitations && (
        <Stack gap="xs">
          <Textarea
            label={personal ? 'Invite the owner' : 'Invite more administrators'}
            description={
              personal
                ? 'One address. They become the owner when they accept.'
                : 'Separate the addresses with commas or new lines. People who were already invited get their link again.'
            }
            placeholder={personal ? 'ana@example.com' : 'ana@example.com\nmarko@example.com'}
            autosize
            minRows={personal ? 1 : 2}
            maxRows={6}
            value={emails}
            onChange={(e) => setEmails(e.currentTarget.value)}
          />
          {invite.error && <ErrorAlert error={invite.error} title="Could not send the invitations" />}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {unique} address{unique === 1 ? '' : 'es'}
            </Text>
            <Button
              variant="gradient"
              leftSection={<IconSend size={16} />}
              disabled={unique === 0 || (personal && unique !== 1)}
              loading={invite.isPending}
              onClick={send}
            >
              Send {unique === 1 ? 'invitation' : 'invitations'}
            </Button>
          </Group>
        </Stack>
      )}
      {personal && !canInvite && (
        <Text size="sm" c="dimmed">
          {tenant.ownerUserId != null
            ? 'This personal workspace has its owner.'
            : 'Revoke the pending invitation to invite someone else.'}
        </Text>
      )}
    </Stack>
  );
}
