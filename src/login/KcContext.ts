import type { ExtendKcContext } from 'keycloakify/login';
import type { KcEnvName, ThemeName } from '../kc.gen';

/** What Keycloak passes to the login theme (window.kcContext). No extra properties of our own yet. */
export type KcContextExtension = {
  themeName: ThemeName;
  properties: Record<KcEnvName, string> & {};
};

// No extra fields per page. Must be {} (not Record<string, never>), or ExtendKcContext collapses to never.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type KcContextExtensionPerPage = {};

export type KcContext = ExtendKcContext<KcContextExtension, KcContextExtensionPerPage>;
