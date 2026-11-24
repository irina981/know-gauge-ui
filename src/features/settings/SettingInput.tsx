import {
  Autocomplete,
  Badge,
  defaultOptionsFilter,
  Group,
  NumberInput,
  Select,
  TextInput,
} from '@mantine/core';
import type { ReactNode } from 'react';
import type { TenantSettingDto } from '@/api/types';
import { settingValueText } from './settingValues';

/**
 * One workspace setting's input (ADR014): a select for a choice, a field with suggestions for text, a number input.
 * Empty means the workspace uses the system value, shown as the placeholder.
 */
export function SettingInput({
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
  const placeholder = `System: ${settingValueText(setting, setting.systemValue)}`;

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
