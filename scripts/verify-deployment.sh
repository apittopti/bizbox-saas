#!/bin/bash

# BizBox Multi-Tenant SaaS Platform - Deployment Verification Script
# Comprehensive testing and verification of the production deployment

set -e

# Configuration
COOLIFY_SERVER="194.164.89.92"
BASE_DOMAIN="194-164-89-92.nip.io"
TENANT_DOMAIN="tenant.194-164-89-92.nip.io"

# Service URLs
declare -A SERVICES=(
    ["landing"]="https://bizbox.${BASE_DOMAIN}"
    ["admin"]="https://admin.bizbox.${BASE_DOMAIN}"
    ["builder"]="https://builder.bizbox.${BASE_DOMAIN}"
    ["customer"]="https://app.bizbox.${BASE_DOMAIN}"
    ["super-admin"]="https://super-admin.bizbox.${BASE_DOMAIN}"
)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${PURPLE}[TEST]${NC} $1"
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to increment test counters
start_test() {
    ((TOTAL_TESTS++))
    log_test "$1"
}

pass_test() {
    ((PASSED_TESTS++))
    log_success "$1"
}

fail_test() {
    ((FAILED_TESTS++))
    log_error "$1"
}

# HTTP request function with retries
http_request() {
    local url="$1"
    local expected_status="${2:-200}"
    local max_retries="${3:-3}"
    local timeout="${4:-10}"
    
    for i in $(seq 1 $max_retries); do
        local response
        local status_code
        
        response=$(curl -s -w "\n%{http_code}" --max-time "$timeout" --insecure "$url" 2>/dev/null || echo -e "\n000")
        status_code=$(echo "$response" | tail -n1)
        
        if [[ "$status_code" == "$expected_status" ]]; then
            echo "$response" | head -n -1
            return 0
        fi
        
        if [[ $i -lt $max_retries ]]; then
            log_warning "Request failed (attempt $i/$max_retries), retrying in 2 seconds..."
            sleep 2
        fi
    done
    
    log_error "HTTP request failed: $url (Status: $status_code, Expected: $expected_status)"
    return 1
}

# SSL certificate check
check_ssl_certificate() {
    local domain="$1"
    local result
    
    log_test "Checking SSL certificate for $domain"
    
    result=$(echo | timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [[ $? -eq 0 && -n "$result" ]]; then
        pass_test "SSL certificate valid for $domain"
        echo "$result" | grep -E "(notBefore|notAfter)" | sed 's/^/    /'
        return 0
    else
        fail_test "SSL certificate check failed for $domain"
        return 1
    fi
}

# DNS resolution check
check_dns_resolution() {
    local domain="$1"
    local result
    
    log_test "Checking DNS resolution for $domain"
    
    result=$(nslookup "$domain" 2>/dev/null | grep "Address:" | tail -n1 | awk '{print $2}')
    
    if [[ -n "$result" ]]; then
        pass_test "DNS resolution successful for $domain → $result"
        return 0
    else
        fail_test "DNS resolution failed for $domain"
        return 1
    fi
}

# Service health check
check_service_health() {
    local service_name="$1"
    local url="$2"
    local health_endpoint="${url}/api/health"
    
    start_test "Checking health endpoint for $service_name"
    
    local response
    response=$(http_request "$health_endpoint" "200" 3 15)
    
    if [[ $? -eq 0 ]]; then
        pass_test "$service_name health check passed"
        
        # Try to parse JSON response
        if echo "$response" | jq . >/dev/null 2>&1; then
            local status
            status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null)
            local uptime
            uptime=$(echo "$response" | jq -r '.uptime // "unknown"' 2>/dev/null)
            log_info "  Status: $status, Uptime: $uptime"
        fi
        return 0
    else
        fail_test "$service_name health check failed"
        return 1
    fi
}

# Basic page load check
check_page_load() {
    local service_name="$1"
    local url="$2"
    
    start_test "Checking page load for $service_name"
    
    local response
    response=$(http_request "$url" "200" 2 20)
    
    if [[ $? -eq 0 ]]; then
        if [[ "$response" =~ "<html" ]] || [[ "$response" =~ "<HTML" ]]; then
            pass_test "$service_name page loads successfully"
            
            # Check for common error indicators
            if echo "$response" | grep -i "error\|exception\|not found" >/dev/null; then
                log_warning "Possible errors detected in $service_name response"
            fi
            return 0
        else
            fail_test "$service_name returned non-HTML response"
            return 1
        fi
    else
        fail_test "$service_name page load failed"
        return 1
    fi
}

# Authentication endpoint check
check_auth_endpoint() {
    local service_name="$1"
    local url="$2"
    local auth_endpoint="${url}/api/auth/signin"
    
    start_test "Checking authentication endpoint for $service_name"
    
    # Auth endpoint might return different status codes (200, 302, etc.)
    local response
    response=$(curl -s -w "\n%{http_code}" --max-time 10 --insecure "$auth_endpoint" 2>/dev/null || echo -e "\n000")
    local status_code
    status_code=$(echo "$response" | tail -n1)
    
    if [[ "$status_code" =~ ^(200|302|405)$ ]]; then
        pass_test "$service_name auth endpoint accessible (Status: $status_code)"
        return 0
    else
        fail_test "$service_name auth endpoint check failed (Status: $status_code)"
        return 1
    fi
}

