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

/** How API calls get the signed-in user's token; set by app/auth.tsx when sign-in is on. */
interface ApiAuth {
  getAccessToken: () => Promise<string | undefined>;
  /** Called when the API answers 401 although a token was sent: the session ended. */
  onUnauthorized: () => void;
}

let apiAuth: ApiAuth | null = null;

export function configureApiAuth(auth: ApiAuth) {
  apiAuth = auth;
}

/** Participants (ADR009) are anonymous: their calls never carry a token, so an old token can't break them. */
function needsToken(url: string): boolean {
  const path = new URL(url, window.location.origin).pathname;
  return path.startsWith('/api/') && !path.startsWith('/api/public/');
}

async function authorizationFor(url: string): Promise<string | undefined> {
  if (!apiAuth || !needsToken(url)) return undefined;
  const token = await apiAuth.getAccessToken();
  return token ? `Bearer ${token}` : undefined;
}

/**
 * The library (tenant) an admin is viewing read-only, or undefined for the user's own (ADR013). Set by the admin
 * library view; content requests then carry it in the X-KG-Tenant header.
 */
let viewedTenantId: number | undefined;

export function setViewedTenant(tenantId: number | undefined) {
  viewedTenantId = tenantId;
}

/** The header that makes a content request read the viewed library; only content requests carry it. */
function tenantHeaderFor(url: string): string | undefined {
  if (viewedTenantId === undefined) return undefined;
  const path = new URL(url, window.location.origin).pathname;
  return path.startsWith('/api/content/') ? String(viewedTenantId) : undefined;
}

export const TENANT_HEADER = 'X-KG-Tenant';

function checkSession(response: Response, sentToken: boolean) {
  if (response.status === 401 && sentToken) apiAuth?.onUnauthorized();
}

api.use({
  async onRequest({ request }) {
    const authorization = await authorizationFor(request.url);
    if (authorization) request.headers.set('Authorization', authorization);
    const tenant = tenantHeaderFor(request.url);
    if (tenant) request.headers.set(TENANT_HEADER, tenant);
    return request;
  },
  onResponse({ request, response }) {
    checkSession(response, request.headers.has('Authorization'));
    return response;
  },
});

/** fetch with the access token added (when sign-in is on). For the helpers below and file downloads. */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const authorization = await authorizationFor(url);
  const headers = new Headers(init.headers);
  if (authorization) headers.set('Authorization', authorization);
  const tenant = tenantHeaderFor(url);
  if (tenant) headers.set(TENANT_HEADER, tenant);
  const response = await fetch(url, { ...init, headers });
  checkSession(response, authorization !== undefined);
  return response;
}

/** Headers for a request made by a library (e.g. PDF.js), with the access token when sign-in is on. */
export async function authHeaders(url: string): Promise<Record<string, string>> {
  const authorization = await authorizationFor(url);
  const tenant = tenantHeaderFor(url);
  return {
    ...(authorization ? { Authorization: authorization } : {}),
    ...(tenant ? { [TENANT_HEADER]: tenant } : {}),
  };
}

/** Whether file links need a token, so they must be fetched by script instead of opened as plain links. */
export function fileLinksNeedToken(): boolean {
  return apiAuth !== null;
}

async function fetchFile(url: string): Promise<Blob> {
  const response = await authFetch(url);
  if (!response.ok) throw new ApiError(response.status, `${response.status} ${response.statusText}`);
  return response.blob();
}

/** Opens a file from the API in a new tab (the browser shows PDFs itself). */
export async function openFileInNewTab(url: string): Promise<void> {
  // Opened before the download starts, so the browser doesn't treat it as an unrequested pop-up.
  const tab = window.open('', '_blank');
  const objectUrl = URL.createObjectURL(await fetchFile(url));
  if (tab) tab.location.href = objectUrl;
  else window.location.href = objectUrl;
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** Saves a file from the API under `fileName`. */
export async function downloadFile(url: string, fileName: string): Promise<void> {
  const objectUrl = URL.createObjectURL(await fetchFile(url));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

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
  return parseResponse<T>(await authFetch(url, { method: 'POST', body: form }));
}

/**
 * Untyped JSON POST, for an endpoint that is not in `schema.d.ts` yet (the backend wasn't running to
 * regenerate it). After `npm run gen:api`, prefer `unwrap(api.POST(...))`.
 */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  return parseResponse<T>(
    await authFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

/** Untyped JSON GET, for an endpoint that is not in `schema.d.ts` yet. Same error handling as `unwrap`. */
export async function getJson<T>(url: string): Promise<T> {
  return parseResponse<T>(await authFetch(url));
}

async function parseResponse<T>(response: Response): Promise<T> {
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
