import { ActionIcon, Button, Center, Group, Loader, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconExternalLink,
  IconEye,
  IconFileTypePdf,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';
import { lazy, Suspense, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fileLinksNeedToken, openFileInNewTab } from '@/api/client';
import { documentPreviewUrl, useTopicDocuments } from '@/api/documents';
import type { DocumentDto } from '@/api/types';
import { DOCUMENT_PAGE_SIZE, DocumentTable } from './DocumentTable';
import { UploadDropzone } from './UploadDropzone';

// PDF.js is large, so it loads only when a preview is first shown.
const PdfViewer = lazy(() => import('./PdfViewer'));

/**
 * Width of the list next to the preview, kept in this browser. Storage can be unavailable (private mode, blocked site
 * data): the split then starts at half the width. The preview itself always starts closed.
 */
const LAYOUT_KEY = 'kg-library-document-preview';
const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;

interface PreviewLayout {
  /** Width of the document list as a share of the panel. */
  ratio: number;
}

/** Zoom levels in percent of the preview width: 100 fits the page width. */
const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200, 300];

/** The next zoom level up or down, or the same one at either end. */
function stepZoom(zoom: number, direction: 1 | -1): number {
  const next =
    direction > 0
      ? ZOOM_LEVELS.find((level) => level > zoom)
      : [...ZOOM_LEVELS].reverse().find((level) => level < zoom);
  return next ?? zoom;
}

const clampRatio = (ratio: number) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));

function loadLayout(): PreviewLayout {
  try {
    const stored = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') as Partial<PreviewLayout>;
    return {
      ratio: typeof stored.ratio === 'number' ? clampRatio(stored.ratio) : 0.5,
    };
  } catch {
    return { ratio: 0.5 };
  }
}

function saveLayout(layout: PreviewLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Not remembered; the panel still works.
  }
}

/**
 * Topics whose preview the user closed, kept in this browser. Every other topic opens with the preview showing its
 * first document. Without storage every topic simply opens with the preview.
 */
const CLOSED_KEY = 'kg-library-preview-closed-topics';

