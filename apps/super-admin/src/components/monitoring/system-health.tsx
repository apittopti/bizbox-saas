'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/dashboard/metric-card';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Mail,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { formatNumber, getRelativeTime } from '@/lib/utils';
import type { SystemHealth, SystemAlert } from '@/types/admin';

// Mock data - replace with real API calls
const mockSystemHealth: SystemHealth = {
  status: 'healthy',
  services: {
    database: {
      status: 'online',
      responseTime: 12,
      uptime: 99.9,
      lastCheck: new Date(),
    },
    redis: {
      status: 'online',
      responseTime: 3,
      uptime: 99.8,
      lastCheck: new Date(),
    },
    storage: {
      status: 'online',
      responseTime: 45,
      uptime: 99.7,
      lastCheck: new Date(),
    },
    email: {
      status: 'degraded',
      responseTime: 234,
      uptime: 98.5,
      lastCheck: new Date(),
    },
    payments: {
      status: 'online',
      responseTime: 89,
      uptime: 99.9,
      lastCheck: new Date(),
    },
  },
  metrics: {
    cpuUsage: 45.2,
    memoryUsage: 67.8,
    diskUsage: 23.1,
    networkLatency: 12.4,
  },
  alerts: [
    {
      id: '1',
      type: 'warning',
      title: 'High Memory Usage',
      message: 'Memory usage has been above 65% for the past 15 minutes',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      acknowledged: false,
      source: 'System Monitor',
    },
    {
      id: '2',
      type: 'info',
      title: 'Scheduled Maintenance',
      message: 'Database maintenance window scheduled for tonight at 2:00 AM UTC',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      acknowledged: true,
      source: 'Maintenance Scheduler',
    },
  ],
};

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<SystemHealth>(mockSystemHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHealth(mockSystemHealth);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh system health:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'offline':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      online: { variant: 'default' as const, label: 'Online' },
      degraded: { variant: 'secondary' as const, label: 'Degraded' },
      offline: { variant: 'destructive' as const, label: 'Offline' },
    };

    const { variant, label } = config[status as keyof typeof config] || config.offline;
    return (
      <Badge variant={variant} className="text-xs">
        {label}
      </Badge>
    );
  };

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertBgColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
      case 'error':
        return 'bg-red-50 border-l-red-500 dark:bg-red-900/20';
      case 'warning':
        return 'bg-yellow-50 border-l-yellow-500 dark:bg-yellow-900/20';
      case 'info':
        return 'bg-blue-50 border-l-blue-500 dark:bg-blue-900/20';
      default:
        return 'bg-gray-50 border-l-gray-500 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of platform infrastructure and services
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {getRelativeTime(lastUpdated)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Platform Status</span>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-lg font-semibold text-green-600 capitalize">
                {health.status}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            All core services are operational. System performance is within normal parameters.
          </p>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="CPU Usage"
          value={health.metrics.cpuUsage}
          format="percentage"
          suffix="%"
          icon={Cpu}
        />
        <MetricCard
          title="Memory Usage"
          value={health.metrics.memoryUsage}
          format="percentage"
          suffix="%"
          icon={MemoryStick}
        />
        <MetricCard
          title="Disk Usage"
          value={health.metrics.diskUsage}
          format="percentage"
          suffix="%"
          icon={HardDrive}
        />
        <MetricCard
          title="Network Latency"
          value={health.metrics.networkLatency}
          suffix="ms"
          icon={Network}
        />
      </div>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle>Services Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(health.services).map(([serviceName, service]) => {
              const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
                database: Database,
                redis: MemoryStick,
                storage: HardDrive,
                email: Mail,
                payments: CreditCard,
              };
              
              const Icon = serviceIcons[serviceName] || CheckCircle;
              
              return (
                <div key={serviceName} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${getStatusColor(service.status)}`} />
                    <div>
                      <h4 className="font-medium capitalize">{serviceName}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Response: {service.responseTime}ms</span>
                        <span>Uptime: {service.uptime}%</span>
                        <span>Last check: {getRelativeTime(service.lastCheck)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Progress 
                      value={service.uptime} 
                      className="w-20 h-2" 
                    />
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Alerts</span>
            <Badge variant="outline">
              {health.alerts.filter(alert => !alert.acknowledged).length} Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {health.alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium">No Active Alerts</p>
              <p className="text-muted-foreground">All systems are running smoothly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {health.alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`system-alert border-l-4 p-4 ${getAlertBgColor(alert.type)} ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{alert.title}</h4>
                          {alert.acknowledged && (
                            <Badge variant="outline" className="text-xs">
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                          <span>{alert.source}</span>
                          <span>•</span>
                          <span>{getRelativeTime(alert.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button variant="outline" size="sm">
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}