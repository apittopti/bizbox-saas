#!/bin/bash

# BizBox Key Generation Script
# Generates secure keys for your .env.deployment.local file

echo "🔐 BizBox Key Generator"
echo "======================"
echo ""

echo "# Generated BizBox Environment Keys - $(date)"
echo "# Copy these values to your .env.deployment.local file"
echo ""

echo "# Coolify Configuration"
echo "COOLIFY_TOKEN=your-api-token-here"
echo "COOLIFY_URL=http://194.164.89.92"
echo ""

echo "# Database Passwords"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo ""

echo "# NextAuth Configuration"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "NEXTAUTH_URL=https://admin.bizbox.194-164-89-92.nip.io"
echo ""

echo "# Security Keys"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""

echo "# Admin Configuration"
echo "SUPER_ADMIN_EMAIL=admin@yourdomain.com"
echo "SUPER_ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d '=' | head -c 12)"
echo ""

echo "# Stripe Configuration (add your real keys)"
echo "STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here"
echo "STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here"
echo ""

echo "# Email Configuration (add your real SMTP details)"
echo "SMTP_HOST=smtp.sendgrid.net"
echo "SMTP_USER=apikey"
echo "SMTP_PASS=your-sendgrid-api-key"
echo ""

echo "# Storage Configuration (add your real S3 details)"
echo "S3_BUCKET=bizbox-storage"
echo "S3_ACCESS_KEY=your-s3-access-key"
echo "S3_SECRET_KEY=your-s3-secret-key"
echo "S3_REGION=us-east-1"
echo ""
echo "✅ Keys generated! Copy the above to your .env.deployment.local file"
echo "⚠️  Remember to replace 'your-api-token-here' with your actual Coolify API token"