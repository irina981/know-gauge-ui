import { ActionIcon, Group, Pagination, Table, Text, Tooltip } from '@mantine/core';
import { IconDownload, IconPlayerPlay, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import {
  canStartIngestion,
  documentContentUrl,
  useDeleteDocument,
  useIngestDocument,
  useIngestingDocumentIds,
  useTopicDocuments,
} from '@/api/documents';
import type { DocumentDto } from '@/api/types';
import { EmptyState, ErrorAlert, PageLoader, StatusBadge } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';
import { documentStatus } from '@/shared/enums';
import { formatBytes, formatDateTime } from '@/shared/format';

const PAGE_SIZE = 10;

export function DocumentTable({ topicId }: { topicId: number }) {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useTopicDocuments(topicId, page, PAGE_SIZE);
  const ingest = useIngestDocument();
  const ingestingIds = useIngestingDocumentIds();
  const remove = useDeleteDocument();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert error={error} title="Could not load documents" />;
  if (!data?.content.length) {
    return <EmptyState title="No documents yet">Upload a PDF above to add it to this topic.</EmptyState>;
  }

  // Ingestion is a long synchronous call, so "in progress" is a pending request in this browser,
  // plus the INGESTING status reported by the server.
  const isIngesting = (doc: DocumentDto) => ingestingIds.includes(doc.id!) || doc.status === 'INGESTING';

  const ingestTooltip = (doc: DocumentDto, ingesting: boolean) => {
    if (ingesting) return 'Ingestion in progress';
    if (doc.status === 'INGESTED') return 'Already ingested';
    if (doc.status === 'FAILED') return 'Retry ingestion';
    return 'Ingest now (otherwise the scheduled job picks it up)';
  };

  const rows = data.content.map((doc) => {
    const ingesting = isIngesting(doc);
    const failed = doc.status === 'FAILED';
    const ingestAllowed = !ingesting && canStartIngestion(doc);
    return (
      <Table.Tr key={doc.id}>
        <Table.Td>
          <Text size="sm" fw={500}>
            {doc.title || doc.originalFileName}
          </Text>
          <Text size="xs" c="dimmed">
            {doc.originalFileName} · {formatBytes(doc.fileSizeBytes)}
          </Text>
        </Table.Td>
        <Table.Td style={{ whiteSpace: 'nowrap' }}>
          {ingesting ? (
            <StatusBadge info={documentStatus('INGESTING')} busy />
          ) : (
            <Tooltip label={doc.errorMessage} disabled={!doc.errorMessage} multiline w={320}>
              <span>
                <StatusBadge info={documentStatus(doc.status)} />
              </span>
            </Tooltip>
          )}
        </Table.Td>
        <Table.Td style={{ whiteSpace: 'nowrap' }}>
          <Text size="sm">{formatDateTime(doc.createdAt)}</Text>
          {doc.ingestedAt && (
            <Text size="xs" c="dimmed">
              ingested {formatDateTime(doc.ingestedAt)}
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Group gap={4} justify="flex-end" wrap="nowrap">
            <Tooltip label={ingestTooltip(doc, ingesting)}>
              {/* The wrapper keeps the tooltip working on a disabled button. */}
              <span>
                <ActionIcon
                  variant="subtle"
                  disabled={!ingestAllowed}
                  onClick={() => ingest.mutate(doc.id!)}
                  aria-label="Ingest"
                >
                  {failed ? <IconRefresh size={18} /> : <IconPlayerPlay size={18} />}
                </ActionIcon>
              </span>
            </Tooltip>
            <Tooltip label="Download">
              <ActionIcon
                variant="subtle"
                component="a"
                href={documentContentUrl(doc.id!)}
                aria-label="Download"
              >
                <IconDownload size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete">
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={ingesting}
                aria-label="Delete"
                onClick={() =>
                  confirmDelete({
                    title: 'Delete document',
                    message: `Delete "${doc.title || doc.originalFileName}"? This cannot be undone.`,
                    onConfirm: () => remove.mutate(doc.id!),
                  })
                }
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Table.ScrollContainer minWidth={420}>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Document</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Uploaded</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {data.page.totalPages > 1 && (
        <Group justify="space-between" mt="sm">
          <Text size="sm" c="dimmed">
            {data.page.totalElements} documents
          </Text>
          <Pagination
            total={data.page.totalPages}
            value={page + 1}
            onChange={(p) => setPage(p - 1)}
            size="sm"
          />
        </Group>
      )}
      {ingestingIds.length > 0 && (
        <Text size="xs" c="dimmed" mt="xs">
          Ingestion runs on the server and can take a minute for large documents.
        </Text>
      )}
    </>
  );
}
