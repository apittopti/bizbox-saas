# BizBox Docker Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the BizBox Multi-Tenant SaaS Platform using Docker and Coolify.

## Architecture
- **Monorepo Structure**: pnpm workspaces with Turbo build orchestration
- **6 Next.js Applications**: landing, admin, builder, customer, tenant, super-admin
- **Shared Packages**: types, ui, utils, hooks, security, auth, api
- **Production Ready**: Multi-stage Docker builds with optimization

## Quick Start

### 1. Local Testing
```bash
# Build and test all applications
docker-compose up --build

# Applications will be available at:
# Landing Page: http://localhost:3001
# Admin: http://localhost:3002
# Builder: http://localhost:3003
# Customer: http://localhost:3004
# Tenant: http://localhost:3005
# Super Admin: http://localhost:3006
```

### 2. Production Build
```bash
# Build individual apps for production
docker build -f apps/landing/Dockerfile.prod -t bizbox-landing .
docker build -f apps/admin/Dockerfile.prod -t bizbox-admin .
docker build -f apps/builder/Dockerfile.prod -t bizbox-builder .
docker build -f apps/customer/Dockerfile.prod -t bizbox-customer .
docker build -f apps/tenant/Dockerfile.prod -t bizbox-tenant .
docker build -f apps/super-admin/Dockerfile.prod -t bizbox-super-admin .
```

### 3. Coolify Deployment
```bash
# Make deployment script executable
chmod +x coolify-deploy.sh

# Run deployment script
./coolify-deploy.sh
```

## Dockerfile Architecture

### Key Features
1. **pnpm Native**: Uses pnpm throughout, preserves workspace: protocol
2. **Multi-stage Builds**: Optimized layer caching and final image size
3. **Network Resilience**: Configured with retry logic for network issues
4. **Build Order**: Dependencies built before consumers using Turbo
5. **Production Optimized**: Standalone Next.js output, minimal runtime

### Build Stages
1. **base**: Node.js 20 Alpine with pnpm and system dependencies
2. **workspace-deps**: Install all workspace dependencies
3. **workspace-build**: Build shared packages in dependency order
4. **app-build**: Build specific application
5. **runner**: Minimal production runtime

## Network Issue Resolution

The Docker builds include network resilience configurations:
```bash
pnpm config set network-timeout 300000
pnpm config set fetch-retries 5
pnpm config set fetch-retry-mintimeout 20000
pnpm config set fetch-retry-maxtimeout 120000
```

## Coolify Configuration

### Setup Steps
1. Access Coolify at http://194.164.89.92/
2. Create new project "bizbox-platform"
3. Import the `coolify.yml` configuration
4. Configure environment variables per application
5. Deploy all services

### Environment Variables (per app)
```env
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
# Add app-specific variables as needed
```

## Troubleshooting

### Common Issues

#### 1. Network Connectivity Errors
```bash
# ERR_INVALID_THIS or timeout errors
# Solution: Network retry configuration is built into Dockerfiles
# Ensure Docker has internet access during build
```

#### 2. Workspace Resolution Failures
```bash
# workspace:* not found
# Solution: Use pnpm throughout, don't convert to file: references
# Ensure pnpm-lock.yaml is present and valid
```

#### 3. Build Order Issues
```bash
# Package not found during build
# Solution: Turbo builds dependencies in correct order
# Check turbo.json configuration
```

### Debug Commands
```bash
# Test workspace resolution
pnpm install --dry-run

# Check build order
pnpm turbo build --dry-run

# Inspect Docker layers
docker history bizbox-landing:latest

# Check container health
docker exec -it bizbox-landing sh
```

## Performance Optimization

### Build Cache
- Uses pnpm store cache for faster installs
- Docker layer caching for unchanged dependencies
- Multi-stage builds minimize final image size

### Runtime Optimization
- Next.js standalone output
- Minimal Alpine-based runtime
- Health checks for container orchestration

## Security Considerations

### Production Security
- Non-root user (nextjs:nodejs)
- Minimal runtime dependencies
- No build tools in production images
- Environment-based configuration

### Network Security
- Internal Docker networks
- Port isolation per application
- Coolify manages SSL termination

## Monitoring and Health Checks

Each application includes:
- Health check endpoints at `/api/health`
- Process monitoring via container orchestration
- Automatic restart on failure
- Resource usage monitoring

## Scaling Strategy

### Horizontal Scaling
- Each app can scale independently
- Load balancing handled by Coolify
- Shared packages built once, used by all apps

### Resource Management
- Memory-optimized builds
- CPU-efficient multi-stage process
- Disk space optimization through layer sharing

## Support and Maintenance

### Regular Maintenance
- Update base images monthly
- Monitor build performance
- Review security vulnerabilities
- Update dependencies regularly

### Backup Strategy
- Source code in version control
- Container images in registry
- Configuration management
- Database backups (if applicable)