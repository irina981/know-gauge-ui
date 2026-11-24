import {
  Autocomplete,
  Badge,
  Button,
  defaultOptionsFilter,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconGauge, IconSettings, type Icon } from '@tabler/icons-react';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useResetWorkspaceSettings, useSaveWorkspaceSettings, useWorkspaceSettings } from '@/api/admin';
import type { TenantSummaryDto, TenantSettingDto } from '@/api/types';
import { ErrorAlert, PageLoader } from '@/shared/components';

const integerFormat = new Intl.NumberFormat();

/** The setting types, one vertical tab each, as on the System settings page. */
const SETTING_TYPES: { type: string; tab: string; label: string; icon: Icon; intro: string }[] = [
  {
    type: 'CONFIG',
    tab: 'configuration',
    label: 'Configuration',
    icon: IconSettings,
    intro: 'Used for new tests of this workspace when the request does not choose them.',
  },
  {
    type: 'LIMIT',
    tab: 'limits',
    label: 'Limits',
    icon: IconGauge,
    intro: 'Enter 0 for no limit.',
  },
];

const typeOf = (setting: TenantSettingDto) => setting.settingType ?? 'LIMIT';

/** A value as text: "no limit" for a limit of 0, thousands separators for numbers, "—" when empty. */
function valueText(setting: TenantSettingDto, value?: string | null): string {
  if (value == null || value === '') return typeOf(setting) === 'LIMIT' ? 'no limit' : '—';
  if (setting.type !== 'INTEGER') return value;
  if (typeOf(setting) === 'LIMIT' && Number(value) === 0) return 'no limit';
  return integerFormat.format(Number(value));
}

/** What a field means: the workspace's own value, or the system value it falls back to. */
function hint(setting: TenantSettingDto, draft: string): string {
  const system = valueText(setting, setting.systemValue);
  if (draft === '') return `Uses the system value: ${system}.`;
  if (typeOf(setting) === 'LIMIT' && setting.type === 'INTEGER' && Number(draft) === 0) {
    return `Own value: no limit (system: ${system}).`;
  }
  return `Own value (system: ${system}).`;
}

/**
 * A workspace's own settings (ADR014), which win over the System settings: configuration (models, defaults of new
 * tests) and limits, on vertical tabs like the System settings page. Which settings a workspace may have is decided
 * by the server (setting_config_owners). Empty uses the system value; for a limit, 0 means no limit. Saved together;
 * "Use system values" removes all of them.
 */
export function WorkspaceLimitsModal({
  tenant,
  onClose,
}: {
  tenant: TenantSummaryDto | null;
  onClose: () => void;
}) {
  return (
    <Modal
      opened={tenant != null}
      onClose={onClose}
      title={tenant ? `Settings for ${tenant.name}` : 'Settings'}
      size="xl"
      centered
    >
      {tenant?.tenantId != null && (
        <SettingsForm key={tenant.tenantId} tenantId={tenant.tenantId} onClose={onClose} />
      )}
    </Modal>
  );
}

/** One setting's input: a select for a choice, a field with suggestions for text, a number input. */
function SettingInput({
  setting,
  draft,
  onChange,
}: {
  setting: TenantSettingDto;
  draft: string;
  onChange: (value: string) => void;
}) {
  const label: ReactNode = (
    <Group gap={6}>
      <span>{setting.label}</span>
      {draft !== '' && (
        <Badge size="xs" variant="light" color="violet">
          Own value
        </Badge>
      )}
    </Group>
  );
  const placeholder = `System: ${valueText(setting, setting.systemValue)}`;

  if (setting.type === 'CHOICE') {
    return (
      <Select
        label={label}
        placeholder={placeholder}
        data={setting.options ?? []}
        value={draft || null}
        onChange={(value) => onChange(value ?? '')}
        clearable
        w={260}
      />
    );
  }
  if (setting.type === 'INTEGER') {
    return (
      <NumberInput
        label={label}
        placeholder={placeholder}
        min={setting.min ?? undefined}
        max={setting.max ?? undefined}
        thousandSeparator=","
        allowDecimal={false}
        allowNegative={false}
        value={draft === '' ? '' : Number(draft)}
        onChange={(value) => onChange(value === '' ? '' : String(value))}
        w={260}
      />
    );
  }
  if (setting.suggestions?.length) {
    return (
      <Autocomplete
        label={label}
        placeholder={placeholder}
        data={setting.suggestions}
        value={draft}
        onChange={onChange}
        // Autocomplete filters by the text in the field; while it still holds the saved value, offer the whole list.
        filter={(input) =>
          defaultOptionsFilter(
            input.search.trim() === (setting.ownValue ?? '') ? { ...input, search: '' } : input,
          )
        }
        limit={200}
        maxDropdownHeight={280}
        w={260}
      />
    );
  }
  return (
    <TextInput
      label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => onChange(event.currentTarget.value)}
      w={260}
    />
  );
}

