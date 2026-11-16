import { Alert, Badge, Button, Group, List, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconPlayerPlay } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { usePublicInvitation, usePublicTest, useStartFromInvitation, useStartFromLink } from '@/api/public';
import type { PublicTestDto } from '@/api/types';
import { ErrorAlert, PageLoader } from '@/shared/components';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Shared link /t/:token: the participant enters name and email. Any number of attempts. */
export function SharedLinkPage() {
  const token = useParams().token!;
  const navigate = useNavigate();
  const { data: test, isLoading, error } = usePublicTest(token);
  const start = useStartFromLink(token);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  if (isLoading) return <PageLoader />;
  if (error || !test) return <LinkError error={error} />;

  const nameError = touched && !name.trim() ? 'Please enter your full name' : undefined;
  const emailError = touched && !EMAIL.test(email.trim()) ? 'Please enter a valid email address' : undefined;

  const submit = () => {
    setTouched(true);
    if (!name.trim() || !EMAIL.test(email.trim())) return;
    start.mutate(
      { participantName: name.trim(), participantEmail: email.trim() },
      { onSuccess: (attempt) => navigate(`/a/${attempt.attemptToken}`, { replace: true }) },
    );
  };

  return (
    <Intro test={test}>
      <Stack gap="sm" mt="lg">
        <TextInput
          label="Full name"
          placeholder="First and last name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={nameError}
          maxLength={200}
          required
          autoComplete="name"
        />
        <TextInput
          label="Email"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          error={emailError}
          maxLength={320}
          required
          autoComplete="email"
        />
      </Stack>
      <StartButton loading={start.isPending} error={start.error} onClick={submit} />
    </Intro>
  );
}

/** Personal invitation /i/:token: the email is the invited address and cannot be changed. One attempt. */
export function InvitationPage() {
  const token = useParams().token!;
  const navigate = useNavigate();
  const { data: invitation, isLoading, error } = usePublicInvitation(token);
  const start = useStartFromInvitation(token);
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  if (isLoading) return <PageLoader />;
  if (error || !invitation?.test) return <LinkError error={error} />;

  if (invitation.attemptStatus && invitation.attemptStatus !== 'STARTED') {
    return (
      <Paper p="xl" maw={760} mx="auto">
        <Group gap="sm" mb="xs">
          <IconCircleCheck size={24} color="var(--mantine-color-teal-6)" />
          <Title order={2} fz={22}>
            Already completed
          </Title>
        </Group>
        <Text c="dimmed">
          This invitation to “{invitation.test.name}” was already used. Each personal link can be used for one
          attempt.
        </Text>
      </Paper>
    );
  }

  const nameError = touched && !name.trim() ? 'Please enter your full name' : undefined;
  const submit = () => {
    setTouched(true);
    if (!name.trim()) return;
    start.mutate(name.trim(), {
      onSuccess: (attempt) => navigate(`/a/${attempt.attemptToken}`, { replace: true }),
    });
  };

  return (
    <Intro test={invitation.test} personal>
      {invitation.attemptToken ? (
        <Group justify="flex-end" mt="xl">
          <Button
            variant="gradient"
            size="md"
            leftSection={<IconPlayerPlay size={18} />}
            onClick={() => navigate(`/a/${invitation.attemptToken}`)}
          >
            Continue test
          </Button>
        </Group>
      ) : (
        <>
          <Stack gap="sm" mt="lg">
            <TextInput
              label="Full name"
              placeholder="First and last name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              error={nameError}
              maxLength={200}
              required
              autoComplete="name"
            />
            <TextInput
              label="Email"
              value={invitation.email}
              readOnly
              disabled
              description="This invitation was sent to this address."
            />
          </Stack>
          <StartButton loading={start.isPending} error={start.error} onClick={submit} />
        </>
      )}
    </Intro>
  );
}

function Intro({
  test,
  personal = false,
  children,
}: {
  test: PublicTestDto;
  personal?: boolean;
  children: React.ReactNode;
}) {
  const multiple = test.answerCardinality === 'MULTIPLE_CORRECT';
  return (
    <Paper
      p={{ base: 'lg', sm: 'xl' }}
      maw={760}
      mx="auto"
      className="kg-ai-edge"
      style={{ overflow: 'hidden' }}
    >
      <Text
        size="xs"
        fw={800}
        tt="uppercase"
        className="kg-gradient-text"
        style={{ letterSpacing: '0.12em' }}
      >
        {personal ? 'Your invitation' : 'Take test'}
      </Text>
      <Title order={1} fz={{ base: 24, sm: 28 }} mt={4}>
        {test.name}
      </Title>
      {test.description && (
        <Text c="dimmed" mt="xs" style={{ whiteSpace: 'pre-wrap' }}>
          {test.description}
        </Text>
      )}
      <Group gap={6} mt="md">
        {[
          `${test.questionCount} questions`,
          multiple ? 'Multiple correct answers' : 'One correct answer',
        ].map((label) => (
          <Badge key={label} variant="default" radius="sm" tt="none" fw={500}>
            {label}
          </Badge>
        ))}
      </Group>
      <List mt="lg" spacing={6} size="sm">
        <List.Item>
          {multiple
            ? 'Each question can have more than one correct answer. Select all that apply.'
            : 'Each question has exactly one correct answer.'}
        </List.Item>
        <List.Item>
          You can change your answers until you submit. Unanswered questions count as wrong.
        </List.Item>
        <List.Item>After submitting you see your score, and it is also emailed to you.</List.Item>
        {personal && <List.Item>This link is personal and can be used for one attempt.</List.Item>}
      </List>
      {children}
      <Text size="xs" c="dimmed" mt="md">
        Your name, email, answers and score are stored and visible to the organisers of this test.
      </Text>
    </Paper>
  );
}

function StartButton({ loading, error, onClick }: { loading: boolean; error: unknown; onClick: () => void }) {
  return (
    <>
      {error != null && (
        <Alert color="red" variant="light" mt="md" icon={<IconAlertCircle size={18} />}>
          {error instanceof Error ? error.message : String(error)}
        </Alert>
      )}
      <Group justify="flex-end" mt="xl">
        <Button
          variant="gradient"
          size="md"
          leftSection={<IconPlayerPlay size={18} />}
          loading={loading}
          onClick={onClick}
        >
          Start test
        </Button>
      </Group>
    </>
  );
}

function LinkError({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <Paper p="xl" maw={760} mx="auto">
        <Title order={2} fz={22} mb="xs">
          This link doesn't work
        </Title>
        <Text c="dimmed">{error.message} Please ask the person who sent it for a new one.</Text>
      </Paper>
    );
  }
  return <ErrorAlert error={error ?? 'Not found'} title="Could not open the test" />;
}
