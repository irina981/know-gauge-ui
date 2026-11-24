import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AboutPage } from '@/features/about/AboutPage';
import { AttemptPage } from '@/features/attempts/AttemptPage';
import { AttemptsPage } from '@/features/attempts/AttemptsPage';
import { HomePage } from '@/features/home/HomePage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { PublicLayout } from '@/features/public/PublicLayout';
import { PublicAttemptPage, PublicResultsPage } from '@/features/public/PublicAttemptPage';
import { InvitationPage, SharedLinkPage } from '@/features/public/StartTestPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SystemSettingsPage } from '@/features/admin/SystemSettingsPage';
import { WorkspacesPage } from '@/features/admin/WorkspacesPage';
import { WorkspaceScope } from './WorkspaceScope';
import { GenerateTestPage } from '@/features/tests/GenerateTestPage';
import { TestsPage } from '@/features/tests/TestsPage';
import { TestReviewPage } from '@/features/review/TestReviewPage';
import { AuthCallbackPage, KgAuthProvider, RequireAdmin, RequireAuth } from './AuthRoutes';
import { Layout } from './Layout';
import { queryClient } from './queryClient';
import { theme } from './theme';

/** URL -> page. Add new pages here. */
const router = createBrowserRouter([
  // Public home page: what KnowGauge is, with Sign in and Create account (straight to the Library when signed in).
  { path: '/', element: <HomePage /> },
  // Keycloak sends the browser back here after signing in.
  { path: 'auth/callback', element: <AuthCallbackPage /> },
  // Participants (ADR009): no admin navigation, no sign-in. Tokens, never ids.
  {
    element: <PublicLayout />,
    children: [
      { path: 't/:token', element: <SharedLinkPage /> },
      { path: 'i/:token', element: <InvitationPage /> },
      { path: 'a/:token', element: <PublicAttemptPage /> },
      { path: 'r/:token', element: <PublicResultsPage /> },
    ],
  },
  // The app itself: needs a signed-in user (when sign-in is on).
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: 'library', element: <LibraryPage /> },
          { path: 'library/topics/:topicId', element: <LibraryPage /> },
          { path: 'tests', element: <TestsPage /> },
          { path: 'tests/new', element: <GenerateTestPage /> },
          { path: 'tests/:testId', element: <TestReviewPage /> },
          { path: 'attempts', element: <AttemptsPage /> },
          { path: 'attempts/:attemptId', element: <AttemptPage /> },
          { path: 'about', element: <AboutPage /> },
          { path: 'settings', element: <Navigate to="/settings/profile" replace /> },
          { path: 'settings/:tab', element: <SettingsPage /> },
          // Admins only (ADR013): everyone else is sent to their Library (the API would refuse them too).
          {
            element: <RequireAdmin />,
            children: [
              { path: 'admin/workspaces', element: <WorkspacesPage /> },
              { path: 'admin/settings', element: <SystemSettingsPage /> },
              // Another user's workspace, read-only: the same pages under the workspace's own address.
              {
                path: 'admin/workspaces/:tenantId',
                element: <WorkspaceScope />,
                children: [
                  { index: true, element: <Navigate to="library" replace /> },
                  { path: 'library', element: <LibraryPage /> },
                  { path: 'library/topics/:topicId', element: <LibraryPage /> },
                  { path: 'tests', element: <TestsPage /> },
                  { path: 'tests/:testId', element: <TestReviewPage /> },
                  { path: 'attempts', element: <AttemptsPage /> },
                  { path: 'attempts/:attemptId', element: <AttemptPage /> },
                ],
              },
            ],
          },
          { path: '*', element: <Navigate to="/library" replace /> },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <KgAuthProvider>
        <QueryClientProvider client={queryClient}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <RouterProvider router={router} />
          </ModalsProvider>
        </QueryClientProvider>
      </KgAuthProvider>
    </MantineProvider>
  );
}
