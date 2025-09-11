// Core platform types for super admin dashboard
export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  monthlyRevenue: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  activePlugins: number;
  supportTickets: number;
  uptime: number;
  apiResponseTime: number;
  errorRate: number;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'pending' | 'terminated';
  plan: 'starter' | 'professional' | 'enterprise' | 'custom';
  createdAt: Date;
  lastActive: Date;
  userCount: number;
  monthlyRevenue: number;
  storageUsed: number;
  customDomain?: string;
  owner: {
    id: string;
    email: string;
    name: string;
  };
}

export interface TenantFilters {
  status?: string;
  plan?: string;
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TenantMetrics {
  userActivity: {
    dailyActive: number;
    monthlyActive: number;
    totalLogins: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  billing: {
    currentUsage: number;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: Date;
    paymentStatus: 'current' | 'overdue' | 'failed';
  };
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  category: string;
  developer: {
    id: string;
    name: string;
    email: string;
  };
  installations: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  submittedAt: Date;
  lastUpdated: Date;
  securityScan: {
    status: 'passed' | 'failed' | 'pending';
    issues: SecurityIssue[];
    lastScanned: Date;
  };
}

export interface SecurityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  file: string;
  line?: number;
  recommendation: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
    email: ServiceStatus;
    payments: ServiceStatus;
  };
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  alerts: SystemAlert[];
}

export interface ServiceStatus {
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  source: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip: string;
  userAgent: string;
  timestamp: Date;
  status: 'success' | 'failed';
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  resource?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: 'success' | 'failed';
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  permissions: string[];
  lastLogin: Date;
  createdAt: Date;
  isActive: boolean;
  twoFactorEnabled: boolean;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: Date;
  tenantId?: string;
  userId?: string;
  errorMessage?: string;
}

export interface ConsoleLog {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  source: string;
  stack?: string;
}

export interface DashboardStats {
  timeframe: '24h' | '7d' | '30d' | '90d';
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
  tenants: {
    current: number;
    previous: number;
    growth: number;
  };
  users: {
    current: number;
    previous: number;
    growth: number;
  };
  plugins: {
    current: number;
    previous: number;
    growth: number;
  };
}

export interface BillingSettings {
  stripePublishableKey: string;
  defaultCurrency: string;
  taxRate: number;
  gracePeriodDays: number;
  plans: BillingPlan[];
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    users: number;
    storage: number;
    plugins: number;
  };
  isActive: boolean;
}