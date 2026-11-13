import {
  Accordion,
  ActionIcon,
  Code,
  CopyButton,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useGenerationRuns } from '@/api/review';
import { EmptyState, ErrorAlert, PageLoader, StatusBadge } from '@/shared/components';
import { humanize, runStatus } from '@/shared/enums';
import { formatDateTime } from '@/shared/format';

function prettyJson(raw?: string): string {
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/** A scrollable block of text with a copy button in its corner. */
function TextBlock({ text }: { text: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <CopyButton value={text}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copied' : 'Copy'}>
            <ActionIcon
              variant="default"
              size="sm"
              onClick={copy}
              aria-label="Copy"
              style={{ position: 'absolute', top: 8, right: 20, zIndex: 1 }}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
      <ScrollArea.Autosize mah={480}>
        <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}
        </Code>
      </ScrollArea.Autosize>
    </div>
  );
}

function NotRecorded({ what }: { what: string }) {
  return (
    <Text size="sm" c="dimmed" py="xs">
      No {what} was recorded for this call. Calls made before the backend started recording it have none.
    </Text>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value ?? '—'}</Text>
    </div>
  );
}

/** Every LLM call made for this test (generation, verification, regeneration), for debugging. */
export function GenerationRunsPanel({ testId }: { testId: number }) {
  const { data: runs, isLoading, error } = useGenerationRuns(testId);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert error={error} />;
  if (!runs?.length) return <EmptyState title="No LLM calls recorded" />;

  return (
    <Accordion variant="separated" mt="sm">
      {runs.map((r) => (
        <Accordion.Item key={r.id} value={String(r.id)}>
          <Accordion.Control>
            <Group gap="sm">
              <StatusBadge info={runStatus(r.status)} />
              <Text size="sm" fw={500}>
                {r.purpose ? humanize(r.purpose) : 'Run'}
                {r.batchIndex != null && ` · batch ${r.batchIndex}`}
              </Text>
              <Text size="xs" c="dimmed">
                {r.model} · {formatDateTime(r.createdAt)}
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 2, sm: 4 }}>
                <Field label="Input tokens" value={r.inputTokens} />
                <Field label="Output tokens" value={r.outputTokens} />
                <Field label="Finish reason" value={r.finishReason} />
                <Field label="Prompt template" value={r.promptTemplateId} />
              </SimpleGrid>
              {r.errorMessage && (
                <Text size="sm" c="red">
                  {r.errorMessage}
                </Text>
              )}
              {!!r.retrievedChunkIds?.length && (
                <Text size="xs" c="dimmed">
                  Chunks used: {r.retrievedChunkIds.join(', ')}
                </Text>
              )}
              {/* What was sent, what came back, and with which settings. */}
              <Tabs defaultValue="prompt" keepMounted={false}>
                <Tabs.List>
                  <Tabs.Tab value="prompt">Prompt</Tabs.Tab>
                  <Tabs.Tab value="response">Response</Tabs.Tab>
                  <Tabs.Tab value="settings">Request settings</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="prompt" pt="sm">
                  {r.prompt ? <TextBlock text={r.prompt} /> : <NotRecorded what="prompt" />}
                </Tabs.Panel>
                <Tabs.Panel value="response" pt="sm">
                  {r.rawResponse ? (
                    <TextBlock text={prettyJson(r.rawResponse)} />
                  ) : (
                    <NotRecorded what="response" />
                  )}
                </Tabs.Panel>
                <Tabs.Panel value="settings" pt="sm">
                  {r.requestParams && Object.keys(r.requestParams).length ? (
                    <TextBlock text={JSON.stringify(r.requestParams, null, 2)} />
                  ) : (
                    <NotRecorded what="request settings" />
                  )}
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
