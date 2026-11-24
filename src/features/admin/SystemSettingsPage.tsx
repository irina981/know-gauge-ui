import {
  ActionIcon,
  Alert,
  Autocomplete,
  Badge,
  Button,
  defaultOptionsFilter,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAdjustments,
  IconGauge,
  IconPencil,
  IconRestore,
  IconSearch,
  IconSettings,
  IconTrash,
  type Icon,
} from '@tabler/icons-react';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useDeleteTokenPrice,
  useEmbeddingInfo,
  useResetSystemSettings,
  useSaveSystemSettings,
  useSetTokenPrice,
  useSuggestTokenPrice,
  useSystemSettings,
  useTokenPrices,
} from '@/api/admin';
import type { SystemSettingDto, TokenPriceSuggestionDto } from '@/api/types';
import { confirmDelete } from '@/shared/confirm';
import { ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { formatDateTime } from '@/shared/format';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper p="lg">
      <Title order={3} fz="lg" mb={4}>
        {title}
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        {description}
      </Text>
      {children}
    </Paper>
  );
}

// Errors of the mutations below are shown by the global handler (queryClient.ts).

const integerFormat = new Intl.NumberFormat();

/** A value as the page shows it: thousands separators for numbers, "empty" for an optional setting left empty. */
function display(setting: SystemSettingDto, value?: string | null): string {
  if (value === undefined || value === null || value === '') return setting.optional ? 'empty' : '—';
  return setting.type === 'INTEGER' ? integerFormat.format(Number(value)) : value;
}

