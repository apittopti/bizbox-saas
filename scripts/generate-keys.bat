@echo off
REM BizBox Key Generation Script for Windows
REM Generates secure keys for your .env.deployment.local file

echo 🔐 BizBox Key Generator
echo ======================
echo.

echo # Generated BizBox Environment Keys - %date% %time%
echo # Copy these values to your .env.deployment.local file
echo.

echo # Coolify Configuration
echo COOLIFY_TOKEN=your-api-token-here
echo COOLIFY_URL=http://194.164.89.92
echo.

REM Generate random strings using PowerShell
echo # Database Passwords
powershell -Command "[System.Web.Security.Membership]::GeneratePassword(32, 8)" > temp_pass1.txt
set /p POSTGRES_PASS=<temp_pass1.txt
echo POSTGRES_PASSWORD=%POSTGRES_PASS%

powershell -Command "[System.Web.Security.Membership]::GeneratePassword(32, 8)" > temp_pass2.txt
set /p REDIS_PASS=<temp_pass2.txt
echo REDIS_PASSWORD=%REDIS_PASS%
echo.

echo # NextAuth Configuration
powershell -Command "[System.Web.Security.Membership]::GeneratePassword(48, 12)" > temp_auth.txt
set /p NEXTAUTH_SEC=<temp_auth.txt
echo NEXTAUTH_SECRET=%NEXTAUTH_SEC%
echo NEXTAUTH_URL=https://admin.bizbox.194-164-89-92.nip.io
echo.

echo # Security Keys
powershell -Command "[System.Web.Security.Membership]::GeneratePassword(32, 8)" > temp_enc.txt
set /p ENC_KEY=<temp_enc.txt
echo ENCRYPTION_KEY=%ENC_KEY%
echo.

echo # Admin Configuration
echo SUPER_ADMIN_EMAIL=admin@yourdomain.com
powershell -Command "[System.Web.Security.Membership]::GeneratePassword(16, 4)" > temp_admin.txt
set /p ADMIN_PASS=<temp_admin.txt
echo SUPER_ADMIN_PASSWORD=%ADMIN_PASS%
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

REM Cleanup temp files
del temp_pass1.txt temp_pass2.txt temp_auth.txt temp_enc.txt temp_admin.txt 2>nul

echo.
echo ✅ Keys generated! Copy the above to your .env.deployment.local file
echo ⚠️  Remember to replace 'your-api-token-here' with your actual Coolify API token
pause