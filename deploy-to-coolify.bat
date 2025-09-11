@echo off
REM BizBox Coolify Deployment Script for Windows
REM Deploys the BizBox platform to your Coolify instance

echo 🚀 BizBox Coolify Deployment Starting...
echo ==========================================

REM Load environment variables from .env.deployment.local
if not exist ".env.deployment.local" (
    echo ❌ .env.deployment.local not found!
    pause
    exit /b 1
)

REM Parse environment file (simple approach)
for /f "usebackq tokens=1,2 delims==" %%a in (".env.deployment.local") do (
    if not "%%a"=="" if not "%%b"=="" (
        set "%%a=%%b"
    )
)

echo ✅ Loaded environment variables
echo 🔧 Coolify URL: %COOLIFY_URL%

REM Test Coolify API connection
echo 🔍 Testing Coolify API connection...
curl -s -o nul -w "%%{http_code}" -H "Authorization: Bearer %COOLIFY_TOKEN%" -H "Content-Type: application/json" "%COOLIFY_URL%/api/v1/teams" > temp_response.txt
set /p API_RESPONSE=<temp_response.txt
del temp_response.txt

if "%API_RESPONSE%"=="200" (
    echo ✅ Coolify API connection successful
) else (
    echo ❌ Coolify API connection failed (HTTP %API_RESPONSE%^)
    echo Please check your COOLIFY_TOKEN and COOLIFY_URL
    pause
    exit /b 1
)

REM Create project
echo 📁 Creating/checking BizBox project...
curl -s -X POST -H "Authorization: Bearer %COOLIFY_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"bizbox-saas\",\"description\":\"BizBox Multi-Tenant SaaS Platform\"}" "%COOLIFY_URL%/api/v1/projects" > nul

echo ✅ Project created/verified

echo.
echo 🎯 Next Steps:
echo 1. Access Coolify at: %COOLIFY_URL%
echo 2. Find the 'bizbox-saas' project
echo 3. Create new service → Docker Compose  
echo 4. Upload .coolify.production.yml
echo 5. Set these environment variables:
echo.
echo Environment Variables to Set in Coolify:
echo ========================================
echo DB_PASSWORD=%POSTGRES_PASSWORD%
echo REDIS_PASSWORD=%REDIS_PASSWORD%
echo NEXTAUTH_SECRET=%NEXTAUTH_SECRET%
echo SUPER_ADMIN_PASSWORD=%SUPER_ADMIN_PASSWORD%
echo ADMIN_EMAIL=%SUPER_ADMIN_EMAIL%
echo.
echo Optional (if using Stripe^):
echo STRIPE_SECRET_KEY=%STRIPE_SECRET_KEY%
echo STRIPE_WEBHOOK_SECRET=%STRIPE_WEBHOOK_SECRET%
echo.
echo 6. Deploy and monitor progress
echo.
echo 🌐 After deployment, your apps will be available at:
echo - Landing Page: http://194.164.89.92:3001
echo - Admin Dashboard: http://194.164.89.92:3002
echo - Website Builder: http://194.164.89.92:3003
echo - Customer Portal: http://194.164.89.92:3004
echo - Tenant Sites: http://194.164.89.92:3005
echo - Super Admin: http://194.164.89.92:3006
echo.
echo ✅ Deployment preparation complete!
pause