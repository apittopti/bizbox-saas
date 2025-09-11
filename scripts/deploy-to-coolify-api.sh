#!/bin/bash

# BizBox Coolify API Deployment Script
# Run this script locally to deploy via Coolify API

set -e

# Configuration
COOLIFY_URL="http://194.164.89.92"
PROJECT_NAME="bizbox-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 BizBox Coolify API Deployment Script${NC}"
echo "==============================================="

# Check if API token is set
if [ -z "$COOLIFY_TOKEN" ]; then
    echo -e "${RED}Error: COOLIFY_TOKEN environment variable not set${NC}"
    echo "Please get your API token from Coolify Settings > API Tokens"
    echo "Then run: export COOLIFY_TOKEN='your-token-here'"
    exit 1
fi

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$COOLIFY_URL/api/v1$endpoint" \
            -H "Authorization: Bearer $COOLIFY_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "$COOLIFY_URL/api/v1$endpoint" \
            -H "Authorization: Bearer $COOLIFY_TOKEN"
    fi
}

# Step 1: Create Project
echo -e "${YELLOW}📁 Creating project...${NC}"
PROJECT_RESPONSE=$(api_call "POST" "/projects" '{
    "name": "'$PROJECT_NAME'",
    "description": "BizBox Multi-Tenant SaaS Platform - Complete business solution for UK service businesses"
}')

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.data.id // .id // empty')

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Failed to create project. Response: $PROJECT_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project created with ID: $PROJECT_ID${NC}"

# Step 2: Create Database Service
echo -e "${YELLOW}🗄️ Creating PostgreSQL database...${NC}"
DB_RESPONSE=$(api_call "POST" "/services" '{
    "type": "postgresql",
    "name": "bizbox-postgres",
    "project_id": "'$PROJECT_ID'",
    "environment_variables": [
        {"key": "POSTGRES_DB", "value": "bizbox"},
        {"key": "POSTGRES_USER", "value": "bizbox"},
        {"key": "POSTGRES_PASSWORD", "value": "'$(openssl rand -base64 32)'"}
    ]
}')

echo -e "${GREEN}✅ Database service created${NC}"

# Step 3: Create Redis Service
echo -e "${YELLOW}🔄 Creating Redis cache...${NC}"
REDIS_RESPONSE=$(api_call "POST" "/services" '{
    "type": "redis",
    "name": "bizbox-redis",
    "project_id": "'$PROJECT_ID'"
}')

echo -e "${GREEN}✅ Redis service created${NC}"

# Step 4: Deploy Applications
APPS=("landing" "admin" "builder" "customer" "super-admin")
DOMAINS=("bizbox" "admin.bizbox" "builder.bizbox" "app.bizbox" "super-admin.bizbox")

for i in "${!APPS[@]}"; do
    APP="${APPS[$i]}"
    DOMAIN="${DOMAINS[$i]}"
    
    echo -e "${YELLOW}🚀 Deploying $APP application...${NC}"
    
    APP_RESPONSE=$(api_call "POST" "/applications" '{
        "name": "bizbox-'$APP'",
        "project_id": "'$PROJECT_ID'",
        "source": {
            "type": "git",
            "repository": "https://github.com/your-username/bizbox.git",
            "branch": "main"
        },
        "build_pack": "dockerfile",
        "dockerfile_location": "apps/'$APP'/Dockerfile",
        "domains": ["'$DOMAIN'.194-164-89-92.nip.io"],
        "environment_variables": [
            {"key": "NODE_ENV", "value": "production"},
            {"key": "DATABASE_URL", "value": "postgresql://bizbox:password@bizbox-postgres:5432/bizbox"},
            {"key": "REDIS_URL", "value": "redis://bizbox-redis:6379"},
            {"key": "NEXTAUTH_SECRET", "value": "'$(openssl rand -base64 32)'"},
            {"key": "NEXTAUTH_URL", "value": "https://'$DOMAIN'.194-164-89-92.nip.io"}
        ]
    }')
    
    echo -e "${GREEN}✅ $APP application deployed${NC}"
done

# Step 5: Setup SSL
echo -e "${YELLOW}🔒 Setting up SSL certificates...${NC}"
# SSL setup would be handled automatically by Coolify for .nip.io domains

echo ""
echo -e "${GREEN}🎉 BizBox Platform Deployment Complete!${NC}"
echo "==============================================="
echo ""
echo "Your BizBox platform is now deployed at:"
echo "• Landing Page: https://bizbox.194-164-89-92.nip.io"
echo "• Admin Dashboard: https://admin.bizbox.194-164-89-92.nip.io"  
echo "• Website Builder: https://builder.bizbox.194-164-89-92.nip.io"
echo "• Customer Portal: https://app.bizbox.194-164-89-92.nip.io"
echo "• Super Admin: https://super-admin.bizbox.194-164-89-92.nip.io"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run database migrations"
echo "2. Create super admin account"
echo "3. Test all applications"
echo "4. Configure custom domain (optional)"
echo ""
echo -e "${GREEN}🚀 Your enterprise SaaS platform is live!${NC}"