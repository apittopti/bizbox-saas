FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
ARG APP_NAME

# Create a minimal Next.js app structure
RUN mkdir -p ${APP_NAME}/src/app ${APP_NAME}/public
WORKDIR /app/${APP_NAME}

# Create package.json
RUN echo '{"name": "bizbox-app","version": "0.1.0","private": true,"scripts": {"dev": "next dev","build": "next build","start": "next start","lint": "next lint"},"dependencies": {"react": "^18","react-dom": "^18","next": "14.2.14"},"devDependencies": {"typescript": "^5","@types/node": "^20","@types/react": "^18","@types/react-dom": "^18","tailwindcss": "^3.4.0","eslint": "^8","eslint-config-next": "14.2.14"}}' > package.json

# Create next.config.js
RUN echo 'module.exports = { output: "standalone", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true } };' > next.config.js

# Create tailwind.config.js
RUN echo 'module.exports = { content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: {} }, plugins: [] };' > tailwind.config.js

# Create globals.css
RUN mkdir -p src/app && echo '@tailwind base; @tailwind components; @tailwind utilities;' > src/app/globals.css

# Create layout.tsx
RUN echo 'import "./globals.css"; export default function RootLayout({children}:{children:React.ReactNode}) { return (<html lang="en"><body>{children}</body></html>); }' > src/app/layout.tsx

# Create page.tsx with app name
RUN echo "export default function Page() { return (<div className=\"min-h-screen bg-blue-50 flex items-center justify-center p-4\"><div className=\"bg-white rounded-lg shadow-lg p-8 text-center\"><h1 className=\"text-3xl font-bold text-gray-900 mb-4\">BizBox ${APP_NAME}</h1><p className=\"text-gray-600 mb-6\">Welcome to your business platform</p><div className=\"bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4\"><p>🎉 Deployment Successful!</p></div><button className=\"bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded\">Get Started</button></div></div>); }" > src/app/page.tsx

# Install dependencies
RUN npm install

# Build
RUN npm run build

FROM base AS runner
WORKDIR /app
ARG APP_NAME

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/${APP_NAME}/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/${APP_NAME}/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]