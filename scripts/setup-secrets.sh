#!/bin/bash

# BizBox Secrets Management Setup Script
# This script helps set up all required secrets for deployment

set -e

echo "🔐 BizBox Secrets Management Setup"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate random passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to generate NextAuth secret
generate_nextauth_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [ -n "$default" ]; then
        echo -e "${BLUE}$prompt${NC} (default: $default): "
    else
        echo -e "${BLUE}$prompt${NC}: "
    fi
    
    read value
    echo "${value:-$default}"
}

# Function to prompt for secret input (hidden)
prompt_secret() {
    local prompt="$1"
    local value
    
    echo -e "${BLUE}$prompt${NC}: "
    read -s value
    echo "$value"
}

echo -e "${YELLOW}This script will help you set up all required secrets for BizBox deployment.${NC}"
echo -e "${YELLOW}You can press Enter to use generated values or provide your own.${NC}"
echo ""

# Start collecting secrets
SECRETS_FILE=".env.production"

echo "# BizBox Production Environment Variables" > "$SECRETS_FILE"
echo "# Generated on $(date)" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# Database Configuration
echo -e "${GREEN}📊 Database Configuration${NC}"
echo "# Database Configuration" >> "$SECRETS_FILE"

DB_PASSWORD=$(generate_password)
DB_PASSWORD=$(prompt_with_default "Database password" "$DB_PASSWORD")
echo "DB_PASSWORD=\"$DB_PASSWORD\"" >> "$SECRETS_FILE"

DATABASE_URL="postgresql://bizbox_user:$DB_PASSWORD@postgres:5432/bizbox"
echo "DATABASE_URL=\"$DATABASE_URL\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# Redis Configuration
echo -e "${GREEN}🔄 Redis Configuration${NC}"
echo "# Redis Configuration" >> "$SECRETS_FILE"

REDIS_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(prompt_with_default "Redis password" "$REDIS_PASSWORD")
echo "REDIS_PASSWORD=\"$REDIS_PASSWORD\"" >> "$SECRETS_FILE"

REDIS_URL="redis://default:$REDIS_PASSWORD@redis:6379"
echo "REDIS_URL=\"$REDIS_URL\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# NextAuth Configuration
echo -e "${GREEN}🔑 NextAuth Configuration${NC}"
echo "# NextAuth Configuration" >> "$SECRETS_FILE"

NEXTAUTH_SECRET=$(generate_nextauth_secret)
NEXTAUTH_SECRET=$(prompt_with_default "NextAuth secret" "$NEXTAUTH_SECRET")
echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"" >> "$SECRETS_FILE"

DOMAIN=$(prompt_with_default "Your domain (e.g., bizbox.com)" "bizbox.yourdomain.com")
echo "NEXTAUTH_URL=\"https://$DOMAIN\"" >> "$SECRETS_FILE"
echo "ADMIN_NEXTAUTH_URL=\"https://admin.$DOMAIN\"" >> "$SECRETS_FILE"
echo "BUILDER_NEXTAUTH_URL=\"https://builder.$DOMAIN\"" >> "$SECRETS_FILE"
echo "CUSTOMER_NEXTAUTH_URL=\"https://app.$DOMAIN\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# Stripe Configuration
echo -e "${GREEN}💳 Stripe Configuration${NC}"
echo "# Stripe Configuration" >> "$SECRETS_FILE"

STRIPE_SECRET_KEY=$(prompt_secret "Stripe secret key (sk_live_...)")
echo "STRIPE_SECRET_KEY=\"$STRIPE_SECRET_KEY\"" >> "$SECRETS_FILE"

STRIPE_PUBLISHABLE_KEY=$(prompt_with_default "Stripe publishable key (pk_live_...)" "")
echo "STRIPE_PUBLISHABLE_KEY=\"$STRIPE_PUBLISHABLE_KEY\"" >> "$SECRETS_FILE"

STRIPE_WEBHOOK_SECRET=$(prompt_secret "Stripe webhook secret (whsec_...)")
echo "STRIPE_WEBHOOK_SECRET=\"$STRIPE_WEBHOOK_SECRET\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# Email Configuration
echo -e "${GREEN}📧 Email Configuration${NC}"
echo "# Email Configuration" >> "$SECRETS_FILE"

SMTP_HOST=$(prompt_with_default "SMTP host" "smtp.sendgrid.net")
echo "SMTP_HOST=\"$SMTP_HOST\"" >> "$SECRETS_FILE"

SMTP_PORT=$(prompt_with_default "SMTP port" "587")
echo "SMTP_PORT=\"$SMTP_PORT\"" >> "$SECRETS_FILE"

SMTP_USER=$(prompt_with_default "SMTP username" "apikey")
echo "SMTP_USER=\"$SMTP_USER\"" >> "$SECRETS_FILE"

SMTP_PASSWORD=$(prompt_secret "SMTP password")
echo "SMTP_PASSWORD=\"$SMTP_PASSWORD\"" >> "$SECRETS_FILE"

FROM_EMAIL=$(prompt_with_default "From email address" "noreply@$DOMAIN")
echo "FROM_EMAIL=\"$FROM_EMAIL\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# AWS S3 Configuration
echo -e "${GREEN}☁️  AWS S3 Configuration${NC}"
echo "# AWS S3 Configuration" >> "$SECRETS_FILE"

AWS_ACCESS_KEY_ID=$(prompt_with_default "AWS Access Key ID" "")
echo "AWS_ACCESS_KEY_ID=\"$AWS_ACCESS_KEY_ID\"" >> "$SECRETS_FILE"

AWS_SECRET_ACCESS_KEY=$(prompt_secret "AWS Secret Access Key")
echo "AWS_SECRET_ACCESS_KEY=\"$AWS_SECRET_ACCESS_KEY\"" >> "$SECRETS_FILE"

