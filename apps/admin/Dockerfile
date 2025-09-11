# BizBox Admin App - Optimized Production Build
# This Dockerfile builds only the admin app with full monorepo context

FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat python3 make g++ curl git

# Enable pnpm
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

WORKDIR /app

# =============================================================================
# DEPENDENCIES STAGE
# =============================================================================
FROM base AS dependencies

# Copy workspace configuration - must include full monorepo context for workspace: dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files to establish workspace structure
COPY packages/ ./packages/
COPY apps/ ./apps/

# Remove source files, keep only package.json files
RUN find packages apps -type f ! -name "package.json" -delete
RUN find packages apps -type d -empty -delete

# Install dependencies with retry logic
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    for i in 1 2 3 4 5; do \
        echo "Dependency installation attempt $i..." && \
        pnpm install --frozen-lockfile --filter=@bizbox/app-admin --filter=@bizbox/app-admin^... && break || \
        (echo "Attempt $i failed, retrying in 10 seconds..." && sleep 10); \
    done

# =============================================================================
# BUILDER STAGE
# =============================================================================
FROM dependencies AS builder

# Copy full source code (needed for workspace: dependencies)
COPY . .

# Build only admin app and its dependencies
RUN --mount=type=cache,id=turbo,target=/app/.turbo \
    pnpm build --filter=@bizbox/app-admin

# =============================================================================
# RUNNER STAGE
# =============================================================================
FROM node:18-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "apps/admin/server.js"]