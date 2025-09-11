"use client"

import { Card } from '@bizbox/shared-ui'

interface UsageMetric {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: string
}

export function PluginUsageOverview() {
  const usageMetrics: UsageMetric[] = [
    {
      label: 'Active Plugins',
      value: '3',
      change: '+1',
      trend: 'up',
      icon: '🔌'
    },
    {
      label: 'Total Usage',
      value: '89%',
      change: '+12%',
      trend: 'up',
      icon: '📊'
    },
    {
      label: 'Monthly Cost',
      value: '£24.98',
      change: '+£4.99',
      trend: 'up',
      icon: '💰'
    },
    {
      label: 'API Requests',
      value: '2.4k',
      change: '+340',
      trend: 'up',
      icon: '🔄'
    }
  ]

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
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Plugin Usage Overview</h2>
        <p className="text-muted-foreground">
          Monitor your plugin performance and resource usage
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {usageMetrics.map((metric, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{metric.icon}</span>
              <div className={`flex items-center space-x-1 text-sm ${trendColors[metric.trend]}`}>
                <span>{trendIcons[metric.trend]}</span>
                <span>{metric.change}</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Plugin Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span>📅</span>
                <div>
                  <p className="font-medium">Booking System</p>
                  <p className="text-sm text-muted-foreground">124 bookings processed</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">98.5%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span>💳</span>
                <div>
                  <p className="font-medium">Payment Processing</p>
                  <p className="text-sm text-muted-foreground">£3,247 processed</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">99.9%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span>⭐</span>
                <div>
                  <p className="font-medium">Customer Reviews</p>
                  <p className="text-sm text-muted-foreground">47 reviews collected</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">4.8/5</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}