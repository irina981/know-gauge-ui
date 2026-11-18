import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { useAuth } from 'react-oidc-context';
import { configureApiAuth } from '@/api/client';
import { authEnabled, config } from './config';
import { queryClient } from './queryClient';

/**
 * Sign-in through Keycloak (OIDC, Authorization Code + PKCE). The login, registration and password pages are
 * Keycloak's, in the KnowGauge theme (keycloak-theme/). The app only redirects there and keeps the tokens.
 * The components that use this (provider, route guard, callback page) are in AuthRoutes.tsx.
 *
 * With sign-in off (no OIDC authority configured, see config.ts) everything here is a no-op and every page is open.
 */

/** Where Keycloak sends the browser back after signing in. Registered as a redirect URI of the client. */
const CALLBACK_PATH = '/auth/callback';

/** The page to open after signing in, carried through Keycloak in the OIDC state. */
interface SignInState {
  returnTo?: string;
}

export const userManager: UserManager | null = authEnabled
  ? new UserManager({
      authority: config.oidcAuthority,
      client_id: config.oidcClientId,
      redirect_uri: `${window.location.origin}${CALLBACK_PATH}`,
      post_logout_redirect_uri: `${window.location.origin}/`,
      response_type: 'code',
      scope: 'openid profile email',
      // Renews the access token (5 minutes in Keycloak) with the refresh token before it expires.
      automaticSilentRenew: true,
      // localStorage: a new tab or a reload stays signed in.
      userStore: new WebStorageStateStore({ store: window.localStorage }),
    })
  : null;

/**
 * Access token for an API call: the current one, renewed first when it has expired (e.g. after the laptop slept).
 * `undefined` when sign-in is off or nobody is signed in.
 */
async function getAccessToken(): Promise<string | undefined> {
  if (!userManager) return undefined;
  let user: User | null = await userManager.getUser();
  if (user?.expired) {
    try {
      user = await userManager.signinSilent();
    } catch {
      return undefined;
    }
  }
  return user?.access_token;
}

/** The session ended (the API answered 401 to a signed-in user): sign in again and come back to this page. */
function signInAgain() {
  const returnTo = window.location.pathname + window.location.search;
  void userManager?.signinRedirect({ state: { returnTo } satisfies SignInState });
}

// Every API call (except the participants' /api/public/**) carries the access token.
if (userManager) {
  configureApiAuth({ getAccessToken, onUnauthorized: signInAgain });
}

export interface Session {
  /** Sign-in is configured. When false, everyone is "signed in" and the other fields don't matter. */
  enabled: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  name?: string;
  email?: string;
  /** Right after signing in: the page the user wanted before (from the OIDC state). */
  returnTo?: string;
  /** Opens Keycloak's sign-in page; afterwards the app opens `returnTo` (default: the Library). */
  signIn: (returnTo?: string) => void;
  /** Opens Keycloak's registration page directly. */
  signUp: (returnTo?: string) => void;
  /** Ends the Keycloak session too and comes back to the home page. */
  signOut: () => void;
}

function useOidcSession(): Session {
  const auth = useAuth();
  const profile = auth.user?.profile;
  return {
    enabled: true,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    name: profile?.name ?? profile?.preferred_username,
    email: profile?.email,
    returnTo: (auth.user?.state as SignInState | undefined)?.returnTo,
    signIn: (returnTo) => void auth.signinRedirect({ state: { returnTo } satisfies SignInState }),
    // prompt=create (OIDC "Initiating User Registration"): Keycloak shows its registration form.
    signUp: (returnTo) =>
      void auth.signinRedirect({ prompt: 'create', state: { returnTo } satisfies SignInState }),
    signOut: () => {
      queryClient.clear();
      void auth.signoutRedirect();
    },
  };
}

const noop = () => {};

function useNoSession(): Session {
  return {
    enabled: false,
    isLoading: false,
    isAuthenticated: true,
    signIn: noop,
    signUp: noop,
    signOut: noop,
  };
}

/** The current session. Chosen once at startup, so the hook order never changes between renders. */
export const useSession: () => Session = authEnabled ? useOidcSession : useNoSession;