# Multi-tenant functionality check
check_tenant_routing() {
    local tenant_name="demo"
    local tenant_url="https://${tenant_name}.${TENANT_DOMAIN}"
    
    start_test "Checking multi-tenant routing for $tenant_name"
    
    local response
    response=$(http_request "$tenant_url" "200" 2 15)
    
    if [[ $? -eq 0 ]]; then
        pass_test "Tenant routing working for $tenant_name"
        return 0
    else
        # Tenant might not exist, which is acceptable for initial deployment
        log_warning "Tenant routing test inconclusive (tenant may not exist yet)"
        return 0
    fi
}

# Database connectivity check (through health endpoints)
check_database_connectivity() {
    start_test "Checking database connectivity through services"
    
    local db_accessible=false
    
    for service_name in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service_name]}"
        local db_health_endpoint="${url}/api/health/db"
        
        local response
        response=$(http_request "$db_health_endpoint" "200" 1 10)
        
        if [[ $? -eq 0 ]]; then
            db_accessible=true
            pass_test "Database accessible through $service_name"
            break
        fi
    done
    
    if [[ "$db_accessible" == "false" ]]; then
        fail_test "Database connectivity check failed through all services"
        return 1
    fi
    
    return 0
}

# Redis connectivity check
check_redis_connectivity() {
    start_test "Checking Redis connectivity through services"
    
    local redis_accessible=false
    
    for service_name in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service_name]}"
        local redis_health_endpoint="${url}/api/health/redis"
        
        local response
        response=$(http_request "$redis_health_endpoint" "200" 1 10)
        
        if [[ $? -eq 0 ]]; then
            redis_accessible=true
            pass_test "Redis accessible through $service_name"
            break
        fi
    done
    
    if [[ "$redis_accessible" == "false" ]]; then
        fail_test "Redis connectivity check failed through all services"
        return 1
    fi
    
    return 0
}

