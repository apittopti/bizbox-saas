"use client"

import { Card } from '@bizbox/shared-ui'

interface BookingData {
  byStatus: Array<{ status: string; count: number }>
  byDay: Array<{ date: string; count: number }>
  byHour: Array<{ hour: number; count: number }>
  byMonth: Array<{ month: string; count: number }>
}

interface BookingAnalyticsProps {
  data: BookingData
  dateRange: string
}

export function BookingAnalytics({ data, dateRange }: BookingAnalyticsProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'cancelled': return 'bg-red-500'
      case 'completed': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return '✅'
      case 'pending': return '⏳'
      case 'cancelled': return '❌'
      case 'completed': return '🎉'
      default: return '📋'
    }
  }

  const totalBookings = data.byStatus.reduce((sum, item) => sum + item.count, 0)

  const getBusiestHours = () => {
    return [...data.byHour]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const getMaxValue = (dataset: Array<{ count?: number; amount?: number }>) => {
    return Math.max(...dataset.map(item => item.count || item.amount || 0))
  }

  return (
    <div className="space-y-8">
      {/* Booking Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Booking Status Distribution</h3>
          <div className="space-y-4">
            {data.byStatus.map(item => {
              const percentage = totalBookings > 0 ? (item.count / totalBookings) * 100 : 0
              return (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(item.status)}</span>
                      <span className="font-medium capitalize">{item.status}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{item.count}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getStatusColor(item.status)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Peak Hours</h3>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your busiest booking hours
            </p>
            {getBusiestHours().map((item, index) => (
              <div key={item.hour} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{formatHour(item.hour)}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{item.count} bookings</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Hourly Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Bookings by Hour</h3>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Distribution of bookings throughout the day
          </p>
          <div className="grid grid-cols-12 gap-2">
            {data.byHour.map(item => {
              const maxCount = getMaxValue(data.byHour)
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
              
              return (
                <div key={item.hour} className="text-center">
                  <div className="h-32 flex items-end justify-center mb-2">
                    <div
                      className="w-full bg-primary rounded-t min-h-[4px] flex items-end justify-center text-xs text-white font-medium"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    >
                      {item.count > 0 && (
                        <span className="mb-1">{item.count}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatHour(item.hour)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Daily Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Booking Trend</h3>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Booking volume over the selected period
          </p>
          <div className="h-64 flex items-end space-x-1">
            {data.byDay.map((item, index) => {
              const maxCount = getMaxValue(data.byDay)
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center h-48">
                    <div
                      className="w-full bg-blue-500 rounded-t min-h-[2px] flex items-end justify-center text-xs text-white font-medium"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${item.date}: ${item.count} bookings`}
                    >
                      {item.count > 0 && height > 20 && (
                        <span className="mb-1">{item.count}</span>
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

      {/* Monthly Trend (for longer date ranges) */}
      {dateRange === '1y' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Booking Trend</h3>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Monthly booking volume over the year
            </p>
            <div className="grid grid-cols-6 lg:grid-cols-12 gap-4">
              {data.byMonth.map(item => {
                const maxCount = getMaxValue(data.byMonth)
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                
                return (
                  <div key={item.month} className="text-center">
                    <div className="h-24 flex items-end justify-center mb-2">
                      <div
                        className="w-full bg-purple-500 rounded-t min-h-[4px] flex items-end justify-center text-xs text-white font-medium"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        {item.count > 0 && height > 30 && (
                          <span className="mb-1">{item.count}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.month}
                    </div>
                    <div className="text-xs font-medium">
                      {item.count}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Booking Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Booking Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-semibold">Total Bookings</p>
            <p className="text-2xl font-bold text-blue-600">{totalBookings}</p>
            <p className="text-sm text-muted-foreground">In selected period</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">✅</div>
            <p className="font-semibold">Completion Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {totalBookings > 0 
                ? ((data.byStatus.find(s => s.status === 'completed')?.count || 0) / totalBookings * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Successfully completed</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl mb-2">⏳</div>
            <p className="font-semibold">Pending Bookings</p>
            <p className="text-2xl font-bold text-yellow-600">
              {data.byStatus.find(s => s.status === 'pending')?.count || 0}
            </p>
            <p className="text-sm text-muted-foreground">Awaiting confirmation</p>
          </div>
        </div>
      </Card>
    </div>
  )
}