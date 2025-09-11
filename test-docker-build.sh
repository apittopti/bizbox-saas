#!/bin/bash

# Test script to validate Docker builds for BizBox applications
set -e

echo "🧪 Testing BizBox Docker builds..."

# Array of applications to test
apps=("landing" "admin" "builder" "customer" "tenant" "super-admin")

# Test each application build
for app in "${apps[@]}"; do
    echo "🔨 Testing build for $app..."
    
    # Build the Docker image
    if docker build -f "apps/$app/Dockerfile.prod" -t "bizbox-$app:test" . --quiet; then
        echo "✅ $app build successful"
        
        # Test container can start
        if docker run -d --name "test-$app" -p "0:3000" "bizbox-$app:test"; then
            echo "✅ $app container starts successfully"
            
            # Wait a moment for startup
            sleep 3
            
            # Check if container is still running
            if docker ps | grep -q "test-$app"; then
                echo "✅ $app container is running stable"
            else
                echo "❌ $app container failed to stay running"
                docker logs "test-$app"
            fi
            
            # Clean up test container
            docker stop "test-$app" > /dev/null 2>&1 || true
            docker rm "test-$app" > /dev/null 2>&1 || true
        else
            echo "❌ $app container failed to start"
        fi
        
        # Clean up test image
        docker rmi "bizbox-$app:test" > /dev/null 2>&1 || true
    else
        echo "❌ $app build failed"
        exit 1
    fi
    
    echo ""
done

echo "🎉 All Docker builds tested successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Run 'docker-compose up' to test all services together"
echo "2. Deploy to Coolify using the coolify.yml configuration"
echo "3. Configure environment variables for production"
echo "4. Set up SSL certificates and domains"