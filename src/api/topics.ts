import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getJson, unwrap, unwrapVoid } from './client';
import type { TopicCreateInput, TopicDto, TopicNode, TopicTreeNodeInput, TopicUpdateInput } from './types';

export const topicKeys = {
  all: ['topics'] as const,
  tree: ['topics', 'tree'] as const,
  ingestedCounts: ['topics', 'ingested-counts'] as const,
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
      position: topic.position ?? undefined,
      readOnly: topic.readOnly ?? false,
      shared: topic.shared ?? false,
      children: [],
    });
  }

  const treeRoots: TopicNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else treeRoots.push(node);
  }

  // Position first (lowest first, missing last), then name.
  const byName = (a: TopicNode, b: TopicNode) =>
    (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
    a.name.localeCompare(b.name);
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

/**
 * Ingested documents per topic id, counting each topic's own documents only. Use `subtreeCount` for a topic
 * together with its sub-topics, which is what test generation uses.
 */
export function useIngestedDocumentCounts() {
  return useQuery({
    queryKey: topicKeys.ingestedCounts,
    // Documents are ingested in the background too, so always refresh when a page opens.
    staleTime: 0,
    queryFn: async () => {
      const rows = await unwrap(api.GET('/api/content/topics/ingested-document-counts'));
      return new Map(rows.map((r) => [r.topicId!, r.ingestedDocuments ?? 0]));
    },
  });
}

/** Ingested documents of a topic and all its sub-topics. */
export function subtreeCount(node: TopicNode, counts: Map<number, number>): number {
  return node.children.reduce((sum, child) => sum + subtreeCount(child, counts), counts.get(node.id) ?? 0);
}

/**
 * Focus suggestions for the dev-seeded demo topics, keyed by topic id. They come from a dev-only endpoint that exists
 * only when the backend seeds the demo content; elsewhere it answers 404 and there are simply no suggestions.
 */
export function useDevFocusSuggestions() {
  return useQuery({
    queryKey: [...topicKeys.all, 'dev-focus-suggestions'] as const,
    queryFn: async (): Promise<Map<number, string[]>> => {
      try {
        const byId = await getJson<Record<string, string[]>>('/api/dev/focus-suggestions');
        return new Map(Object.entries(byId).map(([id, list]) => [Number(id), list]));
      } catch {
        return new Map();
      }
    },
    retry: false,
    staleTime: Infinity,
  });
}

/**
 * Focus suggestions for the selected topics: those of each topic, its parents and its sub-topics (a suggestion on a
 * parent still applies to one of its sub-topics, and the reverse), without duplicates.
 */
export function focusSuggestionsFor(
  tree: TopicTree,
  suggestions: Map<number, string[]>,
  topicIds: number[],
  max = 8,
): string[] {
  const seen = new Set<string>();
  const add = (node: TopicNode | undefined) => node && suggestions.get(node.id)?.forEach((s) => seen.add(s));
  const addSubtree = (node: TopicNode) => {
    add(node);
    node.children.forEach(addSubtree);
  };
  for (const id of topicIds) {
    const node = tree.byId.get(id);
    if (!node) continue;
    addSubtree(node);
    for (let parentId = node.parentId; parentId != null; parentId = tree.byId.get(parentId)?.parentId) {
      add(tree.byId.get(parentId));
    }
  }
  return [...seen].slice(0, max);
}
