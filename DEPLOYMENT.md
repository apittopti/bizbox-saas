# BizBox Multi-Tenant SaaS Platform - Deployment Guide

This comprehensive guide covers the deployment of BizBox to Coolify at http://194.164.89.92/.

## 🏗️ Architecture Overview

BizBox is a multi-tenant SaaS platform with the following components:

- **Frontend Applications**: 5 Next.js 15 applications
  - `landing`: Main marketing website
  - `admin`: Super admin dashboard
  - `builder`: Website builder interface
  - `customer`: Customer management app
  - `tenant`: Multi-tenant customer websites

- **Backend Services**:
  - PostgreSQL 16 with Row-Level Security
  - Redis 7 for caching and sessions
  - Nginx reverse proxy for routing

- **Infrastructure**:
  - Docker containerization
  - Coolify deployment platform
  - GitHub Actions CI/CD
  - Prometheus monitoring stack

## 🚀 Quick Start Deployment

### Prerequisites

1. **Server Requirements**:
   - Ubuntu 20.04+ or similar Linux distribution
   - Docker and Docker Compose installed
   - Coolify platform installed at http://194.164.89.92/
   - Domain name with DNS configured
   - SSL certificates (Let's Encrypt recommended)

2. **Local Development**:
   - Node.js 20+
   - pnpm 8.0.0
   - Git

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker if not already installed
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Create deployment directory
sudo mkdir -p /opt/coolify/deployments/bizbox-saas
sudo chown $USER:$USER /opt/coolify/deployments/bizbox-saas
```

### Step 2: Environment Configuration

1. **Generate Secrets**:
```bash
# Run the secrets setup script
./scripts/setup-secrets.sh
```

2. **Configure Environment Variables**:
```bash
# Copy the example environment file
cp .env.example .env.production

# Edit with your values
nano .env.production
```

**Required Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NEXTAUTH_SECRET`: NextAuth.js secret (64+ characters)
- `STRIPE_SECRET_KEY`: Stripe payment processing
- `ADMIN_EMAIL`: Super admin email address
- Domain-specific URLs for each application

### Step 3: Database Setup

```bash
# Deploy PostgreSQL and Redis
docker compose up -d postgres redis

# Wait for services to be ready
sleep 30

# Run database migrations
docker compose up migration
```

### Step 4: Application Deployment

```bash
# Deploy all applications
docker compose up -d

# Verify deployment
docker compose ps
curl -f https://yourdomain.com/api/health
```

## 🔧 Detailed Configuration

### Coolify Configuration

1. **Create New Project** in Coolify:
   - Project Name: `bizbox-saas`
   - Environment: `production`

2. **Configure Services**:
   - Import the `.coolify.yml` configuration
   - Set up environment variables
   - Configure domain routing

3. **SSL Setup**:
   - Enable Let's Encrypt
   - Configure wildcard certificate for `*.yourdomain.com`

### Domain Configuration

**DNS Records Required**:
```
A     yourdomain.com         → 194.164.89.92
A     www.yourdomain.com     → 194.164.89.92
A     admin.yourdomain.com   → 194.164.89.92
A     builder.yourdomain.com → 194.164.89.92
A     app.yourdomain.com     → 194.164.89.92
CNAME *.yourdomain.com       → yourdomain.com
```

### Multi-Tenant Routing

The Nginx configuration handles:
- **Main domain**: Landing page
- **admin.domain**: Admin dashboard
- **builder.domain**: Website builder
- **app.domain**: Customer application
- **{tenant}.domain**: Individual tenant websites

## 🔐 Security Configuration

### SSL/TLS Setup

```bash
# Generate SSL certificates using Certbot
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d admin.yourdomain.com -d builder.yourdomain.com -d app.yourdomain.com

# For wildcard certificate
certbot certonly --manual --preferred-challenges dns -d yourdomain.com -d *.yourdomain.com
```

### Security Headers

The Nginx configuration includes:
- HSTS enforcement
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Rate limiting for API endpoints

### Database Security

- Row-Level Security (RLS) enabled
- Encrypted connections required
- Regular automated backups
- Connection pooling with PgBouncer

## 📊 Monitoring Setup

### Prometheus Stack Deployment

```bash
# Deploy monitoring stack
docker compose -f monitoring/docker-compose.monitoring.yml up -d

# Access monitoring interfaces
# Grafana: http://your-server:3000 (admin/admin)
# Prometheus: http://your-server:9090
# AlertManager: http://your-server:9093
```

### Key Metrics Monitored

- **Application Metrics**: Response times, error rates, throughput
- **System Metrics**: CPU, memory, disk usage, network
- **Database Metrics**: Connections, query performance, locks
- **Business Metrics**: User registrations, payments, tenant activity

### Alert Configuration

Alerts are configured for:
- Application downtime (5 minutes)
- High error rates (>5%)
- Database issues
- Resource exhaustion
- SSL certificate expiration

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Quality Gates**:
   - Code linting and formatting
   - Type checking
   - Unit tests
   - Security scanning

2. **Build Process**:
   - Multi-architecture Docker builds
   - Image vulnerability scanning
   - SBOM generation

3. **Deployment**:
   - Zero-downtime deployments
   - Database migrations
   - Health check verification
   - Rollback capabilities

### Required GitHub Secrets

```bash
# Deployment
COOLIFY_HOST=194.164.89.92
COOLIFY_USER=root
COOLIFY_SSH_KEY=<private-ssh-key>
COOLIFY_PORT=22

# Application
DB_PASSWORD=<database-password>
NEXTAUTH_SECRET=<nextauth-secret>
STRIPE_SECRET_KEY=<stripe-secret>
REDIS_PASSWORD=<redis-password>

# Storage
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
S3_BUCKET=<bucket-name>

# Notifications
SLACK_WEBHOOK=<slack-webhook-url>
```

## 🗄️ Database Management

### Backup Strategy

**Automated Backups**:
- Daily full backups at 2 AM UTC
- 30-day retention policy
- Encrypted backup storage
- S3 cloud backup integration

**Manual Backup**:
```bash
# Create manual backup
./scripts/backup-database.sh full

# Restore from backup
docker exec -i bizbox-postgres psql -U bizbox_user -d bizbox < backup.sql
```

### Migration Management

```bash
# Check migration status
docker exec bizbox-migration node dist/cli.js migrate:status

# Run pending migrations
docker exec bizbox-migration node dist/cli.js migrate

# Rollback last migration
docker exec bizbox-migration node dist/cli.js migrate:rollback
```

## 🔧 Troubleshooting

### Common Issues

**Application Won't Start**:
```bash
# Check logs
docker compose logs <service-name>

# Verify environment variables
docker exec <container> env | grep -E "(DATABASE_URL|REDIS_URL)"

# Check service connectivity
docker exec <container> curl -f http://postgres:5432
```

**Database Connection Issues**:
```bash
# Test database connection
docker exec bizbox-postgres psql -U bizbox_user -d bizbox -c "SELECT 1;"

# Check connection pool
docker exec bizbox-postgres psql -U bizbox_user -d bizbox -c "SELECT count(*) FROM pg_stat_activity;"
```

**SSL Certificate Issues**:
```bash
# Check certificate status
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Renew certificates
certbot renew --dry-run
```

### Health Checks

**Application Health**:
```bash
# Check all services
curl -f https://yourdomain.com/api/health
curl -f https://admin.yourdomain.com/api/health
curl -f https://builder.yourdomain.com/api/health
curl -f https://app.yourdomain.com/api/health
```

**Database Health**:
```bash
# Check database status
docker exec bizbox-postgres pg_isready -U bizbox_user -d bizbox
```

**System Health**:
```bash
# Check system resources
docker stats
df -h
free -h
```

## 📈 Performance Optimization

### Application Optimization

- **Next.js Optimizations**: App Router, ISR, Edge functions
- **Bundle Optimization**: Code splitting, tree shaking
- **Image Optimization**: Next.js image component, WebP format
- **Caching Strategy**: Redis for sessions, API responses

### Database Optimization

- **Query Optimization**: Proper indexing, query analysis
- **Connection Pooling**: PgBouncer configuration
- **Maintenance Tasks**: Regular VACUUM, ANALYZE, REINDEX

### Infrastructure Optimization

- **Resource Allocation**: Container memory/CPU limits
- **Load Balancing**: Nginx upstream configuration
- **CDN Integration**: Static asset delivery

## 🚨 Disaster Recovery

### Backup Verification

```bash
# Test backup integrity
./scripts/backup-database.sh full
tar -tzf /opt/coolify/backups/bizbox-db/latest.tar.gz

# Test restoration process
docker run --rm -v backup_data:/backup postgres:16 psql -U test -d test_db < /backup/restore.sql
```

### Recovery Procedures

**Application Recovery**:
1. Identify failing components
2. Restore from known good state
3. Verify data integrity
4. Test functionality

**Database Recovery**:
1. Stop application services
2. Restore database from backup
3. Run consistency checks
4. Restart services

## 📚 Additional Resources

### Documentation
- [Coolify Documentation](https://coolify.io/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL Administration](https://www.postgresql.org/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)

### Support
- **Issues**: GitHub Issues
- **Documentation**: Project Wiki
- **Community**: Discord/Slack channels

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Domain DNS configured
- [ ] SSL certificates ready
- [ ] Environment variables configured
- [ ] Database credentials set
- [ ] Third-party services configured (Stripe, SMTP, etc.)
- [ ] GitHub Actions secrets configured

### Deployment
- [ ] Server resources allocated
- [ ] Docker services deployed
- [ ] Database migrations completed
- [ ] Health checks passing
- [ ] SSL certificates working
- [ ] Monitoring stack deployed
- [ ] Backup system configured

### Post-Deployment
- [ ] Application functionality tested
- [ ] Performance benchmarks run
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified
- [ ] Disaster recovery plan reviewed

---

*This deployment guide ensures a production-ready, scalable, and maintainable BizBox platform deployment on Coolify.*