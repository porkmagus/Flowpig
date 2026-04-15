# ============================================
# Web Service - Production Dockerfile
# ============================================
# React Router builds the server bundle, then the runtime serves it with
# react-router-serve.

FROM node:24.14.1-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG VITE_API_URL=http://localhost:3001
ARG VITE_WS_URL=ws://localhost:3001/ws

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

COPY package.json package-lock.json ./
COPY .nvmrc ./
COPY scripts ./scripts
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci --include=dev

COPY apps/web ./apps/web
COPY packages/contracts ./packages/contracts
COPY packages/ui ./packages/ui

RUN npm run build --workspace=@flowpigdev/web
RUN npm cache clean --force

FROM node:24.14.1-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 flowpig

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci --omit=dev
RUN npm cache clean --force

COPY --from=builder --chown=flowpig:nodejs /app/apps/web/build ./apps/web/build

USER flowpig

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "--workspace", "@flowpigdev/web", "run", "start"]
