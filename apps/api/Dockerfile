# ══════════════════════════════════════════════════════════════
# API Dockerfile — Monorepo-aware, multi-stage
# Build context deve ser a RAIZ do monorepo (fleetmaster/)
# ══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# Stage 1: deps — instala apenas dependências de produção
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json          ./apps/api/

RUN npm ci --omit=dev

# ──────────────────────────────────────────────────────────────
# Stage 2: builder — compila TypeScript
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Reinstala com devDependencies para ter o compilador TS
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json          ./apps/api/

RUN npm ci

# Copia o código-fonte
COPY packages/shared ./packages/shared
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/src    ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/

# Gera o Prisma Client e compila TS → JS
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 3: runner — imagem final enxuta
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 fleetmaster

# Copia apenas dependências de produção e o build compilado
COPY --from=deps    /app/node_modules               ./node_modules
COPY --from=deps    /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared             ./packages/shared
COPY --from=builder /app/apps/api/dist               ./apps/api/dist
COPY --from=builder /app/apps/api/prisma             ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules       ./apps/api/node_modules
COPY                apps/api/package.json            ./apps/api/package.json

WORKDIR /app/apps/api

# Ajusta o Prisma para apontar para a pasta correta em produção
ENV DATABASE_URL=""
ENV NODE_ENV=production

USER fleetmaster

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health | grep -q '"status":"ok"' || exit 1

# Roda migrations pendentes antes de iniciar (prisma está em dependencies → disponível no runner)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
