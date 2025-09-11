# BizBox Manual Deployment to Coolify

## 🚀 Step-by-Step Deployment Guide

Since the API approach encountered permissions issues, here's the manual deployment process:

### Step 1: Access Your Coolify Instance
Navigate to: http://194.164.89.92:8000

### Step 2: Create New Project
1. Click **"New Project"**
2. Project details:
   - **Name**: `bizbox-saas`
   - **Description**: `BizBox Multi-Tenant SaaS Platform`
3. Click **Create**

### Step 3: Add Docker Compose Service
1. In your `bizbox-saas` project, click **"New Resource"**
2. Select **"Docker Compose"**
3. Upload the file: `.coolify.production.yml`

### Step 4: Set Environment Variables
In the Coolify interface, set these environment variables:

**Required Variables:**
```
DB_PASSWORD=PG_mR9qT2nY8vK3xF6sH1jL7cB4eN5wZ9pQ8tU0iM6gD2aV
REDIS_PASSWORD=RD_kN7wQ9pL5xS2vF8jH0mT6yU3zC1qR4tY7iE9oA2gD5bN
NEXTAUTH_SECRET=auth_zT9mQ2rK8vX5wN3jL6sF1cB7eH0pY4tU9iR6gD2aM5qT8v_secure2024
SUPER_ADMIN_PASSWORD=SecureBizBox2024!
ADMIN_EMAIL=apitt@optimotive.co.uk
```

**Optional (for Stripe payments):**
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Step 5: Deploy
1. Click **"Deploy"**
2. Monitor the deployment progress in the logs
3. Wait for all services to become healthy (usually 5-10 minutes)

### Step 6: Verify Ports are Open
Make sure these ports are open in your IONOS VPS firewall:
- `3001` - Landing Page
- `3002` - Admin Dashboard  
- `3003` - Website Builder
- `3004` - Customer Portal
- `3005` - Tenant Sites
- `3006` - Super Admin

### Step 7: Test Your Deployment

After deployment completes, test each service:

1. **Landing Page**: http://194.164.89.92:3001
   - Should show marketing homepage
   - Registration should work

2. **Admin Dashboard**: http://194.164.89.92:3002
   - Should redirect to login
   - Test authentication

3. **Website Builder**: http://194.164.89.92:3003
   - Should require authentication
   - Drag-and-drop interface should load

4. **Customer Portal**: http://194.164.89.92:3004
   - Should require authentication
   - Customer dashboard should load

5. **Super Admin**: http://194.164.89.92:3006
   - Login with: `apitt@optimotive.co.uk`
   - Password: `SecureBizBox2024!`
   - Platform management tools should be available

6. **Tenant Sites**: http://194.164.89.92:3005
   - Multi-tenant website renderer

### Step 8: Initial Platform Setup

Once deployment is verified:

1. **Access Super Admin** at http://194.164.89.92:3006
2. **Login** with your credentials
3. **Configure** platform settings
4. **Create** your first tenant organization
5. **Test** multi-tenant isolation

## 🔧 Troubleshooting

### If Services Don't Start:
1. Check Coolify service logs
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL and Redis services are healthy first
4. Check that all required ports are accessible

### If Ports Are Not Accessible:
1. Check IONOS VPS firewall settings
2. Verify Coolify proxy configuration
3. Test port connectivity: `telnet 194.164.89.92 3001`

### If Database Connection Fails:
1. Check PostgreSQL service health in Coolify
2. Verify DB_PASSWORD matches in all services
3. Check database initialization logs

## 📋 Deployment Checklist

- [ ] Coolify project created
- [ ] Docker Compose file uploaded
- [ ] Environment variables set
- [ ] All ports open in firewall
- [ ] Deployment completed successfully
- [ ] All services healthy
- [ ] Landing page accessible (port 3001)
- [ ] Admin dashboard accessible (port 3002)
- [ ] Builder accessible (port 3003)
- [ ] Customer portal accessible (port 3004)
- [ ] Tenant renderer accessible (port 3005)
- [ ] Super admin accessible (port 3006)
- [ ] Super admin login working
- [ ] Database connections working
- [ ] Redis cache working

## 🎉 Success!

Your BizBox Multi-Tenant SaaS Platform is now deployed and ready for use!

**Your Platform URLs:**
- 🏠 Landing: http://194.164.89.92:3001
- 🛠️ Admin: http://194.164.89.92:3002
- 🎨 Builder: http://194.164.89.92:3003
- 👤 Customer: http://194.164.89.92:3004
- 🏢 Tenants: http://194.164.89.92:3005
- ⚡ Super Admin: http://194.164.89.92:3006