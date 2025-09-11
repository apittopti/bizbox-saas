# BizBox Platform - Docker Architecture Guide

## Overview

This document outlines the comprehensive Docker architecture designed for the BizBox Multi-Tenant SaaS Platform. The architecture addresses network connectivity issues in Docker environments while preserving the sophisticated pnpm workspace monorepo structure.

## Architecture Highlights

### 🎯 Key Problem Solved
- **Network Connectivity Issues**: ERR_INVALID_THIS errors when using pnpm in containers
- **Workspace Dependencies**: Complex `workspace:*` dependency resolution
- **Build Optimization**: Efficient multi-stage builds with layer caching
- **Production Ready**: Optimized for Coolify deployment

### 🏗️ Architecture Principles
1. **Multi-Stage Builds**: Separate dependency installation, building, and runtime stages
2. **Network Resilience**: Retry mechanisms and alternative registry configurations
3. **Layer Optimization**: Maximize Docker cache efficiency
4. **Security**: Non-root users, health checks, and minimal attack surface
5. **Scalability**: Resource limits and horizontal scaling support

## File Structure

```
BizBox/
├── Dockerfile                    # Main multi-stage build with network resilience
├── Dockerfile.migration          # Database migration container
├── docker-compose.yml           # Production deployment (Coolify-ready)
├── docker-compose.dev.yml       # Development environment
├── docker-compose.prod.yml      # Advanced production with monitoring
├── .dockerignore               # Optimized build context
├── .env.example               # Environment configuration template
└── scripts/
    └── docker-build.sh        # Build automation script
```

## Docker Architecture Components

### 1. Main Dockerfile (Multi-Stage Build)

```dockerfile
# 🔧 Base Stage - Node.js with pnpm and network resilience
FROM node:18-alpine AS base
# - Installs system dependencies
# - Configures pnpm with network retry logic
# - Sets up optimal caching

# 📦 Dependencies Stage - Install workspace dependencies
FROM base AS dependencies
# - Copies workspace configuration files
# - Installs dependencies with retry logic
# - Handles workspace: dependencies properly

# 🏗️ Builder Stage - Build all packages
FROM dependencies AS builder
# - Copies source code
# - Builds using Turbo for optimal performance

# 🎯 Application Stages - Individual optimized production images
FROM base AS {app}-app
# - Minimal runtime images for each application
# - Non-root user for security
# - Health checks included
```

### 2. Network Resilience Configuration

The architecture addresses Docker network connectivity issues through:

```bash
# pnpm Configuration with Retry Logic
pnpm config set network-timeout 300000
pnpm config set fetch-retries 5
pnpm config set fetch-retry-factor 2
pnpm config set fetch-retry-mintimeout 10000
pnpm config set fetch-retry-maxtimeout 60000

# Installation with Retry Loop
for i in 1 2 3 4 5; do
    pnpm install --frozen-lockfile && break || sleep 10
done
```

### 3. Workspace Dependency Handling

The architecture preserves the full monorepo context to properly resolve `workspace:*` dependencies:

```dockerfile
# Copy ALL package.json files to establish workspace structure
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install with workspace context
pnpm install --frozen-lockfile --filter=@bizbox/app-name --filter=@bizbox/app-name^...
```

## Deployment Scenarios

### 🚀 Development Environment

```bash
# Start full development environment
docker-compose -f docker-compose.dev.yml --profile dev up

# Start individual application
docker-compose -f docker-compose.dev.yml --profile admin up

# Build development image
./scripts/docker-build.sh dev
```

### 🌟 Production Deployment (Coolify)

```bash
# Build production images
./scripts/docker-build.sh prod

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# Deploy specific application
docker-compose -f docker-compose.prod.yml up -d admin
```

### 🎯 Individual Application Builds

```bash
# Build specific application
./scripts/docker-build.sh app admin

# Build with custom registry
./scripts/docker-build.sh --registry myregistry.com --tag v1.0.0 app admin
```

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_DB=bizbox
POSTGRES_USER=bizbox
POSTGRES_PASSWORD=secure-password

# Redis
REDIS_URL=redis://host:port
REDIS_PASSWORD=redis-password

# Authentication
NEXTAUTH_SECRET=your-secure-secret
NEXTAUTH_URL=https://your-domain.com

