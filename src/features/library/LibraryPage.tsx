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
  IconBuildingCommunity,
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
import { useMe, usePermissions } from '@/api/account';
import { useLibraries } from '@/api/admin';
import type { TopicNode } from '@/api/types';
import { DocumentsPanel } from '@/features/documents/DocumentsPanel';
import { useViewedWorkspace, useWorkspacePath } from '@/app/viewedWorkspace';
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

/**
 * Topics on the left, the selected topic and its documents on the right. While an admin views another user's
 * workspace (ADR013), it shows their library only, read-only.
 */
export function LibraryPage() {
  const viewed = useViewedWorkspace();
  // Users and viewers read the library; only its admins change it (ADR017).
  const { canChangeLibrary, canCreateTests } = usePermissions();
  const params = useParams();
  const selectedId = params.topicId ? Number(params.topicId) : undefined;
  const navigate = useNavigate();
  const wp = useWorkspacePath();
  const { data: tree, isLoading, error } = useTopicTree();
  const deleteTopic = useDeleteTopic();

  const [formTarget, setFormTarget] = useState<TopicFormTarget | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const select = (id: number) => navigate(wp(`/library/topics/${id}`));
  const selected = selectedId != null ? tree?.byId.get(selectedId) : undefined;

  // The tree shows one library at a time: the user's own topics or the shared library (ADR010). An open topic
  // decides which one (a link may point into either); otherwise the last choice, kept in this browser. A viewed
  // library shows only its own topics.
  const [chosenLibrary, setChosenLibrary] = useState<LibraryView>(loadLibraryView);
  // An admin fills the shared libraries (ADR015), so they see the switch as soon as one exists, even an empty one.
  const { data: me } = useMe();
  const isAdmin = !viewed && !!me?.roles?.includes('ADMIN');
  // An organization's members share its library (ADR015): call it by the organization's name.
  const organization = !viewed && me?.tenantType === 'ORGANIZATION' ? me.tenantName : undefined;
  const { data: libraries = [] } = useLibraries(isAdmin);
  const hasShared = !viewed && (!!tree?.roots.some((t) => t.shared) || (isAdmin && libraries.length > 0));
  const library: LibraryView = !hasShared
    ? 'mine'
    : selected
      ? selected.shared
        ? 'shared'
        : 'mine'
      : chosenLibrary;
  const libraryRoots = tree ? tree.roots.filter((t) => t.shared === (library === 'shared')) : [];
  // New topics and imported trees go into a library while an admin works on the shared view.
  const editingLibraries = isAdmin && library === 'shared' && libraries.length > 0 ? libraries : undefined;
  const chooseLibrary = (view: LibraryView) => {
    setChosenLibrary(view);
    saveLibraryView(view);
    // A topic from the other library would keep the tree on that library, so close it.
    if (selected && selected.shared !== (view === 'shared')) navigate('/library');
  };

  // A topic stands for its whole subtree in test generation, so a parent topic without documents of its own can
  // be used as long as an ingested document exists somewhere below it. The counts refresh after ingestion.
  const { data: ingestedCounts } = useIngestedDocumentCounts();
  const canGenerate =
    !viewed && canCreateTests && !!selected && !!ingestedCounts && subtreeCount(selected, ingestedCounts) > 0;

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
        eyebrow={viewed ? 'Knowledge base · read-only' : 'Knowledge base'}
        title={viewed ? `${viewed.name} · library` : 'Library'}
        description={
          viewed
            ? 'Another user’s library, viewed as an admin. You can open and download, but not change anything.'
            : 'Organise your source material in topics. Uploaded PDFs are indexed so every test is grounded in them.'
        }
        icon={IconBooks}
        actions={
          viewed || !canChangeLibrary ? null : (
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
          )
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
                      {organization ? <IconBuildingCommunity size={15} /> : <IconUser size={15} />}
                      <Text
                        span
                        inherit
                        truncate
                        maw={160}
                        title={organization ? `${organization} library` : undefined}
                      >
                        {organization ? `${organization} library` : 'My library'}
                      </Text>
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
              {viewed
                ? `Topics and documents of ${viewed.name}.`
                : library === 'shared'
                  ? isAdmin
                    ? 'Topics every user can read and generate tests from. As an admin you add and change them here.'
                    : 'Sample topics for everyone. Generate tests from them; they can’t be changed.'
                  : organization
                    ? `Topics and documents of ${organization}. Everyone in the organization and KnowGauge admins can see them.`
                    : 'Your own topics and documents. Only you and KnowGauge admins can see them.'}
            </Text>
          )}
          {tree && libraryRoots.length === 0 && (
            <EmptyState title="No topics yet" icon={IconFolders}>
              {viewed
                ? 'This library has no topics yet.'
                : library === 'shared'
                  ? 'Create a topic with New topic, then upload PDFs into it.'
                  : organization
                    ? 'Create a topic with New topic to upload the organization’s PDFs.'
                    : 'Create a topic with New topic to upload your own PDFs.'}
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
                {viewed
                  ? 'Pick a topic on the left to see its documents.'
                  : 'Pick a topic on the left to see and upload its documents.'}
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
                          <Tooltip
                            label={
                              selected.readOnly
                                ? 'Sample content shared with everyone: you can generate tests from it, but not change it'
                                : 'Shared with every user. As an admin you can change it.'
                            }
                          >
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
                    {/* An admin viewing another library only looks: no generation there (ADR013). */}
                    {viewed ? null : canGenerate ? (
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
        libraries={editingLibraries}
      />
      <ImportTreeModal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        onCreated={select}
        libraries={editingLibraries}
      />
    </div>
  );
}
