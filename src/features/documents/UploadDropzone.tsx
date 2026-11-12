import { Checkbox, Group, Stack, Text } from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconFileTypePdf, IconUpload, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useIngestDocument, useUploadDocument } from '@/api/documents';
import { titleFromFileName } from '@/shared/format';

const MAX_SIZE = 50 * 1024 * 1024; // matches spring.servlet.multipart.max-file-size

/** Drag-and-drop PDF upload into a topic, optionally followed by ingestion. */
export function UploadDropzone({ topicId }: { topicId: number }) {
  const upload = useUploadDocument();
  const ingest = useIngestDocument();
  const [ingestAfterUpload, setIngestAfterUpload] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleDrop = async (files: File[]) => {
    setBusy(true);
    try {
      // One by one, so a failure in one file doesn't hide the others.
      for (const file of files) {
        try {
          const doc = await upload.mutateAsync({ topicId, file, title: titleFromFileName(file.name) });
          notifications.show({ color: 'teal', message: `Uploaded "${file.name}"` });
          if (ingestAfterUpload && doc.id != null) {
            // Don't wait: ingestion can take a while and the table shows its progress.
            ingest.mutate(doc.id);
          }
        } catch {
          // shown as a notification by the global handler
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="xs">
      <Dropzone
        onDrop={handleDrop}
        onReject={(rejections) =>
          rejections.forEach((r) =>
            notifications.show({
              color: 'red',
              title: r.file.name,
              message: r.errors.map((e) => e.message).join(', '),
            }),
          )
        }
        maxSize={MAX_SIZE}
        accept={PDF_MIME_TYPE}
        loading={busy}
      >
        <Group justify="center" gap="lg" mih={90} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={36} stroke={1.5} color="var(--mantine-color-indigo-6)" />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={36} stroke={1.5} color="var(--mantine-color-red-6)" />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileTypePdf size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
          </Dropzone.Idle>
          <div>
            <Text size="md">Drop PDF files here or click to choose</Text>
            <Text size="sm" c="dimmed">
              Up to 50 MB per file
            </Text>
          </div>
        </Group>
      </Dropzone>
      <Checkbox
        size="xs"
        label="Ingest immediately after upload"
        description="Otherwise the server's scheduled ingestion job picks the document up within a few minutes."
        checked={ingestAfterUpload}
        onChange={(e) => setIngestAfterUpload(e.currentTarget.checked)}
      />
    </Stack>
  );
}
