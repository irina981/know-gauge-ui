import type { TenantSettingDto } from '@/api/types';

const integerFormat = new Intl.NumberFormat();

/** CONFIG or LIMIT (setting_configs); older servers sent only limits. */
export const settingTypeOf = (setting: TenantSettingDto) => setting.settingType ?? 'LIMIT';

/** A value as text: "no limit" for a limit of 0, thousands separators for numbers, "—" when empty. */
export function settingValueText(setting: TenantSettingDto, value?: string | null): string {
  if (value == null || value === '') return settingTypeOf(setting) === 'LIMIT' ? 'no limit' : '—';
  if (setting.type !== 'INTEGER') return value;
  if (settingTypeOf(setting) === 'LIMIT' && Number(value) === 0) return 'no limit';
  return integerFormat.format(Number(value));
}

/** What a field means: the workspace's own value, or the system value it falls back to. */
export function settingHint(setting: TenantSettingDto, draft: string): string {
  const system = settingValueText(setting, setting.systemValue);
  if (draft === '') return `Uses the system value: ${system}.`;
  if (settingTypeOf(setting) === 'LIMIT' && setting.type === 'INTEGER' && Number(draft) === 0) {
    return `Own value: no limit (system: ${system}).`;
  }
  return `Own value (system: ${system}).`;
}

/** Settings by group, in the server's order: groups appear in the order of their first setting. */
export function groupSettings(settings: TenantSettingDto[]): Map<string, TenantSettingDto[]> {
  const groups = new Map<string, TenantSettingDto[]>();
  for (const setting of settings) {
    const group = setting.group ?? 'Other';
    groups.set(group, [...(groups.get(group) ?? []), setting]);
  }
  return groups;
}
