import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Image,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconLogin2, IconSparkles, IconUserPlus } from '@tabler/icons-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/app/auth';
import { AboutContent } from '@/features/about/AboutPage';
import { Wordmark } from '@/shared/components';

/**
 * The public home page (`/`): what KnowGauge is (the About content), with Sign in and Create account. Both open the
 * KnowGauge-styled Keycloak pages and come back to the app. Signed-in users, and everyone when sign-in is off, go
 * straight to the Library.
 */
export function HomePage() {
  const session = useSession();
  const location = useLocation();
  // Set by RequireAuth when a signed-out user opened an app page: open it after signing in.
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  if (!session.enabled) return <Navigate to="/library" replace />;
  if (session.isLoading) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }
  if (session.isAuthenticated) return <Navigate to={returnTo ?? '/library'} replace />;

  const signIn = () => session.signIn(returnTo);
  const signUp = () => session.signUp(returnTo);

  return (
    <Box mih="100vh" pb={64}>
      <Container size={1200} py="lg">
        <Group justify="space-between" mb="xl" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Image src="/favicon.svg" alt="" w={40} h={40} />
            <div>
              <Text fz={24} lh={1.1}>
                <Wordmark />
              </Text>
              <Text size="xs" c="dimmed" fw={600} lh={1.2} tt="uppercase" style={{ letterSpacing: '0.12em' }}>
                Assessment studio
              </Text>
            </div>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Button variant="default" leftSection={<IconLogin2 size={18} />} onClick={signIn}>
              Sign in
            </Button>
            <Button
              variant="gradient"
              leftSection={<IconUserPlus size={18} />}
              onClick={signUp}
              visibleFrom="xs"
            >
              Create account
            </Button>
          </Group>
        </Group>

        <AboutContent
          heroAction={
            // Sign in is in the header and the closing card, so the hero only invites new users.
            <Button
              size="md"
              color="white"
              c="brand.7"
              leftSection={<IconSparkles size={18} />}
              onClick={signUp}
            >
              Create a free account
            </Button>
          }
        />

        <Paper p={{ base: 'lg', sm: 'xl' }} mt="xl" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
          <Group justify="space-between" align="center" gap="lg">
            <Stack gap={4} maw={720}>
              <Title order={2} fz={22}>
                Try it with your own documents
              </Title>
              <Text c="dimmed" size="sm">
                KnowGauge is in public beta. Create an account, upload a few PDFs and generate your first test
                in minutes. Please don’t upload confidential documents during the beta.
              </Text>
            </Stack>
            <Group gap="sm">
              <Button variant="default" onClick={signIn}>
                Sign in
              </Button>
              <Button variant="gradient" leftSection={<IconUserPlus size={18} />} onClick={signUp}>
                Create account
              </Button>
            </Group>
          </Group>
        </Paper>
      </Container>
    </Box>
  );
}
