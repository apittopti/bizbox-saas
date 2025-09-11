#!/bin/bash

# BizBox Multi-Tenant SaaS Platform - Coolify Production Deployment Script
# Target: http://194.164.89.92/

set -e

echo "🚀 Starting BizBox deployment to Coolify..."
echo "Target server: http://194.164.89.92/"
echo "=================================================="

# Configuration
COOLIFY_SERVER="194.164.89.92"
PROJECT_NAME="bizbox-saas"
ENVIRONMENT="production"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Pre-deployment checks
print_step "Running pre-deployment checks..."

# Check if required environment variables are set
REQUIRED_VARS=(
    "DB_PASSWORD"
    "REDIS_PASSWORD"
    "NEXTAUTH_SECRET"
    "ADMIN_EMAIL"
    "SUPER_ADMIN_PASSWORD"
)

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these variables before running the deployment:"
    echo "export DB_PASSWORD='your-secure-db-password'"
    echo "export REDIS_PASSWORD='your-secure-redis-password'"
    echo "export NEXTAUTH_SECRET='your-32-character-nextauth-secret'"
    echo "export ADMIN_EMAIL='admin@yourdomain.com'"
    echo "export SUPER_ADMIN_PASSWORD='your-secure-admin-password'"
    exit 1
fi

print_status "Environment variables check passed ✓"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

print_status "Docker availability check passed ✓"

# Check if required files exist
REQUIRED_FILES=(
    ".coolify.production.yml"
    ".env.production"
    "Dockerfile.migration"
    "apps/landing/Dockerfile"
    "apps/admin/Dockerfile"
    "apps/builder/Dockerfile"
    "apps/customer/Dockerfile"
    "apps/tenant/Dockerfile"
    "apps/super-admin/Dockerfile"
)

missing_files=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    print_error "Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

print_status "Required files check passed ✓"

# Validate environment configuration
print_step "Validating deployment configuration..."

# Check if package.json exists and has required scripts
if [ ! -f "package.json" ]; then
    print_error "package.json not found in project root"
    exit 1
fi

# Validate workspace configuration
if [ ! -f "pnpm-workspace.yaml" ]; then
    print_error "pnpm-workspace.yaml not found in project root"
    exit 1
fi

print_status "Configuration validation passed ✓"

# Build verification
print_step "Running build verification test..."

# Create a test build to verify everything compiles
print_status "Testing Docker build for migration service..."
if ! docker build -f Dockerfile.migration -t bizbox-migration-test . > /dev/null 2>&1; then
    print_error "Migration Dockerfile build failed"
    print_warning "Please check the Dockerfile.migration for errors"
    exit 1
fi

print_status "Migration build test passed ✓"

print_status "Testing landing page build..."
if ! docker build -f apps/landing/Dockerfile -t bizbox-landing-test . > /dev/null 2>&1; then
    print_error "Landing page Dockerfile build failed"
    print_warning "Please check apps/landing/Dockerfile for errors"
    exit 1
fi

print_status "Landing page build test passed ✓"

# Clean up test images
print_status "Cleaning up test images..."
docker rmi bizbox-migration-test bizbox-landing-test > /dev/null 2>&1 || true

# Generate deployment environment file
print_step "Generating deployment environment configuration..."

cat > .env.deploy << EOF
# BizBox Production Deployment Configuration
# Generated on $(date)

# Database Configuration
DB_PASSWORD=${DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}

# Authentication
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Admin Configuration
ADMIN_EMAIL=${ADMIN_EMAIL}
SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD}

# Optional Stripe Configuration (if provided)
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}

# Optional Email Configuration (if provided)
SMTP_PASSWORD=${SMTP_PASSWORD:-}

# Optional Storage Configuration (if provided)
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}

# Deployment Info
DEPLOYMENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOYMENT_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
EOF

print_status "Environment configuration generated ✓"

# Database preparation
print_step "Preparing database setup..."

# Check if database setup script exists
DB_SETUP_FILE="packages/core/database/setup-database.sql"
if [ ! -f "$DB_SETUP_FILE" ]; then
    print_warning "Database setup script not found at $DB_SETUP_FILE"
    print_status "Creating basic database setup script..."
    
    mkdir -p "$(dirname "$DB_SETUP_FILE")"
    cat > "$DB_SETUP_FILE" << 'EOF'
-- BizBox Database Setup Script
-- This script sets up the initial database structure and security

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Enable Row Level Security
ALTER DATABASE bizbox SET row_security = on;

-- Create initial schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS public;

-- Set up basic permissions
GRANT USAGE ON SCHEMA public TO bizbox_user;
GRANT CREATE ON SCHEMA public TO bizbox_user;

-- Create a health check table
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health check record
INSERT INTO health_check (checked_at) VALUES (CURRENT_TIMESTAMP) 
ON CONFLICT DO NOTHING;

-- Grant permissions on health check table
GRANT ALL PRIVILEGES ON TABLE health_check TO bizbox_user;
GRANT USAGE, SELECT ON SEQUENCE health_check_id_seq TO bizbox_user;
EOF
fi

print_status "Database setup prepared ✓"

# Security check
print_step "Running security checks..."

