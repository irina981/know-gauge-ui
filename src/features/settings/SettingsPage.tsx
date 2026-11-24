import {
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconChartBar,
  IconClipboardCheck,
  IconDeviceDesktop,
  IconDevices,
  IconExternalLink,
  IconFileText,
  IconFolders,
  IconKey,
  IconLogout,
  IconMoon,
  IconPalette,
  IconSettings,
  IconShieldLock,
  IconSparkles,
  IconSun,
  IconTrash,
  IconUser,
  IconUserCircle,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMe, useUsage } from '@/api/account';
import type { ThemePreference } from '@/api/types';
import { useSession } from '@/app/auth';
import { config } from '@/app/config';
import { ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatBytes } from '@/shared/format';
import { SUPPORT_EMAIL } from '@/shared/siteLinks';
import { useThemePreference } from '@/shared/themePreference';

type SettingsTab = 'profile' | 'appearance' | 'usage' | 'security';

/** Keycloak's own account pages (account console v3), for what the identity provider owns. */
function keycloakAccountUrl(page = '') {
  return `${config.oidcAuthority}/account/${page}`;
}

/** Settings of the signed-in user, one side tab per category (`/settings/:tab`). */
export function SettingsPage() {
  const session = useSession();
  const navigate = useNavigate();
  const { tab } = useParams();
  // Side tabs from the "sm" breakpoint; a row of tabs above the content on phones.
  const wide = useMediaQuery('(min-width: 48em)', true);

  // Security is Keycloak's: without sign-in there is nothing to manage.
  const tabs: { value: SettingsTab; label: string; icon: TablerIcon }[] = [
    { value: 'profile', label: 'Profile', icon: IconUserCircle },
    { value: 'appearance', label: 'Appearance', icon: IconPalette },
    { value: 'usage', label: 'Usage', icon: IconChartBar },
    ...(session.enabled ? [{ value: 'security' as const, label: 'Security', icon: IconShieldLock }] : []),
  ];
  const active = tabs.find((t) => t.value === tab)?.value;
  if (!active) return <Navigate to="/settings/profile" replace />;

  return (
    <Box maw={1100}>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, how the app looks, and what your workspace uses."
        icon={IconSettings}
      />
      <Tabs
        value={active}
        onChange={(value) => value && navigate(`/settings/${value}`)}
        orientation={wide ? 'vertical' : 'horizontal'}
        variant="pills"
        radius="md"
        keepMounted={false}
        className="kg-settings-tabs"
      >
        <Tabs.List>
          {tabs.map(({ value, label, icon: Icon }) => (
            <Tabs.Tab key={value} value={value} leftSection={<Icon size={18} stroke={1.7} />}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="profile">
          <ProfileTab />
        </Tabs.Panel>
        <Tabs.Panel value="appearance">
          <AppearanceTab />
        </Tabs.Panel>
        <Tabs.Panel value="usage">
          <UsageTab />
        </Tabs.Panel>
        {session.enabled && (
          <Tabs.Panel value="security">
            <SecurityTab />
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}

/** A titled block of one settings tab. */
function Section({
  title,
  description,
  children,
  danger,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Paper p="lg" className={danger ? 'kg-settings-danger' : undefined}>
      <Title order={3} fz="lg" mb={description ? 4 : 'md'}>
        {title}
      </Title>
      {description && (
        <Text size="sm" c="dimmed" mb="md">
          {description}
        </Text>
      )}
      {children}
    </Paper>
  );
}

/** One label/value line of a definition list. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group gap="md" wrap="nowrap" align="baseline">
      <Text size="sm" c="dimmed" w={130} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm" fw={500} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Text>
    </Group>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—';
}

function ProfileTab() {
  const session = useSession();
  const { data: me, isLoading, error } = useMe();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert error={error} title="Could not load your profile" />;

  const name = me?.displayName ?? session.name;
  const email = me?.email ?? session.email;
  const admin = me?.roles?.includes('ADMIN');

  return (
    <Stack gap="lg">
      <Section title="Profile">
        <Group gap="lg" align="center" mb="lg" wrap="nowrap">
          <Avatar size={64} radius="xl" color="needle" variant="filled" name={name ?? email ?? 'You'} />
          <Box style={{ minWidth: 0 }}>
            <Group gap="xs">
              <Text fw={700} fz="xl" truncate="end">
                {name ?? (session.enabled ? email : 'Local user')}
              </Text>
              {admin && (
                <Badge variant="light" color="violet">
                  Application admin
                </Badge>
              )}
            </Group>
            {email && name && (
              <Text c="dimmed" size="sm" truncate="end">
                {email}
              </Text>
            )}
          </Box>
        </Group>
        <Stack gap="xs">
          <Field label="Library">{me?.tenantName ?? '—'}</Field>
          {session.enabled && <Field label="Member since">{formatDate(me?.createdAt)}</Field>}
          <Field label="Plan">Free beta</Field>
        </Stack>
        {session.enabled ? (
          <Group mt="lg">
            <Button
              variant="default"
              component="a"
              href={keycloakAccountUrl('personal-info')}
              target="_blank"
              rel="noreferrer"
              leftSection={<IconUser size={16} />}
              rightSection={<IconExternalLink size={14} />}
            >
              Edit name and email
            </Button>
          </Group>
        ) : (
          <Text size="sm" c="dimmed" mt="lg">
            Sign-in is off on this server: everyone works as the same local user.
          </Text>
        )}
      </Section>

      {session.enabled && (
        <Section
          title="Delete account"
          description="Deletes your workspace for good: topics, documents, tests, attempts and the sign-in itself."
          danger
        >
          <Group justify="space-between" gap="md">
            <Text size="sm" style={{ flex: '1 1 320px' }}>
              Deleting from here is coming soon. Until then, write to{' '}
              <Anchor href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my account')}`}>
                {SUPPORT_EMAIL}
              </Anchor>{' '}
              from your account’s email address and we delete everything.
            </Text>
            <Button color="red" variant="light" leftSection={<IconTrash size={16} />} disabled>
              Delete account
            </Button>
          </Group>
        </Section>
      )}
    </Stack>
  );
}

const THEMES: { value: ThemePreference; label: string; hint: string; icon: TablerIcon }[] = [
  { value: 'LIGHT', label: 'Light', hint: 'Always light', icon: IconSun },
  { value: 'DARK', label: 'Dark', hint: 'Always dark', icon: IconMoon },
  { value: 'SYSTEM', label: 'System', hint: 'Follows your device', icon: IconDeviceDesktop },
];

/** A small sketch of the app (sidebar and two cards) in one colour scheme. */
function ThemeSketch({ scheme }: { scheme: 'light' | 'dark' }) {
  return (
    <Box className={`kg-theme-preview kg-theme-preview-${scheme}`} aria-hidden>
      <span />
      <span />
      <span />
    </Box>
  );
}

function AppearanceTab() {
  const session = useSession();
  const { theme, setTheme } = useThemePreference();
  return (
    <Section
      title="Theme"
      description={
        session.enabled
          ? 'Saved to your account, so it follows you to every device.'
          : 'Remembered in this browser.'
      }
    >
      <SimpleGrid cols={3} spacing={{ base: 'xs', sm: 'md' }}>
        {THEMES.map(({ value, label, hint, icon: Icon }) => (
          <UnstyledButton
            key={value}
            className="kg-theme-choice"
            data-checked={theme === value || undefined}
            onClick={() => setTheme(value)}
            aria-pressed={theme === value}
          >
            {value === 'SYSTEM' ? (
              // Light and dark sketches on top of each other, the dark one cut diagonally.
              <Box className="kg-theme-preview-system" aria-hidden>
                <ThemeSketch scheme="light" />
                <ThemeSketch scheme="dark" />
              </Box>
            ) : (
              <ThemeSketch scheme={value === 'DARK' ? 'dark' : 'light'} />
            )}
            <Group gap="xs" mt="sm" wrap="nowrap">
              <Icon size={18} stroke={1.7} />
              <div>
                <Text size="sm" fw={600}>
                  {label}
                </Text>
                <Text size="xs" c="dimmed">
                  {hint}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  extra,
  tone,
}: {
  icon: TablerIcon;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  /** Shown under the detail, e.g. a progress bar. */
  extra?: ReactNode;
  tone: 'doc' | 'ai' | 'check' | 'people';
}) {
  return (
    <Paper p="md" withBorder className="kg-stat">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon size={36} radius="md" className={`kg-tone kg-tone-${tone}`}>
          <Icon size={20} stroke={1.7} />
        </ThemeIcon>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            {label}
          </Text>
          <Text fz={24} fw={700} lh={1.2}>
            {value}
          </Text>
          {detail && (
            <Text size="xs" c="dimmed">
              {detail}
            </Text>
          )}
          {extra}
        </div>
      </Group>
    </Paper>
  );
}

const numberFormat = new Intl.NumberFormat();
const count = (value?: number) => numberFormat.format(value ?? 0);
const usdFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
/** Dollars with cents; amounts below a cent are shown as "< $0.01" rather than $0.00. */
const usd = (value: number) =>
  value > 0 && value < 0.01 ? '< ' + usdFormat.format(0.01) : usdFormat.format(value);

function UsageTab() {
  const { data: usage, isLoading, error } = useUsage();
  if (isLoading) return <PageLoader />;
  if (error || !usage) return <ErrorAlert error={error} title="Could not load your usage" />;

  const month = new Date(usage.periodStart!).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const tokens = (usage.llmInputTokens ?? 0) + (usage.llmOutputTokens ?? 0);
  const limit = usage.llmTokenLimit ?? null;
  const usedShare = limit ? Math.min(100, (tokens / limit) * 100) : 0;
  const unpriced = usage.unpricedModels ?? [];

  return (
    <Stack gap="lg">
      <Section
        title="Your library"
        description="What you keep in My library. The shared library is not counted."
      >
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
          <Stat icon={IconFolders} tone="doc" label="Topics" value={count(usage.topics)} />
          <Stat
            icon={IconFileText}
            tone="doc"
            label="Documents"
            value={count(usage.documents)}
            detail={`${count(usage.ingestedDocuments)} ready for tests`}
          />
          <Stat icon={IconFileText} tone="doc" label="Storage" value={formatBytes(usage.storageBytes)} />
        </SimpleGrid>
      </Section>

      <Section
        title={`This month · ${month}`}
        description="Counts reset on the first day of each month (UTC)."
      >
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
          <Stat icon={IconSparkles} tone="ai" label="Tests" value={count(usage.tests)} />
          <Stat
            icon={IconSparkles}
            tone="ai"
            label="Questions"
            value={count(usage.questions)}
            detail="written by the AI, regenerations included"
          />
          <Stat
            icon={IconClipboardCheck}
            tone="people"
            label="Attempts"
            value={count(usage.submittedAttempts)}
            detail="submitted by participants"
          />
          <Stat
            icon={IconChartBar}
            tone="check"
            label="AI tokens"
            value={count(tokens)}
            detail={
              <>
                {limit ? `of ${count(limit)} this month` : 'writing and checking questions'}
                {/* What the tokens cost, with the token prices an admin set (System settings). */}
                <Text span display="block" size="sm" fw={600} c="var(--mantine-color-text)" mt={4}>
                  {usd(usage.llmCostUsd ?? 0)} spent
                </Text>
                {unpriced.length > 0 && (
                  <Text span display="block" size="xs" c="dimmed">
                    Not included: {unpriced.join(', ')} (no price set)
                  </Text>
                )}
              </>
            }
            extra={
              limit ? (
                <Progress
                  value={usedShare}
                  color={usedShare >= 100 ? 'red' : usedShare >= 80 ? 'yellow' : 'teal'}
                  size="sm"
                  mt={8}
                  aria-label={`${Math.round(usedShare)}% of the monthly AI tokens used`}
                />
              ) : undefined
            }
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed" mt="md">
          {limit
            ? `Each workspace may use ${count(limit)} AI tokens per month.`
            : 'The free beta has no limits yet. Monthly allowances will show here once they apply.'}
        </Text>
      </Section>
    </Stack>
  );
}

/** A row that opens one of Keycloak's account pages. */
function KeycloakLink({
  icon: Icon,
  title,
  description,
  page,
}: {
  icon: TablerIcon;
  title: string;
  description: string;
  page: string;
}) {
  return (
    <Group justify="space-between" gap="md" wrap="nowrap" className="kg-settings-row">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ThemeIcon variant="light" size={36} radius="md">
          <Icon size={20} stroke={1.7} />
        </ThemeIcon>
        <div style={{ minWidth: 0 }}>
          <Text size="sm" fw={600}>
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </div>
      </Group>
      <Button
        variant="default"
        size="xs"
        component="a"
        href={keycloakAccountUrl(page)}
        target="_blank"
        rel="noreferrer"
        rightSection={<IconExternalLink size={14} />}
        style={{ flexShrink: 0 }}
      >
        Open
      </Button>
    </Group>
  );
}

function SecurityTab() {
  const session = useSession();
  return (
    <Stack gap="lg">
      <Section
        title="Sign-in and security"
        description="Your password and sessions are kept by the KnowGauge sign-in service. These open its pages in a new tab."
      >
        <Stack gap={0}>
          <KeycloakLink
            icon={IconKey}
            title="Password"
            description="Change your password."
            page="account-security/signing-in"
          />
          <KeycloakLink
            icon={IconDevices}
            title="Devices and sessions"
            description="See where you are signed in, and sign out other devices."
            page="account-security/device-activity"
          />
        </Stack>
      </Section>
      <Section title="Sign out" description="Ends your session on this device.">
        <Button variant="default" leftSection={<IconLogout size={16} />} onClick={session.signOut}>
          Sign out
        </Button>
      </Section>
    </Stack>
  );
}
