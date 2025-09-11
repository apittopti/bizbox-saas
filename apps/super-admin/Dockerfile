FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy all source files
COPY . .

# Install dependencies using npm workspaces (fallback approach)
RUN npm install --legacy-peer-deps --no-package-lock --prefer-offline || \
    npm install --legacy-peer-deps --no-package-lock

# Build the application
FROM base AS builder
WORKDIR /app

# Copy everything from deps stage
COPY --from=deps /app ./

# Build the super-admin app
RUN cd apps/super-admin && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/super-admin/.next/standalone ./
COPY --from=builder /app/apps/super-admin/.next/static ./apps/super-admin/.next/static
COPY --from=builder /app/apps/super-admin/public ./apps/super-admin/public

# Copy packages for runtime dependencies
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "apps/super-admin/server.js"]