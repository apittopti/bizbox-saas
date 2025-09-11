# BizBox Super Admin Dashboard

The master control panel for BizBox platform administrators to manage the entire multi-tenant SaaS system.

## Overview

The Super Admin Dashboard provides comprehensive control and visibility over the BizBox platform, allowing platform administrators to:

- Monitor platform health and performance metrics
- Manage tenant accounts and billing
- Control plugin marketplace and approvals  
- Handle system configuration and updates
- Monitor security and compliance
- Analyze platform usage and metrics

## Features

### 🏠 Platform Overview Dashboard
- **Real-time Metrics**: Total tenants, revenue, users, system health
- **Growth Analytics**: Trend analysis and performance indicators
- **Quick Actions**: Direct access to critical administrative tasks
- **System Status**: Overall platform health monitoring

### 🏢 Tenant Management System
- **Tenant Directory**: Comprehensive list with search and filtering
- **Account Actions**: Suspend, activate, upgrade, downgrade tenants
- **Tenant Analytics**: Usage metrics, performance data, billing status
- **Tenant Impersonation**: Secure admin access for support
- **Billing Management**: Payment tracking and subscription management

### 🧩 Plugin Marketplace Administration
- **Approval Workflow**: Review and approve plugin submissions
- **Security Scanning**: Automated security analysis of plugins
- **Developer Management**: Plugin developer accounts and permissions
- **Analytics Dashboard**: Usage stats, ratings, revenue tracking
- **Marketplace Configuration**: Featured plugins, categories, pricing

### 📊 System Monitoring & Health
- **Real-time Metrics**: Server performance, database health, API response times
- **Error Monitoring**: System errors, failed requests, exception tracking
- **Security Monitoring**: Failed login attempts, suspicious activity alerts
- **Resource Usage**: CPU, memory, storage, bandwidth utilization
- **Uptime Monitoring**: Service availability and outage tracking

### 🛡️ Security & Audit Management
- **Audit Log**: Complete audit trail of all admin actions
- **Admin User Management**: Platform administrator accounts
- **Role-Based Access Control**: Granular permissions for admin functions
- **Security Alerts**: Real-time security event monitoring
- **Compliance Reporting**: GDPR, SOC 2, security compliance status

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **UI Components**: Shadcn/UI with Radix UI primitives
- **Styling**: Tailwind CSS with custom admin theme
- **Authentication**: NextAuth.js with admin role verification
- **Real-time Updates**: WebSocket integration for live metrics
- **Data Visualization**: Recharts for analytics and monitoring
- **Type Safety**: Full TypeScript implementation

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- pnpm 8.0 or later
- Access to BizBox platform APIs

### Installation

1. **Install dependencies**:
   ```bash
   cd apps/super-admin
   pnpm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env.local
   ```

3. **Configure environment variables**:
   ```env
   NEXTAUTH_URL=http://localhost:3001
   NEXTAUTH_SECRET=your-nextauth-secret
   API_BASE_URL=https://api.bizbox.app
   WEBSOCKET_URL=wss://ws.bizbox.app
   ```

4. **Start development server**:
   ```bash
   pnpm dev
   ```

