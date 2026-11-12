import createClient from 'openapi-fetch';
import type { paths } from './schema';

/**
 * Typed HTTP client for the KnowGauge backend.
 *
 * Paths, parameters and response bodies are checked against `schema.d.ts`, which is generated from the
 * backend's OpenAPI spec (`npm run gen:api`). URLs are relative: Vite (dev) or nginx (Docker) forwards
 * `/api` to the Spring Boot service.
 */
export const api = createClient<paths>({
  baseUrl: '',
  // Look up fetch on every call (not once at startup), so tests and dev tools can stub window.fetch.
  fetch: (request) => globalThis.fetch(request),
});

/** Error thrown for any non-2xx response. `message` is the backend's `HttpErrorInfo.message` when present. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function messageFrom(error: unknown, response: Response): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof error === 'string' && error.trim()) return error;
  return `${response.status} ${response.statusText || 'Request failed'}`;
}

/**
 * Turns an openapi-fetch result into "data or exception", which is what TanStack Query expects.
 *
 *   const topic = await unwrap(api.GET('/api/content/topics/{id}', { params: { path: { id } } }));
 */
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok) throw new ApiError(response.status, messageFrom(error, response));
  return data as T;
}

/** Same as {@link unwrap} for endpoints that return no body. */
export async function unwrapVoid(request: Promise<{ error?: unknown; response: Response }>): Promise<void> {
  const { error, response } = await request;
  if (!response.ok) throw new ApiError(response.status, messageFrom(error, response));
}

/**
 * Plain fetch for multipart requests (openapi-fetch is JSON-oriented). Same error handling as `unwrap`.
 */
export async function postMultipart<T>(url: string, form: FormData): Promise<T> {
  const response = await fetch(url, { method: 'POST', body: form });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // not JSON: keep the text
  }
  if (!response.ok) throw new ApiError(response.status, messageFrom(body, response));
  return body as T;
}
