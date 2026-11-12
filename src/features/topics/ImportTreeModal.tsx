import { Button, Group, JsonInput, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useCreateTopicTree } from '@/api/topics';
import type { TopicTreeNodeInput } from '@/api/types';

const EXAMPLE = `{
  "name": "Java",
  "description": "Core Java topics",
  "children": [
    { "name": "Collections" },
    {
      "name": "Concurrency",
      "children": [{ "name": "Executors" }, { "name": "CompletableFuture" }]
    }
  ]
}`;

/** Create a whole topic tree at once by pasting JSON (POST /api/content/topics/tree). */
export function ImportTreeModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated?: (rootId: number) => void;
}) {
  const [json, setJson] = useState(EXAMPLE);
  const [error, setError] = useState<string | null>(null);
  const createTree = useCreateTopicTree();

  const submit = () => {
    let input: TopicTreeNodeInput;
    try {
      input = JSON.parse(json);
    } catch {
      setError('This is not valid JSON');
      return;
    }
    setError(null);
    createTree.mutate(input, {
      onSuccess: (root) => {
        onCreated?.(root.id!);
        onClose();
      },
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Import topic tree" size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Paste a topic with nested <code>children</code>. Each node needs a <code>name</code>;{' '}
          <code>description</code> is optional. The whole tree is created as a new root topic.
        </Text>
        <JsonInput
          value={json}
          onChange={setJson}
          error={error}
          autosize
          minRows={12}
          maxRows={24}
          formatOnBlur
          validationError="Invalid JSON"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={createTree.isPending}>
            Create tree
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
