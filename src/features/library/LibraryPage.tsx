import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Menu,
  Paper,
  ScrollArea,
  SegmentedControl,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBooks,
  IconDots,
  IconFileImport,
  IconFolderOpen,
  IconFolderPlus,
  IconFolders,
  IconLock,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  subtreeCount,
  topicPathLabel,
  useDeleteTopic,
  useIngestedDocumentCounts,
  useTopicTree,
} from '@/api/topics';
import type { TopicNode } from '@/api/types';
import { DocumentsPanel } from '@/features/documents/DocumentsPanel';
import { ImportTreeModal } from '@/features/topics/ImportTreeModal';
import { TopicFormModal, type TopicFormTarget } from '@/features/topics/TopicFormModal';
import { TopicTree } from '@/features/topics/TopicTree';
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';

type LibraryView = 'mine' | 'shared';

const LIBRARY_VIEW_KEY = 'kg-library-view';

function loadLibraryView(): LibraryView {
  try {
    return localStorage.getItem(LIBRARY_VIEW_KEY) === 'shared' ? 'shared' : 'mine';
  } catch {
    return 'mine';
  }
}

function saveLibraryView(view: LibraryView) {
  try {
    localStorage.setItem(LIBRARY_VIEW_KEY, view);
  } catch {
    // Not remembered; the switch still works.
  }
}

