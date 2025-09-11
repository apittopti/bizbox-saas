@echo off
REM Simple BizBox Key Generator for Windows
echo 🔐 BizBox Key Generator - Simple Version
echo ========================================
echo.

echo # Generated BizBox Environment Keys - %date% %time%
echo # Copy these values to your .env.deployment.local file
echo.

echo # Coolify Configuration
echo COOLIFY_TOKEN=your-api-token-here
echo COOLIFY_URL=http://194.164.89.92
echo.

echo # Database Passwords
echo POSTGRES_PASSWORD=PG_%RANDOM%%RANDOM%%RANDOM%_bizbox2024
echo REDIS_PASSWORD=RD_%RANDOM%%RANDOM%%RANDOM%_cache2024
echo.

echo # NextAuth Configuration  
echo NEXTAUTH_SECRET=auth_%RANDOM%%RANDOM%%RANDOM%%RANDOM%_secret_bizbox_2024_secure
echo NEXTAUTH_URL=https://admin.bizbox.194-164-89-92.nip.io
echo.

echo # Security Keys
echo ENCRYPTION_KEY=encrypt_%RANDOM%%RANDOM%%RANDOM%_key_2024
echo.

echo # Admin Configuration
echo SUPER_ADMIN_EMAIL=admin@yourdomain.com
echo SUPER_ADMIN_PASSWORD=Admin_%RANDOM%_2024
echo.

echo # Stripe Configuration (add your real keys)
echo STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
echo STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
echo.

echo # Email Configuration (add your real SMTP details)
echo SMTP_HOST=smtp.sendgrid.net
echo SMTP_USER=apikey
echo SMTP_PASS=your-sendgrid-api-key
echo.

echo # Storage Configuration (add your real S3 details)
echo S3_BUCKET=bizbox-storage
echo S3_ACCESS_KEY=your-s3-access-key
echo S3_SECRET_KEY=your-s3-secret-key
echo S3_REGION=us-east-1
echo.

echo ========================================
echo ✅ Keys generated successfully!
echo.
echo 📋 NEXT STEPS:
echo 1. Copy ALL the text above
echo 2. Create file: .env.deployment.local
echo 3. Paste the text into that file
echo 4. Replace 'your-api-token-here' with your Coolify API token
echo 5. Run: scripts\deploy-with-env.sh
echo.
pause