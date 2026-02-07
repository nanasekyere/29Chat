# ============================================================
# Multi-stage Dockerfile for 29Chat microservices
#
# This single Dockerfile builds ANY of the five services.
# Which service gets built is controlled by the SERVICE_NAME
# build argument (passed from docker-compose.yml).
#
# Stages:
#   1. base        – install npm dependencies
#   2. build       – compile TypeScript (packages first, then the target service)
#   3. production  – lean runtime image with only compiled JS + node_modules
# ============================================================

# ----------------------------------------------------------
# Stage 1: base
# Purpose: Start from a small Node image and install all
#          npm dependencies. We copy only package.json and
#          package-lock.json first so Docker can CACHE this
#          layer — dependencies only reinstall when those
#          files change, not when your source code changes.
# ----------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

# Copy dependency manifests only (for layer caching)
COPY package.json package-lock.json ./

# npm ci = "clean install" — installs the exact versions
# from package-lock.json (faster and more reliable than npm install)
RUN npm ci

# ----------------------------------------------------------
# Stage 2: build
# Purpose: Copy all source code and compile TypeScript.
#          Packages (common, database) must build BEFORE
#          services because services import from them.
# ----------------------------------------------------------
FROM base AS build

# The build arg that controls which service we compile.
# It will be set to something like "auth-service" or "api-gateway".
ARG SERVICE_NAME

WORKDIR /app

# Copy all source files (node_modules already exist from the base stage)
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/ ./services/

# Build shared packages first (order matters — common before database)
RUN npx tsc -p packages/common/tsconfig.json
RUN npx tsc -p packages/database/tsconfig.json

# Build the target service
RUN npx tsc -p services/${SERVICE_NAME}/tsconfig.json

# ----------------------------------------------------------
# Stage 3: production
# Purpose: Create a fresh, minimal image that contains ONLY
#          what's needed to run the compiled JavaScript.
#          No TypeScript source, no dev dependencies.
# ----------------------------------------------------------
FROM node:22-alpine AS production

ARG SERVICE_NAME

# Store SERVICE_NAME as an environment variable so the CMD
# can reference it at runtime (ARG values disappear after build)
ENV SERVICE_NAME=${SERVICE_NAME}
ENV NODE_ENV=production

WORKDIR /app

# Copy dependency manifests and install production-only deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from the build stage
# We need: packages dist (shared code) + the target service dist
COPY --from=build /app/packages/common/dist/ ./packages/common/dist/
COPY --from=build /app/packages/database/dist/ ./packages/database/dist/
COPY --from=build /app/services/${SERVICE_NAME}/dist/ ./services/${SERVICE_NAME}/dist/

# Don't run as root in production (security best practice)
USER node

# Expose a generic port — the actual port is set via env vars
EXPOSE 3000

# Start the service
CMD node services/${SERVICE_NAME}/dist/server.js
