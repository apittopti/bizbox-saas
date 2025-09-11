# BizBox VPS Deployment Instructions

## Overview
Your BizBox platform is configured for deployment on your IONOS VPS at `194.164.89.92` using direct port access (no domain required).

## Access URLs (After Deployment)
- **Landing Page**: http://194.164.89.92:3001
- **Admin Dashboard**: http://194.164.89.92:3002  
- **Website Builder**: http://194.164.89.92:3003
- **Customer Portal**: http://194.164.89.92:3004
- **Tenant Sites**: http://194.164.89.92:3005
- **Super Admin**: http://194.164.89.92:3006

## Required Firewall Ports
Make sure these ports are open on your IONOS VPS:
- `3001` - Landing page
- `3002` - Admin dashboard
- `3003` - Website builder
- `3004` - Customer portal
- `3005` - Tenant sites
- `3006` - Super admin
- `8000` - Coolify dashboard

## Deployment Steps

### 1. Get Your Coolify API Token
1. Access your Coolify dashboard: `http://194.164.89.92:8000`
2. Go to **Settings** → **API Tokens**
3. Create a new token
4. Copy the token

### 2. Update Environment File
Edit `.env.deployment.local` and replace `your-api-token-here` with your actual Coolify API token.

### 3. Deploy to Coolify
1. Login to Coolify at `http://194.164.89.92:8000`
2. Create new project: "bizbox-saas"
3. Add new service → Docker Compose
4. Upload `.coolify.production.yml`
5. Set environment variables:
   ```
   DB_PASSWORD=PG_mR9qT2nY8vK3xF6sH1jL7cB4eN5wZ9pQ8tU0iM6gD2aV
   REDIS_PASSWORD=RD_kN7wQ9pL5xS2vF8jH0mT6yU3zC1qR4tY7iE9oA2gD5bN
   NEXTAUTH_SECRET=auth_zT9mQ2rK8vX5wN3jL6sF1cB7eH0pY4tU9iR6gD2aM5qT8v_secure2024
   SUPER_ADMIN_PASSWORD=SecureBizBox2024!
   ADMIN_EMAIL=admin@yourdomain.com
   ```
6. Deploy

### 4. Verify Deployment
After deployment, test each service:
- Visit `http://194.164.89.92:3001` (Landing)
- Visit `http://194.164.89.92:3002` (Admin)
- Visit `http://194.164.89.92:3003` (Builder)
- Visit `http://194.164.89.92:3004` (Customer)
- Visit `http://194.164.89.92:3006` (Super Admin)

### 5. Initial Setup
1. Access Super Admin at `http://194.164.89.92:3006`
2. Login with password: `SecureBizBox2024!`
3. Configure your platform settings

## Security Notes
- All services are running on HTTP (not HTTPS) since no domain is configured
- This is suitable for testing and development
- For production, consider setting up a domain with SSL certificates

## Troubleshooting
If services don't start:
1. Check Coolify logs for each service
2. Verify all environment variables are set
3. Check that all required ports are open on your VPS
4. Ensure PostgreSQL and Redis services are healthy before apps start