import { Button, Grid, Group, Menu, Paper, ScrollArea, Stack, Text, Title, ActionIcon } from '@mantine/core';
import {
  IconDots,
  IconFileImport,
  IconFolderPlus,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { topicPathLabel, useDeleteTopic, useTopicTree } from '@/api/topics';
import type { TopicNode } from '@/api/types';
import { DocumentTable } from '@/features/documents/DocumentTable';
import { UploadDropzone } from '@/features/documents/UploadDropzone';
import { ImportTreeModal } from '@/features/topics/ImportTreeModal';
import { TopicFormModal, type TopicFormTarget } from '@/features/topics/TopicFormModal';
import { TopicTree } from '@/features/topics/TopicTree';
import { EmptyState, ErrorAlert, PageLoader } from '@/shared/components';
import { confirmDelete } from '@/shared/confirm';

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
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Library</Title>
        <Group gap="xs">
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
            onClick={() => setFormTarget({ mode: 'create', parent: selected })}
          >
            New topic
          </Button>
        </Group>
      </Group>

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
          <Paper p="xs" radius="md">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" px={6} py={4}>
              Topics
            </Text>
            {isLoading && <PageLoader />}
            {error && <ErrorAlert error={error} title="Could not load topics" />}
            {tree && tree.roots.length === 0 && (
              <EmptyState title="No topics yet">Create a topic to start uploading documents.</EmptyState>
            )}
            {tree && tree.roots.length > 0 && (
              <ScrollArea.Autosize mah="calc(100vh - 220px)">
                <TopicTree roots={tree.roots} selectedId={selectedId} onSelect={select} />
              </ScrollArea.Autosize>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
          {!selected ? (
            <Paper p="xl" radius="md">
              <EmptyState title={selectedId != null && tree ? 'Topic not found' : 'Select a topic'}>
                Pick a topic on the left to see and upload its documents.
              </EmptyState>
            </Paper>
          ) : (
            <Stack gap="lg">
              <Paper p="lg" radius="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text size="xs" c="dimmed">
                      {topicPathLabel(tree, selected.id)}
                    </Text>
                    <Title order={3}>{selected.name}</Title>
                    {selected.description && (
                      <Text c="dimmed" size="sm" mt={4}>
                        {selected.description}
                      </Text>
                    )}
                  </div>
                  <Group gap="xs" wrap="nowrap">
                    <Button
                      variant="default"
                      leftSection={<IconFolderPlus size={16} />}
                      onClick={() => setFormTarget({ mode: 'create', parent: selected })}
                    >
                      Add sub-topic
                    </Button>
                    <Button
                      component={Link}
                      to={`/tests/new?topicId=${selected.id}`}
                      variant="light"
                      leftSection={<IconSparkles size={16} />}
                    >
                      Generate test
                    </Button>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="default" size="lg" aria-label="Topic actions">
                          <IconDots size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconFolderPlus size={16} />}
                          onClick={() => setFormTarget({ mode: 'create', parent: selected })}
                        >
                          Add sub-topic
                        </Menu.Item>
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
                  </Group>
                </Group>
              </Paper>

              <Paper p="lg" radius="md">
                <Title order={4} mb="md">
                  Documents
                </Title>
                <Stack gap="lg">
                  <UploadDropzone topicId={selected.id} />
                  <DocumentTable key={selected.id} topicId={selected.id} />
                </Stack>
              </Paper>
            </Stack>
          )}
        </Grid.Col>
      </Grid>

      <TopicFormModal
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={(id) => formTarget?.mode === 'create' && select(id)}
      />
      <ImportTreeModal opened={importOpen} onClose={() => setImportOpen(false)} onCreated={select} />
    </>
  );
}
