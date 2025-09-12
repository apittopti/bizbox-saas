FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Create a simple Next.js app
RUN npx create-next-app@latest superadmin --typescript --no-eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --no-git --no-install

WORKDIR /app/superadmin

# Install dependencies
RUN npm install

# Create a simple super admin page
RUN echo 'export default function Home() { return ( <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-red-50"> <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm"> <h1 className="text-4xl font-bold text-center mb-8">Super Admin Control</h1> <p className="text-center text-xl mb-8">Platform Administration</p> <div className="bg-white p-8 rounded-lg shadow-lg"> <h2 className="text-2xl font-semibold mb-4">System Controls</h2> <ul className="space-y-2"> <li>• Infrastructure Management</li> <li>• Platform Configuration</li> <li>• Multi-Tenant Administration</li> <li>• System Monitoring</li> </ul> </div> </div> </main> ); }' > app/page.tsx

# Configure for standalone output
RUN echo 'module.exports = { output: "standalone" }' > next.config.js

# Build the app
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=base --chown=nextjs:nodejs /app/superadmin/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/superadmin/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/superadmin/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]