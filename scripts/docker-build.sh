#!/bin/bash
# BizBox Platform - Docker Build Scripts
# Automated build process for development and production environments with network resilience

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="bizbox-platform"
BUILD_CONTEXT="."
DEFAULT_REGISTRY="docker.io"
APPS=("landing" "admin" "builder" "customer" "tenant" "super-admin")

# Global options
REGISTRY="$DEFAULT_REGISTRY"
TAG="latest"
PLATFORM="linux/amd64"
NO_CACHE=""
PUSH_AFTER_BUILD=false
BUILD_ARGS=""

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

# Show usage
show_usage() {
    cat << EOF
BizBox Platform - Docker Build Script

Usage: $0 [OPTIONS] [COMMAND]

COMMANDS:
    dev                 Build development environment
    prod                Build all production images
    app <name>          Build specific application (landing, admin, builder, customer, tenant, super-admin)
    migration           Build migration container
    all                 Build all production images
    push                Push images to registry
    clean               Clean up build artifacts

OPTIONS:
    -r, --registry      Docker registry (default: docker.io)
    -t, --tag          Tag for images (default: latest)
    -p, --platform     Platform for multi-arch builds (default: linux/amd64)
    --no-cache         Disable Docker cache
    --push             Automatically push after build
    --build-arg        Pass build arguments (can be used multiple times)
    -h, --help         Show this help message

EXAMPLES:
    $0 dev                                    # Build development environment
    $0 prod                                   # Build all production images
    $0 app admin                              # Build only admin application
    $0 --registry myregistry.com --tag v1.0.0 prod   # Build with custom registry and tag
    $0 --push --tag latest all               # Build and push all images
    $0 --no-cache --build-arg NODE_ENV=production prod  # Build without cache

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            -t|--tag)
                TAG="$2"
                shift 2
                ;;
            -p|--platform)
                PLATFORM="$2"
                shift 2
                ;;
            --no-cache)
                NO_CACHE="--no-cache"
                shift
                ;;
            --push)
                PUSH_AFTER_BUILD=true
                shift
                ;;
            --build-arg)
                BUILD_ARGS="$BUILD_ARGS --build-arg $2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                COMMAND="$1"
                APP_NAME="$2"
                break
                ;;
        esac
    done
}

# Retry function with exponential backoff
retry_with_backoff() {
    local max_attempts=5
    local delay=1
    local attempt=1
    local command="$*"
    
    until eval "$command"; do
        if [ $attempt -eq $max_attempts ]; then
            error "Command failed after $max_attempts attempts: $command"
        fi
        
        warning "Attempt $attempt failed. Retrying in ${delay}s..."
        sleep $delay
        delay=$((delay * 2))
        attempt=$((attempt + 1))
    done
}

# Build functions with retry logic
build_base_stage() {
    log "Building base stage with network resilience..."
    retry_with_backoff docker build \
        --target base \
        --platform "$PLATFORM" \
        -t "${REGISTRY}/${PROJECT_NAME}:base-${TAG}" \
        $NO_CACHE \
        $BUILD_ARGS \
        -f Dockerfile \
        "$BUILD_CONTEXT"
    success "Base stage built successfully"
}

build_dependencies_stage() {
    log "Building dependencies stage..."
    retry_with_backoff docker build \
        --target dependencies \
        --platform "$PLATFORM" \
        -t "${REGISTRY}/${PROJECT_NAME}:deps-${TAG}" \
        $NO_CACHE \
        $BUILD_ARGS \
        -f Dockerfile \
        "$BUILD_CONTEXT"
    success "Dependencies stage built successfully"
}

build_builder_stage() {
    log "Building builder stage..."
    retry_with_backoff docker build \
        --target builder \
        --platform "$PLATFORM" \
        -t "${REGISTRY}/${PROJECT_NAME}:builder-${TAG}" \
        $NO_CACHE \
        $BUILD_ARGS \
        -f Dockerfile \
        "$BUILD_CONTEXT"
    success "Builder stage built successfully"
}

