"use client"

import { Card } from '@bizbox/shared-ui'

interface OverviewData {
  totalBookings: number
  totalRevenue: number
  averageBookingValue: number
  customerRetentionRate: number
  bookingGrowth: number
  revenueGrowth: number
}

interface CustomersData {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  topCustomers: Array<{
    name: string
    email: string
    totalBookings: number
    totalSpent: number
  }>
}

interface AnalyticsOverviewProps {
  data: OverviewData
  customers: CustomersData
  dateRange: string
}

export function AnalyticsOverview({ data, customers, dateRange }: AnalyticsOverviewProps) {
  const formatCurrency = (amount: number) => {
    return `£${(amount / 100).toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return 'vs last 7 days'
      case '30d': return 'vs last 30 days'
      case '90d': return 'vs last 90 days'
      case '1y': return 'vs last year'
      default: return 'vs previous period'
    }
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
              <p className="text-3xl font-bold">{data.totalBookings.toLocaleString()}</p>
              <p className={`text-sm ${getGrowthColor(data.bookingGrowth)}`}>
                {formatPercentage(data.bookingGrowth)} {getDateRangeLabel(dateRange)}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(data.totalRevenue)}</p>
              <p className={`text-sm ${getGrowthColor(data.revenueGrowth)}`}>
                {formatPercentage(data.revenueGrowth)} {getDateRangeLabel(dateRange)}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Booking Value</p>
              <p className="text-3xl font-bold">{formatCurrency(data.averageBookingValue)}</p>
              <p className="text-sm text-muted-foreground">Per booking</p>
            </div>
            <div className="text-4xl">💳</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customer Retention</p>
              <p className="text-3xl font-bold">{data.customerRetentionRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Returning customers</p>
            </div>
            <div className="text-4xl">🔄</div>
          </div>
        </Card>
      </div>

      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Customers</span>
              <span className="font-semibold">{customers.totalCustomers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">New Customers</span>
              <span className="font-semibold text-green-600">{customers.newCustomers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Returning Customers</span>
              <span className="font-semibold text-blue-600">{customers.returningCustomers.toLocaleString()}</span>
            </div>
            
            {/* Customer Distribution Chart */}
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">New ({((customers.newCustomers / customers.totalCustomers) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Returning ({((customers.returningCustomers / customers.totalCustomers) * 100).toFixed(1)}%)</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                <div 
                  className="bg-green-500 h-3 rounded-l-full"
                  style={{ width: `${(customers.newCustomers / customers.totalCustomers) * 100}%` }}
                ></div>
                <div 
                  className="bg-blue-500 h-3 rounded-r-full"
                  style={{ 
                    width: `${(customers.returningCustomers / customers.totalCustomers) * 100}%`,
                    marginTop: '-12px',
                    marginLeft: `${(customers.newCustomers / customers.totalCustomers) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
          <div className="space-y-4">
            {customers.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={customer.email} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-sm text-muted-foreground">{customer.totalBookings} bookings</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Business Health Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Business Health Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">
              {data.bookingGrowth >= 0 ? '📈' : '📉'}
            </div>
            <p className="font-semibold">Booking Trend</p>
            <p className={`text-sm ${getGrowthColor(data.bookingGrowth)}`}>
              {formatPercentage(data.bookingGrowth)} growth
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl mb-2">
              {data.revenueGrowth >= 0 ? '💹' : '📊'}
            </div>
            <p className="font-semibold">Revenue Trend</p>
            <p className={`text-sm ${getGrowthColor(data.revenueGrowth)}`}>
              {formatPercentage(data.revenueGrowth)} growth
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl mb-2">
              {data.customerRetentionRate >= 70 ? '🎯' : data.customerRetentionRate >= 50 ? '⚠️' : '🚨'}
            </div>
            <p className="font-semibold">Customer Loyalty</p>
            <p className="text-sm text-muted-foreground">
              {data.customerRetentionRate >= 70 ? 'Excellent' : 
               data.customerRetentionRate >= 50 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Revenue per Customer</h4>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(data.totalRevenue / customers.totalCustomers)}
            </p>
            <p className="text-sm text-blue-600">Average lifetime value</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Bookings per Customer</h4>
            <p className="text-2xl font-bold text-green-700">
              {(data.totalBookings / customers.totalCustomers).toFixed(1)}
            </p>
            <p className="text-sm text-green-600">Average bookings per customer</p>
          </div>
        </div>
      </Card>
    </div>
  )
}