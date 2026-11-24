import { Badge, Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useResetWorkspaceSettings, useSaveWorkspaceSettings, useWorkspaceSettings } from '@/api/admin';
import type { TenantSummaryDto, TenantSettingDto } from '@/api/types';
import { ErrorAlert, PageLoader } from '@/shared/components';

const integerFormat = new Intl.NumberFormat();

/** A limit as text: "no limit" for 0 or empty, else the number. */
function limitText(value?: string | null): string {
  if (value == null || value === '' || Number(value) === 0) return 'no limit';
  return integerFormat.format(Number(value));
}

/** What a field means: the workspace's own value, or the system value it falls back to. */
function hint(setting: TenantSettingDto, draft: string): string {
  if (draft === '') return `Uses the system value: ${limitText(setting.systemValue)}.`;
  if (Number(draft) === 0) return `Own value: no limit (system: ${limitText(setting.systemValue)}).`;
  return `Own value (system: ${limitText(setting.systemValue)}).`;
}

/**
 * A workspace's own limits (ADR014), which win over the system settings. Empty uses the system value, 0 means no
 * limit. Saved together; "Use system values" removes all of them.
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
      title={tenant ? `Limits of ${tenant.name}` : 'Limits'}
      size="lg"
      centered
    >
      {tenant?.tenantId != null && (
        <LimitsForm key={tenant.tenantId} tenantId={tenant.tenantId} onClose={onClose} />
      )}
    </Modal>
  );
}

function LimitsForm({ tenantId, onClose }: { tenantId: number; onClose: () => void }) {
  const { data: settings, isLoading, error } = useWorkspaceSettings(tenantId);
  const save = useSaveWorkspaceSettings(tenantId);
  const reset = useResetWorkspaceSettings(tenantId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Start from the workspace's own values (empty where it uses the system value).
  useEffect(() => {
    if (settings) {
      setDrafts(Object.fromEntries(settings.map((s) => [s.key ?? '', s.ownValue ?? ''])));
    }
  }, [settings]);

  if (isLoading) return <PageLoader />;
  if (error || !settings) return <ErrorAlert error={error} title="Could not load the limits" />;

  const changed = settings.filter((s) => (drafts[s.key ?? ''] ?? '') !== (s.ownValue ?? ''));
  const hasOwnValues = settings.some((s) => s.ownValue != null);

  const submit = () =>
    // Errors are shown as a notification by the global handler.
    save.mutate(Object.fromEntries(changed.map((s) => [s.key ?? '', drafts[s.key ?? ''] ?? ''])), {
      onSuccess: onClose,
    });

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Values for this workspace only; they win over the System settings. Leave a field empty to use the
        system value, enter 0 for no limit.
      </Text>
      {settings.map((setting) => {
        const key = setting.key ?? '';
        const draft = drafts[key] ?? '';
        return (
          <Stack key={key} gap={4}>
            <NumberInput
              label={
                <Group gap={6}>
                  <span>{setting.label}</span>
                  {draft !== '' && (
                    <Badge size="xs" variant="light" color="violet">
                      Own value
                    </Badge>
                  )}
                </Group>
              }
              placeholder={`System: ${limitText(setting.systemValue)}`}
              min={setting.min ?? undefined}
              max={setting.max ?? undefined}
              thousandSeparator=","
              allowDecimal={false}
              allowNegative={false}
              value={draft === '' ? '' : Number(draft)}
              onChange={(value) => setDrafts((d) => ({ ...d, [key]: value === '' ? '' : String(value) }))}
              w={260}
            />
            <Text size="xs" c="dimmed">
              {hint(setting, draft)} {setting.description}
            </Text>
          </Stack>
        );
      })}
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
