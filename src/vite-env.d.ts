/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Keycloak realm URL for `npm run dev`, e.g. http://localhost:8180/realms/knowgauge. Empty: no sign-in. */
  readonly VITE_OIDC_AUTHORITY?: string;
  /** Keycloak client of the UI (default knowgauge-ui). */
  readonly VITE_OIDC_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
