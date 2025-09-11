/**
 * Authentication utilities for k6 performance tests
 */
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function authenticate(email, password) {
  const payload = {
    email,
    password
  };

  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.status === 200) {
    const body = JSON.parse(response.body);
    return body.accessToken;
  }

  return null;
}

export function getTenantToken(tenantId) {
  // In a real scenario, you'd have pre-authenticated tokens
  // For testing, we'll use a simplified approach
  const testCredentials = {
    'tenant-basic': { email: 'admin+tenant-basic@test.bizbox.com', password: 'testpassword123' },
    'tenant-pro': { email: 'admin+tenant-pro@test.bizbox.com', password: 'testpassword123' },
    'tenant-enterprise': { email: 'admin+tenant-enterprise@test.bizbox.com', password: 'testpassword123' }
  };

  const creds = testCredentials[tenantId];
  if (!creds) return null;

  return authenticate(creds.email, creds.password);
}

export function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}