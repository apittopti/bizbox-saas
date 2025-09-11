FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm
WORKDIR /app

FROM base AS installer
ARG APP_NAME
COPY . .

# Install all dependencies using pnpm
RUN pnpm install

# Build the specific app using pnpm
RUN pnpm --filter @bizbox/app-${APP_NAME} build

FROM base AS runner
WORKDIR /app

ARG APP_NAME

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD node apps/${APP_NAME}/server.js