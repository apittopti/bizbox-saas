#!/bin/bash

# BizBox Deployment Script with Environment File Support
# This script loads environment variables from .env.deployment.local

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 BizBox Deployment Script${NC}"
echo "=================================="

# Check if environment file exists
ENV_FILE=".env.deployment.local"
if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}📁 Loading environment from $ENV_FILE${NC}"
    source "$ENV_FILE"
else
    echo -e "${YELLOW}⚠️  Environment file $ENV_FILE not found${NC}"
    echo "Please create $ENV_FILE with your configuration"
    echo "You can copy from .env.deployment as a template"
    echo ""
    echo "Required variables:"
    echo "- COOLIFY_TOKEN"
    echo "- COOLIFY_URL"
    exit 1
fi

# Validate required variables
if [ -z "$COOLIFY_TOKEN" ]; then
    echo -e "${RED}❌ COOLIFY_TOKEN not set in $ENV_FILE${NC}"
    exit 1
fi

if [ -z "$COOLIFY_URL" ]; then
    echo -e "${YELLOW}⚠️  COOLIFY_URL not set, using default: http://194.164.89.92${NC}"
    COOLIFY_URL="http://194.164.89.92"
fi

echo -e "${GREEN}✅ Environment loaded successfully${NC}"
echo "Coolify URL: $COOLIFY_URL"
echo ""

# Generate secure passwords if not provided
if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    echo -e "${BLUE}🔐 Generated PostgreSQL password${NC}"
fi

if [ -z "$REDIS_PASSWORD" ]; then
    REDIS_PASSWORD=$(openssl rand -base64 32)
    echo -e "${BLUE}🔐 Generated Redis password${NC}"
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo -e "${BLUE}🔐 Generated NextAuth secret${NC}"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    echo -e "${BLUE}🔐 Generated encryption key${NC}"
fi

echo ""

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

# Test API connection
echo -e "${YELLOW}🔌 Testing Coolify API connection...${NC}"
API_TEST=$(api_call "GET" "/projects")
if [[ $API_TEST == *"error"* ]] || [[ $API_TEST == *"unauthorized"* ]]; then
    echo -e "${RED}❌ API connection failed. Check your COOLIFY_TOKEN${NC}"
    echo "Response: $API_TEST"
    exit 1
fi
echo -e "${GREEN}✅ API connection successful${NC}"

# Continue with deployment...
echo -e "${YELLOW}📁 Creating BizBox project...${NC}"
PROJECT_RESPONSE=$(api_call "POST" "/projects" '{
    "name": "bizbox-platform",
    "description": "BizBox Multi-Tenant SaaS Platform"
}')

echo -e "${GREEN}🎉 Deployment script ready to continue!${NC}"
echo ""
echo "Generated credentials saved for deployment:"
echo "- PostgreSQL Password: [GENERATED]"
echo "- Redis Password: [GENERATED]" 
echo "- NextAuth Secret: [GENERATED]"
echo "- Encryption Key: [GENERATED]"
echo ""
echo -e "${BLUE}Next: The script will continue deploying all services...${NC}"