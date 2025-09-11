/**
 * Super Admin API Client
 * Centralized client for all super admin operations
 */

import type {
  PlatformMetrics,
  Tenant,
  TenantFilters,
  TenantMetrics,
  Plugin,
  SystemHealth,
  AuditLog,
  AuditFilters,
  AdminUser,
  NetworkRequest,
  ConsoleLog,
  DashboardStats,
} from '@/types/admin';

export class SuperAdminApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'SuperAdminApiError';
  }
}

export class SuperAdminApiClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(baseUrl = '/api/super-admin') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new SuperAdminApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof SuperAdminApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new SuperAdminApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Platform Overview
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    return this.get<PlatformMetrics>('/metrics');
  }

  async getDashboardStats(timeframe = '30d'): Promise<DashboardStats> {
    return this.get<DashboardStats>(`/stats?timeframe=${timeframe}`);
  }

  // Tenant Management
  async getTenants(filters?: TenantFilters): Promise<{
    tenants: Tenant[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.plan) params.append('plan', filters.plan);
    if (filters?.dateRange?.start) {
      params.append('startDate', filters.dateRange.start.toISOString());
    }
    if (filters?.dateRange?.end) {
      params.append('endDate', filters.dateRange.end.toISOString());
    }

    const queryString = params.toString();
    return this.get(`/tenants${queryString ? `?${queryString}` : ''}`);
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    return this.get<Tenant>(`/tenants/${tenantId}`);
  }

  async getTenantMetrics(tenantId: string): Promise<TenantMetrics> {
    return this.get<TenantMetrics>(`/tenants/${tenantId}/metrics`);
  }

  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    return this.post(`/tenants/${tenantId}/suspend`, { reason });
  }

  async activateTenant(tenantId: string): Promise<void> {
    return this.post(`/tenants/${tenantId}/activate`);
  }

  async deleteTenant(tenantId: string, reason: string): Promise<void> {
    return this.delete(`/tenants/${tenantId}?reason=${encodeURIComponent(reason)}`);
  }

  async impersonateTenant(
    tenantId: string,
    options: {
      reason: string;
      duration?: number; // minutes
      ticketId?: string;
    }
  ): Promise<{ token: string; expiresAt: Date }> {
    return this.post(`/tenants/${tenantId}/impersonate`, options);
  }

  // Plugin Management
  async getPendingPlugins(): Promise<Plugin[]> {
    return this.get<Plugin[]>('/plugins/pending');
  }

  async getPlugin(pluginId: string): Promise<Plugin> {
    return this.get<Plugin>(`/plugins/${pluginId}`);
  }

  async approvePlugin(
    pluginId: string,
    notes?: string
  ): Promise<void> {
    return this.post(`/plugins/${pluginId}/approve`, { notes });
  }

  async rejectPlugin(
    pluginId: string,
    reason: string
  ): Promise<void> {
    return this.post(`/plugins/${pluginId}/reject`, { reason });
  }

  async requestPluginChanges(
    pluginId: string,
    feedback: string
  ): Promise<void> {
    return this.post(`/plugins/${pluginId}/request-changes`, { feedback });
  }

  async runSecurityScan(pluginId: string): Promise<void> {
    return this.post(`/plugins/${pluginId}/security-scan`);
  }

  // System Health & Monitoring
  async getSystemHealth(): Promise<SystemHealth> {
    return this.get<SystemHealth>('/system/health');
  }

  async getSystemMetrics(timeframe = '1h'): Promise<{
    cpu: Array<{ timestamp: Date; value: number }>;
    memory: Array<{ timestamp: Date; value: number }>;
    disk: Array<{ timestamp: Date; value: number }>;
    network: Array<{ timestamp: Date; value: number }>;
  }> {
    return this.get(`/system/metrics?timeframe=${timeframe}`);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    return this.post(`/system/alerts/${alertId}/acknowledge`);
  }

  // Security & Audit
  async getAuditLogs(filters?: AuditFilters & {
    page?: number;
    pageSize?: number;
  }): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const params = new URLSearchParams();
    
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.resource) params.append('resource', filters.resource);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateRange?.start) {
      params.append('startDate', filters.dateRange.start.toISOString());
    }
    if (filters?.dateRange?.end) {
      params.append('endDate', filters.dateRange.end.toISOString());
    }
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

    const queryString = params.toString();
    return this.get(`/audit-logs${queryString ? `?${queryString}` : ''}`);
  }

  async exportAuditLogs(
    filters?: AuditFilters,
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.resource) params.append('resource', filters.resource);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateRange?.start) {
      params.append('startDate', filters.dateRange.start.toISOString());
    }
    if (filters?.dateRange?.end) {
      params.append('endDate', filters.dateRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/audit-logs/export?${params.toString()}`);
    
    if (!response.ok) {
      throw new SuperAdminApiError(
        `Export failed: ${response.statusText}`,
        response.status
      );
    }
    
    return response.blob();
  }

  // Admin User Management
  async getAdminUsers(): Promise<AdminUser[]> {
    return this.get<AdminUser[]>('/admins');
  }

  async createAdminUser(user: Omit<AdminUser, 'id' | 'createdAt' | 'lastLogin'>): Promise<AdminUser> {
    return this.post<AdminUser>('/admins', user);
  }

  async updateAdminUser(
    userId: string,
    updates: Partial<AdminUser>
  ): Promise<AdminUser> {
    return this.put<AdminUser>(`/admins/${userId}`, updates);
  }

  async deactivateAdminUser(userId: string): Promise<void> {
    return this.post(`/admins/${userId}/deactivate`);
  }

  // Network & Performance Monitoring
  async getNetworkRequests(filters?: {
    domain?: string;
    status?: number;
    limit?: number;
  }): Promise<NetworkRequest[]> {
    const params = new URLSearchParams();
    
    if (filters?.domain) params.append('domain', filters.domain);
    if (filters?.status) params.append('status', filters.status.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    return this.get(`/network-requests${queryString ? `?${queryString}` : ''}`);
  }

  async getConsoleLogs(filters?: {
    level?: string;
    limit?: number;
  }): Promise<ConsoleLog[]> {
    const params = new URLSearchParams();
    
    if (filters?.level) params.append('level', filters.level);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    return this.get(`/console-logs${queryString ? `?${queryString}` : ''}`);
  }

  // Settings & Configuration
  async getSystemSettings(): Promise<Record<string, any>> {
    return this.get<Record<string, any>>('/settings');
  }

  async updateSystemSetting(
    key: string,
    value: any,
    reason?: string
  ): Promise<void> {
    return this.put(`/settings/${key}`, { value, reason });
  }

  // Bulk Operations
  async bulkTenantAction(
    tenantIds: string[],
    action: 'suspend' | 'activate' | 'delete',
    reason: string
  ): Promise<{
    success: string[];
    failed: Array<{ tenantId: string; error: string }>;
  }> {
    return this.post('/tenants/bulk-action', {
      tenantIds,
      action,
      reason,
    });
  }

  async bulkPluginAction(
    pluginIds: string[],
    action: 'approve' | 'reject',
    reason: string
  ): Promise<{
    success: string[];
    failed: Array<{ pluginId: string; error: string }>;
  }> {
    return this.post('/plugins/bulk-action', {
      pluginIds,
      action,
      reason,
    });
  }
}

// Singleton instance
export const apiClient = new SuperAdminApiClient();

// Hook for error handling
export const handleApiError = (error: unknown): string => {
  if (error instanceof SuperAdminApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};