/**
 * Test App utility for creating isolated test application instances
 * Used for integration testing with proper mocking and configuration
 */
import express from 'express';
import { TestDatabase } from './test-database';
import { TestRedis } from './test-redis';

export interface TestAppConfig {
  database: string;
  redis: string;
  port?: number;
  enableRateLimit?: boolean;
  enableWebhooks?: boolean;
}

/**
 * Create a test application instance with proper configuration
 */
export async function createTestApp(config: TestAppConfig): Promise<express.Application> {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Test-specific middleware
  app.use((req, res, next) => {
    req.testMode = true;
    next();
  });

  // Mock database connection
  app.use((req, res, next) => {
    req.db = {
      connectionString: config.database,
      query: async (sql: string, params: any[]) => {
        // Mock database operations
        return { rows: [], rowCount: 0 };
      }
    };
    next();
  });

  // Mock Redis connection
  app.use((req, res, next) => {
    req.redis = {
      connectionString: config.redis,
      get: async (key: string) => null,
      set: async (key: string, value: string) => 'OK',
      del: async (key: string) => 1
    };
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected'
      }
    });
  });

  app.get('/api/health/plugins', (req, res) => {
    res.json({
      plugins: [
        { id: 'booking', status: 'active', version: '1.0.0' },
        { id: 'ecommerce', status: 'active', version: '1.0.0' },
        { id: 'website-builder', status: 'active', version: '1.0.0' }
      ]
    });
  });

  // Authentication endpoints
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        message: 'Missing credentials',
        timestamp: new Date().toISOString()
      });
    }

    // Mock authentication logic
    if (email.includes('test.bizbox.com') && password === 'testpassword123') {
      const tenantId = email.split('+')[1]?.split('@')[0] || 'default-tenant';
      const role = email.includes('admin') ? 'TENANT_ADMIN' : 
                   email.includes('staff') ? 'STAFF' : 'CUSTOMER';

      return res.json({
        accessToken: `test_token_${tenantId}_${Date.now()}`,
        refreshToken: `refresh_token_${tenantId}_${Date.now()}`,
        user: {
          id: `user_${tenantId}`,
          email,
          tenantId,
          role,
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        }
      });
    }

    res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken || !refreshToken.startsWith('refresh_token_')) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired',
        timestamp: new Date().toISOString()
      });
    }

    const tenantId = refreshToken.split('_')[2];
    
    res.json({
      accessToken: `test_token_${tenantId}_${Date.now()}`,
      refreshToken: `refresh_token_${tenantId}_${Date.now()}`
    });
  });

  // Authentication middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Access token is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!token.startsWith('test_token_')) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Access token is invalid',
        timestamp: new Date().toISOString()
      });
    }

    // Extract tenant ID from token
    const tenantId = token.split('_')[2];
    req.user = {
      id: `user_${tenantId}`,
      tenantId,
      role: 'TENANT_ADMIN' // Simplified for testing
    };

    next();
  };

  // Rate limiting middleware (simplified for testing)
  const rateLimitRequests: Map<string, number[]> = new Map();
  const rateLimit = (req: any, res: any, next: any) => {
    if (config.enableRateLimit === false) return next();

    const tenantId = req.user?.tenantId || 'anonymous';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    const requests = rateLimitRequests.get(tenantId) || [];
    const windowRequests = requests.filter(time => now - time < windowMs);
    
    // Different limits based on tenant plan (simplified)
    const limit = tenantId.includes('enterprise') ? 1000 : 
                  tenantId.includes('pro') ? 500 : 100;

    if (windowRequests.length >= limit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${limit} per minute`,
        timestamp: new Date().toISOString()
      });
    }

    windowRequests.push(now);
    rateLimitRequests.set(tenantId, windowRequests);
    next();
  };

  // Protected routes
  app.get('/api/tenant/settings', authenticateToken, rateLimit, (req, res) => {
    res.json({
      tenantId: req.user.tenantId,
      settings: {
        theme: { primaryColor: '#2563eb' },
        features: ['website-builder']
      }
    });
  });

  app.get('/api/tenant/info', authenticateToken, rateLimit, (req, res) => {
    res.json({
      tenantId: req.user.tenantId,
      name: 'Test Tenant',
      plan: 'BASIC'
    });
  });

  app.post('/api/tenant/data', authenticateToken, rateLimit, (req, res) => {
    res.json({
      id: `data_${Date.now()}`,
      tenantId: req.user.tenantId,
      ...req.body,
      createdAt: new Date().toISOString()
    });
  });

  app.get('/api/tenant/data', authenticateToken, rateLimit, (req, res) => {
    res.json({
      data: [
        {
          id: `data_${req.user.tenantId}_1`,
          tenantId: req.user.tenantId,
          name: 'Test Data'
        }
      ]
    });
  });

  app.delete('/api/tenant/settings', authenticateToken, rateLimit, (req, res) => {
    if (req.user.role !== 'TENANT_ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only tenant administrators can delete settings',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  });

  // Plugin routes
  app.get('/api/plugins/:pluginId/*', authenticateToken, rateLimit, (req, res) => {
    const { pluginId } = req.params;
    
    // Check if tenant has access to plugin (simplified)
    const tenantPlan = req.user.tenantId.includes('enterprise') ? 'ENTERPRISE' :
                       req.user.tenantId.includes('pro') ? 'PROFESSIONAL' : 'BASIC';
    
    const pluginAccess = {
      'booking': ['PROFESSIONAL', 'ENTERPRISE'],
      'ecommerce': ['PROFESSIONAL', 'ENTERPRISE'],
      'website-builder': ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'],
      'community': ['ENTERPRISE'],
      'payments': ['ENTERPRISE']
    };

    if (!pluginAccess[pluginId]?.includes(tenantPlan)) {
      return res.status(403).json({
        error: 'Plugin not available for your plan',
        message: `Plugin ${pluginId} requires ${pluginAccess[pluginId]?.join(' or ')} plan`,
        timestamp: new Date().toISOString()
      });
    }

    if (pluginId === 'nonexistent') {
      return res.status(404).json({
        error: 'Plugin not found',
        message: `Plugin ${pluginId} does not exist`,
        timestamp: new Date().toISOString()
      });
    }

    // Mock plugin response
    res.json({
      pluginId,
      tenantId: req.user.tenantId,
      data: `Mock data from ${pluginId} plugin`
    });
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Test app error:', err);
    
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      message: err.details || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

/**
 * Create a test server instance
 */
export async function createTestServer(config: TestAppConfig): Promise<any> {
  const app = await createTestApp(config);
  const port = config.port || 0; // Random port
  
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          app,
          server,
          port: (server.address() as any)?.port,
          close: () => {
            return new Promise((resolveClose) => {
              server.close(resolveClose);
            });
          }
        });
      }
    });
  });
}