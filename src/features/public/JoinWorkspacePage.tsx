import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconBuildingCommunity, IconCircleCheck } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMe } from '@/api/account';
import { ApiError } from '@/api/client';
import { useAcceptWorkspaceInvitation, useWorkspaceInvitationPreview } from '@/api/workspaces';
import { useSession } from '@/app/auth';
import { ErrorAlert, PageLoader } from '@/shared/components';

const KIND: Record<string, string> = { PERSONAL: 'personal workspace', ORGANIZATION: 'organization' };

function Card({ children }: { children: ReactNode }) {
  return (
    <Paper p="xl" maw={640} mx="auto">
      {children}
    </Paper>
  );
}

/**
 * The link in a workspace invitation (ADR015), /join/{token}: shows the workspace before signing in, then lets the
 * invited person accept. Someone who signs in for the first time with the invited, verified address has already
 * joined by then; accepting moves anyone else who already has an account.
 */
export function JoinWorkspacePage() {
  const token = useParams().token!;
  const navigate = useNavigate();
  const session = useSession();
  const signedIn = !session.isLoading && (session.enabled ? session.isAuthenticated : true);
  const { data: me, error: meError } = useMe(signedIn);
  // A first sign-in joins the invited workspace while loading /api/me, so read the invitation only after it.
  const ready = !session.isLoading && (!signedIn || me != null || meError != null);
  const { data: invitation, isLoading, error } = useWorkspaceInvitationPreview(token, ready);
  const accept = useAcceptWorkspaceInvitation(token);

  if (!ready || isLoading) return <PageLoader />;
  if (error || !invitation) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Card>
          <Title order={2} fz={22} mb="xs">
            This link doesn't work
          </Title>
          <Text c="dimmed">{error.message} Please ask the person who sent it for a new one.</Text>
        </Card>
      );
    }
    return <ErrorAlert error={error ?? 'Not found'} title="Could not open the invitation" />;
  }

  const kind = KIND[invitation.workspaceType ?? ''] ?? 'workspace';
  const returnTo = `/join/${token}`;

  if (!signedIn) {
    return (
      <Card>
        <Group gap="sm" mb="xs" wrap="nowrap">
          <IconBuildingCommunity size={26} color="var(--mantine-primary-color-filled)" />
          <Title order={2} fz={22}>
            Join “{invitation.workspaceName}”
          </Title>
        </Group>
        <Text c="dimmed" mb="lg">
          You are invited to the {kind} “{invitation.workspaceName}” on KnowGauge. Sign in, or create an
          account, with <b>{invitation.email}</b> to accept.
        </Text>
        <Group>
          <Button variant="gradient" onClick={() => session.signUp(returnTo)}>
            Create account
          </Button>
          <Button variant="default" onClick={() => session.signIn(returnTo)}>
            Sign in
          </Button>
        </Group>
      </Card>
    );
  }

  if (!me)
    return (
      <ErrorAlert error={meError ?? 'Could not load your account'} title="Could not load your account" />
    );
  const myEmail = me.email?.toLowerCase();
  const isMine = myEmail != null && myEmail === invitation.email;

  if (invitation.accepted) {
    return (
      <Card>
        {isMine ? (
          <>
            <Group gap="sm" mb="xs">
              <IconCircleCheck size={24} color="var(--mantine-color-teal-6)" />
              <Title order={2} fz={22}>
                You're a member of “{invitation.workspaceName}”
              </Title>
            </Group>
            <Text c="dimmed" mb="lg">
              Everything you do in KnowGauge now happens in this {kind}.
            </Text>
            <Button variant="gradient" onClick={() => navigate('/library')}>
              Open the library
            </Button>
          </>
        ) : (
          <>
            <Title order={2} fz={22} mb="xs">
              Already accepted
            </Title>
            <Text c="dimmed">This invitation has already been accepted.</Text>
          </>
        )}
      </Card>
    );
  }

  if (!isMine) {
    return (
      <Card>
        <Title order={2} fz={22} mb="xs">
          This invitation is for another address
        </Title>
        <Text c="dimmed" mb="lg">
          It was sent to <b>{invitation.email}</b>, but you are signed in as{' '}
          <b>{me.email ?? 'a user without an email address'}</b>. Sign out, then sign in or create an account
          with the invited address.
        </Text>
        {session.enabled && (
          <Button variant="default" onClick={session.signOut}>
            Sign out
          </Button>
        )}
      </Card>
    );
  }

  const leaving = me.tenantName && me.tenantType !== 'LIBRARY' ? me.tenantName : null;
  return (
    <Card>
      <Group gap="sm" mb="xs" wrap="nowrap">
        <IconBuildingCommunity size={26} color="var(--mantine-primary-color-filled)" />
        <Title order={2} fz={22}>
          Join “{invitation.workspaceName}”
        </Title>
      </Group>
      <Stack>
        <Text c="dimmed">
          You are invited to the {kind} “{invitation.workspaceName}”
          {invitation.workspaceType === 'ORGANIZATION' ? ' as one of its administrators' : ', as its owner'}.
        </Text>
        {leaving && (
          <Alert
            color="orange"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title="You leave your workspace"
          >
            You now work in “{leaving}”. Its library, tests and attempts stay there, but you won't see them
            any more after joining.
          </Alert>
        )}
        {accept.error && <ErrorAlert error={accept.error} title="Could not accept the invitation" />}
        <Group>
          <Button
            variant="gradient"
            loading={accept.isPending}
            onClick={() =>
              accept.mutate(undefined, {
                onSuccess: (joined) => {
                  notifications.show({ color: 'teal', message: `You joined ${joined.workspaceName}` });
                  navigate('/library', { replace: true });
                },
              })
            }
          >
            Accept and join
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
