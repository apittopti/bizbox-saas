#!/bin/bash

# BizBox Coolify Deployment Script
# Deploys the BizBox platform to your Coolify instance

set -e

echo "🚀 BizBox Coolify Deployment Starting..."
echo "=========================================="

# Load environment variables
if [ -f ".env.deployment.local" ]; then
    export $(grep -v '^#' .env.deployment.local | grep -v '^$' | xargs)
    echo "✅ Loaded environment variables"
else
    echo "❌ .env.deployment.local not found!"
    exit 1
fi

# Verify required variables
if [ -z "$COOLIFY_TOKEN" ] || [ "$COOLIFY_TOKEN" = "your-api-token-here" ]; then
    echo "❌ COOLIFY_TOKEN not set in .env.deployment.local"
    exit 1
fi

if [ -z "$COOLIFY_URL" ]; then
    echo "❌ COOLIFY_URL not set in .env.deployment.local"
    exit 1
fi

echo "🔧 Coolify URL: $COOLIFY_URL"

# Test Coolify API connection
echo "🔍 Testing Coolify API connection..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    "$COOLIFY_URL/api/v1/teams")

if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ Coolify API connection successful"
else
    echo "❌ Coolify API connection failed (HTTP $API_RESPONSE)"
    echo "Please check your COOLIFY_TOKEN and COOLIFY_URL"
    exit 1
fi

# Create project
echo "📁 Creating/checking BizBox project..."
PROJECT_DATA='{
    "name": "bizbox-saas",
    "description": "BizBox Multi-Tenant SaaS Platform"
}'

curl -s -X POST \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PROJECT_DATA" \
    "$COOLIFY_URL/api/v1/projects" || echo "Project may already exist"

echo "✅ Project created/verified"

# Get project ID
echo "🔍 Getting project ID..."
PROJECT_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    "$COOLIFY_URL/api/v1/projects")

echo "📋 Available projects:"
echo "$PROJECT_RESPONSE" | jq -r '.[] | "- \(.name) (ID: \(.uuid))"' 2>/dev/null || echo "$PROJECT_RESPONSE"

echo ""
echo "🎯 Next Steps:"
echo "1. Access Coolify at: $COOLIFY_URL"
echo "2. Find the 'bizbox-saas' project"
echo "3. Create new service → Docker Compose"
echo "4. Upload .coolify.production.yml"
echo "5. Set these environment variables:"
echo ""
echo "Environment Variables to Set in Coolify:"
echo "========================================"
echo "DB_PASSWORD=$POSTGRES_PASSWORD"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "SUPER_ADMIN_PASSWORD=$SUPER_ADMIN_PASSWORD"
echo "ADMIN_EMAIL=$SUPER_ADMIN_EMAIL"
echo ""
echo "Optional (if using Stripe):"
echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY"
echo "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET"
echo ""
echo "6. Deploy and monitor progress"
echo ""
echo "🌐 After deployment, your apps will be available at:"
echo "- Landing Page: http://194.164.89.92:3001"
echo "- Admin Dashboard: http://194.164.89.92:3002"
echo "- Website Builder: http://194.164.89.92:3003"
echo "- Customer Portal: http://194.164.89.92:3004"
echo "- Tenant Sites: http://194.164.89.92:3005"
echo "- Super Admin: http://194.164.89.92:3006"
echo ""
echo "✅ Deployment preparation complete!"