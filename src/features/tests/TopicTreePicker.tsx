import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Combobox,
  Group,
  Pill,
  PillsInput,
  Popover,
  ScrollArea,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import { subtreeCount, topicPathLabel, type TopicTree } from '@/api/topics';
import type { TopicNode } from '@/api/types';

interface TopicTreePickerProps {
  tree: TopicTree;
  /** Ingested documents per topic (own documents only). */
  counts: Map<number, number>;
  /** Selected topic ids, as strings (form values). */
  value: string[];
  onChange: (value: string[]) => void;
  error?: React.ReactNode;
  /**
   * `subtree` (default): several topics, each standing for its whole subtree.
   * `single`: one topic whose own documents are listed next, so only topics holding ingested documents themselves
   * can be picked; picking one closes the tree.
   */
  mode?: 'subtree' | 'single';
  label?: string;
  description?: string;
  placeholder?: string;
}

/**
 * A field with the selected topics as chips; clicking it opens the topic tree, where each topic appears once in its
 * place. A topic stands for its whole subtree: checking it
 * includes all its sub-topics, which are then shown as included rather than selectable on their own. Topics whose
 * subtree has no ingested documents cannot be chosen.
 */
export function TopicTreePicker({
  tree,
  counts,
  value,
  onChange,
  error,
  mode = 'subtree',
  label = 'Topics',
  description = 'A topic includes all its sub-topics. Only topics with ingested documents can be chosen.',
  placeholder = 'Choose topics',
}: TopicTreePickerProps) {
  const single = mode === 'single';
  const [opened, setOpened] = useState(false);
  const selected = new Set(value.map(Number));
  // Expand the roots, plus the path to anything already selected.
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const open = new Set(tree.roots.map((r) => r.id));
    for (const id of selected) {
      let node = tree.byId.get(id);
      while (node?.parentId != null) {
        open.add(node.parentId);
        node = tree.byId.get(node.parentId);
      }
    }
    return open;
  });

  const toggleExpanded = (id: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const descendantIds = (node: TopicNode): number[] =>
    node.children.flatMap((child) => [child.id, ...descendantIds(child)]);

  const toggleSelected = (node: TopicNode, checked: boolean) => {
    if (single) {
      onChange(checked ? [String(node.id)] : []);
      if (checked) setOpened(false);
      return;
    }
    const next = new Set(selected);
    if (checked) {
      next.add(node.id);
      // The parent now covers them, so separate selections below it are redundant.
      descendantIds(node).forEach((id) => next.delete(id));
    } else {
      next.delete(node.id);
    }
    onChange([...next].map(String));
  };

  const renderNode = (node: TopicNode, depth: number, coveredByParent: boolean): React.ReactNode => {
    const docs = subtreeCount(node, counts);
    const own = counts.get(node.id) ?? 0;
    const isSelected = selected.has(node.id);
    const included = coveredByParent || isSelected;
    // In single mode only the topic's own documents count, and a parent does not include its children.
    const usable = single ? own : docs;
    const disabled = usable === 0 || coveredByParent;
    const isOpen = expanded.has(node.id);
    const hint = single
      ? own > 0
        ? `${own} ingested document${own === 1 ? '' : 's'}`
        : docs > 0
          ? 'Its documents are in its sub-topics: pick one of those'
          : 'No ingested documents in this topic or its sub-topics'
      : docs === 0
        ? 'No ingested documents in this topic or its sub-topics'
        : coveredByParent
          ? 'Included through a selected parent topic'
          : own === docs
            ? `${docs} ingested document${docs === 1 ? '' : 's'}`
            : `${docs} ingested documents, including its sub-topics`;

    return (
      <Box key={node.id}>
        <Group gap={4} wrap="nowrap" pl={depth * 20} py={3}>
          {node.children.length > 0 ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => toggleExpanded(node.id)}
              aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
            >
              {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            </ActionIcon>
          ) : (
            <Box w={22} />
          )}
          <Tooltip label={hint} openDelay={400}>
            <Checkbox
              checked={included}
              disabled={disabled}
              onChange={(e) => toggleSelected(node, e.currentTarget.checked)}
              label={
                <Group gap={6} wrap="nowrap">
                  <Text size="sm" fw={node.children.length ? 600 : 400} c={docs === 0 ? 'dimmed' : undefined}>
                    {node.name}
                  </Text>
                  {/* Always the subtree total, in both modes; whether the topic can be picked is the checkbox. */}
                  <Badge
                    size="xs"
                    variant={docs ? 'light' : 'default'}
                    color={docs ? 'teal' : 'gray'}
                    tt="none"
                  >
                    {docs} doc{docs === 1 ? '' : 's'}
                  </Badge>
                </Group>
              }
            />
          </Tooltip>
        </Group>
        {isOpen && node.children.map((child) => renderNode(child, depth + 1, !single && included))}
      </Box>
    );
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      // Always open below the field, even near the bottom of the window: the page scrolls instead.
      middlewares={{ flip: false, shift: false }}
      width="target"
      shadow="md"
      trapFocus
    >
      <Popover.Target>
        <PillsInput
          label={label}
          description={description}
          error={error}
          pointer
          onClick={() => setOpened((o) => !o)}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
        >
          <Pill.Group>
            {value.map((id) => (
              <Pill
                key={id}
                withRemoveButton={!single}
                onRemove={() => onChange(value.filter((v) => v !== id))}
                // Removing a chip must not open or close the tree.
                onClick={(e) => e.stopPropagation()}
              >
                {topicPathLabel(tree, Number(id))}
              </Pill>
            ))}
            {value.length === 0 && (
              <Text size="sm" c="dimmed">
                {placeholder}
              </Text>
            )}
          </Pill.Group>
        </PillsInput>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <ScrollArea.Autosize mah={360}>
          {tree.roots.map((root) => renderNode(root, 0, false))}
        </ScrollArea.Autosize>
        <Group justify="flex-end" mt="xs">
          <Button size="xs" variant="light" onClick={() => setOpened(false)}>
            Done
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
