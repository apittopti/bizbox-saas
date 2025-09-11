# BizBox Platform - Multi-Stage Docker Build for pnpm Workspace Monorepo
# This Dockerfile is designed to handle complex workspace dependencies and network resilience

# =============================================================================
# BASE STAGE - Node.js with pnpm and network resilience configurations
# =============================================================================
FROM node:18-alpine AS base

# Install essential system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    curl \
    git

# Enable pnpm with specific version matching package.json
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@8.0.0 --activate

# Configure pnpm for network resilience
RUN pnpm config set registry https://registry.npmjs.org/ && \
    pnpm config set network-timeout 300000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-factor 2 && \
    pnpm config set fetch-retry-mintimeout 10000 && \
    pnpm config set fetch-retry-maxtimeout 60000 && \
    pnpm config set auto-install-peers true

# Set working directory
WORKDIR /app

# =============================================================================
# DEPENDENCIES STAGE - Install all workspace dependencies with network resilience
# =============================================================================
FROM base AS dependencies

# Copy workspace configuration files first for optimal layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files to establish workspace structure
COPY packages/ ./packages/
COPY apps/ ./apps/

# Remove source files to ensure we only copy package.json files
# This is crucial for Docker layer caching efficiency
RUN find packages apps -type f ! -name "package.json" -delete
RUN find packages apps -type d -empty -delete

# Install dependencies with retry logic for network resilience
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=cache,id=turbo,target=/app/.turbo \
    for i in 1 2 3 4 5; do \
        echo "Dependency installation attempt $i..." && \
        pnpm install --frozen-lockfile --prefer-offline && break || \
        (echo "Attempt $i failed, retrying in 10 seconds..." && sleep 10); \
    done

# Verify installation success
RUN pnpm list --depth=0

# =============================================================================
# BUILDER STAGE - Build all workspace packages and applications
# =============================================================================
FROM dependencies AS builder

# Copy all source code
COPY . .

# Build all packages and applications using Turbo
RUN --mount=type=cache,id=turbo,target=/app/.turbo \
    pnpm build

# =============================================================================
# APPLICATION-SPECIFIC STAGES
# Each Next.js app gets its own optimized production image
# =============================================================================

# Admin App Production Image
FROM base AS admin-app
WORKDIR /app

# Copy built application and necessary files
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/admin/server.js"]

# Landing App Production Image  
FROM base AS landing-app
WORKDIR /app

COPY --from=builder /app/apps/landing/.next/standalone ./
COPY --from=builder /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder /app/apps/landing/public ./apps/landing/public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/landing/server.js"]

# Builder App Production Image
FROM base AS builder-app
WORKDIR /app

COPY --from=builder /app/apps/builder/.next/standalone ./
COPY --from=builder /app/apps/builder/.next/static ./apps/builder/.next/static
COPY --from=builder /app/apps/builder/public ./apps/builder/public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/builder/server.js"]

# Customer App Production Image
FROM base AS customer-app
WORKDIR /app

COPY --from=builder /app/apps/customer/.next/standalone ./
COPY --from=builder /app/apps/customer/.next/static ./apps/customer/.next/static
COPY --from=builder /app/apps/customer/public ./apps/customer/public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/customer/server.js"]

# Tenant App Production Image
FROM base AS tenant-app
WORKDIR /app

COPY --from=builder /app/apps/tenant/.next/standalone ./
COPY --from=builder /app/apps/tenant/.next/static ./apps/tenant/.next/static
COPY --from=builder /app/apps/tenant/public ./apps/tenant/public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/tenant/server.js"]

# Super Admin App Production Image
FROM base AS super-admin-app
WORKDIR /app

COPY --from=builder /app/apps/super-admin/.next/standalone ./
COPY --from=builder /app/apps/super-admin/.next/static ./apps/super-admin/.next/static
COPY --from=builder /app/apps/super-admin/public ./apps/super-admin/public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/super-admin/server.js"]

# =============================================================================
# DEVELOPMENT STAGE - Full monorepo for development
# =============================================================================
FROM dependencies AS development

# Copy all source code
COPY . .

# Install development dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install

EXPOSE 3000 3001 3002 3003 3004 3005

# Default to development mode
ENV NODE_ENV=development

CMD ["pnpm", "dev"]