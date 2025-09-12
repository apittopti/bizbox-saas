FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

FROM base AS deps
COPY . .
ARG APP_NAME
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm config set registry https://registry.npmjs.org/

# Install dependencies and build packages in the correct order
# First build packages without dependencies
RUN for dir in packages/tools/* packages/shared/types packages/shared/utils; do \
      if [ -f "$dir/package.json" ]; then \
        echo "Installing dependencies for $dir" && \
        cd "/app/$dir" && npm install && npm run build --if-present; \
        cd /app; \
      fi \
    done

# Then build packages that depend on the above
RUN for dir in packages/shared/hooks packages/shared/ui packages/core/* packages/plugins/*; do \
      if [ -f "$dir/package.json" ]; then \
        echo "Installing dependencies for $dir" && \
        cd "/app/$dir" && npm install && npm run build --if-present; \
        cd /app; \
      fi \
    done

# Install app dependencies
RUN cd apps/${APP_NAME} && npm install

FROM base AS build
ARG APP_NAME
COPY --from=deps /app .
WORKDIR /app/apps/${APP_NAME}
RUN npm run build

FROM base AS runner
ARG APP_NAME
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/${APP_NAME}/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]