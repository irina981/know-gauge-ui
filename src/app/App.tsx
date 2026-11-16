import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AboutPage } from '@/features/about/AboutPage';
import { AttemptPage } from '@/features/attempts/AttemptPage';
import { AttemptsPage } from '@/features/attempts/AttemptsPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { PublicLayout } from '@/features/public/PublicLayout';
import { PublicAttemptPage, PublicResultsPage } from '@/features/public/PublicAttemptPage';
import { InvitationPage, SharedLinkPage } from '@/features/public/StartTestPage';
import { GenerateTestPage } from '@/features/tests/GenerateTestPage';
import { TestsPage } from '@/features/tests/TestsPage';
import { TestReviewPage } from '@/features/review/TestReviewPage';
import { Layout } from './Layout';
import { queryClient } from './queryClient';
import { theme } from './theme';

/** URL -> page. Add new pages here. */
const router = createBrowserRouter([
  // Participants (ADR009): no admin navigation. Tokens, never ids.
  {
    element: <PublicLayout />,
    children: [
      { path: 't/:token', element: <SharedLinkPage /> },
      { path: 'i/:token', element: <InvitationPage /> },
      { path: 'a/:token', element: <PublicAttemptPage /> },
      { path: 'r/:token', element: <PublicResultsPage /> },
    ],
  },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/library" replace /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'library/topics/:topicId', element: <LibraryPage /> },
      { path: 'tests', element: <TestsPage /> },
      { path: 'tests/new', element: <GenerateTestPage /> },
      { path: 'tests/:testId', element: <TestReviewPage /> },
      { path: 'attempts', element: <AttemptsPage /> },
      { path: 'attempts/:attemptId', element: <AttemptPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <Navigate to="/library" replace /> },
    ],
  },
]);

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <QueryClientProvider client={queryClient}>
        <ModalsProvider>
          <Notifications position="top-right" />
          <RouterProvider router={router} />
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
