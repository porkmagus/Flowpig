# ============================================
# API Service - Production Dockerfile
# ============================================
# Multi-stage build for optimized production image
# Stage 1: Build dependencies and generate Prisma client
# Stage 2: Production runtime with compiled code

# ----------------------------------------
# STAGE 1: Dependencies & Build
# ----------------------------------------
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

WORKDIR /app

# Copy workspace configuration first (for better caching)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN npm ci

# Copy source code
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/contracts ./packages/contracts
COPY packages/ui ./packages/ui

# Generate Prisma client (critical - must happen before build)
RUN npm run db:generate

# Build TypeScript
RUN npm run build --workspace=@flowpigdev/api

# Remove devDependencies for production
RUN npm prune --production

# ----------------------------------------
# STAGE 2: Production Runtime
# ----------------------------------------
FROM node:22-alpine AS runner

# Install runtime dependencies only
RUN apk add --no-cache \
    openssl \
    dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 flowpig

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy built application from builder stage
COPY --from=builder --chown=flowpig:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=flowpig:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=flowpig:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=flowpig:nodejs /app/packages ./packages
COPY --from=builder --chown=flowpig:nodejs /app/package.json ./

# Create uploads directory
RUN mkdir -p /app/data/uploads && chown -R flowpig:nodejs /app/data

# Switch to non-root user
USER flowpig

# Expose the API port
EXPOSE 3001

# Health check to ensure container is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/api/dist/server.js"]