build_app() {
    local app_name="$1"
    local dockerfile="Dockerfile"
    
    # Validate app name
    if [[ ! " ${APPS[@]} " =~ " ${app_name} " ]]; then
        error "Invalid app name: $app_name. Valid apps: ${APPS[*]}"
    fi
    
    log "Building ${app_name} application..."
    retry_with_backoff docker build \
        --target "${app_name}-app" \
        --platform "$PLATFORM" \
        -t "${REGISTRY}/${PROJECT_NAME}-${app_name}:${TAG}" \
        $NO_CACHE \
        $BUILD_ARGS \
        -f "$dockerfile" \
        "$BUILD_CONTEXT"
    success "${app_name} application built successfully"
    
    # Push if requested
    if [ "$PUSH_AFTER_BUILD" = true ]; then
        push_image "${REGISTRY}/${PROJECT_NAME}-${app_name}:${TAG}"
    fi
}

build_migration() {
    log "Building migration container..."
    retry_with_backoff docker build \
        --platform "$PLATFORM" \
        -t "${REGISTRY}/${PROJECT_NAME}-migration:${TAG}" \
        $NO_CACHE \
        $BUILD_ARGS \
        -f Dockerfile.migration \
        "$BUILD_CONTEXT"
    success "Migration container built successfully"
    
    # Push if requested
    if [ "$PUSH_AFTER_BUILD" = true ]; then
        push_image "${REGISTRY}/${PROJECT_NAME}-migration:${TAG}"
    fi
}

build_all_apps() {
    log "Building all production applications..."
    
    # Build shared stages first for efficiency
    build_base_stage
    build_dependencies_stage
    build_builder_stage
    
    # Build all applications
    for app in "${APPS[@]}"; do
        build_app "$app"
    done
    
    # Build migration container
    build_migration
    
    success "All applications built successfully!"
}

build_development() {
    log "Building development environment..."
    retry_with_backoff docker build \
        --target development \
        --platform "$PLATFORM" \
        -t "${REGISTRY}/${PROJECT_NAME}:dev-${TAG}" \
        $NO_CACHE \
        $BUILD_ARGS \
        -f Dockerfile \
        "$BUILD_CONTEXT"
    success "Development environment ready!"
    
    # Push if requested
    if [ "$PUSH_AFTER_BUILD" = true ]; then
        push_image "${REGISTRY}/${PROJECT_NAME}:dev-${TAG}"
    fi
}

push_image() {
    local image="$1"
    log "Pushing image: $image"
    retry_with_backoff docker push "$image"
    success "Image pushed: $image"
}

push_all_images() {
    log "Pushing all images to registry..."
    
    # Push application images
    for app in "${APPS[@]}"; do
        push_image "${REGISTRY}/${PROJECT_NAME}-${app}:${TAG}"
    done
    
    # Push migration image
    push_image "${REGISTRY}/${PROJECT_NAME}-migration:${TAG}"
    
    success "All images pushed successfully!"
}

clean_build_artifacts() {
    log "Cleaning up build artifacts..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove build cache
    docker buildx prune -f
    
    success "Build artifacts cleaned up!"
}

# Verify Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running or not accessible"
    fi
}

# Main execution
main() {
    check_docker
    
    # If no arguments provided, show usage
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    # Parse arguments
    parse_args "$@"
    
    log "Starting build with registry: $REGISTRY, tag: $TAG, platform: $PLATFORM"
    
    # Execute commands
    case "$COMMAND" in
        dev)
            build_development
            ;;
        prod|all)
            build_all_apps
            ;;
        app)
            if [[ -z "$APP_NAME" ]]; then
                error "App name required for 'app' command. Valid apps: ${APPS[*]}"
            fi
            build_app "$APP_NAME"
            ;;
        migration)
            build_migration
            ;;
        push)
            push_all_images
            ;;
        clean)
            clean_build_artifacts
            ;;
        -h|--help|help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown command: $COMMAND. Use --help for usage information."
            ;;
    esac
    
    log "Build process completed successfully!"
}

# Run main function with all arguments
main "$@"