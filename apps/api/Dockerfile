# ============================================
# API Service - Production Dockerfile
# ============================================
# Builds the API with Nitro (Vercel Workflow SDK) and runs the bundled output.

FROM node:24.14.1-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

WORKDIR /app

ENV DATABASE_URL=postgresql://flowpig:flowpig@localhost:5432/flowpig_build

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/contracts/package.json ./packages/contracts/

RUN npm ci

COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/contracts ./packages/contracts

RUN npm run db:generate
RUN npm run build:api
RUN npm cache clean --force

FROM node:24.14.1-alpine AS runner

RUN apk add --no-cache \
    openssl \
    dumb-init

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 flowpig

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY --from=builder --chown=flowpig:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=flowpig:nodejs /app/package.json ./package.json
COPY --from=builder --chown=flowpig:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=flowpig:nodejs /app/apps/api ./apps/api
COPY --from=builder --chown=flowpig:nodejs /app/packages/db ./packages/db
COPY --from=builder --chown=flowpig:nodejs /app/packages/contracts ./packages/contracts

RUN mkdir -p /app/data/uploads && chown -R flowpig:nodejs /app

USER flowpig

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "apps/api/entrypoint.sh"]
