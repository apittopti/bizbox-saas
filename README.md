# BizBox Multi-Tenant Platform

A comprehensive SaaS platform designed for UK service-based businesses including car valeting/detailing, hairdressers, barbers, beauty salons, and bodyshops.

## Architecture

BizBox follows a plugin-first architecture within a monorepo structure, enabling modular development and easy extensibility. Built with Next.js, TypeScript, PostgreSQL, and Shadcn UI.

## Monorepo Structure

```
packages/
├── core/                   # Core platform packages
│   ├── framework/         # Plugin framework
│   ├── database/          # Database utilities
│   ├── auth/              # NextAuth configuration
│   └── api/               # Core API routes
├── plugins/               # Feature plugins
│   ├── booking/           # Booking system
│   ├── ecommerce/         # E-commerce functionality
│   ├── website-builder/   # Website builder
│   ├── media-manager/     # Media management
│   ├── community/         # Community & marketplace
│   └── payments/          # Stripe integration
├── shared/                # Shared libraries
│   ├── ui/                # Shadcn UI components
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Shared utilities
│   └── hooks/             # React hooks
└── tools/                 # Development tools
    ├── eslint-config/     # ESLint configuration
    └── typescript-config/ # TypeScript configuration

apps/
├── landing/               # Landing page & marketplace
├── admin/                 # Super Admin dashboard
├── tenant/                # Tenant Admin panel
├── builder/               # Website builder interface
└── customer/              # Customer site renderer
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- PostgreSQL 14+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

4. Start development:
   ```bash
   pnpm dev
   ```

## Development

### Available Scripts

- `pnpm build` - Build all packages
- `pnpm dev` - Start development servers
- `pnpm lint` - Lint all packages
- `pnpm test` - Run tests
- `pnpm type-check` - Type check all packages
- `pnpm format` - Format code with Prettier

### Package Management

This monorepo uses pnpm workspaces for dependency management. Each package can be developed independently while sharing common dependencies.

### Plugin Development

All features are built as plugins on the core framework. See the plugin documentation for development guidelines.

## License

Private - All rights reserved