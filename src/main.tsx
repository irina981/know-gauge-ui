import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
// After Mantine's CSS, so the brand styles win.
import './app/brand.css';

import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { KcPage } from './kc.gen';

// The same bundle is the Keycloak login theme (src/login/, built by `npm run build-keycloak-theme`): inside
// Keycloak, window.kcContext is set and the login pages are shown instead of the app.
// eslint-disable-next-line react-refresh/only-export-components -- the entry point exports nothing
const App = lazy(() => import('./app/App').then((module) => ({ default: module.App })));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense>{window.kcContext ? <KcPage kcContext={window.kcContext} /> : <App />}</Suspense>
  </StrictMode>,
);