/** Topics on the left, the selected topic and its documents on the right. */
export function LibraryPage() {
  const params = useParams();
  const selectedId = params.topicId ? Number(params.topicId) : undefined;
  const navigate = useNavigate();
  const { data: tree, isLoading, error } = useTopicTree();
  const deleteTopic = useDeleteTopic();

  const [formTarget, setFormTarget] = useState<TopicFormTarget | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const select = (id: number) => navigate(`/library/topics/${id}`);
  const selected = selectedId != null ? tree?.byId.get(selectedId) : undefined;

  // The tree shows one library at a time: the user's own topics or the shared library (ADR010). An open topic
  // decides which one (a link may point into either); otherwise the last choice, kept in this browser.
  const [chosenLibrary, setChosenLibrary] = useState<LibraryView>(loadLibraryView);
  const hasShared = !!tree?.roots.some((t) => t.shared);
  const library: LibraryView = !hasShared
    ? 'mine'
    : selected
      ? selected.shared
        ? 'shared'
        : 'mine'
      : chosenLibrary;
  const libraryRoots = tree ? tree.roots.filter((t) => t.shared === (library === 'shared')) : [];
  const chooseLibrary = (view: LibraryView) => {
    setChosenLibrary(view);
    saveLibraryView(view);
    // A topic from the other library would keep the tree on that library, so close it.
    if (selected && selected.shared !== (view === 'shared')) navigate('/library');
  };

  // A topic stands for its whole subtree in test generation, so a parent topic without documents of its own can
  // be used as long as an ingested document exists somewhere below it. The counts refresh after ingestion.
  const { data: ingestedCounts } = useIngestedDocumentCounts();
  const canGenerate = !!selected && !!ingestedCounts && subtreeCount(selected, ingestedCounts) > 0;

  const handleDelete = (topic: TopicNode) =>
    confirmDelete({
      title: 'Delete topic',
      message: `Delete "${topic.name}"? All its sub-topics and documents are deleted too. This cannot be undone.`,
      onConfirm: () =>
        deleteTopic.mutate(topic.id, {
          onSuccess: () => navigate(topic.parentId ? `/library/topics/${topic.parentId}` : '/library'),
        }),
    });

  return (
    // On desktop the page fills the window: both panels reach the bottom and scroll inside (brand.css).
    <div className="kg-library-page">
      <PageHeader
        eyebrow="Knowledge base"
        title="Library"
        description="Organise your source material in topics. Uploaded PDFs are indexed so every test is grounded in them."
        icon={IconBooks}
        actions={
          <>
            <Button
              variant="default"
              leftSection={<IconFileImport size={16} />}
              onClick={() => setImportOpen(true)}
            >
              Import tree
            </Button>
            {/* The dialog preselects the selected topic as parent; clear it for a top-level topic. */}
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() =>
                setFormTarget({
                  mode: 'create',
                  parent: selected && !selected.readOnly ? selected : undefined,
                })
              }
            >
              New topic
            </Button>
          </>
        }
      />

      <div className="kg-library">
        <Paper p="sm" className="kg-library-tree">
          {isLoading && <PageLoader />}
          {error && <ErrorAlert error={error} title="Could not load topics" />}
          {tree && hasShared && (
            <SegmentedControl
              fullWidth
              size="sm"
              value={library}
              onChange={(value) => chooseLibrary(value as LibraryView)}
              data={[
                {
                  value: 'mine',
                  label: (
                    <Center style={{ gap: 6 }}>
                      <IconUser size={15} />
                      <span>My library</span>
                    </Center>
                  ),
                },
                {
                  value: 'shared',
                  label: (
                    <Center style={{ gap: 6 }}>
                      <IconLock size={15} />
                      <span>Shared library</span>
                    </Center>
                  ),
                },
              ]}
            />
          )}
          {tree && (
            <Text size="xs" c="dimmed" px={6} pt="xs" pb={6}>
              {library === 'shared'
                ? 'Sample topics for everyone. Generate tests from them; they can’t be changed.'
                : 'Your own topics and documents. Only you can see them.'}
            </Text>
          )}
          {tree && libraryRoots.length === 0 && (
            <EmptyState title="No topics yet" icon={IconFolders}>
              Create a topic with New topic to upload your own PDFs.
            </EmptyState>
          )}
          {tree && libraryRoots.length > 0 && (
            <ScrollArea className="kg-topic-scroll" scrollbars="y" type="auto" offsetScrollbars>
              <TopicTree roots={libraryRoots} selectedId={selectedId} onSelect={select} />
            </ScrollArea>
          )}
        </Paper>

        <div className="kg-library-detail">
          {!selected ? (
            <Paper p="xl" className="kg-fill kg-center">
              <EmptyState
                title={selectedId != null && tree ? 'Topic not found' : 'Select a topic'}
                icon={IconFolders}
              >
                Pick a topic on the left to see and upload its documents.
              </EmptyState>
            </Paper>
          ) : (
            <>
              <Paper p="lg" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
                <Group justify="space-between" align="flex-start" gap="md">
                  {/* Takes the free width, so a long path wraps here and the buttons stay beside it. */}
                  <Group gap="md" align="flex-start" wrap="nowrap" style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <ThemeIcon variant="light" size={44} radius="md">
                      <IconFolderOpen size={24} stroke={1.6} />
                    </ThemeIcon>
                    <div style={{ minWidth: 0 }}>
                      <Text size="xs" c="dimmed" fw={500}>
                        {topicPathLabel(tree, selected.id)}
                      </Text>
                      <Group gap="xs" wrap="nowrap">
                        <Title order={2} fz={22}>
                          {selected.name}
                        </Title>
                        {selected.shared && (
                          <Tooltip label="Sample content shared with everyone: you can generate tests from it, but not change it">
                            <Badge variant="light" color="gray" leftSection={<IconLock size={12} />}>
                              Shared library
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                    </div>
                  </Group>
                  <Group gap="xs" wrap="nowrap">
                    {/* The shared library is read-only (ADR010): no sub-topics, renaming or deleting. */}
                    {!selected.readOnly && (
                      <Button
                        variant="default"
                        leftSection={<IconFolderPlus size={16} />}
                        onClick={() => setFormTarget({ mode: 'create', parent: selected })}
                      >
                        Add sub-topic
                      </Button>
                    )}
                    {canGenerate ? (
                      <Button
                        component={Link}
                        to={`/tests/new?topicId=${selected.id}`}
                        variant="gradient"
                        leftSection={<IconSparkles size={16} />}
                      >
                        Generate test
                      </Button>
                    ) : (
                      // data-disabled instead of disabled, so the tooltip still gets hover events.
                      <Tooltip label="Upload and ingest at least one PDF in this topic or one of its sub-topics first">
                        <Button
                          data-disabled
                          onClick={(event) => event.preventDefault()}
                          leftSection={<IconSparkles size={16} />}
                        >
                          Generate test
                        </Button>
                      </Tooltip>
                    )}
                    {!selected.readOnly && (
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="default" size="lg" aria-label="Topic actions">
                            <IconDots size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={16} />}
                            onClick={() => setFormTarget({ mode: 'edit', topic: selected })}
                          >
                            Rename
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={() => handleDelete(selected)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </Group>
                </Group>
                {/* Below the title row, so it can use the full width; indented to line up with the title
                    (icon 44 px + md gap). */}
                {selected.description && (
                  <Text c="dimmed" size="sm" mt={4} pl={44 + 16}>
                    {selected.description}
                  </Text>
                )}
              </Paper>

              <DocumentsPanel key={selected.id} topicId={selected.id} readOnly={selected.readOnly} />
            </>
          )}
        </div>
      </div>

      <TopicFormModal
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={(id) => formTarget?.mode === 'create' && select(id)}
      />
      <ImportTreeModal opened={importOpen} onClose={() => setImportOpen(false)} onCreated={select} />
    </div>
  );
}
