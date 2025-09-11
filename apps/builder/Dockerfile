FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    apk add --no-cache curl && \
    pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm config set network-timeout 600000 && \
    pnpm config set fetch-retries 10 && \
    pnpm config set fetch-retry-mintimeout 30000 && \
    pnpm config set fetch-retry-maxtimeout 300000 && \
    pnpm install --no-frozen-lockfile || \
    (pnpm config set registry https://registry.npmjs.org/ && pnpm install --no-frozen-lockfile)

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm config set network-timeout 600000 && \
    pnpm config set fetch-retries 10 && \
    pnpm install --no-frozen-lockfile || \
    (pnpm config set registry https://registry.npmjs.org/ && pnpm install --no-frozen-lockfile)

# Build workspace packages first
RUN pnpm turbo build --filter=@bizbox/shared-* --filter=@bizbox/core-* --filter=@bizbox/plugin-* || true

# Build the builder app  
WORKDIR /app/apps/builder
RUN echo 'module.exports = { ...require("./next.config.js"), output: "standalone" }' > next.config.standalone.js
RUN mv next.config.standalone.js next.config.js || true
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/builder/.next/standalone ./
COPY --from=build /app/apps/builder/.next/static ./apps/builder/.next/static
COPY --from=build /app/apps/builder/public ./apps/builder/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/builder/server.js"]