FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS installer
ARG APP_NAME
COPY . .

# Install dependencies for shared packages first
RUN cd packages/shared/types && npm install
RUN cd packages/shared/utils && npm install
RUN cd packages/shared/hooks && npm install
RUN cd packages/shared/ui && npm install

# Build shared packages
RUN cd packages/shared/types && npm run build
RUN cd packages/shared/utils && npm run build
RUN cd packages/shared/hooks && npm run build
RUN cd packages/shared/ui && npm run build

# Install dependencies for core packages
RUN cd packages/core/api && npm install
RUN cd packages/core/auth && npm install

# Build core packages
RUN cd packages/core/api && npm run build
RUN cd packages/core/auth && npm run build

# Install dependencies for plugin packages that the app needs
RUN cd packages/plugins/booking && npm install && npm run build
RUN cd packages/plugins/ecommerce && npm install && npm run build
RUN cd packages/plugins/website-builder && npm install && npm run build
RUN cd packages/plugins/payments && npm install && npm run build

# Finally, install and build the specific app
RUN cd apps/${APP_NAME} && npm install
RUN cd apps/${APP_NAME} && npm run build

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