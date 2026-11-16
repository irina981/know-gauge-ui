import { Box, Group, Text, Tree, type TreeNodeData, getTreeExpandedState, useTree } from '@mantine/core';
import { IconChevronRight, IconFolder, IconFolderOpen } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import type { TopicNode } from '@/api/types';

function toTreeData(nodes: TopicNode[]): TreeNodeData[] {
  return nodes.map((n) => ({ value: String(n.id), label: n.name, children: toTreeData(n.children) }));
}

/**
 * Which Library folders are open, kept in this browser so they stay open after visiting other pages or reloading.
 * Storage can be unavailable (private mode, blocked site data): the tree then simply starts collapsed.
 */
const EXPANDED_KEY = 'kg-library-expanded-topics';

function loadExpanded(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

function rememberExpanded(value: string, expanded: boolean) {
  try {
    const state = loadExpanded();
    if (expanded) state[value] = true;
    else delete state[value];
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: folders just aren't remembered
  }
}

/** Ids of the topics above `id`, from the root down; empty when `id` is a root or not in the tree. */
function ancestorIds(nodes: TopicNode[], id: number | undefined, path: number[] = []): number[] {
  if (id == null) return [];
  for (const node of nodes) {
    if (node.id === id) return path;
    const found = ancestorIds(node.children, id, [...path, node.id]);
    if (found.length || node.children.some((c) => c.id === id)) return found;
  }
  return [];
}

/** Expandable topic tree. Clicking a topic selects it; the chevron expands/collapses it. */
export function TopicTree({
  roots,
  selectedId,
  onSelect,
}: {
  roots: TopicNode[];
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  const data = useMemo(() => toTreeData(roots), [roots]);
  // Starts collapsed, except the folders the user left open last time and the path to the selected topic.
  const tree = useTree({
    initialExpandedState: getTreeExpandedState(data, []),
    onNodeExpand: (value) => rememberExpanded(value, true),
    onNodeCollapse: (value) => rememberExpanded(value, false),
  });

  // Restore the remembered folders, collapse topics that are new, and open the ancestors of the selected topic so
  // it is always visible (also right after creating a sub-topic, which selects it).
  useEffect(() => {
    const remembered = loadExpanded();
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(getTreeExpandedState(data, []))) {
      next[key] = remembered[key] ?? false;
    }
    for (const id of ancestorIds(roots, selectedId)) next[String(id)] = true;
    tree.setExpandedState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedId]);

  return (
    <Tree
      data={data}
      tree={tree}
      expandOnClick={false}
      levelOffset="md"
      renderNode={({ node, expanded, hasChildren, elementProps }) => {
        const selected = node.value === String(selectedId);
        return (
          <Group
            {...elementProps}
            gap={6}
            wrap="nowrap"
            onClick={() => onSelect(Number(node.value))}
            py={5}
            // Only right padding: Mantine indents each level with padding on the left.
            pr={6}
            style={{
              ...elementProps.style,
              cursor: 'pointer',
              borderRadius: 'var(--mantine-radius-sm)',
              background: selected ? 'var(--mantine-primary-color-light)' : undefined,
            }}
          >
            <Box
              w={16}
              style={{ display: 'flex', visibility: hasChildren ? 'visible' : 'hidden' }}
              onClick={(e) => {
                e.stopPropagation();
                tree.toggleExpanded(node.value);
              }}
            >
              <IconChevronRight
                size={14}
                style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 120ms' }}
              />
            </Box>
            {expanded && hasChildren ? (
              <IconFolderOpen size={16} stroke={1.5} />
            ) : (
              <IconFolder size={16} stroke={1.5} />
            )}
            {/* Long names are cut off with "…"; the full name shows on hover. */}
            <Text
              size="sm"
              fw={selected ? 600 : 400}
              c={selected ? 'var(--mantine-primary-color-light-color)' : undefined}
              truncate
              title={String(node.label)}
              style={{ flex: 1, minWidth: 0 }}
            >
              {node.label}
            </Text>
          </Group>
        );
      }}
    />
  );
}
