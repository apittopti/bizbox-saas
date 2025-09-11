# Turborepo Multi-Stage Dockerfile for BizBox Apps
# This file can be used to build any app in the monorepo by specifying the APP_NAME build arg

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g turbo pnpm

FROM base AS pruner
WORKDIR /app
COPY . .
ARG APP_NAME
RUN turbo prune --scope=@bizbox/app-${APP_NAME} --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install

COPY --from=pruner /app/out/full/ .
ARG APP_NAME
RUN turbo run build --filter=@bizbox/app-${APP_NAME}...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

ARG APP_NAME
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

ARG APP_NAME
CMD node apps/${APP_NAME}/server.js