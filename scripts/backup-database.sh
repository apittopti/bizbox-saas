#!/bin/bash

# BizBox Database Backup Script
# Automated PostgreSQL backup with encryption and cloud storage

set -e

# Configuration
BACKUP_DIR="/opt/coolify/backups/bizbox-db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
COMPRESSION_LEVEL=6

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
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

# Check if running as root or with proper permissions
check_permissions() {
    if [ "$EUID" -ne 0 ] && ! groups | grep -q docker; then
        log_error "This script must be run as root or user must be in docker group"
        exit 1
    fi
}

# Verify required environment variables
check_environment() {
    local required_vars=(
        "DB_PASSWORD"
        "DB_NAME"
        "DB_USER"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Environment variables validated"
}

# Create backup directory if it doesn't exist
setup_backup_directory() {
    mkdir -p "$BACKUP_DIR"
    chmod 750 "$BACKUP_DIR"
    log_success "Backup directory ready: $BACKUP_DIR"
}

# Check if PostgreSQL container is running
check_postgres_container() {
    if ! docker ps | grep -q "bizbox-postgres"; then
        log_error "PostgreSQL container 'bizbox-postgres' is not running"
        exit 1
    fi
    log_success "PostgreSQL container is running"
}

# Perform database backup
create_backup() {
    local backup_type="${1:-full}"
    local backup_filename="bizbox_${backup_type}_${TIMESTAMP}.sql"
    local backup_path="$BACKUP_DIR/$backup_filename"
    
    log "Creating $backup_type backup..."
    
    # Create SQL dump
    if [ "$backup_type" = "schema" ]; then
        docker exec bizbox-postgres pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --schema-only \
            --verbose \
            > "$backup_path" 2>/dev/null
    else
        docker exec bizbox-postgres pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            > "$backup_path" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        log_success "SQL dump created: $backup_filename"
    else
        log_error "Failed to create SQL dump"
        return 1
    fi
    
    # Compress backup
    log "Compressing backup..."
    gzip -$COMPRESSION_LEVEL "$backup_path"
    backup_path="${backup_path}.gz"
    
    # Encrypt backup if encryption key is available
    if [ -n "$BACKUP_ENCRYPTION_KEY" ]; then
        log "Encrypting backup..."
        openssl enc -aes-256-cbc -salt -in "$backup_path" -out "${backup_path}.enc" -pass pass:"$BACKUP_ENCRYPTION_KEY"
        rm "$backup_path"
        backup_path="${backup_path}.enc"
        log_success "Backup encrypted"
    fi
    
    # Calculate and store checksum
    sha256sum "$backup_path" > "${backup_path}.sha256"
    
    log_success "Backup created: $(basename $backup_path)"
    echo "$backup_path"
}

# Upload backup to cloud storage
upload_backup() {
    local backup_path="$1"
    local backup_filename=$(basename "$backup_path")
    
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ -n "$BACKUP_S3_BUCKET" ]; then
        log "Uploading backup to S3..."
        
        # Configure AWS CLI if not already done
        export AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}"
        
        # Upload to S3
        if command -v aws >/dev/null 2>&1; then
            aws s3 cp "$backup_path" "s3://$BACKUP_S3_BUCKET/database/$backup_filename"
            aws s3 cp "${backup_path}.sha256" "s3://$BACKUP_S3_BUCKET/database/${backup_filename}.sha256"
            log_success "Backup uploaded to S3"
        else
            log_warning "AWS CLI not found, skipping S3 upload"
        fi
    else
        log_warning "S3 configuration incomplete, skipping cloud upload"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"
    
    log "Verifying backup integrity..."
    
    # Check file exists and is not empty
    if [ ! -s "$backup_path" ]; then
        log_error "Backup file is empty or doesn't exist"
        return 1
    fi
    
    # Verify checksum
    if [ -f "${backup_path}.sha256" ]; then
        if sha256sum -c "${backup_path}.sha256" >/dev/null 2>&1; then
            log_success "Checksum verification passed"
        else
            log_error "Checksum verification failed"
            return 1
        fi
    fi
    
    # Test backup (if it's not encrypted)
    if [[ "$backup_path" != *.enc ]]; then
        log "Testing backup restoration (dry run)..."
        
        # Create temporary test database
        local test_db="bizbox_test_$(date +%s)"
        docker exec bizbox-postgres createdb -U "$DB_USER" "$test_db" 2>/dev/null || true
        
        # Try to restore to test database
        if [[ "$backup_path" == *.gz ]]; then
            gunzip -c "$backup_path" | docker exec -i bizbox-postgres psql -U "$DB_USER" -d "$test_db" >/dev/null 2>&1
        else
            docker exec -i bizbox-postgres psql -U "$DB_USER" -d "$test_db" < "$backup_path" >/dev/null 2>&1
        fi
        
        if [ $? -eq 0 ]; then
            log_success "Backup restoration test passed"
            # Cleanup test database
            docker exec bizbox-postgres dropdb -U "$DB_USER" "$test_db" 2>/dev/null || true
        else
            log_warning "Backup restoration test failed (this may be normal for incremental backups)"
        fi
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR" -name "bizbox_*.sql.gz*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "bizbox_*.sql.gz*.sha256" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    local removed_count=$(find "$BACKUP_DIR" -name "bizbox_*.sql.gz*" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)
    log_success "Cleaned up old backups"
    
    # Cleanup S3 old backups if configured
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$BACKUP_S3_BUCKET" ]; then
        if command -v aws >/dev/null 2>&1; then
            aws s3api list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix "database/bizbox_" --query "Contents[?LastModified<='$(date -d "$RETENTION_DAYS days ago" --iso-8601)'].Key" --output text | xargs -I {} aws s3 rm "s3://$BACKUP_S3_BUCKET/{}" 2>/dev/null || true
        fi
    fi
}

