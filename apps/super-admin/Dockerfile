FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/super-admin/package.json ./apps/super-admin/
COPY packages/*/package.json ./packages/*/
COPY packages/*/*/package.json ./packages/*/*/
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set network-timeout 600000 && \
    npm config set fetch-retries 10 && \
    npm install --workspace=apps/super-admin --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/super-admin/node_modules ./apps/super-admin/node_modules
COPY . .

# Build workspace packages first  
RUN npx turbo build --filter=@bizbox/shared-* --filter=@bizbox/core-* --filter=@bizbox/plugin-* || true

# Build the super-admin app
WORKDIR /app/apps/super-admin
RUN echo 'module.exports = { ...require("./next.config.js"), output: "standalone" }' > next.config.standalone.js
RUN mv next.config.standalone.js next.config.js || true
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/super-admin/.next/standalone ./
COPY --from=build /app/apps/super-admin/.next/static ./apps/super-admin/.next/static
COPY --from=build /app/apps/super-admin/public ./apps/super-admin/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/super-admin/server.js"]