# Domain Configuration
LANDING_DOMAIN=your-domain.com
ADMIN_DOMAIN=admin.your-domain.com
# ... other domains
```

### Development vs Production

| Environment | Features | Use Case |
|-------------|----------|----------|
| **Development** | Hot reload, source mapping, debug tools | Local development |
| **Production** | Optimized builds, health checks, monitoring | Coolify deployment |

## Application Architecture

### Multi-Tenant Applications

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Landing Page  │    │  Admin Portal   │    │ Website Builder │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Customer Portal │    │ Tenant Websites │    │  Super Admin    │
│   Port: 3003    │    │   Port: 3004    │    │   Port: 3005    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Shared Infrastructure

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │   Migration     │
│   Port: 5432    │    │   Port: 6379    │    │   (Init Only)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Performance Optimizations

### 1. Docker Layer Caching
- Separate dependency installation from source code
- Use BuildKit cache mounts for pnpm store
- Optimize .dockerignore for minimal context

### 2. Multi-Stage Builds
- Minimal production images (Node.js runtime only)
- Separate build artifacts from runtime dependencies
- Security through non-root user execution

### 3. Resource Management
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

## Coolify Integration

### Production Deployment Labels
```yaml
labels:
  - "coolify.managed=true"
  - "coolify.type=application"
  - "coolify.name=bizbox-admin"
  - "coolify.fqdn=admin.your-domain.com"
  - "traefik.enable=true"
  - "traefik.http.routers.admin.rule=Host(`admin.your-domain.com`)"
  - "traefik.http.routers.admin.tls.certresolver=letsencrypt"
```

### Automatic SSL and Routing
- Traefik integration for automatic SSL certificates
- Multi-domain routing for different applications
- Wildcard SSL for multi-tenant subdomains

## Monitoring and Health Checks

### Application Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1
```

### Database Health Checks
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U bizbox -d bizbox"]
  interval: 30s
  timeout: 10s
  retries: 5
```

## Build Commands Reference

### Quick Start Commands

```bash
# Development
docker-compose -f docker-compose.dev.yml up --profile dev

# Production (Coolify)
docker-compose -f docker-compose.prod.yml up -d

# Individual App Development
docker-compose -f docker-compose.dev.yml up --profile admin

# Build Production Images
./scripts/docker-build.sh prod
```

### Advanced Build Options

```bash
# Custom registry and tag
./scripts/docker-build.sh --registry myregistry.com --tag v1.0.0 prod

# Multi-platform builds
./scripts/docker-build.sh --platform linux/amd64,linux/arm64 prod

# No cache builds
./scripts/docker-build.sh --no-cache prod

# Build and push
./scripts/docker-build.sh --push --tag latest all
```

## Troubleshooting

### Common Issues and Solutions

#### 1. pnpm Network Errors
**Problem**: ERR_INVALID_THIS or network timeout errors
**Solution**: The architecture includes retry logic and increased timeouts

#### 2. Workspace Dependencies Not Found
**Problem**: workspace:* dependencies fail to resolve
**Solution**: Full monorepo context is preserved in Docker builds

#### 3. Build Context Too Large
**Problem**: Docker build takes too long or runs out of space
**Solution**: Optimized .dockerignore excludes unnecessary files

#### 4. Container Memory Issues
**Problem**: Applications crash due to memory limits
**Solution**: Configured resource limits with appropriate reservations

### Debug Commands

```bash
# Check image sizes
docker images bizbox-platform*

# Debug build process
docker build --progress=plain --no-cache --target dependencies .

# Inspect container logs
docker-compose logs -f admin

# Execute into running container
docker-compose exec admin sh
```

## Security Considerations

### 1. Non-Root User Execution
All production containers run as non-root users with minimal privileges.

### 2. Minimal Attack Surface
Production images contain only runtime dependencies, no development tools.

### 3. Network Security
Applications communicate over internal Docker networks with no external exposure except through reverse proxy.

### 4. Environment Variable Security
Sensitive configuration managed through environment variables with secure defaults.

## Next Steps

1. **Deploy to Coolify**: Use docker-compose.prod.yml for production deployment
2. **Configure Monitoring**: Add application performance monitoring
3. **Set up CI/CD**: Integrate build scripts into automated pipelines
4. **Scale Applications**: Use Docker Swarm or Kubernetes for horizontal scaling
5. **Backup Strategy**: Implement automated database backups

## Support

For issues with this Docker architecture:
1. Check the troubleshooting section above
2. Review Docker and pnpm logs for specific errors
3. Ensure all environment variables are properly configured
4. Verify network connectivity and DNS resolution

This architecture provides a robust, scalable foundation for deploying the BizBox platform while maintaining the sophisticated monorepo structure and addressing Docker network connectivity challenges.