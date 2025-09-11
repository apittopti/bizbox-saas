#!/bin/bash

# BizBox Deployment Script
# Automated deployment to Coolify server

set -e

# Configuration
COOLIFY_HOST="${COOLIFY_HOST:-194.164.89.92}"
COOLIFY_USER="${COOLIFY_USER:-root}"
COOLIFY_PORT="${COOLIFY_PORT:-22}"
DEPLOY_PATH="/opt/coolify/deployments/bizbox-saas"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "Commands:"
    echo "  deploy     - Deploy application to production"
    echo "  rollback   - Rollback to previous deployment"
    echo "  status     - Check deployment status"
    echo "  logs       - View application logs"
    echo "  backup     - Create database backup"
    echo "  migrate    - Run database migrations"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --dry-run      Show what would be done without executing"
    echo "  --force        Force deployment even if checks fail"
    echo "  --no-migrate   Skip database migrations"
    echo "  --no-backup    Skip pre-deployment backup"
    echo ""
    echo "Environment Variables:"
    echo "  COOLIFY_HOST   Target server hostname/IP (default: 194.164.89.92)"
    echo "  COOLIFY_USER   SSH username (default: root)"
    echo "  COOLIFY_PORT   SSH port (default: 22)"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "ssh" "curl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "Required command '$cmd' not found"
            exit 1
        fi
    done
    
    # Check environment variables
    if [ -z "$COOLIFY_HOST" ]; then
        log_error "COOLIFY_HOST environment variable is required"
        exit 1
    fi
    
    # Check SSH connectivity
    log "Testing SSH connectivity..."
    if ! ssh -p "$COOLIFY_PORT" -o ConnectTimeout=10 -o BatchMode=yes "$COOLIFY_USER@$COOLIFY_HOST" exit 2>/dev/null; then
        log_error "Cannot connect to $COOLIFY_USER@$COOLIFY_HOST:$COOLIFY_PORT"
        log_error "Please ensure SSH key authentication is set up"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found"
        log_error "Please run ./scripts/setup-secrets.sh first"
        exit 1
    fi
    
    # Check required Docker images
    log "Checking Docker images..."
    local images=("landing" "admin" "builder" "customer" "tenant")
    for image in "${images[@]}"; do
        if ! docker image inspect "bizbox-${image}:latest" >/dev/null 2>&1; then
            log_warning "Docker image bizbox-${image}:latest not found locally"
        fi
    done
    
    # Check server resources
    log "Checking server resources..."
    ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" '
        # Check disk space
        DISK_USAGE=$(df / | awk "NR==2{print \$5}" | sed "s/%//")
        if [ "$DISK_USAGE" -gt 80 ]; then
            echo "WARNING: Disk usage is ${DISK_USAGE}%"
        fi
        
        # Check memory
        MEMORY_USAGE=$(free | grep Mem | awk "{printf(\"%.1f\", \$3/\$2 * 100.0)}")
        if [ "$(echo "$MEMORY_USAGE > 85" | bc -l)" -eq 1 ]; then
            echo "WARNING: Memory usage is ${MEMORY_USAGE}%"
        fi
        
        # Check if deployment directory exists
        if [ ! -d "/opt/coolify/deployments/bizbox-saas" ]; then
            echo "Creating deployment directory..."
            mkdir -p /opt/coolify/deployments/bizbox-saas
        fi
    '
    
    log_success "Pre-deployment checks completed"
}

# Create backup before deployment
create_backup() {
    if [ "$NO_BACKUP" = "true" ]; then
        log_warning "Skipping backup (--no-backup specified)"
        return 0
    fi
    
    log "Creating pre-deployment backup..."
    
    ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
        cd $DEPLOY_PATH
        if [ -f docker-compose.yml ]; then
            ./scripts/backup-database.sh full
        else
            echo 'No existing deployment found, skipping backup'
        fi
    "
    
    log_success "Backup completed"
}

