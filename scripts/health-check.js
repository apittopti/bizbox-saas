#!/usr/bin/env node

/**
 * BizBox Health Check Script
 * Monitors all services and provides comprehensive health status
 * Can be used by Coolify monitoring or external monitoring systems
 */

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const net = require('net');

// Configuration
const config = {
  services: {
    database: {
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      type: 'postgres'
    },
    redis: {
      host: 'redis',
      port: 6379,
      type: 'redis'
    },
    landing: {
      url: process.env.NEXTAUTH_URL || 'https://bizbox.194-164-89-92.nip.io',
      path: '/api/health',
      type: 'http'
    },
    admin: {
      url: process.env.ADMIN_NEXTAUTH_URL || 'https://admin.bizbox.194-164-89-92.nip.io',
      path: '/api/health',
      type: 'http'
    },
    builder: {
      url: process.env.BUILDER_NEXTAUTH_URL || 'https://builder.bizbox.194-164-89-92.nip.io',
      path: '/api/health',
      type: 'http'
    },
    customer: {
      url: process.env.CUSTOMER_NEXTAUTH_URL || 'https://app.bizbox.194-164-89-92.nip.io',
      path: '/api/health',
      type: 'http'
    },
    'super-admin': {
      url: 'https://super-admin.bizbox.194-164-89-92.nip.io',
      path: '/api/health',
      type: 'http'
    }
  },
  timeout: 30000,
  retries: 3,
  outputFormat: process.env.OUTPUT_FORMAT || 'json' // json, text, prometheus
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = 'reset') => {
  if (config.outputFormat === 'text') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
};

const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
};

// Service check implementations
const checkTcpConnection = (host, port, timeout = 5000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const startTime = Date.now();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve({
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'Connection successful'
      });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: 'Connection timeout'
      });
    });
    
    socket.on('error', (error) => {
      socket.destroy();
      resolve({
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });
    
    socket.connect(port, host);
  });
};

const checkHttpEndpoint = (url, path = '/', timeout = 10000) => {
  return new Promise((resolve) => {
    const fullUrl = `${url}${path}`;
    const startTime = Date.now();
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(fullUrl, { timeout }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let parsedData = {};
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            // Response is not JSON, which is fine
          }
          
          resolve({
            status: 'healthy',
            responseTime,
            statusCode: res.statusCode,
            data: parsedData,
            message: 'HTTP check successful'
          });
        } else {
          resolve({
            status: 'unhealthy',
            responseTime,
            statusCode: res.statusCode,
            error: `HTTP ${res.statusCode}`,
            data: data.substring(0, 200)
          });
        }
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: 'Request timeout'
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });
  });
};

const checkDatabase = async (host, port) => {
  try {
    // Use pg_isready for PostgreSQL health check
    const result = execSync(`pg_isready -h ${host} -p ${port} -U ${process.env.DB_USER || 'bizbox_user'}`, {
      timeout: 10000,
      encoding: 'utf8'
    });
    
    return {
      status: 'healthy',
      message: result.trim(),
      responseTime: 0 // pg_isready is very fast
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: 0
    };
  }
};

const checkRedis = async (host, port) => {
  try {
    // Use redis-cli ping for Redis health check
    const result = execSync(`redis-cli -h ${host} -p ${port} ping`, {
      timeout: 10000,
      encoding: 'utf8'
    });
    
    return {
      status: result.trim() === 'PONG' ? 'healthy' : 'unhealthy',
      message: result.trim(),
      responseTime: 0
    };
  } catch (error) {
    // Fall back to TCP connection check
    return await checkTcpConnection(host, port);
  }
};

// Main health check function
const checkService = async (name, serviceConfig) => {
  log(`Checking ${name}...`, 'blue');
  
  let result;
  const startTime = Date.now();
  
  try {
    switch (serviceConfig.type) {
      case 'postgres':
        result = await checkDatabase(serviceConfig.host, serviceConfig.port);
        break;
      
      case 'redis':
        result = await checkRedis(serviceConfig.host, serviceConfig.port);
        break;
      
      case 'http':
        result = await checkHttpEndpoint(serviceConfig.url, serviceConfig.path, config.timeout);
        break;
      
      case 'tcp':
        result = await checkTcpConnection(serviceConfig.host, serviceConfig.port, config.timeout);
        break;
      
      default:
        result = {
          status: 'unknown',
          error: `Unknown service type: ${serviceConfig.type}`
        };
    }
  } catch (error) {
    result = {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
  
  // Add service info to result
  result.service = name;
  result.timestamp = new Date().toISOString();
  
  // Log result
  const status = result.status === 'healthy' ? 'green' : 'red';
  const timing = result.responseTime ? ` (${formatDuration(result.responseTime)})` : '';
  log(`${name}: ${result.status.toUpperCase()}${timing}`, status);
  
  if (result.error) {
    log(`  Error: ${result.error}`, 'red');
  }
  
  return result;
};

// Generate system metrics
const getSystemMetrics = () => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    platform: process.platform,
    arch: process.arch
  };
  
  try {
    // Get additional system info if available
    if (process.platform === 'linux') {
      const loadavg = require('os').loadavg();
      metrics.loadavg = {
        '1m': loadavg[0],
        '5m': loadavg[1],
        '15m': loadavg[2]
      };
    }
    
    const os = require('os');
    metrics.freemem = os.freemem();
    metrics.totalmem = os.totalmem();
    metrics.cpus = os.cpus().length;
  } catch (error) {
    log(`Warning: Could not gather system metrics: ${error.message}`, 'yellow');
  }
  
  return metrics;
};

