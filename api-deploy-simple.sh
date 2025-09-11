#!/bin/bash

# BizBox API Deployment Script (without jq dependency)
set -e

# Load environment variables
export $(grep -v '^#' .env.deployment.local | grep -v '^$' | xargs)

echo "🚀 BizBox API Deployment Starting..."
echo "=========================================="

# Create a simplified Docker Compose for testing
SIMPLE_COMPOSE='{
  "project_uuid": "uowskkkgo40gksw8gos88cks",
  "environment_name": "production", 
  "server_uuid": "f8scksookwokkwwsowgg8okg",
  "type": "docker-compose",
  "name": "bizbox-platform",
  "description": "BizBox Multi-Tenant SaaS Platform",
  "docker_compose_raw": "version: \"3.8\"\nservices:\n  test:\n    image: nginx:alpine\n    ports:\n      - \"3001:80\""
}'

echo "📦 Creating Docker Compose service..."
curl -X POST \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$SIMPLE_COMPOSE" \
    http://194.164.89.92:8000/api/v1/services

echo ""
echo "✅ API deployment test completed!"
echo "Check Coolify dashboard: http://194.164.89.92:8000"