5. **Access the dashboard**:
   Open [http://localhost:3001](http://localhost:3001)

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with navigation
│   ├── page.tsx                 # Main dashboard page
│   ├── login/                   # Authentication pages
│   ├── tenants/                 # Tenant management
│   ├── plugins/                 # Plugin marketplace admin
│   ├── monitoring/              # System health monitoring
│   ├── users/                   # User and admin management
│   └── settings/                # Platform configuration
├── components/                   # React components
│   ├── ui/                      # Base UI components (Shadcn)
│   ├── dashboard/               # Dashboard-specific components
│   ├── tenants/                 # Tenant management components
│   ├── plugins/                 # Plugin admin components
│   ├── monitoring/              # System monitoring components
│   └── security/                # Security and audit components
├── hooks/                       # Custom React hooks
│   ├── use-realtime-metrics.ts  # WebSocket integration
│   └── use-admin-auth.ts        # Authentication hooks
├── lib/                         # Utility libraries
│   ├── api-client.ts            # Centralized API client
│   ├── utils.ts                 # Common utilities
│   └── websocket.ts             # WebSocket client
├── types/                       # TypeScript type definitions
│   └── admin.ts                 # Super admin types
└── middleware.ts                # Next.js middleware for auth
```

## Key Components

### Platform Dashboard
```typescript
// Main dashboard with key metrics
<PlatformOverview />
  ├── <MetricCard /> // Revenue, tenants, users, plugins
  ├── <SystemHealth /> // Overall platform status
  └── <QuickActions /> // Direct access to critical tasks
```

### Tenant Management
```typescript
// Tenant directory and management
<TenantList />
  ├── <TenantFilters /> // Search and filter tenants
  ├── <TenantTable /> // Paginated tenant list
  └── <TenantActions /> // Suspend, activate, manage

<TenantDetails />
  ├── <TenantMetrics /> // Usage and performance data
  ├── <BillingInfo /> // Payment and subscription details
  └── <TenantSettings /> // Configuration options
```

### Plugin Administration
```typescript
// Plugin approval and management
<PluginApprovalQueue />
  ├── <PluginCard /> // Individual plugin review
  ├── <SecurityScan /> // Automated security analysis
  └── <ApprovalActions /> // Approve, reject, request changes
```

### System Monitoring
```typescript
// Real-time system health monitoring
<SystemHealthDashboard />
  ├── <ServiceStatus /> // Database, Redis, Storage, etc.
  ├── <SystemMetrics /> // CPU, Memory, Disk, Network
  └── <SystemAlerts /> // Active alerts and notifications
```

## Authentication & Security

### Admin Authentication
- **Secure Login**: Email/password with 2FA requirement
- **Role Verification**: Super admin role validation
- **Session Management**: Secure session handling with timeout
- **Audit Logging**: All login attempts and actions logged

### Middleware Protection
```typescript
// Middleware for route protection
export async function middleware(request: NextRequest) {
  // Verify JWT token and admin role
  // Log access for audit trail
  // Block unauthorized access
}
```

### API Security
- **Authentication Headers**: JWT tokens for API requests  
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses

## Real-time Features

### WebSocket Integration
```typescript
// Real-time metrics and alerts
const { data, connectionStatus } = useRealtimeMetrics();

// System health monitoring
const { systemHealth } = useSystemHealth();

// Live platform metrics
const { metrics } = usePlatformMetrics();
```

### Live Updates
- **Platform Metrics**: Real-time revenue, user count, tenant status
- **System Health**: Live service status and performance metrics
- **Security Alerts**: Instant notification of security events
- **Audit Events**: Live audit log streaming

## API Integration

### Super Admin API Client
```typescript
// Centralized API client
const apiClient = new SuperAdminApiClient();

// Tenant operations
const tenants = await apiClient.getTenants(filters);
await apiClient.suspendTenant(tenantId, reason);

// Plugin operations  
const plugins = await apiClient.getPendingPlugins();
await apiClient.approvePlugin(pluginId);

// System monitoring
const health = await apiClient.getSystemHealth();
const metrics = await apiClient.getPlatformMetrics();
```

## Deployment

### Production Build
```bash
pnpm build
pnpm start
```

### Environment Configuration
```env
NODE_ENV=production
NEXTAUTH_URL=https://admin.bizbox.app
API_BASE_URL=https://api.bizbox.app
WEBSOCKET_URL=wss://ws.bizbox.app
```

### Security Considerations
- Enable HTTPS in production
- Configure CORS policies
- Set up rate limiting
- Enable audit logging
- Configure 2FA for all admin accounts

## Monitoring & Analytics

### Dashboard Metrics
- **Platform KPIs**: Revenue, growth, utilization
- **System Performance**: Response times, uptime, errors
- **Security Events**: Failed logins, suspicious activity
- **User Analytics**: Admin actions, feature usage

### Audit & Compliance
- **Complete Audit Trail**: All admin actions logged
- **Security Monitoring**: Real-time threat detection
- **Compliance Reporting**: GDPR, SOC 2 compliance
- **Data Export**: Audit logs and metrics export

## Contributing

1. **Follow the existing code structure and patterns**
2. **Add proper TypeScript types for all components**
3. **Include comprehensive error handling**
4. **Write secure, audit-logged admin operations**
5. **Test all authentication and authorization flows**
6. **Document any new API endpoints or features**

## Support

For technical support or questions about the Super Admin Dashboard:

- **Documentation**: Internal BizBox admin docs
- **Issues**: Internal issue tracking system
- **Security**: security@bizbox.app (for security concerns)
- **Emergency**: On-call admin support rotation

---

**⚠️ Security Notice**: This dashboard provides complete control over the BizBox platform. Access should be restricted to authorized super administrators only. All actions are logged and monitored for security and compliance purposes.