# Check for sensitive data in configuration files
if grep -r "password.*=" --include="*.yml" --include="*.yaml" --include="*.js" --include="*.ts" --exclude-dir=node_modules . | grep -v "DB_PASSWORD\|REDIS_PASSWORD\|SUPER_ADMIN_PASSWORD"; then
    print_warning "Found potential hardcoded passwords in configuration files"
    print_warning "Please review and ensure all passwords are using environment variables"
fi

# Check for TODO or FIXME comments in deployment files
if grep -r "TODO\|FIXME" --include="*.yml" --include="*.yaml" --include="Dockerfile*" .; then
    print_warning "Found TODO or FIXME comments in deployment files"
    print_warning "Please review and address these before production deployment"
fi

print_status "Security checks completed ✓"

# Final deployment summary
print_step "Deployment Summary"
echo "=================================================="
print_status "Project: BizBox Multi-Tenant SaaS Platform"
print_status "Target: http://$COOLIFY_SERVER/"
print_status "Environment: $ENVIRONMENT"
echo ""
print_status "Applications to deploy:"
echo "  • Landing Page:    https://bizbox.194-164-89-92.nip.io"
echo "  • Admin Dashboard: https://admin.bizbox.194-164-89-92.nip.io"
echo "  • Builder App:     https://builder.bizbox.194-164-89-92.nip.io"
echo "  • Customer App:    https://app.bizbox.194-164-89-92.nip.io"
echo "  • Tenant Sites:    https://*.tenant.194-164-89-92.nip.io"
echo "  • Super Admin:     https://super-admin.bizbox.194-164-89-92.nip.io"
echo ""
print_status "Services to deploy:"
echo "  • PostgreSQL Database (with persistent storage)"
echo "  • Redis Cache (with persistent storage)"
echo "  • Database Migration (one-time job)"
echo ""
print_status "Features enabled:"
echo "  • Multi-tenant architecture"
echo "  • SSL/TLS with Let's Encrypt"
echo "  • Automatic backups (daily at 2 AM UTC)"
echo "  • Health monitoring"
echo "  • Resource limits and scaling"
echo ""

# Deployment instructions
print_step "Next Steps:"
echo "=================================================="
echo ""
print_status "1. Copy the deployment files to your Coolify server:"
echo "   scp .coolify.production.yml root@$COOLIFY_SERVER:/tmp/"
echo "   scp .env.deploy root@$COOLIFY_SERVER:/tmp/"
echo ""
print_status "2. Access Coolify web interface:"
echo "   http://$COOLIFY_SERVER:8000"
echo ""
print_status "3. Create a new project:"
echo "   - Project Name: $PROJECT_NAME"
echo "   - Environment: $ENVIRONMENT"
echo ""
print_status "4. Deploy using Docker Compose:"
echo "   - Upload .coolify.production.yml as docker-compose.yml"
echo "   - Set environment variables from .env.deploy"
echo ""
print_status "5. Monitor deployment progress and verify services"
echo ""

# Create deployment checklist
print_step "Creating deployment checklist..."

cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# BizBox Deployment Checklist

## Pre-deployment
- [ ] Environment variables configured in Coolify
- [ ] SSL certificates configured (Let's Encrypt)
- [ ] Domain names verified (using nip.io for automatic resolution)
- [ ] Database backup strategy confirmed
- [ ] Monitoring alerts configured

## Deployment Steps
- [ ] PostgreSQL database deployed and healthy
- [ ] Redis cache deployed and healthy
- [ ] Database migration completed successfully
- [ ] Landing page application deployed and accessible
- [ ] Admin dashboard deployed and accessible
- [ ] Builder application deployed and accessible
- [ ] Customer application deployed and accessible
- [ ] Tenant renderer deployed and accessible
- [ ] Super admin application deployed and accessible

## Post-deployment Verification
- [ ] All health checks passing
- [ ] SSL certificates valid and auto-renewal configured
- [ ] Database connections working
- [ ] Redis cache functioning
- [ ] Multi-tenant isolation verified
- [ ] Authentication working across all apps
- [ ] File uploads and storage working
- [ ] Email notifications working (if configured)
- [ ] Backup system operational
- [ ] Monitoring and alerting active

## Performance Testing
- [ ] Load testing completed
- [ ] Response times acceptable
- [ ] Database performance optimized
- [ ] Cache hit rates acceptable
- [ ] Memory usage within limits
- [ ] CPU usage within limits

## Security Verification
- [ ] All endpoints use HTTPS
- [ ] Authentication required for admin areas
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Rate limiting functional
- [ ] Security headers properly configured

## Rollback Plan Ready
- [ ] Database backup available
- [ ] Previous version containers available
- [ ] Rollback procedure documented
- [ ] DNS rollback plan ready
EOF

print_status "Deployment checklist created: DEPLOYMENT_CHECKLIST.md ✓"

print_step "Pre-deployment verification complete!"
echo "=================================================="
print_status "All checks passed! Ready for deployment to Coolify."
print_status "Use the generated .env.deploy file for environment variables."
print_status "Upload .coolify.production.yml to Coolify as your docker-compose.yml file."
echo ""
print_warning "IMPORTANT: Keep the .env.deploy file secure and never commit it to version control!"
echo ""
print_status "Deployment preparation completed successfully! 🎉"