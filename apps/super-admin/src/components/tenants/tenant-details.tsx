'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/dashboard/metric-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users,
  DollarSign,
  Activity,
  HardDrive,
  Calendar,
  ExternalLink,
  Settings,
  Pause,
  Play,
  Trash2,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatBytes, getRelativeTime } from '@/lib/utils';
import type { Tenant, TenantMetrics } from '@/types/admin';

// Mock data - replace with real API calls
const mockTenant: Tenant = {
  id: '1',
  name: 'Acme Corporation',
  domain: 'acme-corp',
  customDomain: 'app.acmecorp.com',
  status: 'active',
  plan: 'enterprise',
  createdAt: new Date('2023-01-15'),
  lastActive: new Date('2024-01-10'),
  userCount: 145,
  monthlyRevenue: 4500,
  storageUsed: 2048,
  owner: {
    id: '1',
    email: 'admin@acmecorp.com',
    name: 'John Smith',
  },
};

const mockMetrics: TenantMetrics = {
  userActivity: {
    dailyActive: 89,
    monthlyActive: 125,
    totalLogins: 2341,
  },
  performance: {
    avgResponseTime: 234,
    errorRate: 0.012,
    uptime: 99.8,
  },
  billing: {
    currentUsage: 4500,
    billingCycle: 'monthly',
    nextBillingDate: new Date('2024-02-15'),
    paymentStatus: 'current',
  },
  storage: {
    used: 2048,
    limit: 10240,
    percentage: 20,
  },
};

interface TenantDetailsProps {
  tenantId: string;
}

export function TenantDetails({ tenantId }: TenantDetailsProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchTenantData = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTenant(mockTenant);
        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Failed to fetch tenant data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
  }, [tenantId]);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      // TODO: Implement API call
      console.log(`Changing tenant status to ${newStatus}`);
      if (tenant) {
        setTenant(prev => prev ? { ...prev, status: newStatus as Tenant['status'] } : null);
      }
    } catch (error) {
      console.error('Failed to update tenant status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: Tenant['status']) => {
    const config = {
      active: { variant: 'default' as const, label: 'Active' },
      suspended: { variant: 'destructive' as const, label: 'Suspended' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      terminated: { variant: 'outline' as const, label: 'Terminated' },
    };

    const { variant, label } = config[status];
    return (
      <Badge variant={variant}>
        {label}
      </Badge>
    );
  };

  const getPlanBadge = (plan: Tenant['plan']) => {
    const config = {
      starter: { variant: 'outline' as const, label: 'Starter' },
      professional: { variant: 'secondary' as const, label: 'Professional' },
      enterprise: { variant: 'default' as const, label: 'Enterprise' },
      custom: { variant: 'destructive' as const, label: 'Custom' },
    };

    const { variant, label } = config[plan];
    return (
      <Badge variant={variant}>
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tenant || !metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-muted-foreground">
            {tenant.customDomain || `${tenant.domain}.bizbox.app`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(tenant.status)}
          {getPlanBadge(tenant.plan)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={actionLoading}>
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => window.open(`https://${tenant.customDomain || `${tenant.domain}.bizbox.app`}`, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Site
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Tenant Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tenant.status === 'active' ? (
                <DropdownMenuItem onClick={() => handleStatusChange('suspended')}>
                  <Pause className="mr-2 h-4 w-4" />
                  Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <Play className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Tenant
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the tenant
                      account and remove all associated data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={tenant.userCount}
          description="registered users"
          icon={Users}
        />
        <MetricCard
          title="Monthly Revenue"
          value={tenant.monthlyRevenue}
          format="currency"
          description="current billing"
          icon={DollarSign}
        />
        <MetricCard
          title="Daily Active Users"
          value={metrics.userActivity.dailyActive}
          description="last 24 hours"
          icon={Activity}
        />
        <MetricCard
          title="Storage Used"
          value={`${formatBytes(metrics.storage.used * 1024 * 1024)}`}
          description={`of ${formatBytes(metrics.storage.limit * 1024 * 1024)}`}
          icon={HardDrive}
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Information */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Domain</p>
                <p className="font-medium">{tenant.domain}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Custom Domain</p>
                <p className="font-medium">{tenant.customDomain || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{tenant.createdAt.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Active</p>
                <p className="font-medium">{getRelativeTime(tenant.lastActive)}</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-muted-foreground text-sm mb-2">Owner Information</p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{tenant.owner.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{tenant.owner.name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="text-sm font-medium">{metrics.performance.uptime}%</span>
              </div>
              <Progress value={metrics.performance.uptime} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Avg Response Time</p>
                <p className="font-medium">{metrics.performance.avgResponseTime}ms</p>
              </div>
              <div>
                <p className="text-muted-foreground">Error Rate</p>
                <p className="font-medium">{(metrics.performance.errorRate * 100).toFixed(3)}%</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Monthly Active</p>
                <p className="font-medium">{formatNumber(metrics.userActivity.monthlyActive)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Logins</p>
                <p className="font-medium">{formatNumber(metrics.userActivity.totalLogins)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Current Usage</p>
                <p className="font-medium">{formatCurrency(metrics.billing.currentUsage)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Billing Cycle</p>
                <p className="font-medium capitalize">{metrics.billing.billingCycle}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Next Billing</p>
                <p className="font-medium">{metrics.billing.nextBillingDate.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Status</p>
                <Badge variant={metrics.billing.paymentStatus === 'current' ? 'default' : 'destructive'}>
                  {metrics.billing.paymentStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formatBytes(metrics.storage.used * 1024 * 1024)} of {formatBytes(metrics.storage.limit * 1024 * 1024)}
                </span>
                <span className="text-sm font-medium">{metrics.storage.percentage}%</span>
              </div>
              <Progress value={metrics.storage.percentage} className="h-2" />
            </div>
            
            <div className="text-xs text-muted-foreground">
              Storage usage is calculated across all tenant data including databases, files, and backups.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}