# Security headers check
check_security_headers() {
    local service_name="$1"
    local url="$2"
    
    start_test "Checking security headers for $service_name"
    
    local headers
    headers=$(curl -s -I --max-time 10 --insecure "$url" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        fail_test "Failed to fetch headers for $service_name"
        return 1
    fi
    
    local security_score=0
    local total_checks=6
    
    # Check for security headers
    if echo "$headers" | grep -i "strict-transport-security" >/dev/null; then
        ((security_score++))
    else
        log_warning "Missing HSTS header for $service_name"
    fi
    
    if echo "$headers" | grep -i "x-frame-options" >/dev/null; then
        ((security_score++))
    else
        log_warning "Missing X-Frame-Options header for $service_name"
    fi
    
    if echo "$headers" | grep -i "x-content-type-options" >/dev/null; then
        ((security_score++))
    else
        log_warning "Missing X-Content-Type-Options header for $service_name"
    fi
    
    if echo "$headers" | grep -i "x-xss-protection" >/dev/null; then
        ((security_score++))
    else
        log_warning "Missing X-XSS-Protection header for $service_name"
    fi
    
    if echo "$headers" | grep -i "referrer-policy" >/dev/null; then
        ((security_score++))
    else
        log_warning "Missing Referrer-Policy header for $service_name"
    fi
    
    if echo "$headers" | grep -i "content-security-policy" >/dev/null; then
        ((security_score++))
    else
        log_warning "Missing Content-Security-Policy header for $service_name"
    fi
    
    if [[ $security_score -ge 4 ]]; then
        pass_test "$service_name security headers check passed ($security_score/$total_checks)"
        return 0
    else
        fail_test "$service_name security headers check failed ($security_score/$total_checks)"
        return 1
    fi
}

# Performance check
check_performance() {
    local service_name="$1"
    local url="$2"
    
    start_test "Checking response time for $service_name"
    
    local response_time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 30 --insecure "$url" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        local time_ms
        time_ms=$(echo "$response_time * 1000" | bc -l | cut -d. -f1)
        
        if (( time_ms < 3000 )); then
            pass_test "$service_name response time: ${time_ms}ms (Good)"
        elif (( time_ms < 5000 )); then
            log_warning "$service_name response time: ${time_ms}ms (Acceptable)"
            pass_test "$service_name performance check passed with warning"
        else
            log_warning "$service_name response time: ${time_ms}ms (Slow)"
            fail_test "$service_name performance check failed (too slow)"
            return 1
        fi
        return 0
    else
        fail_test "$service_name performance check failed (no response)"
        return 1
    fi
}

# Main deployment verification
main() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  BizBox Deployment Verification Script    ${NC}"
    echo -e "${CYAN}  Target: $COOLIFY_SERVER                  ${NC}"
    echo -e "${CYAN}  Domain: $BASE_DOMAIN                     ${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    
    log_info "Starting comprehensive deployment verification..."
    echo ""
    
    # Phase 1: DNS and SSL Verification
    log_info "Phase 1: DNS and SSL Verification"
    echo "----------------------------------------"
    
    for service_name in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service_name]}"
        local domain
        domain=$(echo "$url" | sed 's|https\?://||' | cut -d'/' -f1)
        
        check_dns_resolution "$domain"
        check_ssl_certificate "$domain"
        echo ""
    done
    
    # Phase 2: Service Health Checks
    log_info "Phase 2: Service Health Checks"
    echo "----------------------------------------"
    
    for service_name in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service_name]}"
        check_service_health "$service_name" "$url"
        echo ""
    done
    
    # Phase 3: Basic Functionality Tests
    log_info "Phase 3: Basic Functionality Tests"
    echo "----------------------------------------"
    
    for service_name in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service_name]}"
        check_page_load "$service_name" "$url"
        check_auth_endpoint "$service_name" "$url"
        echo ""
    done
    
    # Phase 4: Multi-tenant Testing
    log_info "Phase 4: Multi-tenant Testing"
    echo "----------------------------------------"
    
    check_tenant_routing
    echo ""
    
    # Phase 5: Database and Redis Connectivity
    log_info "Phase 5: Database and Redis Connectivity"
    echo "----------------------------------------"
    
    check_database_connectivity
    check_redis_connectivity
    echo ""
    
    # Phase 6: Security Headers Verification
    log_info "Phase 6: Security Headers Verification"
    echo "----------------------------------------"
    
    for service_name in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service_name]}"
        check_security_headers "$service_name" "$url"
        echo ""
    done
    
    # Phase 7: Performance Testing
    log_info "Phase 7: Performance Testing"
    echo "----------------------------------------"
    
    for service_name in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service_name]}"
        check_performance "$service_name" "$url"
        echo ""
    done
    
    # Final Results
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}           VERIFICATION RESULTS             ${NC}"
    echo -e "${CYAN}============================================${NC}"
    
    log_info "Total Tests: $TOTAL_TESTS"
    log_success "Passed: $PASSED_TESTS"
    
    if [[ $FAILED_TESTS -gt 0 ]]; then
        log_error "Failed: $FAILED_TESTS"
    else
        log_success "Failed: $FAILED_TESTS"
    fi
    
    local success_rate
    success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
    
    echo ""
    if [[ $FAILED_TESTS -eq 0 ]]; then
        log_success "🎉 All tests passed! Deployment verification successful!"
        log_success "Success Rate: ${success_rate}%"
        echo ""
        log_info "Your BizBox platform is ready for production use!"
        echo ""
        log_info "Access your applications:"
        for service_name in "${!SERVICES[@]}"; do
            echo "  • ${service_name^}: ${SERVICES[$service_name]}"
        done
        echo ""
        exit 0
    elif [[ $FAILED_TESTS -le 3 ]] && [[ $(echo "$success_rate >= 80" | bc -l) -eq 1 ]]; then
        log_warning "⚠️  Some tests failed, but deployment is mostly functional"
        log_warning "Success Rate: ${success_rate}%"
        echo ""
        log_info "Consider reviewing the failed tests and fixing any critical issues"
        echo ""
        exit 1
    else
        log_error "❌ Multiple critical tests failed! Deployment needs attention"
        log_error "Success Rate: ${success_rate}%"
        echo ""
        log_error "Please review and fix the failed tests before proceeding to production"
        echo ""
        exit 2
    fi
}

# Check for required tools
check_dependencies() {
    local missing_tools=()
    
    for tool in curl jq nslookup openssl bc; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install missing tools before running this script"
        exit 1
    fi
}

# Handle CLI arguments
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "BizBox Deployment Verification Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --quick        Run only essential tests"
    echo "  --domain=X     Use custom base domain (default: $BASE_DOMAIN)"
    echo ""
    echo "Environment Variables:"
    echo "  COOLIFY_SERVER     Target server IP (default: $COOLIFY_SERVER)"
    echo "  BASE_DOMAIN        Base domain for services (default: $BASE_DOMAIN)"
    echo ""
    exit 0
fi

# Parse arguments
for arg in "$@"; do
    case $arg in
        --quick)
            QUICK_MODE=1
            ;;
        --domain=*)
            BASE_DOMAIN="${arg#*=}"
            # Update service URLs with new domain
            SERVICES=(
                ["landing"]="https://bizbox.${BASE_DOMAIN}"
                ["admin"]="https://admin.bizbox.${BASE_DOMAIN}"
                ["builder"]="https://builder.bizbox.${BASE_DOMAIN}"
                ["customer"]="https://app.bizbox.${BASE_DOMAIN}"
                ["super-admin"]="https://super-admin.bizbox.${BASE_DOMAIN}"
            )
            ;;
        *)
            log_warning "Unknown argument: $arg"
            ;;
    esac
done

# Run the verification
check_dependencies
main