function loadClosedTopics(): number[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function rememberClosed(topicId: number, closed: boolean) {
  try {
    const others = loadClosedTopics().filter((id) => id !== topicId);
    localStorage.setItem(CLOSED_KEY, JSON.stringify(closed ? [...others, topicId] : others));
  } catch {
    // Not remembered; the panel still works.
  }
}

/**
 * The Documents card of the Library: upload and the document list on the left, a PDF preview of the chosen document
 * on the right. A topic opens with the preview showing its first document, unless the preview was closed for that
 * topic; the eye button in the header opens it again on the first document, the eye button of a row on that
 * document, and while it is open clicking a row shows that document. The divider
 * can be dragged (or moved with the arrow keys). On narrow screens the preview sits below the list.
 */
export function DocumentsPanel({ topicId, readOnly = false }: { topicId: number; readOnly?: boolean }) {
  const wide = useMediaQuery('(min-width: 62em)', true);
  const [layout, setLayout] = useState(loadLayout);
  // The panel is mounted per topic, so this is read again for every topic.
  const [open, setOpenState] = useState(() => !loadClosedTopics().includes(topicId));
  const setOpen = (next: boolean) => {
    setOpenState(next);
    rememberClosed(topicId, !next);
  };
  // The document the user picked; until then (and after it is deleted) the first document of the topic is shown.
  // Same query as the list's first page, so it comes from the cache.
  const [picked, setPicked] = useState<DocumentDto | null>(null);
  const { data: firstPage } = useTopicDocuments(topicId, 0, DOCUMENT_PAGE_SIZE);
  const preview = picked ?? firstPage?.content[0] ?? null;
  // A topic without documents has nothing to preview, so it has no preview button either.
  const hasDocuments = !!firstPage?.content.length;
  const showPreviewPane = open && hasDocuments;
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(100);
  const splitRef = useRef<HTMLDivElement>(null);

  const update = (next: Partial<PreviewLayout>) =>
    setLayout((current) => {
      const merged = { ...current, ...next };
      saveLayout(merged);
      return merged;
    });

  const showPreview = (doc: DocumentDto) => {
    setPicked(doc);
    setOpen(true);
  };

  const ratioAt = (clientX: number) => {
    const rect = splitRef.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? clampRatio((clientX - rect.left) / rect.width) : layout.ratio;
  };

  // Pointer capture keeps the drag going when the pointer moves over the preview.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) setLayout((current) => ({ ...current, ratio: ratioAt(event.clientX) }));
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    update({ ratio: ratioAt(event.clientX) });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? -0.05 : event.key === 'ArrowRight' ? 0.05 : 0;
    if (step === 0) return;
    event.preventDefault();
    update({ ratio: clampRatio(layout.ratio + step) });
  };

  const list = (
    <Stack gap="lg">
      {/* Shared library topics take no uploads (ADR010). */}
      {!readOnly && <UploadDropzone topicId={topicId} />}
      <DocumentTable
        topicId={topicId}
        topicReadOnly={readOnly}
        previewId={showPreviewPane ? preview?.id : undefined}
        onPreview={showPreview}
        onDeleted={(id) => picked?.id === id && setPicked(null)}
      />
    </Stack>
  );

  const header = (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <div>
        <Title order={3} fz={18}>
          Documents
        </Title>
        <Text size="sm" c="dimmed">
          Tests are generated from ingested PDFs.
        </Text>
      </div>
      {!open && hasDocuments && (
        <Tooltip label="Show the document preview">
          <ActionIcon variant="default" size="lg" aria-label="Show preview" onClick={() => setOpen(true)}>
            <IconEye size={18} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );

  const previewPane = (
    <div className="kg-doc-preview">
      <Group justify="space-between" wrap="nowrap" gap="xs" className="kg-doc-preview-bar">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <IconFileTypePdf size={18} stroke={1.6} style={{ flexShrink: 0 }} />
          <Text size="sm" fw={500} truncate>
            {preview ? preview.title || preview.originalFileName : 'Preview'}
          </Text>
        </Group>
        <Group gap={4} wrap="nowrap">
          {preview && (
            <>
              <Tooltip label="Zoom out">
                <ActionIcon
                  variant="subtle"
                  aria-label="Zoom out"
                  disabled={zoom <= ZOOM_LEVELS[0]}
                  onClick={() => setZoom(stepZoom(zoom, -1))}
                >
                  <IconZoomOut size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Fit to width">
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  w={64}
                  onClick={() => setZoom(100)}
                  aria-label="Fit to width"
                >
                  {zoom}%
                </Button>
              </Tooltip>
              <Tooltip label="Zoom in">
                <ActionIcon
                  variant="subtle"
                  aria-label="Zoom in"
                  disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  onClick={() => setZoom(stepZoom(zoom, 1))}
                >
                  <IconZoomIn size={18} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
          {preview && (
            <Tooltip label="Open in a new tab">
              <ActionIcon
                variant="subtle"
                component="a"
                href={documentPreviewUrl(preview.id!)}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in a new tab"
                onClick={(event) => {
                  // With sign-in the file needs the access token, which a plain link can't send.
                  if (!fileLinksNeedToken()) return;
                  event.preventDefault();
                  void openFileInNewTab(documentPreviewUrl(preview.id!));
                }}
              >
                <IconExternalLink size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Close the preview">
            <ActionIcon variant="subtle" aria-label="Close preview" onClick={() => setOpen(false)}>
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      {preview ? (
        <Suspense
          fallback={
            <Center className="kg-pdf-viewer">
              <Loader size="sm" />
            </Center>
          }
        >
          <PdfViewer
            key={preview.id}
            url={documentPreviewUrl(preview.id!)}
            zoom={zoom}
            onZoomStep={(direction) => setZoom((current) => stepZoom(current, direction))}
          />
        </Suspense>
      ) : (
        <div className="kg-doc-preview-empty">
          <Text size="sm" c="dimmed" ta="center" maw={260}>
            Click a document in the list to preview it here.
          </Text>
        </div>
      )}
    </div>
  );

  if (!showPreviewPane) {
    return (
      <Paper p="lg" className="kg-fill kg-docs-card">
        {header}
        <div className="kg-docs-list">{list}</div>
      </Paper>
    );
  }

  if (!wide) {
    return (
      <Paper p="lg" className="kg-fill kg-docs-card">
        {header}
        {list}
        {previewPane}
      </Paper>
    );
  }

  return (
    <Paper p="lg" className="kg-fill kg-docs-card">
      {header}
      <div ref={splitRef} className="kg-docs-split" data-dragging={dragging || undefined}>
        <div className="kg-docs-list" style={{ flexBasis: `${layout.ratio * 100}%` }}>
          {list}
        </div>
        <div
          className="kg-docs-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the document list and preview"
          aria-valuemin={MIN_RATIO * 100}
          aria-valuemax={MAX_RATIO * 100}
          aria-valuenow={Math.round(layout.ratio * 100)}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => update({ ratio: 0.5 })}
          onKeyDown={onKeyDown}
          title="Drag to resize, double-click to reset"
        />
        {previewPane}
      </div>
    </Paper>
  );
}