S3_BUCKET=$(prompt_with_default "S3 bucket name" "bizbox-assets-$(date +%s)")
echo "S3_BUCKET=\"$S3_BUCKET\"" >> "$SECRETS_FILE"

AWS_REGION=$(prompt_with_default "AWS region" "us-east-1")
echo "AWS_REGION=\"$AWS_REGION\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# SSL Configuration
echo -e "${GREEN}🔒 SSL Configuration${NC}"
echo "# SSL Configuration" >> "$SECRETS_FILE"

SSL_EMAIL=$(prompt_with_default "SSL certificate email" "admin@$DOMAIN")
echo "SSL_EMAIL=\"$SSL_EMAIL\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# Admin Configuration
echo -e "${GREEN}👤 Admin Configuration${NC}"
echo "# Admin Configuration" >> "$SECRETS_FILE"

ADMIN_EMAIL=$(prompt_with_default "Super admin email" "admin@$DOMAIN")
echo "ADMIN_EMAIL=\"$ADMIN_EMAIL\"" >> "$SECRETS_FILE"

SUPER_ADMIN_PASSWORD=$(generate_password)
SUPER_ADMIN_PASSWORD=$(prompt_with_default "Super admin password" "$SUPER_ADMIN_PASSWORD")
echo "SUPER_ADMIN_PASSWORD=\"$SUPER_ADMIN_PASSWORD\"" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"

# Optional Integrations
echo -e "${GREEN}🔌 Optional Integrations${NC}"
echo "# Optional Integrations" >> "$SECRETS_FILE"

echo "Do you want to configure optional integrations? (y/n)"
read configure_integrations

if [ "$configure_integrations" = "y" ] || [ "$configure_integrations" = "Y" ]; then
    # Monitoring
    SENTRY_DSN=$(prompt_with_default "Sentry DSN (optional)" "")
    if [ -n "$SENTRY_DSN" ]; then
        echo "SENTRY_DSN=\"$SENTRY_DSN\"" >> "$SECRETS_FILE"
    fi
    
    # Analytics
    GOOGLE_ANALYTICS_ID=$(prompt_with_default "Google Analytics ID (optional)" "")
    if [ -n "$GOOGLE_ANALYTICS_ID" ]; then
        echo "GOOGLE_ANALYTICS_ID=\"$GOOGLE_ANALYTICS_ID\"" >> "$SECRETS_FILE"
    fi
    
    # OpenAI
    OPENAI_API_KEY=$(prompt_with_default "OpenAI API Key (optional)" "")
    if [ -n "$OPENAI_API_KEY" ]; then
        echo "OPENAI_API_KEY=\"$OPENAI_API_KEY\"" >> "$SECRETS_FILE"
    fi
fi

echo "" >> "$SECRETS_FILE"

# Add default values for remaining variables
cat >> "$SECRETS_FILE" << 'EOF'
# System Configuration
NODE_ENV="production"
LOG_LEVEL="info"
LOG_FORMAT="json"
TENANT_MODE="multi"
ENABLE_REGISTRATION="true"
ENABLE_TRIAL="true"
TRIAL_DAYS="14"
ENABLE_BILLING="true"
ENABLE_ANALYTICS="true"
ENABLE_CACHING="true"
CACHE_TTL="3600"
MAX_UPLOAD_SIZE="10485760"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"
MAINTENANCE_MODE="false"
EOF

echo ""
echo -e "${GREEN}✅ Secrets configuration completed!${NC}"
echo -e "${YELLOW}📄 Configuration saved to: $SECRETS_FILE${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review the generated configuration file"
echo "2. Update any values as needed"
echo "3. Securely transfer this file to your server"
echo "4. Set up GitHub Actions secrets for CI/CD"
echo ""

# Generate GitHub Actions secrets documentation
cat > "github-secrets.md" << EOF
# GitHub Actions Secrets Configuration

Add these secrets to your GitHub repository:

\`\`\`
Settings → Secrets and variables → Actions → New repository secret
\`\`\`

## Required Secrets:

### Deployment
- \`COOLIFY_HOST\`: $TARGET_HOST
- \`COOLIFY_USER\`: root
- \`COOLIFY_SSH_KEY\`: Your private SSH key for server access
- \`COOLIFY_PORT\`: 22

### Database
- \`DB_PASSWORD\`: $DB_PASSWORD

### Application
- \`NEXTAUTH_SECRET\`: $NEXTAUTH_SECRET
- \`STRIPE_SECRET_KEY\`: $STRIPE_SECRET_KEY
- \`STRIPE_WEBHOOK_SECRET\`: $STRIPE_WEBHOOK_SECRET

### Storage
- \`AWS_ACCESS_KEY_ID\`: $AWS_ACCESS_KEY_ID
- \`AWS_SECRET_ACCESS_KEY\`: $AWS_SECRET_ACCESS_KEY
- \`S3_BUCKET\`: $S3_BUCKET

### Notifications (Optional)
- \`SLACK_WEBHOOK\`: Your Slack webhook URL for deployment notifications

### SSL
- \`SSL_EMAIL\`: $SSL_EMAIL

Copy these values from your $SECRETS_FILE file.
EOF

echo -e "${GREEN}📋 GitHub Actions secrets documentation created: github-secrets.md${NC}"
echo ""
echo -e "${RED}⚠️  Security reminders:${NC}"
echo "- Keep your .env.production file secure and never commit it to git"
echo "- Use strong, unique passwords for all services"
echo "- Regularly rotate secrets and passwords"
echo "- Enable 2FA on all connected services"
echo "- Review and audit access regularly"