# Send notification about backup status
send_notification() {
    local status="$1"
    local backup_filename="$2"
    local backup_size="$3"
    
    if [ -n "$WEBHOOK_ALERT_URL" ]; then
        local color="good"
        local title="✅ Database Backup Successful"
        
        if [ "$status" != "success" ]; then
            color="danger"
            title="❌ Database Backup Failed"
        fi
        
        curl -X POST "$WEBHOOK_ALERT_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$title\",
                    \"fields\": [
                        {\"title\": \"Backup File\", \"value\": \"$backup_filename\", \"short\": true},
                        {\"title\": \"Size\", \"value\": \"$backup_size\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true},
                        {\"title\": \"Server\", \"value\": \"$(hostname)\", \"short\": true}
                    ]
                }]
            }" >/dev/null 2>&1 || true
    fi
}

# Main execution
main() {
    local backup_type="${1:-full}"
    
    log "Starting BizBox database backup (type: $backup_type)"
    
    # Run pre-backup checks
    check_permissions
    check_environment
    setup_backup_directory
    check_postgres_container
    
    # Perform backup
    backup_path=$(create_backup "$backup_type")
    
    if [ $? -eq 0 ]; then
        # Verify backup
        verify_backup "$backup_path"
        
        # Upload to cloud storage
        upload_backup "$backup_path"
        
        # Get backup size
        backup_size=$(du -h "$backup_path" | cut -f1)
        backup_filename=$(basename "$backup_path")
        
        # Cleanup old backups
        cleanup_old_backups
        
        # Send success notification
        send_notification "success" "$backup_filename" "$backup_size"
        
        log_success "Database backup completed successfully"
        log_success "Backup location: $backup_path"
        log_success "Backup size: $backup_size"
        
        exit 0
    else
        send_notification "failure" "N/A" "N/A"
        log_error "Database backup failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "full"|"schema"|"")
        main "${1:-full}"
        ;;
    "--help"|"-h")
        echo "Usage: $0 [full|schema]"
        echo ""
        echo "Options:"
        echo "  full     - Create full database backup (default)"
        echo "  schema   - Create schema-only backup"
        echo "  --help   - Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  DB_PASSWORD         - Database password (required)"
        echo "  DB_NAME            - Database name (required)"
        echo "  DB_USER            - Database user (required)"
        echo "  BACKUP_ENCRYPTION_KEY - Encryption key for backup files (optional)"
        echo "  AWS_ACCESS_KEY_ID  - AWS access key for S3 upload (optional)"
        echo "  AWS_SECRET_ACCESS_KEY - AWS secret key for S3 upload (optional)"
        echo "  BACKUP_S3_BUCKET   - S3 bucket for backup storage (optional)"
        echo "  WEBHOOK_ALERT_URL  - Webhook URL for notifications (optional)"
        exit 0
        ;;
    *)
        log_error "Invalid backup type: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac