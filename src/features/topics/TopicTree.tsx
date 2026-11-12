import { Box, Group, Text, Tree, type TreeNodeData, getTreeExpandedState, useTree } from '@mantine/core';
import { IconChevronRight, IconFolder, IconFolderOpen } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import type { TopicNode } from '@/api/types';

function toTreeData(nodes: TopicNode[]): TreeNodeData[] {
  return nodes.map((n) => ({ value: String(n.id), label: n.name, children: toTreeData(n.children) }));
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
  const tree = useTree({ initialExpandedState: getTreeExpandedState(data, '*') });

  // Expand newly created topics too.
  useEffect(() => {
    tree.setExpandedState({ ...getTreeExpandedState(data, '*'), ...tree.expandedState });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
            <Text
              size="sm"
              fw={selected ? 600 : 400}
              c={selected ? 'var(--mantine-primary-color-light-color)' : undefined}
              truncate
            >
              {node.label}
            </Text>
          </Group>
        );
      }}
    />
  );
}
