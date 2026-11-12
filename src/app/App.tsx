import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AboutPage } from '@/features/about/AboutPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { GenerateTestPage } from '@/features/tests/GenerateTestPage';
import { TestsPage } from '@/features/tests/TestsPage';
import { TestReviewPage } from '@/features/review/TestReviewPage';
import { Layout } from './Layout';
import { queryClient } from './queryClient';
import { theme } from './theme';

/** URL -> page. Add new pages here. */
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/library" replace /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'library/topics/:topicId', element: <LibraryPage /> },
      { path: 'tests', element: <TestsPage /> },
      { path: 'tests/new', element: <GenerateTestPage /> },
      { path: 'tests/:testId', element: <TestReviewPage /> },
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
