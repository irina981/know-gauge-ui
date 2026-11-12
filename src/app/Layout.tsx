import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Button,
  Group,
  Image,
  NavLink,
  Stack,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconBooks,
  IconChecklist,
  IconMoon,
  IconShieldCheck,
  IconSparkles,
  IconSun,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

/** Left navigation. `isActive` decides which entry is highlighted for the current URL. */
const NAV = [
  { to: '/library', label: 'Library', icon: IconBooks, isActive: (p: string) => p.startsWith('/library') },
  { to: '/tests', label: 'Tests', icon: IconChecklist, isActive: (p: string) => /^\/tests(\/\d+)?$/.test(p) },
];

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  const next = scheme === 'dark' ? 'light' : 'dark';
  return (
    <Tooltip label={`Switch to ${next} mode`}>
      <ActionIcon
        variant="subtle"
        color="gray.3"
        size="lg"
        onClick={() => setColorScheme(next)}
        aria-label="Toggle color scheme"
      >
        {scheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

/** Logo mark + wordmark, shown in the sidebar and the mobile top bar. */
function Brand() {
  return (
    <Link to="/library" style={{ textDecoration: 'none' }}>
      <Group gap="sm" wrap="nowrap">
        {/* Same mark as the favicon and the backend landing page. */}
        <Image src="/favicon.svg" alt="" w={36} h={36} />
        <div>
          <Text c="white" fw={800} size="lg" lh={1.1} ff="heading">
            KnowGauge
          </Text>
          <Text size="xs" c="needle.3" fw={600} lh={1.2} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            AI test studio
          </Text>
        </div>
      </Group>
    </Link>
  );
}

/** The frame around every page: branded sidebar and the page itself (<Outlet />). */
export function Layout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();
  // Below the "sm" breakpoint the sidebar is hidden behind a burger in a top bar.
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <AppShell
      header={{ height: 60, collapsed: !isMobile }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={{ base: 'md', sm: 'xl' }}
    >
      <AppShell.Header className="kg-topbar" withBorder={false}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} size="sm" color="white" aria-label="Toggle navigation" />
            <Brand />
          </Group>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="kg-sidebar" p="md" withBorder={false}>
        <Stack h="100%" gap="lg">
          <Box visibleFrom="sm" pt={4}>
            <Brand />
          </Box>

          <Button
            component={Link}
            to="/tests/new"
            variant="gradient"
            gradient={{ from: 'brand.5', to: 'violet.5', deg: 135 }}
            leftSection={<IconSparkles size={18} />}
            size="md"
            fullWidth
            onClick={close}
            style={{ boxShadow: '0 8px 24px rgba(121, 80, 242, 0.35)' }}
          >
            Generate test
          </Button>

          <Stack gap={4}>
            <Text
              size="xs"
              fw={700}
              c="rgba(219,225,255,0.45)"
              tt="uppercase"
              px="xs"
              style={{ letterSpacing: '0.1em' }}
            >
              Workspace
            </Text>
            {NAV.map(({ to, label, icon: Icon, isActive }) => (
              <NavLink
                key={to}
                component={Link}
                to={to}
                label={label}
                className="kg-nav-link"
                leftSection={<Icon size={20} stroke={1.6} />}
                active={isActive(pathname)}
                onClick={close}
              />
            ))}
          </Stack>

          <Box mt="auto" className="kg-sidebar-card">
            <Group gap="xs" mb={6} wrap="nowrap">
              <IconShieldCheck size={18} color="var(--mantine-color-needle-4)" />
              <Text size="sm" fw={600} c="white">
                Grounded in your documents
              </Text>
            </Group>
            <Text size="xs" c="rgba(219,225,255,0.7)" lh={1.5}>
              Questions are generated from your ingested PDFs, and a second AI pass checks every wrong answer.
            </Text>
          </Box>

          <Group justify="space-between" visibleFrom="sm">
            <Text size="xs" c="rgba(219,225,255,0.45)">
              RAG-powered assessments
            </Text>
            <ColorSchemeToggle />
          </Group>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1280} mx="auto">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
