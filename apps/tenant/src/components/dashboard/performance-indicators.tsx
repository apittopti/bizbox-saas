"use client"

import { Card, Button } from '@bizbox/shared-ui'

interface IndicatorProps {
  title: string
  current: number
  target: number
  unit: string
  color: string
  trend: 'up' | 'down' | 'neutral'
}

function PerformanceIndicator({ title, current, target, unit, color, trend }: IndicatorProps) {
  const percentage = Math.min((current / target) * 100, 100)
  
  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '➡️'
  }

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className={`text-xs ${trendColors[trend]}`}>
          {trendIcons[trend]}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold">
            {current.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            / {target.toLocaleString()} {unit}
          </span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percentage.toFixed(0)}% of target</span>
          <span>{target - current} remaining</span>
        </div>
      </div>
    </div>
  )
}

export function PerformanceIndicators() {
  const indicators = [
    {
      title: "Monthly Bookings",
      current: 124,
      target: 150,
      unit: "bookings",
      color: "bg-blue-500",
      trend: "up" as const
    },
    {
      title: "Revenue Target",
      current: 3750,
      target: 5000,
      unit: "£",
      color: "bg-green-500",
      trend: "up" as const
    },
    {
      title: "Customer Satisfaction",
      current: 47,
      target: 50,
      unit: "reviews",
      color: "bg-yellow-500",
      trend: "neutral" as const
    },
    {
      title: "Staff Utilization",
      current: 85,
      target: 90,
      unit: "%",
      color: "bg-purple-500",
      trend: "up" as const
    }
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Performance Goals</h3>
          <Button variant="ghost" size="sm">
            Settings
          </Button>
        </div>
        
        <div className="space-y-6">
          {indicators.map((indicator, index) => (
            <PerformanceIndicator
              key={index}
              title={indicator.title}
              current={indicator.current}
              target={indicator.target}
              unit={indicator.unit}
              color={indicator.color}
              trend={indicator.trend}
            />
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg. Service Time</span>
            <span className="font-medium">32 minutes</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Peak Hours</span>
            <span className="font-medium">2-4 PM</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Popular Service</span>
            <span className="font-medium">Hair Cut & Style</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Retention Rate</span>
            <span className="font-medium">78%</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Tasks</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <input type="checkbox" className="rounded" />
            <span>Review tomorrow's schedule</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <input type="checkbox" className="rounded" />
            <span>Update service prices</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <input type="checkbox" className="rounded" checked readOnly />
            <span className="line-through text-muted-foreground">
              Backup customer data
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <input type="checkbox" className="rounded" />
            <span>Send newsletter to customers</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full mt-4">
          View All Tasks
        </Button>
      </Card>
    </div>
  )
}