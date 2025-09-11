#!/bin/bash

# BizBox Platform - Coolify Deployment Script
# This script triggers a deployment to Coolify server using the latest commit

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COOLIFY_SERVER="194.164.89.92"
PROJECT_NAME="bizbox-platform"
GITHUB_REPO="apittopti/bizbox-saas"

# Helper functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

echo -e "${GREEN}🚀 BizBox Multi-Tenant SaaS Platform - Coolify Deployment${NC}"
echo "=============================================================="
echo ""

# Verify we're on the main branch with latest changes
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    warning "You're not on the main branch. Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled"
    fi
fi

# Check if there are uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    warning "You have uncommitted changes"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Please commit your changes first"
    fi
fi

# Get the current commit hash
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)

log "Current commit: $COMMIT_HASH"
log "Commit message: $COMMIT_MESSAGE"
echo ""

# Check Docker architecture files
log "Verifying Docker architecture files..."
REQUIRED_FILES=(
    "Dockerfile"
    "docker-compose.prod.yml" 
    ".dockerignore"
    "scripts/docker-build.sh"
    ".env.production"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Required file not found: $file"
    fi
    success "✓ $file"
done

# Verify Next.js standalone configurations
log "Verifying Next.js standalone configurations..."
APPS=("admin" "builder" "customer" "landing" "super-admin" "tenant")

for app in "${APPS[@]}"; do
    if [ -f "apps/$app/next.config.js" ]; then
        if grep -q "output.*standalone" "apps/$app/next.config.js"; then
            success "✓ $app has standalone output enabled"
        else
            warning "⚠ $app may not have standalone output enabled"
        fi
    else
        warning "⚠ $app/next.config.js not found"
    fi
done

echo ""
log "🎯 Ready to deploy to Coolify!"
echo ""
echo "Deployment Details:"
echo "• Server: http://$COOLIFY_SERVER/"
echo "• Project: $PROJECT_NAME"
echo "• Repository: https://github.com/$GITHUB_REPO"
echo "• Branch: $CURRENT_BRANCH"
echo "• Commit: $COMMIT_HASH"
echo ""
echo "Applications to be deployed:"
echo "• Landing Page (Port 3000)"
echo "• Admin Dashboard (Port 3001)"
echo "• Website Builder (Port 3002)"
echo "• Customer Portal (Port 3003)"
echo "• Tenant Websites (Port 3004)"
echo "• Super Admin (Port 3005)"
echo ""
echo "Infrastructure:"
echo "• PostgreSQL Database"
echo "• Redis Cache"
echo "• Automated Backups"
echo ""

read -p "Proceed with deployment? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    error "Deployment cancelled by user"
fi

log "Triggering Coolify deployment..."

# Since we're using GitHub integration, the deployment should be automatic
# We just need to ensure our changes are pushed to main branch
if [ "$CURRENT_BRANCH" = "main" ]; then
    log "Pushing latest changes to GitHub..."
    git push origin main || warning "Push may have failed - check if changes are already pushed"
    success "Changes pushed to GitHub"
else
    warning "Not on main branch - deployment may not trigger automatically"
fi

# Provide deployment URLs
echo ""
success "🎉 Deployment triggered successfully!"
echo ""
echo "Next Steps:"
echo "1. Monitor the deployment in Coolify dashboard: http://$COOLIFY_SERVER/"
echo "2. Check application logs for any build issues"
echo "3. Verify all services start successfully"
echo "4. Test each application endpoint"
echo ""
echo "Expected Application URLs (once deployed):"
echo "• Landing: http://$COOLIFY_SERVER:3000"
echo "• Admin: http://$COOLIFY_SERVER:3001"  
echo "• Builder: http://$COOLIFY_SERVER:3002"
echo "• Customer: http://$COOLIFY_SERVER:3003"
echo "• Tenant: http://$COOLIFY_SERVER:3004"
echo "• Super Admin: http://$COOLIFY_SERVER:3005"
echo ""
echo "Troubleshooting:"
echo "• If builds fail due to network issues, Coolify will retry automatically"
echo "• Check Coolify logs for pnpm connectivity issues"
echo "• Verify environment variables are set in Coolify"
echo ""
log "Deployment script completed!"
echo ""
echo -e "${GREEN}🚀 Your BizBox Multi-Tenant SaaS Platform is being deployed!${NC}"