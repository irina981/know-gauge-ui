import { Accordion, Code, Group, ScrollArea, SimpleGrid, Stack, Text } from '@mantine/core';
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
              {r.rawResponse && (
                <ScrollArea.Autosize mah={400}>
                  <Code block>{prettyJson(r.rawResponse)}</Code>
                </ScrollArea.Autosize>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
