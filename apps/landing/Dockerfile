FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

FROM base AS deps
# Copy all workspace packages first
COPY packages/ ./packages/
COPY apps/landing/ ./apps/landing/

# Create package.json with resolved workspace dependencies
RUN cd apps/landing && \
    cp package.json package.json.bak && \
    node -e "
    const pkg = require('./package.json');
    // Replace workspace: references with file: references
    Object.keys(pkg.dependencies || {}).forEach(key => {
      if (pkg.dependencies[key].startsWith('workspace:')) {
        const pkgPath = key.split('/')[1].replace('shared-', 'shared/').replace('core-', 'core/').replace('plugin-', 'plugins/');
        pkg.dependencies[key] = 'file:../../packages/' + pkgPath;
      }
    });
    Object.keys(pkg.devDependencies || {}).forEach(key => {
      if (pkg.devDependencies[key].startsWith('workspace:')) {
        const pkgPath = key.split('/')[1].replace('shared-', 'shared/').replace('core-', 'core/');
        pkg.devDependencies[key] = 'file:../../packages/' + pkgPath;
      }
    });
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
    " && \
    npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY tsconfig.json ./

# Build the app
RUN cd apps/landing && npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/landing/.next/standalone ./
COPY --from=builder /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder /app/apps/landing/public ./apps/landing/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/landing/server.js"]