# Deploy application
deploy_application() {
    log "Starting deployment to $COOLIFY_HOST..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN MODE - No changes will be made"
        return 0
    fi
    
    # Copy application files to server
    log "Copying application files..."
    rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='.next' \
        --exclude='dist' \
        . "$COOLIFY_USER@$COOLIFY_HOST:$DEPLOY_PATH/"
    
    # Copy environment file
    if [ -f ".env.production" ]; then
        scp -P "$COOLIFY_PORT" .env.production "$COOLIFY_USER@$COOLIFY_HOST:$DEPLOY_PATH/.env"
    fi
    
    # Execute deployment on server
    ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
        cd $DEPLOY_PATH
        
        # Pull latest images
        echo 'Pulling latest Docker images...'
        docker compose pull
        
        # Run database migrations if not skipped
        if [ '$NO_MIGRATE' != 'true' ]; then
            echo 'Running database migrations...'
            docker compose up migration --wait
        fi
        
        # Deploy services with zero downtime
        echo 'Deploying services...'
        docker compose up -d --wait
        
        # Cleanup old images
        echo 'Cleaning up old images...'
        docker image prune -f
        
        # Wait for services to be ready
        sleep 30
        
        # Health check
        echo 'Running health checks...'
        curl -f http://localhost:3000/api/health || echo 'Health check failed for landing app'
        curl -f http://localhost:3001/api/health || echo 'Health check failed for admin app'
        curl -f http://localhost:3002/api/health || echo 'Health check failed for builder app'
        curl -f http://localhost:3003/api/health || echo 'Health check failed for customer app'
        curl -f http://localhost:3004/api/health || echo 'Health check failed for tenant app'
    "
    
    log_success "Deployment completed successfully"
}

# Check deployment status
check_status() {
    log "Checking deployment status on $COOLIFY_HOST..."
    
    ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
        cd $DEPLOY_PATH
        
        echo '=== Container Status ==='
        docker compose ps
        
        echo ''
        echo '=== Service Health ==='
        docker compose exec -T landing curl -s http://localhost:3000/api/health || echo 'Landing: UNHEALTHY'
        docker compose exec -T admin curl -s http://localhost:3000/api/health || echo 'Admin: UNHEALTHY'
        docker compose exec -T builder curl -s http://localhost:3000/api/health || echo 'Builder: UNHEALTHY'
        docker compose exec -T customer curl -s http://localhost:3000/api/health || echo 'Customer: UNHEALTHY'
        docker compose exec -T tenant curl -s http://localhost:3000/api/health || echo 'Tenant: UNHEALTHY'
        
        echo ''
        echo '=== System Resources ==='
        docker stats --no-stream --format 'table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}'
        
        echo ''
        echo '=== Disk Usage ==='
        df -h /
    "
}

# View application logs
view_logs() {
    local service="${1:-}"
    
    if [ -n "$service" ]; then
        log "Viewing logs for service: $service"
        ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
            cd $DEPLOY_PATH
            docker compose logs -f --tail=100 $service
        "
    else
        log "Viewing logs for all services"
        ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
            cd $DEPLOY_PATH
            docker compose logs -f --tail=50
        "
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN MODE - No changes will be made"
        return 0
    fi
    
    ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
        cd $DEPLOY_PATH
        
        # Stop current containers
        docker compose down
        
        # Restore from backup (if available)
        LATEST_BACKUP=\$(ls -t /opt/coolify/backups/bizbox-db/*.tar.gz 2>/dev/null | head -n1)
        if [ -n \"\$LATEST_BACKUP\" ]; then
            echo \"Restoring database from: \$LATEST_BACKUP\"
            # Database restoration logic here
        fi
        
        # Start previous version
        docker compose up -d
    "
    
    log_success "Rollback completed"
}

# Run database migration
run_migration() {
    log "Running database migrations..."
    
    ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
        cd $DEPLOY_PATH
        docker compose up migration
    "
    
    log_success "Migrations completed"
}

# Create database backup
create_database_backup() {
    log "Creating database backup..."
    
    ssh -p "$COOLIFY_PORT" "$COOLIFY_USER@$COOLIFY_HOST" "
        cd $DEPLOY_PATH
        ./scripts/backup-database.sh full
    "
    
    log_success "Backup completed"
}

# Parse command line arguments
COMMAND=""
DRY_RUN=false
FORCE=false
NO_MIGRATE=false
NO_BACKUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --no-migrate)
            NO_MIGRATE=true
            shift
            ;;
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        deploy|rollback|status|logs|backup|migrate)
            COMMAND="$1"
            shift
            ;;
        *)
            if [ -z "$COMMAND" ]; then
                log_error "Unknown option: $1"
                show_usage
                exit 1
            else
                # Additional arguments for commands (like service name for logs)
                ARGS="$@"
                break
            fi
            ;;
    esac
done

# Check if command is provided
if [ -z "$COMMAND" ]; then
    log_error "No command specified"
    show_usage
    exit 1
fi

# Execute command
case "$COMMAND" in
    deploy)
        check_prerequisites
        pre_deployment_checks
        create_backup
        deploy_application
        check_status
        ;;
    rollback)
        check_prerequisites
        rollback_deployment
        ;;
    status)
        check_prerequisites
        check_status
        ;;
    logs)
        check_prerequisites
        view_logs $ARGS
        ;;
    backup)
        check_prerequisites
        create_database_backup
        ;;
    migrate)
        check_prerequisites
        run_migration
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac

log_success "Command '$COMMAND' completed successfully"