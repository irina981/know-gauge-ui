import {
  ActionIcon,
  Anchor,
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  Image,
  NavLink,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconAdjustments,
  IconBooks,
  IconBuildingWarehouse,
  IconChecklist,
  IconClipboardCheck,
  IconInfoCircle,
  IconLogout,
  IconShieldCheck,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ColorSchemeToggle, Wordmark } from '@/shared/components';
import { useApplyStoredTheme } from '@/shared/themePreference';
import { FEEDBACK_MAILTO, PRIVACY_URL, TERMS_URL } from '@/shared/siteLinks';
import { isOrganizationAdmin, useMe } from '@/api/account';
import { BetaBanner } from './BetaBanner';
import { LimitBanner } from './LimitBanner';
import { useSession } from './auth';

/**
 * Left navigation. `isActive` decides which entry is highlighted for the current URL; `organizationAdminOnly`
 * entries are shown to tenant admins of an organization workspace only.
 */
const NAV: {
  to: string;
  label: string;
  icon: typeof IconBooks;
  isActive: (p: string) => boolean;
  organizationAdminOnly?: boolean;
}[] = [
  { to: '/library', label: 'Library', icon: IconBooks, isActive: (p: string) => p.startsWith('/library') },
  {
    to: '/tests',
    label: 'Tests',
    icon: IconChecklist,
    isActive: (p: string) => /^\/tests(\/\d+)?$/.test(p),
  },
  {
    to: '/attempts',
    label: 'Attempts',
    icon: IconClipboardCheck,
    isActive: (p: string) => p.startsWith('/attempts'),
  },
  {
    to: '/workspace/users',
    label: 'Users',
    icon: IconUsers,
    isActive: (p: string) => p.startsWith('/workspace/users'),
    organizationAdminOnly: true,
  },
  {
    to: '/workspace/settings',
    label: 'Workspace settings',
    icon: IconAdjustments,
    isActive: (p: string) => p.startsWith('/workspace/settings'),
    organizationAdminOnly: true,
  },
  { to: '/about', label: 'About', icon: IconInfoCircle, isActive: (p: string) => p === '/about' },
];

/**
 * Logo mark + wordmark, shown in the sidebar and the mobile top bar. `large` (sidebar) is a step
 * above the page headers (PageHeader): a 44 px mark and a 26 px wordmark, vs 40 px icons and 24 px titles.
 */
function Brand({ large = false }: { large?: boolean }) {
  return (
    <Link to="/library" style={{ textDecoration: 'none' }}>
      <Group gap="sm" wrap="nowrap">
        {/* Same mark as the favicon and the backend landing page. */}
        <Image src="/favicon.svg" alt="" w={large ? 44 : 36} h={large ? 44 : 36} />
        <div>
          {/* The sidebar is dark in both colour schemes, so the dark-logo colours are fixed here. */}
          <Text c="gray.2" fz={large ? 26 : 'lg'} lh={1.1}>
            <Wordmark accent="var(--mantine-color-brand-4)" />
          </Text>
          {/* Same size and spacing as the page eyebrows (PageHeader); lighter weight, as the colour is brighter. */}
          <Text size="xs" c="needle.3" fw={500} lh={1.2} tt="uppercase" style={{ letterSpacing: '0.12em' }}>
            Assessment studio
          </Text>
        </div>
      </Group>
    </Link>
  );
}

/**
 * The user and Sign out: the last block of the sidebar, framed so it stands apart from the content above it. The
 * name opens the account settings, the only way to them. With sign-in off the box shows the fixed user, without
 * Sign out.
 */
