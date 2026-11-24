import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { accountKeys } from './account';
import { api, postMultipart, unwrap, unwrapVoid } from './client';
import { topicKeys } from './topics';
import type { DocumentDto, Page } from './types';

export const documentKeys = {
  all: ['documents'] as const,
  byTopic: (topicId: number) => ['documents', 'topic', topicId] as const,
  page: (topicId: number, page: number, size: number) => ['documents', 'topic', topicId, page, size] as const,
};

/**
 * Ingestion can only be started for UPLOADED or FAILED documents; the server answers 409 otherwise
 * (an INGESTING document is already claimed, an INGESTED one is done).
 */
export const canStartIngestion = (doc: DocumentDto) => doc.status === 'UPLOADED' || doc.status === 'FAILED';

/**
 * The server's scheduled job ingests UPLOADED documents in the background, so a document's status can change
 * without any action in this browser. Refresh quickly while one is INGESTING, slowly while one is waiting.
 */
function documentsPollInterval(docs: DocumentDto[] | undefined): number | false {
  if (docs?.some((d) => d.status === 'INGESTING')) return 5_000;
  if (docs?.some((d) => d.status === 'UPLOADED')) return 30_000;
  return false;
}

/** One page of a topic's documents (page is 0-based, like Spring). */
export function useTopicDocuments(topicId: number | undefined, page: number, size: number) {
  return useQuery({
    queryKey: documentKeys.page(topicId ?? -1, page, size),
    enabled: topicId != null,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => documentsPollInterval(query.state.data?.content),
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

/** The same content served inline, so the browser shows the PDF (in a frame or tab) instead of saving it. */
export function documentPreviewUrl(id: number): string {
  return `${documentContentUrl(id)}?inline=true`;
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
    // Storage used (the limit banner and the usage page), also after a refused upload.
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountKeys.usage }),
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      queryClient.invalidateQueries({ queryKey: topicKeys.ingestedCounts });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      queryClient.invalidateQueries({ queryKey: topicKeys.ingestedCounts });
      queryClient.invalidateQueries({ queryKey: accountKeys.usage });
    },
  });
}
