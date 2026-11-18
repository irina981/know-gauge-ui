// Runtime settings, read before the app starts (src/app/config.ts).
// In Docker, nginx serves its own /config.js from environment variables (nginx.conf.template), so this file is
// only used by `npm run dev`. There, sign-in is set with VITE_OIDC_* in .env.local (see README).
window.__KG_CONFIG__ = window.__KG_CONFIG__ || {};
