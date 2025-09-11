# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BizBox is a comprehensive multi-tenant SaaS platform for UK service-based businesses (car valeting, hairdressers, barbers, beauty salons, bodyshops). It follows a plugin-first architecture within a monorepo structure using Next.js, TypeScript, PostgreSQL, and Shadcn UI.

## Development Commands

### Core Commands
- `pnpm install` - Install all dependencies
- `pnpm build` - Build all packages in dependency order
- `pnpm dev` - Start all development servers in parallel
- `pnpm lint` - Lint all packages with ESLint
- `pnpm test` - Run tests across all packages
- `pnpm type-check` - Type check all packages with TypeScript
- `pnpm clean` - Clean build outputs

### Code Quality
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting without making changes

## Architecture Overview

### Monorepo Structure
The project uses **pnpm workspaces** with **Turbo** for build orchestration. Five main applications serve different user types:

**Applications (`apps/`):**
- `landing/` - Landing page and marketplace for business signups
- `admin/` - Super Admin dashboard for platform management
- `tenant/` - Tenant Admin panel for business management
- `builder/` - Website builder interface with drag-and-drop functionality
- `customer/` - Customer site renderer for dynamically generated websites

**Core Packages (`packages/core/`):**
- `framework/` - Plugin framework and core platform logic
- `database/` - Database utilities, migrations, and schema management
- `auth/` - NextAuth.js configuration and authentication logic
- `api/` - Core API routes and middleware

**Plugin System (`packages/plugins/`):**
All features are built as plugins on the core framework:
- `booking/` - Intelligent booking system with staff matching
- `ecommerce/` - E-commerce functionality for physical products
- `website-builder/` - Website builder components and logic
- `media-manager/` - Media management and optimization
- `community/` - Community features and marketplace functionality
- `payments/` - Stripe Connect integration

**Shared Libraries (`packages/shared/`):**
- `ui/` - Shadcn UI component library
- `types/` - Shared TypeScript definitions
- `utils/` - Shared utility functions
- `hooks/` - Shared React hooks

### Plugin-First Architecture
All business features are implemented as plugins that register with the core framework. This enables:
- Modular development and feature isolation
- Easy enabling/disabling of features per tenant
- Independent plugin versioning and deployment
- Clean separation of concerns

### Multi-Tenant Design
Complete data isolation with tenant-scoped resources:
- Database schemas per tenant
- Feature flag management per tenant
- Independent website generation per tenant
- Isolated media storage per tenant

## Key Development Patterns

### Package Dependencies
Packages follow strict dependency rules:
- `shared/*` packages have no internal dependencies
- `core/*` packages depend only on `shared/*`
- `plugins/*` depend on `core/*` and `shared/*`
- `apps/*` depend on any packages as needed

### TypeScript Configuration
Root `tsconfig.json` uses project references to all packages for proper IDE support and build optimization.

### Code Style
- ESLint extends `@bizbox/eslint-config`
- Prettier with double quotes, semicolons, 80 char width
- No tabs, 2-space indentation

## Testing and Quality Assurance

Always run lint and type-check after making changes:
```bash
pnpm lint
pnpm type-check
```

The build pipeline enforces that linting and type-checking pass before building packages.

## Key Technical Context

### Website Builder Revolution
The website builder is designed to be as easy as using a word processor, with:
- Real-time preview with actual business data
- Smart auto-population from business information
- AI-powered design suggestions and layout optimization
- Reusable section templates
- Multiple websites per business support

### Booking System Intelligence
The booking system automatically matches customers with qualified staff based on:
- Service skill requirements
- Staff availability and schedules
- Service duration and buffer times
- Automatic conflict prevention

### UK Business Focus
Platform is specifically designed for UK businesses with:
- UK address validation
- Company registration number validation
- UK-specific business types and requirements
- Compliance with UK data protection and business regulations