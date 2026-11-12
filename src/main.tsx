import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
// After Mantine's CSS, so the brand styles win.
import './app/brand.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
