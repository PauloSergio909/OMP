# ══════════════════════════════════════════════════════════════
# Web Dockerfile — Monorepo-aware, multi-stage
# Build context deve ser a RAIZ do monorepo (fleetmaster/)
# ══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# Stage 1: builder — compila o bundle React/Vite
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json         ./apps/web/

RUN npm ci

COPY packages/shared    ./packages/shared
COPY apps/web/src       ./apps/web/src
COPY apps/web/index.html         ./apps/web/
COPY apps/web/vite.config.ts     ./apps/web/
COPY apps/web/tailwind.config.ts ./apps/web/
COPY apps/web/postcss.config.js  ./apps/web/
COPY apps/web/tsconfig.json      ./apps/web/
COPY apps/web/tsconfig.node.json ./apps/web/

WORKDIR /app/apps/web
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2: runner — nginx serve os assets estáticos
# ──────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove configuração padrão
RUN rm /etc/nginx/conf.d/default.conf

# Configuração de SPA: redireciona tudo para index.html (react-router)
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    location /api/ { \
        proxy_pass http://api:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/app.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ | grep -q '<div id="root">' || exit 1

CMD ["nginx", "-g", "daemon off;"]
