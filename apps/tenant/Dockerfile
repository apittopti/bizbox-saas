FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build workspace packages first
RUN pnpm turbo build --filter=@bizbox/shared-* --filter=@bizbox/core-* --filter=@bizbox/plugin-* || true

# Build the tenant app  
WORKDIR /app/apps/tenant
RUN echo 'module.exports = { ...require("./next.config.js"), output: "standalone" }' > next.config.standalone.js
RUN mv next.config.standalone.js next.config.js || true
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/tenant/.next/standalone ./
COPY --from=builder /app/apps/tenant/.next/static ./apps/tenant/.next/static
COPY --from=builder /app/apps/tenant/public ./apps/tenant/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/tenant/server.js"]