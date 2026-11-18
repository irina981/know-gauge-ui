import { Center, Loader } from '@mantine/core';
import type { ReactNode } from 'react';
import { AuthProvider } from 'react-oidc-context';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { userManager, useSession } from './auth';

/** Keeps the signed-in user (sign-in on); passes children through unchanged when sign-in is off. */
export function KgAuthProvider({ children }: { children: ReactNode }) {
  if (!userManager) return <>{children}</>;
  return (
    <AuthProvider
      userManager={userManager}
      // Drop ?code=…&state=… from the address; AuthCallbackPage then opens the page the user wanted.
      onSigninCallback={() => window.history.replaceState({}, document.title, window.location.pathname)}
    >
      {children}
    </AuthProvider>
  );
}

function FullPageLoader() {
  return (
    <Center mih="100vh">
      <Loader />
    </Center>
  );
}

/** Pages behind this need a signed-in user; others are sent to the home page, which offers to sign in. */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();
  if (session.isLoading) return <FullPageLoader />;
  if (!session.isAuthenticated) {
    return <Navigate to="/" replace state={{ returnTo: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Keycloak redirects here after signing in; the provider exchanges the code, then this opens the wanted page. */
export function AuthCallbackPage() {
  const session = useSession();
  if (session.isLoading) return <FullPageLoader />;
  if (!session.isAuthenticated) return <Navigate to="/" replace />;
  const returnTo = session.returnTo;
  return <Navigate to={returnTo && returnTo.startsWith('/') ? returnTo : '/library'} replace />;
}
