# ============================================
# Docker Setup Guide
# ============================================

## Overview

We have three Docker configurations:

1. **Development** (`compose.dev.yml`): Just Postgres + Redis
2. **Production** (`compose.prod.yml`): Full stack with all services
3. **Individual Dockerfiles**: For custom deployment scenarios

---

## DEVELOPMENT SETUP

### Step 1: Start Infrastructure

```bash
# From repo root
cd ops/docker
docker compose -f compose.dev.yml up -d

# Verify
docker ps
# Should show: flowpig-postgres-dev, flowpig-redis-dev
```

### Step 2: Setup Environment

```bash
# From repo root
cp .env.dev.example .env.dev
# Edit .env.dev if needed (defaults should work)
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with test data (optional)
npm run db:seed
```

### Step 5: Start Apps

```bash
# Terminal 1 - API
npm run dev:api

# Terminal 2 - Web
npm run dev:web
```

### Development URLs
- Web: http://localhost:5173
- API: http://localhost:3001
- Postgres: localhost:5432
- Redis: localhost:6379

---

## PRODUCTION SETUP (Dokploy)

### Step 1: Environment Variables

In Dokploy, create these environment variables for each service:

#### API Service
```
NODE_ENV=production
APP_URL=https://app.flowpig.dev
API_URL=https://api.flowpig.dev
BETTER_AUTH_URL=https://api.flowpig.dev
DATABASE_URL=postgresql://flowpig:PASSWORD@postgres:5432/flowpig_prod
REDIS_URL=redis://redis:6379
AUTH_SECRET=your_32_char_secret
STORAGE_DRIVER=filesystem
UPLOAD_ROOT=/app/data/uploads
AI_PROVIDER=openai
AI_API_KEY=sk-...
```

#### Web Service
```
# Build-time variables - set in Dokploy build settings
VITE_API_URL=https://api.flowpig.dev
VITE_WS_URL=wss://api.flowpig.dev
```

#### Postgres Service
```
POSTGRES_USER=flowpig
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_DB=flowpig_prod
```

#### Redis Service
```
# No special env vars needed
```

### Step 2: Dokploy Configuration

1. **Create Services** in Dokploy dashboard:
   - `postgres` (use official postgres:17-alpine image)
   - `redis` (use official redis:7-alpine image)
   - `api` (build from your repo)
   - `web` (build from your repo)

2. **Networking**: 
   - Put all services on the same internal network
   - Do NOT expose ports 3001 or 80 publicly
   - Use Traefik/Dokploy domains instead

3. **Domains**:
   - `api.flowpig.dev` → routes to `api` service
   - `app.flowpig.dev` → routes to `web` service

4. **Volumes**:
   - Mount `postgres_data` for database persistence
   - Mount `uploads_data` for file storage

### Step 3: Build Commands

For the **API service** in Dokploy:
```bash
# Build context: Repository root
# Dockerfile: apps/api/Dockerfile
```

For the **Web service** in Dokploy:
```bash
# Build context: Repository root
# Dockerfile: apps/web/Dockerfile
```

### Step 4: Database Migration

After first deploy, run migrations:

```bash
# In Dokploy terminal/exec
npm run db:deploy
```

Or create a one-off job in Dokploy that runs:
```bash
cd /app && npm run db:deploy
```

### Step 5: Health Checks

All services have built-in health checks:

- **API**: `GET /health` (built into Fastify)
- **Web**: `GET /` (Nginx serves static files)
- **Postgres**: `pg_isready` command
- **Redis**: `redis-cli ping` command

---

## BUILDING IMAGES LOCALLY

### Build API Image

```bash
# From repo root
docker build -f apps/api/Dockerfile -t flowpig/api:latest .
```

### Build Web Image

```bash
# From repo root
docker build -f apps/web/Dockerfile -t flowpig/web:latest .
```

### Run Production Stack Locally (for testing)

```bash
cd ops/docker

# Create env file
cp .env.prod.example .env.prod
# Edit .env.prod with your values

# Start everything
docker compose -f compose.prod.yml up -d

# Check logs
docker compose -f compose.prod.yml logs -f api
docker compose -f compose.prod.yml logs -f web

# Stop everything
docker compose -f compose.prod.yml down

# Stop and delete volumes (careful!)
docker compose -f compose.prod.yml down -v
```

---

## TROUBLESHOOTING

### "Prisma Client not found"

```bash
# Regenerate client
npm run db:generate
```

### "Database connection failed"

```bash
# Check if Postgres is running
docker ps | grep postgres
docker logs flowpig-postgres-dev

# Check connection from API container
docker exec -it flowpig-api node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect().then(() => console.log('OK')).catch(e => console.error(e));
"
```

### "Port already in use"

```bash
# Find what's using port 5432
lsof -i :5432
# or
netstat -an | grep 5432

# Kill it or change port in compose.dev.yml
```

### "Docker build is slow"

```bash
# Check .dockerignore is working
docker build -f apps/api/Dockerfile -t test . 2>&1 | head -50

# Make sure node_modules isn't being copied
```

### "Environment variables not loading"

```bash
# Check env file is named correctly
ls -la .env*

# Ensure no spaces around = in env file
# WRONG: KEY = value
# RIGHT: KEY=value
```

---

## SECURITY CHECKLIST

- [ ] `.env.prod` is in `.gitignore`
- [ ] `AUTH_SECRET` is at least 32 characters
- [ ] `POSTGRES_PASSWORD` is strong and unique
- [ ] Database not exposed to internet (no public 5432)
- [ ] API port 3001 not exposed publicly (use reverse proxy)
- [ ] Non-root user in containers (flowpig user)
- [ ] Uploaded files stored outside container (volume mount)
- [ ] Health checks configured
- [ ] No devDependencies in production images

---

## USEFUL COMMANDS

```bash
# View all containers
docker ps -a

# View logs
docker logs -f <container_name>

# Enter container shell
docker exec -it <container_name> sh

# Database backup
docker exec flowpig-postgres pg_dump -U flowpig flowpig_prod > backup.sql

# Database restore
cat backup.sql | docker exec -i flowpig-postgres psql -U flowpig flowpig_prod

# Clean up unused images
docker image prune -a

# Clean up unused volumes
docker volume prune
```
