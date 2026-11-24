import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useMe } from '@/api/account';
import {
  useOrganizationSettings,
  useResetOrganizationSettings,
  useSaveOrganizationSettings,
} from '@/api/organization';
import type { TenantSettingDto } from '@/api/types';
import { SettingInput } from '@/features/settings/SettingInput';
import { groupSettings, settingHint } from '@/features/settings/settingValues';
import { ErrorAlert, PageHeader, PageLoader } from '@/shared/components';

/**
 * The configuration of an organization workspace, for its tenant admins (ADR016): the models and the defaults of
 * new tests, which win over the System settings for everyone in it. Its limits are not here: an application admin
 * sets them (later the billing plan will).
 */
export function WorkspaceSettingsPage() {
  const { data: me } = useMe();
  return (
    <>
      <PageHeader
        eyebrow={me?.tenantName ? `${me.tenantName} workspace` : 'Workspace'}
        title="Workspace settings"
        description="Used for new tests of everyone in this workspace when the request does not choose them."
        icon={IconAdjustments}
      />
      <ConfigurationForm />
    </>
  );
}

function ConfigurationForm() {
  const { data: settings, isLoading, error } = useOrganizationSettings();
  const save = useSaveOrganizationSettings();
  const reset = useResetOrganizationSettings();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Start from the workspace's own values (empty where it uses the system value).
  useEffect(() => {
    if (settings) setDrafts(Object.fromEntries(settings.map((s) => [s.key ?? '', s.ownValue ?? ''])));
  }, [settings]);

  if (isLoading) return <PageLoader />;
  if (error || !settings) return <ErrorAlert error={error} title="Could not load the settings" />;

  const draftOf = (s: TenantSettingDto) => (drafts[s.key ?? ''] ?? '').trim();
  const changed = settings.filter((s) => draftOf(s) !== (s.ownValue ?? ''));
  const hasOwnValues = settings.some((s) => s.ownValue != null);
  const groups = [...groupSettings(settings).entries()];

  const submit = () =>
    // Errors are shown as a notification by the global handler.
    save.mutate(Object.fromEntries(changed.map((s) => [s.key ?? '', draftOf(s)])), {
      onSuccess: () => notifications.show({ color: 'teal', message: 'Workspace settings saved' }),
    });

  return (
    <Paper p="lg" maw={760}>
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Leave a field empty to use the system value.
        </Text>
        {groups.map(([group, groupItems]) => (
          <Stack key={group} gap="md">
            {groups.length > 1 && (
              <Title order={3} fz="md">
                {group}
              </Title>
            )}
            {groupItems.map((setting) => {
              const key = setting.key ?? '';
              const draft = drafts[key] ?? '';
              return (
                <Stack key={key} gap={4}>
                  <SettingInput
                    setting={setting}
                    draft={draft}
                    onChange={(value) => setDrafts((d) => ({ ...d, [key]: value }))}
                  />
                  <Text size="xs" c="dimmed">
                    {settingHint(setting, draft.trim())} {setting.description}
                  </Text>
                </Stack>
              );
            })}
          </Stack>
        ))}
        <Group justify="space-between" mt="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={() => reset.mutate()}
            loading={reset.isPending}
            disabled={!hasOwnValues || save.isPending}
          >
            Use system values
          </Button>
          <Group gap="sm">
            <Button
              variant="default"
              disabled={changed.length === 0}
              onClick={() =>
                setDrafts(Object.fromEntries(settings.map((s) => [s.key ?? '', s.ownValue ?? ''])))
              }
            >
              Discard changes
            </Button>
            <Button onClick={submit} loading={save.isPending} disabled={changed.length === 0}>
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
