import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, postMultipart, unwrap, unwrapVoid } from './client';
import type { DocumentDto, Page } from './types';

export const documentKeys = {
  all: ['documents'] as const,
  byTopic: (topicId: number) => ['documents', 'topic', topicId] as const,
  page: (topicId: number, page: number, size: number) => ['documents', 'topic', topicId, page, size] as const,
};

/** One page of a topic's documents (page is 0-based, like Spring). */
export function useTopicDocuments(topicId: number | undefined, page: number, size: number) {
  return useQuery({
    queryKey: documentKeys.page(topicId ?? -1, page, size),
    enabled: topicId != null,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const data = await unwrap(
        api.GET('/api/content/documents/all/{topicId}', {
          params: { path: { topicId: topicId! }, query: { pageable: { page, size } } },
          // Spring reads page/size as plain query parameters, not as a nested "pageable" object.
          querySerializer: () => `page=${page}&size=${size}`,
        }),
      );
      return data as unknown as Page<DocumentDto>;
    },
  });
}

/** Download URL. A plain link is enough; the browser handles the file. */
export function documentContentUrl(id: number): string {
  return `/api/content/documents/${id}/content`;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, file, title }: { topicId: number; file: File; title: string }) => {
      const form = new FormData();
      form.append('meta', JSON.stringify({ topicId, title }));
      form.append('file', file);
      return postMultipart<DocumentDto>('/api/content/documents', form);
    },
    onSuccess: (_, { topicId }) => queryClient.invalidateQueries({ queryKey: documentKeys.byTopic(topicId) }),
  });
}

const INGEST_KEY = ['documents', 'ingest'];

/** Ingestion runs synchronously on the server: this resolves only when the document is ingested. */
export function useIngestDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: INGEST_KEY,
    mutationFn: (id: number) =>
      unwrapVoid(
        api.POST('/api/content/documents/ingestion/{id}', { params: { path: { id } }, parseAs: 'text' }),
      ),
    // Refresh even on failure: the document status is FAILED then.
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

/** Ids of documents whose ingestion request is still running in this browser (from any screen). */
export function useIngestingDocumentIds(): number[] {
  return useMutationState({
    filters: { mutationKey: INGEST_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as number,
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      unwrapVoid(api.DELETE('/api/content/documents/{id}', { params: { path: { id } }, parseAs: 'text' })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
  });
}
