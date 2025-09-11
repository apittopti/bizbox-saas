# BizBox Multi-Tenant SaaS Platform - Production Deployment Guide

## 🚀 Complete Deployment Guide for Coolify at http://194.164.89.92/

### Overview

This guide provides comprehensive instructions for deploying the BizBox Multi-Tenant SaaS Platform to your Coolify instance. The platform includes:

- **Landing Page**: Marketing website with user registration
- **Admin Dashboard**: Tenant management and administration
- **Website Builder**: Drag-and-drop website creation tool
- **Customer Dashboard**: Customer portal and account management
- **Super Admin**: Platform-wide administration
- **Multi-tenant Architecture**: Isolated customer websites with custom domains

---

## 📋 Prerequisites

### System Requirements

- **Server**: Minimum 4GB RAM, 2 CPU cores, 50GB storage
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Coolify**: Version 4.0+ installed and configured
- **Domain**: Access to domain management (we'll use nip.io for easy setup)

### Required Tools

```bash
# Install required tools on your local machine
sudo apt update
sudo apt install curl jq openssl bc nslookup
```

---

## 🔧 Environment Configuration

### 1. Generate Required Secrets

Create strong passwords and secrets for your deployment:

```bash
# Generate database password (32 characters)
export DB_PASSWORD=$(openssl rand -base64 32)

# Generate Redis password (32 characters) 
export REDIS_PASSWORD=$(openssl rand -base64 32)

# Generate NextAuth secret (32+ characters)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Generate Super Admin password
export SUPER_ADMIN_PASSWORD=$(openssl rand -base64 16)

# Set admin email
export ADMIN_EMAIL="admin@yourdomain.com"

# Optional: Stripe keys for payment processing
export STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
export STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
export STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

### 2. Run Pre-deployment Script

Execute the deployment preparation script:

```bash
# Make script executable
chmod +x scripts/deploy-coolify.sh

# Run pre-deployment checks
./scripts/deploy-coolify.sh
```

This script will:
- Verify all required environment variables
- Check Docker availability
- Validate configuration files
- Test Docker builds
- Generate deployment environment file

---

## 🐳 Coolify Deployment Steps

### Step 1: Access Coolify Dashboard

1. Navigate to your Coolify instance: `http://194.164.89.92:8000`
2. Log in with your Coolify credentials

### Step 2: Create New Project

1. Click **"New Project"**
2. Set project details:
   - **Name**: `bizbox-saas`
   - **Description**: `BizBox Multi-Tenant SaaS Platform`
   - **Environment**: `production`

### Step 3: Deploy with Docker Compose

1. In your project, click **"New Resource"** → **"Docker Compose"**
2. Upload the `.coolify.production.yml` file as your `docker-compose.yml`
3. Set the following environment variables in Coolify:

```env
# Database Configuration
DB_PASSWORD=<generated_db_password>

# Redis Configuration  
REDIS_PASSWORD=<generated_redis_password>

# Authentication
NEXTAUTH_SECRET=<generated_nextauth_secret>

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=<generated_super_admin_password>

# Optional: Payment Processing
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_PUBLISHABLE_KEY=<your_stripe_publishable_key>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>

# Optional: Email Configuration
SMTP_PASSWORD=<your_smtp_password>

# Optional: Storage Configuration
AWS_ACCESS_KEY_ID=<your_aws_access_key>
AWS_SECRET_ACCESS_KEY=<your_aws_secret_key>
```

### Step 4: Configure Domains

Coolify will automatically configure the following domains using nip.io:

- **Landing Page**: `bizbox.194-164-89-92.nip.io`
- **Admin Dashboard**: `admin.bizbox.194-164-89-92.nip.io`
- **Website Builder**: `builder.bizbox.194-164-89-92.nip.io`
- **Customer Portal**: `app.bizbox.194-164-89-92.nip.io`
- **Super Admin**: `super-admin.bizbox.194-164-89-92.nip.io`
- **Tenant Sites**: `*.tenant.194-164-89-92.nip.io`

### Step 5: Deploy Services

1. Click **"Deploy"** to start the deployment
2. Monitor the deployment progress in Coolify logs
3. Wait for all services to become healthy (typically 5-10 minutes)

---

## 🔍 Deployment Verification

### Automated Verification

Run the comprehensive deployment verification script:

```bash
# Make script executable
chmod +x scripts/verify-deployment.sh

# Run verification tests
./scripts/verify-deployment.sh
```

The script will test:
- DNS resolution for all domains
- SSL certificate validity
- Service health endpoints
- Database and Redis connectivity
- Security headers
- Performance benchmarks
- Multi-tenant routing

### Manual Verification

1. **Landing Page**: Visit `https://bizbox.194-164-89-92.nip.io`
   - Should load marketing homepage
   - Registration form should be functional
   - SSL certificate should be valid

2. **Admin Dashboard**: Visit `https://admin.bizbox.194-164-89-92.nip.io`
   - Should redirect to login page
   - Authentication should work
   - Dashboard should load after login

3. **Website Builder**: Visit `https://builder.bizbox.194-164-89-92.nip.io`
   - Should require authentication
   - Drag-and-drop interface should load
   - Should be able to create/edit websites

4. **Customer Portal**: Visit `https://app.bizbox.194-164-89-92.nip.io`
   - Should require authentication
   - Customer dashboard should load
   - Account management features should work

5. **Super Admin**: Visit `https://super-admin.bizbox.194-164-89-92.nip.io`
   - Should require super admin authentication
   - Platform management tools should be available
   - System metrics should be visible

---

## 📊 Monitoring and Health Checks

### Built-in Health Monitoring

The platform includes comprehensive health monitoring:

- **Health Check Script**: `scripts/health-check.js`
- **Endpoints**: `/api/health` on each service
- **Metrics**: Prometheus-compatible metrics available
- **Database**: Health status tracked in `health_check` table

### Coolify Monitoring

Coolify provides built-in monitoring for:
- Service uptime and status
- Resource usage (CPU, memory, disk)
- Container logs and metrics
- Automatic restart on failure

### Custom Monitoring Setup

For advanced monitoring, you can integrate:
- **Prometheus**: Metrics collection
- **Grafana**: Dashboard visualization  
- **Alertmanager**: Alert notifications
- **Uptime Kuma**: Uptime monitoring

---

## 🛡️ Security Configuration

### SSL/TLS Security

- **Let's Encrypt**: Automatic SSL certificate generation and renewal
- **TLS 1.2/1.3**: Modern encryption protocols only
- **HSTS**: HTTP Strict Transport Security headers
- **Perfect Forward Secrecy**: Secure key exchange

### Application Security

- **Row-Level Security**: Database-level tenant isolation
- **CSRF Protection**: Cross-site request forgery protection
- **XSS Protection**: Cross-site scripting prevention
- **Rate Limiting**: API and authentication rate limiting
- **Security Headers**: Comprehensive security header configuration

### Network Security

- **Firewall**: Configured through Coolify
- **Private Networks**: Services communicate on private Docker networks
- **IP Whitelisting**: Super admin access can be IP-restricted

---

## 📦 Backup and Recovery

### Automated Backups

Configured in `.coolify.production.yml`:
- **Schedule**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Scope**: PostgreSQL database and Redis data
- **Location**: Coolify managed backup storage

### Manual Backup Commands

```bash
# Database backup
docker exec bizbox-postgres pg_dump -U bizbox_user bizbox > bizbox_backup_$(date +%Y%m%d).sql

# Redis backup  
docker exec bizbox-redis redis-cli --rdb /data/backup.rdb

# Application data backup
docker run --rm -v bizbox_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz /data
```

### Recovery Procedures

1. **Database Recovery**:
   ```bash
   # Stop all services
   docker-compose down
   
   # Restore database
   docker run --rm -v bizbox_postgres_data:/var/lib/postgresql/data -v $(pwd):/backup postgres:16-alpine sh -c "cd /var/lib/postgresql/data && tar xzf /backup/postgres_backup.tar.gz --strip 1"
   
   # Restart services
   docker-compose up -d
   ```

2. **Complete System Recovery**:
   - Restore from Coolify backup
   - Redeploy using saved configuration
   - Verify all services are healthy

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Services Won't Start

**Symptoms**: Services stuck in "starting" state

**Solutions**:
```bash
# Check service logs
docker logs <service_name>

# Verify environment variables
docker exec <service_name> printenv

# Check database connectivity
docker exec bizbox-postgres pg_isready -U bizbox_user
```

#### 2. SSL Certificate Issues

**Symptoms**: SSL certificate errors or warnings

**Solutions**:
- Wait for Let's Encrypt certificate generation (up to 10 minutes)
- Check domain DNS resolution
- Verify Coolify SSL configuration
- Check certificate expiration dates

#### 3. Database Connection Failures

**Symptoms**: "Connection refused" or "Authentication failed"

**Solutions**:
```bash
# Check database status
docker exec bizbox-postgres pg_isready -U bizbox_user -d bizbox

# Verify credentials
docker exec bizbox-postgres psql -U bizbox_user -d bizbox -c "SELECT version();"

# Check database logs
docker logs bizbox-postgres
```

#### 4. Performance Issues

**Symptoms**: Slow response times, high resource usage

**Solutions**:
- Monitor resource usage in Coolify
- Check database query performance
- Review Redis cache hit rates
- Scale services horizontally if needed

### Getting Help

1. **Check Logs**: Always start with service logs in Coolify
2. **Health Checks**: Use the health check script to diagnose issues
3. **Documentation**: Refer to component-specific documentation
4. **Community**: Join BizBox community forums for support

---

## 🚀 Post-Deployment Tasks

### 1. Initial Setup

1. **Create Super Admin Account**:
   - Visit `https://super-admin.bizbox.194-164-89-92.nip.io`
   - Use the `SUPER_ADMIN_PASSWORD` to sign in
   - Configure platform settings

2. **Configure Email Settings**:
   - Set up SMTP configuration
   - Test email delivery
   - Configure email templates

3. **Set up Payment Processing** (if using Stripe):
   - Configure Stripe webhooks
   - Test payment flow
   - Set up subscription plans

### 2. Create First Tenant

1. Visit admin dashboard
2. Create a new tenant organization
3. Set up tenant-specific settings
4. Test multi-tenant isolation

### 3. Performance Optimization

1. **Database Optimization**:
   - Configure connection pooling
   - Set up database monitoring
   - Optimize frequently used queries

2. **CDN Setup**:
   - Configure Cloudflare or similar CDN
   - Set up asset caching
   - Optimize image delivery

3. **Monitoring Setup**:
   - Configure uptime monitoring
   - Set up performance alerts
   - Create custom dashboards

---

## 📈 Scaling Considerations

### Horizontal Scaling

As your platform grows, consider:

1. **Load Balancing**: Multiple instances behind a load balancer
2. **Database Scaling**: Read replicas for database scaling
3. **Redis Clustering**: Redis cluster for cache scaling
4. **Microservices**: Split monolithic services into smaller services

### Vertical Scaling

For immediate performance improvements:

1. **Resource Allocation**: Increase CPU and memory limits
2. **Database Resources**: Dedicated database server
3. **Redis Resources**: Dedicated Redis instance
4. **Storage**: SSD storage for improved I/O

---

## 🎉 Success!

Your BizBox Multi-Tenant SaaS Platform is now successfully deployed and ready for production use!

### Quick Access Links

- **Landing Page**: https://bizbox.194-164-89-92.nip.io
- **Admin Dashboard**: https://admin.bizbox.194-164-89-92.nip.io  
- **Website Builder**: https://builder.bizbox.194-164-89-92.nip.io
- **Customer Portal**: https://app.bizbox.194-164-89-92.nip.io
- **Super Admin**: https://super-admin.bizbox.194-164-89-92.nip.io

### Next Steps

1. **Custom Domain Setup**: Configure your own domain names
2. **Branding**: Customize the platform with your branding
3. **Feature Configuration**: Enable/disable features as needed
4. **User Training**: Train your team on platform usage
5. **Marketing**: Launch your SaaS platform to customers

### Support and Maintenance

- Regular security updates
- Performance monitoring and optimization
- Feature enhancements and bug fixes
- Customer support and documentation

---

*Congratulations on successfully deploying your BizBox Multi-Tenant SaaS Platform! 🎊*