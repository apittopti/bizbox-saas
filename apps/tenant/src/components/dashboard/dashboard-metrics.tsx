"use client"

import { Card } from '@bizbox/shared-ui'

interface MetricCardProps {
  title: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: string
}

function MetricCard({ title, value, change, trend, icon }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground'
  }

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '➡️'
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
        {change && trend && (
          <div className={`flex items-center space-x-1 text-sm ${trendColors[trend]}`}>
            <span>{trendIcons[trend]}</span>
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </Card>
  )
}

export function DashboardMetrics() {
  // In a real app, this data would come from API calls
  const metrics = [
    {
      title: "Today's Bookings",
      value: "12",
      change: "+2",
      trend: "up" as const,
      icon: "📅"
    },
    {
      title: "This Week's Revenue",
      value: "£2,350",
      change: "+15%",
      trend: "up" as const,
      icon: "💰"
    },
    {
      title: "Active Customers",
      value: "248",
      change: "+8",
      trend: "up" as const,
      icon: "👥"
    },
    {
      title: "Completion Rate",
      value: "94%",
      change: "+2%",
      trend: "up" as const,
      icon: "✅"
    },
    {
      title: "Average Rating",
      value: "4.8",
      change: "0.1",
      trend: "up" as const,
      icon: "⭐"
    },
    {
      title: "Response Time",
      value: "2.3min",
      change: "-30s",
      trend: "up" as const,
      icon: "⚡"
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Key Metrics</h2>
        <select className="text-sm border rounded-md px-3 py-1 bg-background">
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
          <option>This Quarter</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            trend={metric.trend}
            icon={metric.icon}
          />
        ))}
      </div>
    </div>
  )
}