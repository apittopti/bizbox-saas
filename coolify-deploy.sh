#!/bin/bash

# BizBox Multi-App Deployment Script for Coolify
# This script deploys all 6 BizBox applications to Coolify

set -e

COOLIFY_URL="http://194.164.89.92"
REGISTRY_URL="registry.coolify.local"

echo "🚀 Starting BizBox deployment to Coolify..."

# Array of applications to deploy
apps=("landing" "admin" "builder" "customer" "tenant" "super-admin")
ports=(3001 3002 3003 3004 3005 3006)

# Build and push each application
for i in "${!apps[@]}"; do
    app="${apps[$i]}"
    port="${ports[$i]}"
    
    echo "📦 Building and deploying $app..."
    
    # Build the Docker image
    docker build -f "apps/$app/Dockerfile.prod" -t "bizbox-$app:latest" .
    
    # Tag for registry
    docker tag "bizbox-$app:latest" "$REGISTRY_URL/bizbox-$app:latest"
    
    # Push to registry (if using external registry)
    # docker push "$REGISTRY_URL/bizbox-$app:latest"
    
    echo "✅ $app built and ready for deployment on port $port"
done

echo "🎉 All BizBox applications are ready for Coolify deployment!"
echo ""
echo "📋 Deployment Summary:"
echo "- Landing Page: http://$COOLIFY_URL:3001"
echo "- Admin Dashboard: http://$COOLIFY_URL:3002"
echo "- Page Builder: http://$COOLIFY_URL:3003"
echo "- Customer Portal: http://$COOLIFY_URL:3004"
echo "- Tenant Dashboard: http://$COOLIFY_URL:3005"
echo "- Super Admin Panel: http://$COOLIFY_URL:3006"
echo ""
echo "📝 Next steps for Coolify:"
echo "1. Create a new project in Coolify"
echo "2. Add each application using the docker-compose.yml"
echo "3. Configure environment variables as needed"
echo "4. Set up reverse proxy/load balancer if required"
echo "5. Configure SSL certificates for production domains"