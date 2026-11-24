import { Button, Group, Tabs, Text, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconBooks, IconChecklist, IconClipboardCheck, IconEye } from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/** The pages of another user's workspace (ADR013): the admin's own pages, read-only. */
const PAGES = [
  { path: '/library', label: 'Library', icon: IconBooks },
  { path: '/tests', label: 'Tests', icon: IconChecklist },
  { path: '/attempts', label: 'Attempts', icon: IconClipboardCheck },
];

/**
 * Above every page of another user's workspace (ADR013): whose it is, that it is read-only, its Library / Tests /
 * Attempts tabs, and the way back. The sidebar stays the admin's own.
 */
export function WorkspaceViewBar({ name, basePath }: { name: string; basePath: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = PAGES.find(({ path }) => pathname.startsWith(`${basePath}${path}`))?.path ?? null;

  return (
    <div className="kg-workspace-view-bar">
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon variant="light" color="violet" size={32} radius="md">
            <IconEye size={18} />
          </ThemeIcon>
          <Text size="sm" style={{ minWidth: 0 }}>
            Viewing <b>{name}</b>’s workspace as an admin.{' '}
            <Text span c="dimmed">
              Read-only.
            </Text>
          </Text>
        </Group>
        <Button
          component={Link}
          to="/admin/workspaces"
          size="xs"
          variant="default"
          leftSection={<IconArrowLeft size={14} />}
          style={{ flexShrink: 0 }}
        >
          All workspaces
        </Button>
      </Group>
      <Tabs
        value={current}
        onChange={(path) => path && navigate(`${basePath}${path}`)}
        variant="pills"
        radius="md"
        mt="sm"
        classNames={{ list: 'kg-workspace-view-tabs' }}
      >
        <Tabs.List>
          {PAGES.map(({ path, label, icon: Icon }) => (
            <Tabs.Tab key={path} value={path} leftSection={<Icon size={16} stroke={1.7} />}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </div>
  );
}