/** One setting's input and description. The page's Save stores all changes at once. */
function SettingRow({
  setting,
  draft,
  onChange,
}: {
  setting: SystemSettingDto;
  draft: string;
  onChange: (value: string) => void;
}) {
  const changed = draft.trim() !== (setting.value ?? '');
  const label = (
    <Group gap={6}>
      <span>{setting.label}</span>
      {changed ? (
        <Badge size="xs" variant="light" color="yellow">
          Not saved
        </Badge>
      ) : (
        setting.overridden && (
          <Tooltip label="Saved here; overrides the value from the properties files">
            <Badge size="xs" variant="light" color="violet">
              Overridden
            </Badge>
          </Tooltip>
        )
      )}
    </Group>
  );

  let input: ReactNode;
  if (setting.type === 'CHOICE') {
    input = (
      <Select
        label={label}
        data={setting.options ?? []}
        value={draft || null}
        onChange={(value) => onChange(value ?? '')}
        allowDeselect={false}
        w={260}
      />
    );
  } else if (setting.type === 'INTEGER') {
    input = (
      <NumberInput
        label={label}
        placeholder={setting.optional ? 'Empty' : undefined}
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
  } else if (setting.suggestions?.length) {
    input = (
      <Autocomplete
        label={label}
        data={setting.suggestions}
        value={draft}
        onChange={onChange}
        // Autocomplete filters by the text in the field; while it still holds the saved value, offer the whole list.
        filter={(input) =>
          defaultOptionsFilter(
            input.search.trim() === (setting.value ?? '') ? { ...input, search: '' } : input,
          )
        }
        limit={200}
        maxDropdownHeight={280}
        w={260}
      />
    );
  } else {
    input = (
      <TextInput
        label={label}
        value={draft}
        onChange={(event) => onChange(event.currentTarget.value)}
        w={260}
      />
    );
  }

  return (
    <Stack gap={4}>
      {input}
      <Text size="xs" c="dimmed">
        {setting.description} Default from the properties files: {display(setting, setting.defaultValue)}
        {setting.min != null &&
          ` · ${setting.max != null ? `${integerFormat.format(setting.min)}–${integerFormat.format(setting.max)}` : `at least ${integerFormat.format(setting.min)}`}`}
        .{' '}
        <Text span ff="monospace" fz="xs">
          {setting.key}
        </Text>
      </Text>
    </Stack>
  );
}

/** The setting types (setting_configs.setting_type on the server), one vertical tab each, in this order. */
const SETTING_TYPES: { type: string; tab: string; label: string; icon: Icon; description: string }[] = [
  {
    type: 'CONFIG',
    tab: 'configuration',
    label: 'Configuration',
    icon: IconSettings,
    description:
      'Values start from the properties files; a value saved here overrides them, also after restarts.',
  },
  {
    type: 'LIMIT',
    tab: 'limits',
    label: 'Limits',
    icon: IconGauge,
    description:
      'Values start from the properties files; a value saved here overrides them, also after restarts.',
  },
];

/** Added to the introduction of one section: the workspace limits may have a workspace's own value (ADR014). */
const SECTION_NOTES: Record<string, string> = {
  'Workspace limits': 'A workspace may also have values of its own (Workspaces → Limits).',
};

/**
 * Settings that start from the properties files and can be overridden here, on one vertical tab per setting type.
 * "Save changes" stores every changed value of all tabs at once (nothing is saved if one does not fit); "Reset to
 * defaults" removes every override from the database. An override applies at once and again after every restart.
 */
function SystemSettingsSections({ after }: { after: Record<string, ReactNode> }) {
  const { data, isLoading, error } = useSystemSettings();
  const save = useSaveSystemSettings();
  const reset = useResetSystemSettings();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // The open tab is in the address (?tab=limits), so a reload or a shared link keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const narrow = useMediaQuery('(max-width: 48em)');
  const tab = SETTING_TYPES.some((t) => t.tab === searchParams.get('tab'))
    ? searchParams.get('tab')!
    : SETTING_TYPES[0].tab;
  const openTab = (value: string | null) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (!value || value === SETTING_TYPES[0].tab) next.delete('tab');
        else next.set('tab', value);
        return next;
      },
      { replace: true },
    );

  // Start from the values in effect, and follow them after a save or reset.
  useEffect(() => {
    if (data) setDrafts(Object.fromEntries(data.map((s) => [s.key!, s.value ?? ''])));
  }, [data]);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorAlert error={error} title="Could not load the settings" />;

  const draftOf = (setting: SystemSettingDto) => drafts[setting.key!] ?? setting.value ?? '';
  const changes = Object.fromEntries(
    data.filter((s) => draftOf(s).trim() !== (s.value ?? '')).map((s) => [s.key!, draftOf(s).trim()]),
  );
  const changeCount = Object.keys(changes).length;
  const overriddenCount = data.filter((s) => s.overridden).length;

  const saveAll = () =>
    save.mutate(changes, {
      onSuccess: () =>
        notifications.show({
          color: 'teal',
          message: `${changeCount} ${changeCount === 1 ? 'setting' : 'settings'} saved.`,
        }),
    });
  const discard = () => setDrafts(Object.fromEntries(data.map((s) => [s.key!, s.value ?? ''])));
  const resetAll = () =>
    modals.openConfirmModal({
      title: 'Reset all settings to their defaults?',
      children: (
        <Text size="sm">
          Removes {overriddenCount === 1 ? 'the saved value' : `all ${overriddenCount} saved values`} from the
          database, so the values from the properties files apply again, at once and after restarts. Token
          prices are not affected.
        </Text>
      ),
      labels: { confirm: 'Reset to defaults', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        reset.mutate(undefined, {
          onSuccess: () =>
            notifications.show({ color: 'teal', message: 'All settings are back to their defaults.' }),
        }),
    });

  // Per type, keep the server's order: groups appear in the order of their first setting.
  const groupsOf = (type: string) => {
    const groups = new Map<string, SystemSettingDto[]>();
    for (const setting of data.filter((s) => (s.settingType ?? 'CONFIG') === type)) {
      const group = setting.group ?? 'Other';
      groups.set(group, [...(groups.get(group) ?? []), setting]);
    }
    return groups;
  };
  const changesOf = (type: string) =>
    data.filter((s) => (s.settingType ?? 'CONFIG') === type && s.key! in changes).length;

  return (
    <>
      {/* Stays in view while scrolling, so unsaved changes are never out of sight. */}
      <Paper p="sm" withBorder className="kg-settings-actions">
        <Group justify="space-between" gap="sm">
          <Text size="sm" c={changeCount ? undefined : 'dimmed'} fw={changeCount ? 600 : undefined}>
            {changeCount
              ? `${changeCount} unsaved ${changeCount === 1 ? 'change' : 'changes'}`
              : overriddenCount
                ? `${overriddenCount} ${overriddenCount === 1 ? 'setting overrides' : 'settings override'} the properties files`
                : 'All settings use the values from the properties files'}
          </Text>
          <Group gap="sm">
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconRestore size={16} />}
              onClick={resetAll}
              loading={reset.isPending}
              disabled={overriddenCount === 0 || save.isPending}
            >
              Reset to defaults
            </Button>
            <Button variant="default" onClick={discard} disabled={!changeCount || save.isPending}>
              Discard
            </Button>
            <Button onClick={saveAll} loading={save.isPending} disabled={!changeCount}>
              Save changes
            </Button>
          </Group>
        </Group>
      </Paper>
      <Tabs
        value={tab}
        onChange={openTab}
        orientation={narrow ? 'horizontal' : 'vertical'}
        variant="pills"
        keepMounted={false}
      >
        <Tabs.List
          mb={narrow ? 'md' : undefined}
          mr={narrow ? undefined : 'lg'}
          miw={narrow ? undefined : 180}
        >
          {SETTING_TYPES.map(({ type, tab: value, label, icon: TabIcon }) => {
            const unsaved = changesOf(type);
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
        {SETTING_TYPES.map(({ type, tab: value, description }) => (
          <Tabs.Panel key={value} value={value} style={{ minWidth: 0 }}>
            <Stack gap="lg">
              {[...groupsOf(type).entries()].map(([group, settings]) => (
                <Fragment key={group}>
                  <Section
                    title={group}
                    description={
                      SECTION_NOTES[group] ? `${description} ${SECTION_NOTES[group]}` : description
                    }
                  >
                    <Stack gap="lg">
                      {settings.map((setting) => (
                        <SettingRow
                          key={setting.key}
                          setting={setting}
                          draft={draftOf(setting)}
                          onChange={(value) =>
                            setDrafts((current) => ({ ...current, [setting.key!]: value }))
                          }
                        />
                      ))}
                    </Stack>
                  </Section>
                  {/* E.g. the token prices right under the AI models. */}
                  {after[group]}
                </Fragment>
              ))}
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}

/** Add or change one model's price; "Look up" fills in the prices from the LiteLLM price catalog. */
function TokenPriceForm({
  knownModels,
  catalogModels,
  editing,
  onDone,
}: {
  knownModels: string[];
  catalogModels: string[];
  editing: { model: string; input: number; output: number } | null;
  onDone: () => void;
}) {
  const [model, setModel] = useState('');
  const [input, setInput] = useState<number | string>('');
  const [output, setOutput] = useState<number | string>('');
  const [suggestion, setSuggestion] = useState<TokenPriceSuggestionDto | null>(null);
  const save = useSetTokenPrice();
  const suggest = useSuggestTokenPrice();

  useEffect(() => {
    if (editing) {
      setModel(editing.model);
      setInput(editing.input);
      setOutput(editing.output);
      setSuggestion(null);
    }
  }, [editing]);

  const reset = () => {
    setModel('');
    setInput('');
    setOutput('');
    setSuggestion(null);
    onDone();
  };

  const lookUp = () =>
    suggest.mutate(model.trim(), {
      onSuccess: (result) => {
        setSuggestion(result);
        if (result.known) {
          setInput(result.inputUsdPerMillion ?? '');
          setOutput(result.outputUsdPerMillion ?? '');
        }
      },
    });

  const submit = () =>
    save.mutate(
      { model: model.trim(), inputUsdPerMillion: Number(input), outputUsdPerMillion: Number(output) },
      {
        onSuccess: () => {
          notifications.show({ color: 'teal', message: `Price of ${model.trim()} saved.` });
          reset();
        },
      },
    );

  const complete = model.trim() !== '' && typeof input === 'number' && typeof output === 'number';

  return (
    <Stack gap="sm">
      <Group align="flex-end" gap="sm">
        <Autocomplete
          label="Model"
          placeholder="e.g. gpt-4.1"
          description="Name or prefix; the longest match wins"
          data={[
            { group: 'Used here', items: knownModels },
            { group: 'Price catalog (OpenAI)', items: catalogModels },
          ].filter((group) => group.items.length > 0)}
          limit={200}
          maxDropdownHeight={300}
          value={model}
          onChange={(value) => {
            setModel(value);
            setSuggestion(null);
          }}
          disabled={!!editing}
          w={240}
        />
        <Tooltip label="Fill in the prices from the LiteLLM price catalog. Check them before saving.">
          <Button
            variant="light"
            leftSection={<IconSearch size={16} />}
            onClick={lookUp}
            loading={suggest.isPending}
            disabled={model.trim() === ''}
          >
            Look up
          </Button>
        </Tooltip>
        <NumberInput
          label="Input"
          description="USD per 1M tokens"
          min={0}
          decimalScale={6}
          allowNegative={false}
          prefix="$"
          value={input}
          onChange={setInput}
          w={150}
        />
        <NumberInput
          label="Output"
          description="USD per 1M tokens"
          min={0}
          decimalScale={6}
          allowNegative={false}
          prefix="$"
          value={output}
          onChange={setOutput}
          w={150}
        />
        <Button onClick={submit} loading={save.isPending} disabled={!complete}>
          {editing ? 'Save' : 'Add price'}
        </Button>
        {(editing || model || input !== '' || output !== '') && (
          <Button variant="subtle" color="gray" onClick={reset}>
            Cancel
          </Button>
        )}
      </Group>
      {suggestion && (
        <Alert
          color={suggestion.known ? 'blue' : 'yellow'}
          title={
            suggestion.known
              ? `From the ${suggestion.source}: check before saving`
              : `Not in the ${suggestion.source}`
          }
        >
          <Text size="sm">
            {suggestion.known
              ? `Prices of the catalog entry ${suggestion.catalogModel}${
                  suggestion.provider ? ` (${suggestion.provider})` : ''
                }. The catalog is kept by the LiteLLM project, not the provider, so compare with the provider's price list.`
              : "Check the model name, or enter the prices from the provider's price list."}
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

const usd = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});

/** What each LLM model costs; the usage page prices the tokens with it. */
function TokenPricesSection() {
  const { data, isLoading, error } = useTokenPrices();
  const remove = useDeleteTokenPrice();
  const [editing, setEditing] = useState<{ model: string; input: number; output: number } | null>(null);

  const prices = data?.prices ?? [];
  const priced = new Set(prices.map((p) => p.model));
  // Offer the models that have no price yet: those used here first, then the catalog's (each name once).
  const knownModels = (data?.knownModels ?? []).filter((m) => !priced.has(m));
  const catalogModels = (data?.catalogModels ?? []).filter((m) => !priced.has(m) && !knownModels.includes(m));

  const askDelete = (model: string) =>
    confirmDelete({
      title: `Remove the price of ${model}?`,
      message: 'Its tokens are then shown as not priced on the usage page.',
      onConfirm: () => remove.mutate(model, {}),
    });

  return (
    <Section
      title="AI token prices"
      description="What each model costs, in US dollars per million tokens. The usage page shows what the AI tokens cost with these prices. A model name also matches longer names (gpt-4.1 covers gpt-4.1-2025-04-14); the longest match wins."
    >
      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the token prices" />}
      {data && (
        <Stack gap="lg">
          {prices.length > 0 ? (
            <Table.ScrollContainer minWidth={560}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Model</Table.Th>
                    <Table.Th>Input / 1M</Table.Th>
                    <Table.Th>Output / 1M</Table.Th>
                    <Table.Th>Changed</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {prices.map((price) => (
                    <Table.Tr key={price.model}>
                      <Table.Td>
                        <Text size="sm" fw={500} ff="monospace">
                          {price.model}
                        </Text>
                      </Table.Td>
                      <Table.Td>{usd.format(price.inputUsdPerMillion ?? 0)}</Table.Td>
                      <Table.Td>{usd.format(price.outputUsdPerMillion ?? 0)}</Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {formatDateTime(price.updatedAt)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Change">
                            <ActionIcon
                              variant="subtle"
                              aria-label={`Change the price of ${price.model}`}
                              onClick={() =>
                                setEditing({
                                  model: price.model!,
                                  input: price.inputUsdPerMillion ?? 0,
                                  output: price.outputUsdPerMillion ?? 0,
                                })
                              }
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Remove">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label={`Remove the price of ${price.model}`}
                              onClick={() => askDelete(price.model!)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Text size="sm" c="dimmed">
              No prices yet, so the usage page cannot show what the tokens cost.
            </Text>
          )}
          <TokenPriceForm
            knownModels={knownModels}
            catalogModels={catalogModels}
            editing={editing}
            onDone={() => setEditing(null)}
          />
        </Stack>
      )}
    </Section>
  );
}

/**
 * The embedding model, read-only. Every stored vector belongs to the model that made it and every vector query
 * filters by model, so changing it means re-ingesting every document; it is set in the properties files.
 */
function EmbeddingSection() {
  const { data, isLoading, error } = useEmbeddingInfo();
  const fits = data?.catalogVectorSize == null || data.catalogVectorSize === data.dimension;

  return (
    <Section
      title="Embeddings"
      description="The model that turns document chunks into vectors for finding material. Read-only: changing it means re-ingesting every document, so it is set in the properties files."
    >
      {isLoading && <PageLoader />}
      {error && <ErrorAlert error={error} title="Could not load the embedding model" />}
      {data && (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Model
              </Text>
              <Text fw={600} ff="monospace">
                {data.model}
              </Text>
              <Text size="xs" c="dimmed" ff="monospace">
                kg.embedding.openai.model
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Vector size
              </Text>
              <Text fw={600}>{integerFormat.format(data.dimension ?? 0)}</Text>
              <Text size="xs" c="dimmed">
                {data.catalogVectorSize == null
                  ? 'Not given by the price catalog'
                  : fits
                    ? 'Matches the price catalog'
                    : `The price catalog says ${integerFormat.format(data.catalogVectorSize)}`}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Price
              </Text>
              <Text fw={600}>
                {data.inputUsdPerMillion == null ? '—' : `${usd.format(data.inputUsdPerMillion)} / 1M tokens`}
              </Text>
              <Text size="xs" c="dimmed">
                {data.inputUsdPerMillion == null
                  ? 'Not in the price catalog'
                  : 'From the LiteLLM price catalog; not counted in usage yet'}
              </Text>
            </div>
          </SimpleGrid>
          {!fits && (
            <Alert color="red" title="Vector size mismatch">
              The vector database stores {integerFormat.format(data.dimension ?? 0)} values per chunk, but the
              price catalog lists {integerFormat.format(data.catalogVectorSize ?? 0)} for this model.
              Ingestion fails until they match.
            </Alert>
          )}
          {(data.byModel ?? []).length > 0 ? (
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Stored embeddings by model</Table.Th>
                  <Table.Th>Chunks</Table.Th>
                  <Table.Th>Documents</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.byModel!.map((row) => (
                  <Table.Tr key={row.model}>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {row.model}
                      </Text>
                    </Table.Td>
                    <Table.Td>{integerFormat.format(row.embeddings ?? 0)}</Table.Td>
                    <Table.Td>{integerFormat.format(row.documents ?? 0)}</Table.Td>
                    <Table.Td>
                      {row.model === data.model ? (
                        <Badge size="sm" variant="light" color="teal">
                          In use
                        </Badge>
                      ) : (
                        <Tooltip label="Made with another model: not used for finding material">
                          <Badge size="sm" variant="light" color="gray">
                            Unused
                          </Badge>
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text size="sm" c="dimmed">
              No documents are ingested yet.
            </Text>
          )}
        </Stack>
      )}
    </Section>
  );
}

/** Admins only: settings that apply to the whole system. Room for more sections as they come. */
export function SystemSettingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="System settings"
        description="Settings that apply to every workspace. Each starts from the properties files; a value saved here overrides it, also after restarts."
        icon={IconAdjustments}
      />
      <Stack gap="lg">
        <SystemSettingsSections
          after={{
            'AI models': (
              <>
                <TokenPricesSection />
                <EmbeddingSection />
              </>
            ),
          }}
        />
      </Stack>
    </div>
  );
}
