/**
 * Settings that differ per environment, read when the app starts.
 *
 * - Docker / nginx: `/config.js` sets `window.__KG_CONFIG__` from the container's environment variables, so one
 *   image works locally and on any server.
 * - `npm run dev`: `VITE_OIDC_AUTHORITY` / `VITE_OIDC_CLIENT_ID` from `.env.local`.
 *
 * Without an OIDC authority, sign-in is off: the UI works like before, against a backend in security mode `fixed`.
 */
interface RuntimeConfig {
  /** Keycloak realm URL, e.g. `http://localhost:8180/realms/knowgauge`. Empty: no sign-in. */
  oidcAuthority?: string;
  /** Keycloak client of the UI. */
  oidcClientId?: string;
}

declare global {
  interface Window {
    __KG_CONFIG__?: RuntimeConfig;
  }
}

const runtime: RuntimeConfig = window.__KG_CONFIG__ ?? {};

function pick(runtimeValue: string | undefined, buildValue: string | undefined): string {
  return (runtimeValue?.trim() || buildValue?.trim() || '').replace(/\/+$/, '');
}

export const config = {
  oidcAuthority: pick(runtime.oidcAuthority, import.meta.env.VITE_OIDC_AUTHORITY),
  oidcClientId: pick(runtime.oidcClientId, import.meta.env.VITE_OIDC_CLIENT_ID) || 'knowgauge-ui',
};

/** Whether users sign in (through Keycloak). */
export const authEnabled = config.oidcAuthority !== '';
