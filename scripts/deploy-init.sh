#!/bin/bash

# ============================================
# Production Deployment Initialization Script
# ============================================
# This script sets up the environment for production deployment
#
# Usage: bash scripts/deploy-init.sh <environment>
# Example: bash scripts/deploy-init.sh production

set -e

ENVIRONMENT=${1:-production}
ENV_FILE=".env.${ENVIRONMENT}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Flowpig Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    echo -e "${YELLOW}Please copy .env.prod.example to .env.prod and fill in the values${NC}"
    echo -e "${YELLOW}Command: cp .env.prod.example .env.prod${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment file found: $ENV_FILE${NC}"

# Validate required environment variables
required_vars=("DB_PASSWORD" "REDIS_PASSWORD" "AUTH_SECRET" "APP_URL" "API_URL")

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" "$ENV_FILE"; then
        echo -e "${RED}Error: Missing required variable: $var${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All required environment variables present${NC}"

# Create upload directory with proper permissions
mkdir -p data/uploads
chmod 755 data/uploads

echo -e "${GREEN}✓ Upload directory created${NC}"

# Pull latest images
echo -e "${YELLOW}Pulling base images...${NC}"
docker pull postgres:17-alpine
docker pull redis:7-alpine
docker pull node:22-alpine

echo -e "${GREEN}✓ Base images updated${NC}"

# Build application images
echo -e "${YELLOW}Building application images...${NC}"
docker compose -f compose.prod.yml build --no-cache

echo -e "${GREEN}✓ Application images built${NC}"

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker compose -f compose.prod.yml --env-file "$ENV_FILE" up -d

echo -e "${GREEN}✓ Services started${NC}"

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
postgres_health=$(docker compose -f compose.prod.yml ps postgres --format json | grep -o '"State":"[^"]*"' || echo '"State":"exited"')
redis_health=$(docker compose -f compose.prod.yml ps redis --format json | grep -o '"State":"[^"]*"' || echo '"State":"exited"')

if [[ $postgres_health == *"running"* ]] && [[ $redis_health == *"running"* ]]; then
    echo -e "${GREEN}✓ All services are healthy${NC}"
else
    echo -e "${RED}⚠ Warning: Some services may not be healthy${NC}"
    echo -e "${YELLOW}Run: docker compose -f compose.prod.yml ps${NC}"
fi

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker compose -f compose.prod.yml exec -T api npx prisma migrate deploy

echo -e "${GREEN}✓ Database migrations completed${NC}"

# Display summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Services running:"
docker compose -f compose.prod.yml ps
echo ""
echo -e "Useful commands:"
echo -e "  View logs:     ${YELLOW}npm run prod:logs${NC}"
echo -e "  Check status:  ${YELLOW}npm run prod:ps${NC}"
echo -e "  Stop services: ${YELLOW}npm run prod:down${NC}"
echo ""
echo -e "Access your app:"
echo -e "  Web:   ${YELLOW}$APP_URL${NC}"
echo -e "  API:   ${YELLOW}$API_URL${NC}"
echo ""
