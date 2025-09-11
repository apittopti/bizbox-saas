"use client"

import { Card } from '@bizbox/shared-ui'

interface RevenueData {
  byDay: Array<{ date: string; amount: number }>
  byMonth: Array<{ month: string; amount: number }>
  byService: Array<{ serviceName: string; amount: number; count: number }>
  byStaff: Array<{ staffName: string; amount: number; count: number }>
}

interface RevenueAnalyticsProps {
  data: RevenueData
  dateRange: string
}

export function RevenueAnalytics({ data, dateRange }: RevenueAnalyticsProps) {
  const formatCurrency = (amount: number) => {
    return `£${(amount / 100).toFixed(2)}`
  }

  const totalRevenue = data.byDay.reduce((sum, item) => sum + item.amount, 0)
  const averageDailyRevenue = data.byDay.length > 0 ? totalRevenue / data.byDay.length : 0

  const getMaxValue = (dataset: Array<{ amount: number }>) => {
    return Math.max(...dataset.map(item => item.amount))
  }

  const getTopPerformers = (dataset: Array<{ amount: number; [key: string]: any }>, key: string) => {
    return [...dataset]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  return (
    <div className="space-y-8">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">In selected period</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
            <p className="text-3xl font-bold">{formatCurrency(averageDailyRevenue)}</p>
            <p className="text-sm text-muted-foreground">Per day</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm font-medium text-muted-foreground">Best Day</p>
            <p className="text-3xl font-bold">
              {data.byDay.length > 0 
                ? formatCurrency(Math.max(...data.byDay.map(d => d.amount)))
                : formatCurrency(0)
              }
            </p>
            <p className="text-sm text-muted-foreground">Highest single day</p>
          </div>
        </Card>
      </div>

      {/* Daily Revenue Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Revenue Trend</h3>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Revenue generated each day over the selected period
          </p>
          <div className="h-64 flex items-end space-x-1">
            {data.byDay.map((item, index) => {
              const maxAmount = getMaxValue(data.byDay)
              const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center h-48">
                    <div
                      className="w-full bg-green-500 rounded-t min-h-[2px] flex items-end justify-center text-xs text-white font-medium"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${item.date}: ${formatCurrency(item.amount)}`}
                    >
                      {item.amount > 0 && height > 20 && (
                        <span className="mb-1 text-xs">
                          £{(item.amount / 100).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 transform -rotate-45 origin-top-left">
                    {new Date(item.date).toLocaleDateString('en-GB', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Revenue by Service and Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Services by Revenue</h3>
          <div className="space-y-4">
            {getTopPerformers(data.byService, 'serviceName').map((service, index) => {
              const percentage = totalRevenue > 0 ? (service.amount / totalRevenue) * 100 : 0
              
              return (
                <div key={service.serviceName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{service.serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.count} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(service.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Staff by Revenue</h3>
          <div className="space-y-4">
            {getTopPerformers(data.byStaff, 'staffName').map((staff, index) => {
              const percentage = totalRevenue > 0 ? (staff.amount / totalRevenue) * 100 : 0
              
              return (
                <div key={staff.staffName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{staff.staffName}</p>
                        <p className="text-sm text-muted-foreground">
                          {staff.count} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(staff.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Monthly Revenue (for yearly view) */}
      {dateRange === '1y' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Monthly revenue over the year
            </p>
            <div className="grid grid-cols-6 lg:grid-cols-12 gap-4">
              {data.byMonth.map(item => {
                const maxAmount = getMaxValue(data.byMonth)
                const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
                
                return (
                  <div key={item.month} className="text-center">
                    <div className="h-32 flex items-end justify-center mb-2">
                      <div
                        className="w-full bg-purple-500 rounded-t min-h-[4px] flex items-end justify-center text-xs text-white font-medium"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        {item.amount > 0 && height > 30 && (
                          <span className="mb-1">
                            £{(item.amount / 100).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.month}
                    </div>
                    <div className="text-xs font-medium">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Revenue Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">Service Performance</h4>
            {data.byService.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Most Revenue:</span>
                  <span className="font-medium">
                    {data.byService.reduce((max, service) => 
                      service.amount > max.amount ? service : max
                    ).serviceName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average per Service:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      data.byService.reduce((sum, s) => sum + s.amount, 0) / data.byService.length
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Staff Performance</h4>
            {data.byStaff.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Top Performer:</span>
                  <span className="font-medium">
                    {data.byStaff.reduce((max, staff) => 
                      staff.amount > max.amount ? staff : max
                    ).staffName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average per Staff:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      data.byStaff.reduce((sum, s) => sum + s.amount, 0) / data.byStaff.length
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}