// Output formatters
const formatOutput = (results, metrics) => {
  switch (config.outputFormat) {
    case 'json':
      return JSON.stringify({
        status: results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
        services: results,
        metrics,
        summary: {
          total: results.length,
          healthy: results.filter(r => r.status === 'healthy').length,
          unhealthy: results.filter(r => r.status === 'unhealthy').length
        }
      }, null, 2);
    
    case 'prometheus':
      let output = '# HELP bizbox_service_health Service health status (1 = healthy, 0 = unhealthy)\n';
      output += '# TYPE bizbox_service_health gauge\n';
      
      results.forEach(result => {
        const value = result.status === 'healthy' ? 1 : 0;
        output += `bizbox_service_health{service="${result.service}"} ${value}\n`;
        
        if (result.responseTime) {
          output += `# HELP bizbox_service_response_time_ms Service response time in milliseconds\n`;
          output += `# TYPE bizbox_service_response_time_ms gauge\n`;
          output += `bizbox_service_response_time_ms{service="${result.service}"} ${result.responseTime}\n`;
        }
      });
      
      return output;
    
    case 'text':
    default:
      const healthy = results.filter(r => r.status === 'healthy').length;
      const total = results.length;
      
      log(`\n=== Health Check Summary ===`, 'cyan');
      log(`Status: ${healthy === total ? 'ALL HEALTHY' : 'ISSUES DETECTED'}`, 
          healthy === total ? 'green' : 'red');
      log(`Services: ${healthy}/${total} healthy`, 'blue');
      log(`Timestamp: ${new Date().toISOString()}`, 'blue');
      
      return `Health check completed: ${healthy}/${total} services healthy`;
  }
};

// Main execution
const main = async () => {
  const startTime = Date.now();
  
  log('🏥 BizBox Health Check Starting...', 'cyan');
  log(`Checking ${Object.keys(config.services).length} services`, 'blue');
  
  const results = [];
  
  // Check all services
  for (const [name, serviceConfig] of Object.entries(config.services)) {
    const result = await checkService(name, serviceConfig);
    results.push(result);
    
    // Small delay between checks to avoid overwhelming services
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate metrics
  const metrics = getSystemMetrics();
  metrics.checkDuration = Date.now() - startTime;
  
  // Output results
  const output = formatOutput(results, metrics);
  
  if (config.outputFormat === 'json' || config.outputFormat === 'prometheus') {
    console.log(output);
  }
  
  // Exit with appropriate code
  const allHealthy = results.every(r => r.status === 'healthy');
  process.exit(allHealthy ? 0 : 1);
};

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
BizBox Health Check Script

Usage: node health-check.js [options]

Options:
  --format=json|text|prometheus  Output format (default: json)
  --timeout=ms                   Request timeout in milliseconds (default: 30000)
  --help, -h                     Show this help message

Environment Variables:
  DB_HOST                        Database host (default: postgres)
  DB_PORT                        Database port (default: 5432)
  DB_USER                        Database user (default: bizbox_user)
  OUTPUT_FORMAT                  Output format (default: json)
  NEXTAUTH_URL                   Landing page URL
  ADMIN_NEXTAUTH_URL            Admin dashboard URL
  BUILDER_NEXTAUTH_URL          Builder app URL
  CUSTOMER_NEXTAUTH_URL         Customer app URL

Examples:
  node health-check.js
  node health-check.js --format=text
  OUTPUT_FORMAT=prometheus node health-check.js
`);
  process.exit(0);
}

// Parse CLI arguments
process.argv.forEach(arg => {
  if (arg.startsWith('--format=')) {
    config.outputFormat = arg.split('=')[1];
  }
  if (arg.startsWith('--timeout=')) {
    config.timeout = parseInt(arg.split('=')[1]) || config.timeout;
  }
});

// Run the health check
if (require.main === module) {
  main().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = { checkService, formatOutput, getSystemMetrics };