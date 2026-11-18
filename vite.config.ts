import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { keycloakify } from 'keycloakify/vite-plugin';
import { fileURLToPath } from 'node:url';

// The UI calls the backend with relative URLs (/api/...).
// In development, Vite forwards them to the Spring Boot app, so no CORS setup is needed.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [
    react(),
    // Keycloak login theme (src/login/) in the app's style. `npm run build-keycloak-theme` packs it into
    // dist_keycloak/knowgauge-keycloak-theme.jar for Keycloak's providers folder. Generates src/kc.gen.tsx.
    keycloakify({
      themeName: 'knowgauge',
      accountThemeImplementation: 'none',
      keycloakVersionTargets: { '22-to-25': false, 'all-other-versions': 'knowgauge-keycloak-theme.jar' },
    }),
  ],
  resolve: {
    // Lets imports use "@/..." for files under src/, e.g. import { api } from '@/api/client'.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // An internal tool loaded once: one ~700 kB bundle is fine, so don't warn about it.
  build: { chunkSizeWarningLimit: 1000 },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        // Ingestion and test generation are synchronous and can take minutes.
        timeout: 30 * 60 * 1000,
        proxyTimeout: 30 * 60 * 1000,
      },
    },
  },
});
