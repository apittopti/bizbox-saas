FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Create a simple Next.js app
RUN npx create-next-app@latest landing --typescript --no-eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --no-git --no-install

WORKDIR /app/landing

# Install dependencies
RUN npm install

# Create a simple landing page
RUN echo 'export default function Home() { return ( <main className="flex min-h-screen flex-col items-center justify-center p-24"> <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm"> <h1 className="text-4xl font-bold text-center mb-8">BizBox Platform</h1> <p className="text-center text-xl mb-8">Comprehensive Multi-Tenant SaaS for UK Service Businesses</p> <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"> <div className="p-6 bg-white rounded-lg shadow-lg"> <h2 className="text-2xl font-semibold mb-4">For Businesses</h2> <p>Manage your service business with our comprehensive platform</p> </div> <div className="p-6 bg-white rounded-lg shadow-lg"> <h2 className="text-2xl font-semibold mb-4">Website Builder</h2> <p>Create beautiful websites with our drag-and-drop builder</p> </div> <div className="p-6 bg-white rounded-lg shadow-lg"> <h2 className="text-2xl font-semibold mb-4">Smart Booking</h2> <p>Intelligent booking system with staff matching</p> </div> </div> </div> </main> ); }' > app/page.tsx

# Configure for standalone output
RUN echo 'module.exports = { output: "standalone" }' > next.config.js

# Build the app
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=base --chown=nextjs:nodejs /app/landing/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/landing/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/landing/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]