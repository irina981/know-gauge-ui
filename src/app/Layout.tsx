import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  NavLink,
  Image,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBooks, IconChecklist, IconMoon, IconSparkles, IconSun } from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

/** Left navigation. `isActive` decides which entry is highlighted for the current URL. */
const NAV = [
  { to: '/library', label: 'Library', icon: IconBooks, isActive: (p: string) => p.startsWith('/library') },
  { to: '/tests', label: 'Tests', icon: IconChecklist, isActive: (p: string) => /^\/tests(\/\d+)?$/.test(p) },
  {
    to: '/tests/new',
    label: 'Generate test',
    icon: IconSparkles,
    isActive: (p: string) => p === '/tests/new',
  },
];

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  const next = scheme === 'dark' ? 'light' : 'dark';
  return (
    <Tooltip label={`Switch to ${next} mode`}>
      <ActionIcon
        variant="default"
        size="lg"
        onClick={() => setColorScheme(next)}
        aria-label="Toggle color scheme"
      >
        {scheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

/** The frame around every page: header, left navigation, and the page itself (<Outlet />). */
export function Layout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            {/* Same mark as the favicon and the backend landing page. */}
            <Image src="/favicon.svg" alt="" w={28} h={28} />
            <Text fw={600} size="lg">
              KnowGauge
            </Text>
          </Group>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {NAV.map(({ to, label, icon: Icon, isActive }) => (
          <NavLink
            key={to}
            component={Link}
            to={to}
            label={label}
            leftSection={<Icon size={18} stroke={1.6} />}
            active={isActive(pathname)}
            onClick={close}
            style={{ borderRadius: 'var(--mantine-radius-md)' }}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
