FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

FROM base AS deps
COPY . .
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm config set registry https://registry.npmjs.org/ && \
    cd apps/landing && npm install

FROM base AS build
COPY --from=deps /app ./
WORKDIR /app

# Build workspace packages first  
RUN npx turbo build --filter=@bizbox/shared-* --filter=@bizbox/core-* --filter=@bizbox/plugin-* || true

# Build the landing app
WORKDIR /app/apps/landing
RUN echo 'module.exports = { ...require("./next.config.js"), output: "standalone" }' > next.config.standalone.js
RUN mv next.config.standalone.js next.config.js || true
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/landing/.next/standalone ./
COPY --from=build /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=build /app/apps/landing/public ./apps/landing/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/landing/server.js"]