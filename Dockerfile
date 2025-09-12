FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
ARG APP_NAME
RUN npm install -g create-next-app@latest

# Create a fresh Next.js app for the specific service
RUN npx create-next-app@latest ${APP_NAME} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes

# Customize the app with BizBox branding
WORKDIR /app/${APP_NAME}
RUN echo "export default function Page() {" > src/app/page.tsx && \
    echo "  return (" >> src/app/page.tsx && \
    echo "    <div className=\"min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4\">" >> src/app/page.tsx && \
    echo "      <div className=\"max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center\">" >> src/app/page.tsx && \
    echo "        <h1 className=\"text-4xl font-bold text-gray-900 mb-4\">" >> src/app/page.tsx && \
    echo "          BizBox ${APP_NAME^}" >> src/app/page.tsx && \
    echo "        </h1>" >> src/app/page.tsx && \
    echo "        <p className=\"text-gray-600 mb-8\">Welcome to your business management platform</p>" >> src/app/page.tsx && \
    echo "        <div className=\"bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4\">" >> src/app/page.tsx && \
    echo "          <p>🎉 Deployment Successful!</p>" >> src/app/page.tsx && \
    echo "        </div>" >> src/app/page.tsx && \
    echo "        <button className=\"bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300\">" >> src/app/page.tsx && \
    echo "          Get Started" >> src/app/page.tsx && \
    echo "        </button>" >> src/app/page.tsx && \
    echo "      </div>" >> src/app/page.tsx && \
    echo "    </div>" >> src/app/page.tsx && \
    echo "  )" >> src/app/page.tsx && \
    echo "}" >> src/app/page.tsx

# Update package.json to include standalone output
RUN sed -i 's/"build": "next build"/"build": "next build", "output": "standalone"/' package.json

# Add standalone output to next.config.js
RUN echo "/** @type {import('next').NextConfig} */" > next.config.js && \
    echo "const nextConfig = {" >> next.config.js && \
    echo "  output: 'standalone'," >> next.config.js && \
    echo "  typescript: { ignoreBuildErrors: true }," >> next.config.js && \
    echo "  eslint: { ignoreDuringBuilds: true }" >> next.config.js && \
    echo "};" >> next.config.js && \
    echo "" >> next.config.js && \
    echo "module.exports = nextConfig;" >> next.config.js

# Build the app
RUN npm run build

FROM base AS runner
WORKDIR /app
ARG APP_NAME

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder --chown=nextjs:nodejs /app/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/${APP_NAME}/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/${APP_NAME}/public ./public

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]