FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/customer/package.json apps/customer/
COPY packages/shared/types/package.json packages/shared/types/
COPY packages/shared/ui/package.json packages/shared/ui/
COPY packages/shared/utils/package.json packages/shared/utils/
COPY packages/shared/hooks/package.json packages/shared/hooks/
COPY packages/core/auth/package.json packages/core/auth/
COPY packages/core/api/package.json packages/core/api/

# Copy source files for packages
COPY packages packages
COPY turbo.json ./

# Install pnpm and dependencies (required for workspace: syntax)
RUN npm install -g pnpm@8.0.0 && \
    pnpm install --ignore-scripts || pnpm install --no-frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/turbo.json ./turbo.json
COPY tsconfig.json ./

# Copy landing app source
COPY apps/customer apps/customer

# Build with pnpm scripts  
RUN cd apps/customer && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/customer/.next/standalone ./
COPY --from=builder /app/apps/customer/.next/static ./apps/customer/.next/static
COPY --from=builder /app/apps/customer/public ./apps/customer/public

# Copy packages for runtime dependencies
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "apps/customer/server.js"]