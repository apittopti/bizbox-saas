'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Shield,
  AlertTriangle,
  Eye,
  Download,
  Calendar,
  User,
  Lock,
} from 'lucide-react';
import { formatNumber, getRelativeTime } from '@/lib/utils';
import type { AuditLog, AuditFilters } from '@/types/admin';

// Mock data - replace with real API calls
const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    userId: 'admin-1',
    userName: 'John Admin',
    action: 'tenant_suspend',
    resource: '/tenants/acme-corp',
    details: {
      tenantId: 'acme-corp',
      tenantName: 'Acme Corporation',
      reason: 'Payment overdue',
      previousStatus: 'active',
      newStatus: 'suspended',
    },
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date('2024-01-11T14:30:00Z'),
    status: 'success',
  },
  {
    id: '2',
    userId: 'admin-2',
    userName: 'Sarah Manager',
    action: 'plugin_approve',
    resource: '/plugins/analytics-pro',
    details: {
      pluginId: 'analytics-pro',
      pluginName: 'Advanced Analytics Dashboard',
      version: '2.1.0',
      developer: 'DataViz Solutions',
      securityScanResult: 'passed',
    },
    ip: '10.0.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: new Date('2024-01-11T13:15:00Z'),
    status: 'success',
  },
  {
    id: '3',
    userId: 'admin-1',
    userName: 'John Admin',
    action: 'admin_login_failed',
    resource: '/login',
    details: {
      email: 'john@bizbox.app',
      failureReason: 'invalid_2fa_code',
      attemptCount: 3,
    },
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date('2024-01-11T12:45:00Z'),
    status: 'failed',
  },
  {
    id: '4',
    userId: 'admin-3',
    userName: 'Mike Support',
    action: 'tenant_impersonate',
    resource: '/tenants/techstart/impersonate',
    details: {
      tenantId: 'techstart',
      tenantName: 'TechStart Inc',
      impersonationReason: 'Customer support request',
      ticketId: 'SUP-12345',
      duration: '30 minutes',
    },
    ip: '10.0.2.75',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    timestamp: new Date('2024-01-11T11:20:00Z'),
    status: 'success',
  },
  {
    id: '5',
    userId: 'admin-2',
    userName: 'Sarah Manager',
    action: 'system_settings_update',
    resource: '/settings/billing',
    details: {
      setting: 'grace_period_days',
      oldValue: 7,
      newValue: 10,
      reason: 'Customer retention improvement',
    },
    ip: '10.0.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: new Date('2024-01-11T10:30:00Z'),
    status: 'success',
  },
];

const securityMetrics = {
  totalEvents: 1247,
  failedLogins: 23,
  suspiciousActivity: 5,
  dataExports: 12,
  adminActions: 156,
  tenantAccess: 89,
};

export function AuditLogDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [filters, setFilters] = useState<AuditFilters>({
    action: '',
    resource: '',
    status: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filter logs based on current filters
  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        log =>
          log.userName.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term) ||
          log.resource.toLowerCase().includes(term) ||
          log.ip.includes(term)
      );
    }

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.status) {
      filtered = filtered.filter(log => log.status === filters.status);
    }

    setFilteredLogs(filtered);
  }, [logs, filters, searchTerm]);

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      tenant_suspend: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      tenant_activate: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      plugin_approve: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      plugin_reject: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      admin_login_failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      tenant_impersonate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      system_settings_update: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    };
    
    return colorMap[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getStatusBadge = (status: 'success' | 'failed') => {
    return (
      <Badge variant={status === 'success' ? 'default' : 'destructive'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const exportLogs = () => {
    // TODO: Implement CSV/JSON export
    console.log('Exporting logs...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security & Audit Log</h2>
          <p className="text-muted-foreground">
            Complete audit trail of all administrative actions and security events
          </p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{formatNumber(securityMetrics.totalEvents)}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{securityMetrics.failedLogins}</p>
                <p className="text-xs text-muted-foreground">Failed Logins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{securityMetrics.suspiciousActivity}</p>
                <p className="text-xs text-muted-foreground">Suspicious</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{securityMetrics.dataExports}</p>
                <p className="text-xs text-muted-foreground">Data Exports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{securityMetrics.adminActions}</p>
                <p className="text-xs text-muted-foreground">Admin Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{securityMetrics.tenantAccess}</p>
                <p className="text-xs text-muted-foreground">Tenant Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select
              value={filters.action}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, action: value }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="tenant_suspend">Tenant Suspend</SelectItem>
                <SelectItem value="tenant_activate">Tenant Activate</SelectItem>
                <SelectItem value="plugin_approve">Plugin Approve</SelectItem>
                <SelectItem value="plugin_reject">Plugin Reject</SelectItem>
                <SelectItem value="admin_login_failed">Login Failed</SelectItem>
                <SelectItem value="tenant_impersonate">Tenant Access</SelectItem>
                <SelectItem value="system_settings_update">Settings Update</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {log.timestamp.toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.userName}</div>
                      <div className="text-sm text-muted-foreground">{log.userId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.resource}</TableCell>
                  <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Audit Log Details</DialogTitle>
                          <DialogDescription>
                            Detailed information about this audit event
                          </DialogDescription>
                        </DialogHeader>
                        {selectedLog && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium">Event ID</p>
                                <p className="text-muted-foreground">{selectedLog.id}</p>
                              </div>
                              <div>
                                <p className="font-medium">Timestamp</p>
                                <p className="text-muted-foreground">
                                  {selectedLog.timestamp.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">User</p>
                                <p className="text-muted-foreground">
                                  {selectedLog.userName} ({selectedLog.userId})
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">IP Address</p>
                                <p className="text-muted-foreground">{selectedLog.ip}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="font-medium">User Agent</p>
                                <p className="text-muted-foreground text-xs break-all">
                                  {selectedLog.userAgent}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="font-medium mb-2">Event Details</p>
                              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                                {JSON.stringify(selectedLog.details, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No audit logs found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}