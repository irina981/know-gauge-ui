import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, unwrapVoid } from './client';
import type { TopicCreateInput, TopicDto, TopicNode, TopicTreeNodeInput, TopicUpdateInput } from './types';

export const topicKeys = {
  all: ['topics'] as const,
  tree: ['topics', 'tree'] as const,
};

export interface TopicTree {
  roots: TopicNode[];
  byId: Map<number, TopicNode>;
}

/**
 * The API has no "whole tree" endpoint, so we load the roots, then all descendants of each root,
 * and link them by parentId.
 */
async function fetchTopicTree(): Promise<TopicTree> {
  const roots = await unwrap(api.GET('/api/content/topics/roots'));
  const descendants = await Promise.all(
    roots.map((root) =>
      unwrap(
        api.GET('/api/content/topics/descendants/{parentId}', { params: { path: { parentId: root.id! } } }),
      ),
    ),
  );

  const byId = new Map<number, TopicNode>();
  for (const topic of [...roots, ...descendants.flat()] as TopicDto[]) {
    if (topic.id == null || byId.has(topic.id)) continue;
    byId.set(topic.id, {
      id: topic.id,
      name: topic.name ?? '',
      description: topic.description ?? undefined,
      parentId: topic.parentId ?? undefined,
      children: [],
    });
  }

  const treeRoots: TopicNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else treeRoots.push(node);
  }

  const byName = (a: TopicNode, b: TopicNode) => a.name.localeCompare(b.name);
  for (const node of byId.values()) node.children.sort(byName);
  treeRoots.sort(byName);

  return { roots: treeRoots, byId };
}

export function useTopicTree() {
  return useQuery({ queryKey: topicKeys.tree, queryFn: fetchTopicTree });
}

/** "Java › Spring › Boot" style label for a topic. */
export function topicPathLabel(tree: TopicTree | undefined, id: number): string {
  if (!tree) return `#${id}`;
  const names: string[] = [];
  let node = tree.byId.get(id);
  while (node) {
    names.unshift(node.name);
    node = node.parentId != null ? tree.byId.get(node.parentId) : undefined;
  }
  return names.length ? names.join(' › ') : `#${id}`;
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicCreateInput) => unwrap(api.POST('/api/content/topics', { body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.all }),
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: TopicUpdateInput & { id: number }) =>
      unwrap(api.PUT('/api/content/topics/{id}', { params: { path: { id } }, body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.all }),
  });
}

export function useCreateTopicTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicTreeNodeInput) => unwrap(api.POST('/api/content/topics/tree', { body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.all }),
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      unwrapVoid(api.DELETE('/api/content/topics/{id}', { params: { path: { id } }, parseAs: 'text' })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.all }),
  });
}
