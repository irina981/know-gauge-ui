# --- Build stage: compile the React app into static files (dist/) ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- Runtime stage: nginx serves the files and forwards /api to the backend ---
FROM nginx:1.27-alpine
# Files in /etc/nginx/templates are processed with envsubst at startup (${BACKEND_URL} below).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV BACKEND_URL=http://knowgauge-service:8080
# Sign-in (Keycloak): the realm URL as the browser reaches it, e.g. https://auth.example.com/realms/knowgauge.
# Empty: no sign-in. nginx only substitutes variables that exist, so both are always defined.
ENV OIDC_AUTHORITY=""
ENV OIDC_CLIENT_ID=knowgauge-ui
EXPOSE 80