function UserBox({ onNavigate, active }: { onNavigate: () => void; active: boolean }) {
  const session = useSession();
  const { data: me } = useMe();
  const label = session.enabled
    ? (session.name ?? session.email ?? 'Signed in')
    : (me?.displayName ?? me?.email ?? 'Local user');
  const email = session.enabled ? session.email : me?.email;
  return (
    <Group gap="sm" wrap="nowrap" className="kg-sidebar-user" data-active={active || undefined}>
      {/* Name and avatar open the account settings; the tooltip says so on hover. */}
      <Tooltip label="Account settings" position="top" withArrow openDelay={300}>
        <UnstyledButton
          component={Link}
          to="/settings/profile"
          onClick={onNavigate}
          className="kg-sidebar-user-link"
          aria-label="Account settings"
        >
          <Avatar size={34} radius="xl" color="needle" variant="filled" name={label} />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={600} c="white" truncate="end">
              {label}
            </Text>
            {email && email !== label && (
              <Text size="xs" c="rgba(219,225,255,0.6)" truncate="end">
                {email}
              </Text>
            )}
          </Box>
        </UnstyledButton>
      </Tooltip>
      {session.enabled && (
        <Tooltip label="Sign out">
          <ActionIcon
            variant="subtle"
            color="gray.3"
            size="lg"
            onClick={session.signOut}
            aria-label="Sign out"
          >
            <IconLogout size={18} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}

/** Small uppercase heading of a group of sidebar links; a long one is cut off with "…" (full text on hover). */
function NavHeading({ children }: { children: string }) {
  return (
    <Text
      size="xs"
      fw={700}
      c="rgba(219,225,255,0.45)"
      tt="uppercase"
      px="xs"
      truncate
      title={children}
      style={{ letterSpacing: '0.1em' }}
    >
      {children}
    </Text>
  );
}

/**
 * The heading of the user's own section: "My workspace", or for a member of an organization (ADR015) the
 * organization's, e.g. "Acme Training workspace", so they always see which organization they work in.
 */
function WorkspaceHeading({ type, name }: { type?: string; name?: string }) {
  return <NavHeading>{type === 'ORGANIZATION' && name ? `${name} workspace` : 'My workspace'}</NavHeading>;
}

/** Small links at the bottom of the sidebar. */
const SIDEBAR_LINKS = [
  { label: 'Privacy', href: PRIVACY_URL },
  { label: 'Terms', href: TERMS_URL },
  { label: 'Feedback', href: FEEDBACK_MAILTO },
];

/** The frame around every page: branded sidebar and the page itself (<Outlet />). */
export function Layout() {
  // The theme saved on the account wins over this browser's, e.g. after signing in on a new device.
  useApplyStoredTheme();
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();
  // Below the "sm" breakpoint the sidebar is hidden behind a burger in a top bar.
  const isMobile = useMediaQuery('(max-width: 48em)');
  const { data: me } = useMe();
  const isAdmin = !!me?.roles?.includes('ADMIN');
  const nav = NAV.filter((item) => !item.organizationAdminOnly || isOrganizationAdmin(me));

  return (
    <AppShell
      header={{ height: 60, collapsed: !isMobile }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={{ base: 'md', sm: 'lg' }}
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
            <Brand large />
          </Box>

          {/* Admins first: they look into every workspace, read-only (ADR013). Set apart by a rule, so
              it reads as its own section and not as part of the user's workspace below. */}
          {isAdmin && (
            <Stack gap={4} className="kg-sidebar-admin">
              <NavHeading>Administration</NavHeading>
              <NavLink
                component={Link}
                to="/admin/workspaces"
                label="Workspaces"
                className="kg-nav-link"
                leftSection={<IconBuildingWarehouse size={20} stroke={1.6} />}
                // Also while one is open: its Library / Tests / Attempts tabs are in the page (WorkspaceViewBar).
                active={pathname.startsWith('/admin/workspaces')}
                onClick={close}
              />
              <NavLink
                component={Link}
                to="/admin/settings"
                label="System settings"
                className="kg-nav-link"
                leftSection={<IconAdjustments size={20} stroke={1.6} />}
                active={pathname.startsWith('/admin/settings')}
                onClick={close}
              />
            </Stack>
          )}

          {/* The user's own workspace; Generate test belongs to it, so it sits under the heading. */}
          <Stack gap={4}>
            <WorkspaceHeading type={me?.tenantType} name={me?.tenantName} />
            <Button
              component={Link}
              to="/tests/new"
              variant="gradient"
              gradient={{ from: 'brand.5', to: 'violet.5', deg: 135 }}
              leftSection={<IconSparkles size={18} />}
              size="md"
              fullWidth
              mt={4}
              mb={8}
              onClick={close}
              style={{ boxShadow: '0 8px 24px rgba(121, 80, 242, 0.35)' }}
            >
              Generate test
            </Button>
            {nav.map(({ to, label, icon: Icon, isActive }) => (
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
              Questions are written only from your ingested documents, and every wrong answer is independently
              verified.
            </Text>
            <Anchor
              component={Link}
              to="/about"
              size="xs"
              c="needle.3"
              fw={600}
              mt={6}
              display="block"
              onClick={close}
            >
              How KnowGauge works →
            </Anchor>
          </Box>

          <Stack gap={10}>
            <UserBox onNavigate={close} active={pathname.startsWith('/settings')} />
            {/* Legal pages (on knowgauge.com) and feedback, under the user. The theme is chosen in Settings →
                Appearance (and with the switch in the top bar on phones). */}
            <Group gap={6} wrap="nowrap" px={10}>
              {SIDEBAR_LINKS.map(({ label, href }, i) => (
                <Group key={label} gap={6} wrap="nowrap">
                  {i > 0 && (
                    <Text size="xs" c="rgba(219,225,255,0.35)" aria-hidden>
                      ·
                    </Text>
                  )}
                  <Anchor href={href} size="xs" c="rgba(219,225,255,0.6)" className="kg-sidebar-footer-link">
                    {label}
                  </Anchor>
                </Group>
              ))}
            </Group>
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {/* Wide cap so very large screens keep readable line lengths; below it the content uses the full width. */}
        <Box maw={1800} mx="auto" px={{ base: 0, sm: 'sm' }}>
          <LimitBanner />
          <BetaBanner />
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
