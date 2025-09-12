#!/bin/bash

# Build and deploy script for BizBox
echo "Building BizBox platform..."

# Install all dependencies first
npm install

# Build all packages in order
echo "Building shared packages..."
cd packages/shared/types && npm install && npm run build && cd ../../..
cd packages/shared/utils && npm install && npm run build && cd ../../..
cd packages/shared/hooks && npm install && npm run build && cd ../../..
cd packages/shared/ui && npm install && npm run build && cd ../../..

echo "Building core packages..."
cd packages/core/database && npm install && npm run build && cd ../../..
cd packages/core/auth && npm install && npm run build && cd ../../..
cd packages/core/api && npm install && npm run build && cd ../../..
cd packages/core/framework && npm install && npm run build && cd ../../..

echo "Building plugin packages..."
cd packages/plugins/booking && npm install && npm run build && cd ../../..
cd packages/plugins/ecommerce && npm install && npm run build && cd ../../..
cd packages/plugins/website-builder && npm install && npm run build && cd ../../..
cd packages/plugins/payments && npm install && npm run build && cd ../../..
cd packages/plugins/media-manager && npm install && npm run build && cd ../../..
cd packages/plugins/community && npm install && npm run build && cd ../../..

echo "Building applications..."
cd apps/landing && npm install && npm run build && cd ../..
cd apps/admin && npm install && npm run build && cd ../..
cd apps/builder && npm install && npm run build && cd ../..
cd apps/customer && npm install && npm run build && cd ../..
cd apps/tenant && npm install && npm run build && cd ../..
cd apps/super-admin && npm install && npm run build && cd ../..

echo "Build complete!"