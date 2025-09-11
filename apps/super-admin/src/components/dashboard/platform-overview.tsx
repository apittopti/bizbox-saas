'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from './metric-card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Activity, 
  Puzzle, 
  Ticket,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { PlatformMetrics, DashboardStats } from '@/types/admin';

// Mock data - replace with real API calls
const mockMetrics: PlatformMetrics = {
  totalTenants: 1247,
  activeTenants: 1198,
  totalUsers: 15432,
  monthlyRevenue: 89750,
  systemHealth: 'healthy',
  activePlugins: 156,
  supportTickets: 23,
  uptime: 99.9,
  apiResponseTime: 145,
  errorRate: 0.02,
};

const mockStats: DashboardStats = {
  timeframe: '30d',
  revenue: {
    current: 89750,
    previous: 78900,
    growth: 13.7,
  },
  tenants: {
    current: 1247,
    previous: 1189,
    growth: 4.9,
  },
  users: {
    current: 15432,
    previous: 14205,
    growth: 8.6,
  },
  plugins: {
    current: 156,
    previous: 142,
    growth: 9.9,
  },
};

export function PlatformOverview() {
  const [metrics, setMetrics] = useState<PlatformMetrics>(mockMetrics);
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchMetrics = async () => {
      setIsLoading(true);
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMetrics(mockMetrics);
      setStats(mockStats);
      setIsLoading(false);
    };

    fetchMetrics();
  }, []);

  const getHealthStatus = () => {
    switch (metrics.systemHealth) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        };
      case 'critical':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
        };
      default:
        return {
          icon: Activity,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Tenants"
          value={stats.tenants.current}
          trend={stats.tenants.growth}
          description="from last month"
          icon={Building2}
        />
        <MetricCard
          title="Monthly Revenue"
          value={stats.revenue.current}
          format="currency"
          trend={stats.revenue.growth}
          description="from last month"
          icon={DollarSign}
        />
        <MetricCard
          title="Total Users"
          value={stats.users.current}
          trend={stats.users.growth}
          description="from last month"
          icon={Users}
        />
        <MetricCard
          title="Active Plugins"
          value={stats.plugins.current}
          trend={stats.plugins.growth}
          description="from last month"
          icon={Puzzle}
        />
      </div>

      {/* System Health & Support */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <healthStatus.icon className={`h-4 w-4 ${healthStatus.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{metrics.systemHealth}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
              <span>{metrics.uptime}% uptime</span>
            </div>
          </CardContent>
        </Card>

        <MetricCard
          title="API Response Time"
          value={metrics.apiResponseTime}
          suffix="ms"
          description="average response"
          icon={Activity}
        />

        <MetricCard
          title="Error Rate"
          value={metrics.errorRate}
          format="percentage"
          description="in last 24h"
          icon={AlertTriangle}
        />

        <MetricCard
          title="Support Tickets"
          value={metrics.supportTickets}
          description="open tickets"
          icon={Ticket}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="default">{metrics.activeTenants}</Badge>
                  <span className="text-sm">
                    {((metrics.activeTenants / metrics.totalTenants) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <Badge variant="outline">{metrics.totalTenants}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Revenue Growth', value: stats.revenue.growth, icon: DollarSign },
                { label: 'User Growth', value: stats.users.growth, icon: Users },
                { label: 'Tenant Growth', value: stats.tenants.growth, icon: Building2 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+{item.value.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:underline">
                View Tenant Activity
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:underline">
                System Health Details
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:underline">
                Plugin Approvals ({3} pending)
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:underline">
                Support Tickets
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}