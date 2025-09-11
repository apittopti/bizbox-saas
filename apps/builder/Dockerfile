FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.0.0

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages packages
COPY turbo.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.0.0

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/turbo.json ./turbo.json
COPY tsconfig.json ./

# Copy builder app
COPY apps/builder apps/builder

# Build builder app and its dependencies
RUN pnpm turbo build --filter=@bizbox/app-builder

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/builder/.next/standalone ./
COPY --from=builder /app/apps/builder/.next/static ./apps/builder/.next/static
COPY --from=builder /app/apps/builder/public ./apps/builder/public

# Copy packages for runtime dependencies
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "apps/builder/server.js"]