function SettingsForm({ tenantId, onClose }: { tenantId: number; onClose: () => void }) {
  const { data: settings, isLoading, error } = useWorkspaceSettings(tenantId);
  const save = useSaveWorkspaceSettings(tenantId);
  const reset = useResetWorkspaceSettings(tenantId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<string | null>(SETTING_TYPES[0].tab);
  const narrow = useMediaQuery('(max-width: 48em)');

  // Start from the workspace's own values (empty where it uses the system value).
  useEffect(() => {
    if (settings) {
      setDrafts(Object.fromEntries(settings.map((s) => [s.key ?? '', s.ownValue ?? ''])));
    }
  }, [settings]);

  if (isLoading) return <PageLoader />;
  if (error || !settings) return <ErrorAlert error={error} title="Could not load the settings" />;

  const draftOf = (s: TenantSettingDto) => (drafts[s.key ?? ''] ?? '').trim();
  const changed = settings.filter((s) => draftOf(s) !== (s.ownValue ?? ''));
  const hasOwnValues = settings.some((s) => s.ownValue != null);

  // Per type, keep the server's order: groups appear in the order of their first setting.
  const groupsOf = (type: string) => {
    const groups = new Map<string, TenantSettingDto[]>();
    for (const setting of settings.filter((s) => typeOf(s) === type)) {
      const group = setting.group ?? 'Other';
      groups.set(group, [...(groups.get(group) ?? []), setting]);
    }
    return groups;
  };
  const types = SETTING_TYPES.filter((t) => settings.some((s) => typeOf(s) === t.type));

  const submit = () =>
    // Errors are shown as a notification by the global handler.
    save.mutate(Object.fromEntries(changed.map((s) => [s.key ?? '', draftOf(s)])), {
      onSuccess: onClose,
    });

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Values for this workspace only; they win over the System settings. Leave a field empty to use the
        system value.
      </Text>
      <Tabs value={tab} onChange={setTab} orientation={narrow ? 'horizontal' : 'vertical'} variant="pills">
        <Tabs.List
          mb={narrow ? 'md' : undefined}
          mr={narrow ? undefined : 'lg'}
          miw={narrow ? undefined : 160}
        >
          {types.map(({ type, tab: value, label, icon: TabIcon }) => {
            const unsaved = changed.filter((s) => typeOf(s) === type).length;
            return (
              <Tabs.Tab
                key={value}
                value={value}
                leftSection={<TabIcon size={16} />}
                rightSection={
                  unsaved > 0 && (
                    <Tooltip label={`${unsaved} unsaved ${unsaved === 1 ? 'change' : 'changes'}`}>
                      <Badge size="xs" variant="filled" color="yellow" circle>
                        {unsaved}
                      </Badge>
                    </Tooltip>
                  )
                }
              >
                {label}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
        {types.map(({ type, tab: value, intro }) => (
          <Tabs.Panel key={value} value={value} style={{ minWidth: 0 }}>
            <Stack gap="lg">
              <Text size="sm" c="dimmed">
                {intro}
              </Text>
              {[...groupsOf(type).entries()].map(([group, groupSettings], _, all) => (
                <Fragment key={group}>
                  <Stack gap="md">
                    {/* A lone section needs no title (the limits are all "System limits" on the System settings
                        page, which would read wrong for one workspace). */}
                    {all.length > 1 && (
                      <Title order={4} fz="md">
                        {group}
                      </Title>
                    )}
                    {groupSettings.map((setting) => {
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
                            {hint(setting, draft.trim())} {setting.description}
                          </Text>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Fragment>
              ))}
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>
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
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={save.isPending} disabled={changed.length === 0}>
            Save
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
