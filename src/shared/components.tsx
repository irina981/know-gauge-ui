import { Alert, Badge, Center, Group, Loader, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconInbox, IconShieldCheck, type Icon as TablerIcon } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { EnumInfo } from './enums';

/** Small reusable building blocks used across pages. */

type IconComponent = TablerIcon;

/**
 * "KnowGauge" written as in the logo (backend logo.svg / logo-dark.svg): Inter semibold, "Gauge" in the brand
 * blue. It takes its size from the surrounding text. `accent` overrides the blue, e.g. on the always-dark sidebar.
 */
export function Wordmark({ accent }: { accent?: string }) {
  return (
    <span className="kg-wordmark">
      Know
      <span className="kg-wordmark-accent" style={accent ? { color: accent } : undefined}>
        Gauge
      </span>
    </span>
  );
}

/** Coloured status label. `busy` adds a small spinner, e.g. for a test that is still generating. */
export function StatusBadge({ info, busy = false }: { info: EnumInfo; busy?: boolean }) {
  return (
    <Badge
      color={info.color}
      variant="light"
      radius="sm"
      tt="none"
      style={{ minWidth: 'max-content' }}
      leftSection={busy ? <Loader size={10} color={info.color} /> : undefined}
    >
      {info.label}
    </Badge>
  );
}

/** Small gradient marker for an answer option flagged by the automatic verification step. */
export function VerifierBadge({ label = 'Verifier' }: { label?: string }) {
  return (
    <Badge
      variant="gradient"
      size="sm"
      tt="none"
      leftSection={<IconShieldCheck size={11} />}
      style={{ minWidth: 'max-content' }}
    >
      {label}
    </Badge>
  );
}

/**
 * Title area at the top of every page: small gradient "eyebrow", title, optional description and
 * action buttons on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  media,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconComponent;
  /** Shown instead of the icon, e.g. the logo on the About page. */
  media?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" mb="xl" gap="md">
      <Group gap="md" align="center" wrap="nowrap">
        {media}
        {!media && Icon && (
          <ThemeIcon variant="gradient" size={48} radius="md" visibleFrom="xs">
            <Icon size={26} stroke={1.6} />
          </ThemeIcon>
        )}
        <div>
          {eyebrow && (
            <Text
              size="xs"
              fw={800}
              tt="uppercase"
              className="kg-gradient-text"
              style={{ letterSpacing: '0.12em' }}
            >
              {eyebrow}
            </Text>
          )}
          <Title order={1} fz={{ base: 26, sm: 30 }} lh={1.2}>
            {title}
          </Title>
          {description && (
            <Text c="dimmed" size="sm" mt={4} maw={640}>
              {description}
            </Text>
          )}
        </div>
      </Group>
      {actions && <Group gap="xs">{actions}</Group>}
    </Group>
  );
}

/** A number with a label, e.g. "12 · Tests". */
export function StatTile({
  label,
  value,
  icon: Icon,
  color = 'brand',
}: {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  color?: string;
}) {
  return (
    <Paper p="md" miw={0}>
      <Group gap="md" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size={42} radius="md" visibleFrom="sm">
          <Icon size={22} stroke={1.7} />
        </ThemeIcon>
        <div style={{ minWidth: 0 }}>
          <Text fz={24} fw={800} lh={1.1} ff="heading">
            {value}
          </Text>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            {label}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

export function ErrorAlert({ error, title = 'Something went wrong' }: { error: unknown; title?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Alert color="red" variant="light" title={title} icon={<IconAlertCircle size={18} />}>
      {message}
    </Alert>
  );
}

export function PageLoader() {
  return (
    <Center py="xl">
      <Loader />
    </Center>
  );
}

export function EmptyState({
  title,
  children,
  icon: Icon = IconInbox,
}: {
  title: string;
  children?: ReactNode;
  icon?: IconComponent;
}) {
  return (
    <Stack align="center" gap={6} py="xl">
      <ThemeIcon variant="light" size={52} radius="xl" mb={4}>
        <Icon size={26} stroke={1.5} />
      </ThemeIcon>
      <Text fw={600}>{title}</Text>
      {children && (
        <Text c="dimmed" size="sm" ta="center" maw={420}>
          {children}
        </Text>
      )}
    </Stack>
  );
}
