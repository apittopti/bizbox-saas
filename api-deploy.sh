#!/bin/bash

# BizBox API Deployment Script
set -e

# Load environment variables
export $(grep -v '^#' .env.deployment.local | grep -v '^$' | xargs)

echo "🚀 BizBox API Deployment Starting..."
echo "=========================================="

# Read and encode the Docker Compose file
DOCKER_COMPOSE=$(cat .coolify.production.yml | jq -R -s .)

# Create service with Docker Compose
echo "📦 Creating Docker Compose service..."
SERVICE_RESPONSE=$(curl -X POST \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"project_uuid\": \"uowskkkgo40gksw8gos88cks\",
        \"environment_name\": \"production\",
        \"server_uuid\": \"f8scksookwokkwwsowgg8okg\",
        \"type\": \"docker-compose\",
        \"name\": \"bizbox-platform\",
        \"description\": \"BizBox Multi-Tenant SaaS Platform\",
        \"docker_compose_raw\": $DOCKER_COMPOSE
    }" \
    http://194.164.89.92:8000/api/v1/services)

echo "Service creation response:"
echo "$SERVICE_RESPONSE" | jq .

# Extract service UUID from response
SERVICE_UUID=$(echo "$SERVICE_RESPONSE" | jq -r '.uuid // empty')

if [ -z "$SERVICE_UUID" ]; then
    echo "❌ Failed to create service"
    echo "$SERVICE_RESPONSE"
    exit 1
fi

echo "✅ Service created with UUID: $SERVICE_UUID"

# Set environment variables
echo "🔧 Setting environment variables..."
ENV_VARS=(
    "DB_PASSWORD=$POSTGRES_PASSWORD"
    "REDIS_PASSWORD=$REDIS_PASSWORD"
    "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
    "SUPER_ADMIN_PASSWORD=$SUPER_ADMIN_PASSWORD"
    "ADMIN_EMAIL=$SUPER_ADMIN_EMAIL"
)

for env_var in "${ENV_VARS[@]}"; do
    key=$(echo "$env_var" | cut -d'=' -f1)
    value=$(echo "$env_var" | cut -d'=' -f2-)
    
    ENV_RESPONSE=$(curl -X POST \
        -H "Authorization: Bearer $COOLIFY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"key\": \"$key\", \"value\": \"$value\", \"is_build_time\": false, \"is_preview\": false}" \
        "http://194.164.89.92:8000/api/v1/services/$SERVICE_UUID/envs")
    
    echo "Set $key: $(echo "$ENV_RESPONSE" | jq -r '.message // "success"')"
done

# Deploy the service
echo "🚀 Deploying service..."
DEPLOY_RESPONSE=$(curl -X POST \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    "http://194.164.89.92:8000/api/v1/services/$SERVICE_UUID/deploy")

echo "Deploy response:"
echo "$DEPLOY_RESPONSE" | jq .

echo ""
echo "🎉 Deployment initiated!"
echo "🌐 Monitor deployment at: http://194.164.89.92:8000"
echo ""
echo "Your application URLs (once deployed):"
echo "- Landing Page: http://194.164.89.92:3001"
echo "- Admin Dashboard: http://194.164.89.92:3002"
echo "- Website Builder: http://194.164.89.92:3003"
echo "- Customer Portal: http://194.164.89.92:3004"
echo "- Tenant Sites: http://194.164.89.92:3005"
echo "- Super Admin: http://194.164.89.92:3006"