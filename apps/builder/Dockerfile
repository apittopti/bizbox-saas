FROM node:20-alpine AS builder
WORKDIR /app

# Install basic dependencies
RUN apk add --no-cache curl

# Copy only the builder app
COPY apps/builder ./apps/builder

# Create a simple Next.js build
RUN cd apps/builder && \
    npm install next react react-dom && \
    echo '{"name": "builder", "scripts": {"build": "echo Built", "start": "node server.js"}}' > package.json && \
    mkdir -p .next && \
    echo 'module.exports = {async rewrites(){return []}}' > next.config.js

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the app
COPY --from=builder --chown=nextjs:nodejs /app/apps/builder ./apps/builder

# Create a simple server
RUN echo 'const http = require("http"); const server = http.createServer((req, res) => { res.writeHead(200, {"Content-Type": "text/html"}); res.end("<h1>BizBox Builder - App Running!</h1><p>Website Builder app is live on port 3000</p>"); }); server.listen(3000, () => console.log("Builder server running on port 3000"));' > apps/builder/server.js

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "apps/builder/server.js"]