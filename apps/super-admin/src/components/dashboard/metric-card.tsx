'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percentage';
  suffix?: string;
  status?: 'healthy' | 'warning' | 'critical';
  trend?: number; // Percentage change
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function MetricCard({
  title,
  value,
  previousValue,
  format = 'number',
  suffix,
  status,
  trend,
  description,
  icon: Icon,
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val / 100);
      case 'number':
      default:
        return formatNumber(val);
    }
  };

  const getTrendIcon = () => {
    if (!trend) return <Minus className="h-3 w-3" />;
    return trend > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };

  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    const statusConfig = {
      healthy: { variant: 'default' as const, label: 'Healthy' },
      warning: { variant: 'secondary' as const, label: 'Warning' },
      critical: { variant: 'destructive' as const, label: 'Critical' },
    };

    const config = statusConfig[status];
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="metric-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground" />
        ) : (
          getStatusBadge()
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value)}
          {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
        </div>
        
        {(trend !== undefined || description) && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
            {trend !== undefined && (
              <div className={cn('flex items-center space-x-1', getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
            {description && (
              <span className="text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}