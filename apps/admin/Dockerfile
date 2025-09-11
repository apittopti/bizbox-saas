FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@8.0.0 --activate
WORKDIR /app

FROM base AS deps
# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/*/
COPY packages/*/*/package.json ./packages/*/*/
COPY apps/admin/package.json ./apps/admin/

# Install dependencies with network retry
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm config set network-timeout 300000 && \
    pnpm config set fetch-retries 5 && \
    pnpm install --ignore-workspace-root-check

FROM base AS builder  
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .
COPY tsconfig.json ./

# Build workspace packages first
RUN pnpm turbo build --filter=@bizbox/shared-* --filter=@bizbox/core-* --filter=@bizbox/plugin-* || true

# Build the admin app
WORKDIR /app/apps/admin
RUN echo 'module.exports = { ...require("./next.config.js"), output: "standalone" }' > next.config.standalone.js
RUN mv next.config.standalone.js next.config.js || true
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/admin/server.js"]