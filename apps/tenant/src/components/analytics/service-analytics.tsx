"use client"

import { Card } from '@bizbox/shared-ui'

interface ServiceData {
  id: string
  name: string
  totalBookings: number
  totalRevenue: number
  averageRating: number
  conversionRate: number
}

interface ServiceAnalyticsProps {
  data: ServiceData[]
  dateRange: string
}

export function ServiceAnalytics({ data, dateRange }: ServiceAnalyticsProps) {
  const formatCurrency = (amount: number) => {
    return `£${(amount / 100).toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
    
    return (
      <div className="flex items-center">
        {'⭐'.repeat(fullStars)}
        {hasHalfStar && '⭐'}
        {'☆'.repeat(emptyStars)}
        <span className="ml-1 text-sm text-muted-foreground">
          ({rating.toFixed(1)})
        </span>
      </div>
    )
  }

  const getConversionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getServicePerformance = (service: ServiceData) => {
    const revenueScore = Math.min(service.totalRevenue / 10000, 1) * 100 // Normalize to £100
    const bookingScore = Math.min(service.totalBookings / 50, 1) * 100 // Normalize to 50 bookings
    const ratingScore = (service.averageRating / 5) * 100
    const conversionScore = service.conversionRate
    
    const overallScore = (revenueScore * 0.3) + (bookingScore * 0.3) + (ratingScore * 0.2) + (conversionScore * 0.2)
    
    if (overallScore >= 80) return { level: 'Excellent', color: 'text-green-600', icon: '🌟' }
    if (overallScore >= 60) return { level: 'Good', color: 'text-blue-600', icon: '👍' }
    if (overallScore >= 40) return { level: 'Average', color: 'text-yellow-600', icon: '👌' }
    return { level: 'Needs Improvement', color: 'text-red-600', icon: '📈' }
  }

  const sortedByRevenue = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const sortedByBookings = [...data].sort((a, b) => b.totalBookings - a.totalBookings)
  const sortedByRating = [...data].sort((a, b) => b.averageRating - a.averageRating)
  const sortedByConversion = [...data].sort((a, b) => b.conversionRate - a.conversionRate)

  const totalRevenue = data.reduce((sum, service) => sum + service.totalRevenue, 0)
  const totalBookings = data.reduce((sum, service) => sum + service.totalBookings, 0)
  const averageRating = data.length > 0 
    ? data.reduce((sum, service) => sum + service.averageRating, 0) / data.length 
    : 0
  const averageConversion = data.length > 0 
    ? data.reduce((sum, service) => sum + service.conversionRate, 0) / data.length 
    : 0

  return (
    <div className="space-y-8">
      {/* Service Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">⚙️</div>
            <p className="text-sm font-medium text-muted-foreground">Total Services</p>
            <p className="text-3xl font-bold">{data.length}</p>
            <p className="text-sm text-muted-foreground">Available services</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-sm font-medium text-muted-foreground">Avg. Revenue</p>
            <p className="text-3xl font-bold">
              {data.length > 0 ? formatCurrency(totalRevenue / data.length) : formatCurrency(0)}
            </p>
            <p className="text-sm text-muted-foreground">Per service</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">⭐</div>
            <p className="text-sm font-medium text-muted-foreground">Avg. Rating</p>
            <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Customer satisfaction</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm font-medium text-muted-foreground">Avg. Conversion</p>
            <p className="text-3xl font-bold">{formatPercentage(averageConversion)}</p>
            <p className="text-sm text-muted-foreground">Booking success rate</p>
          </div>
        </Card>
      </div>

      {/* Service Performance Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Service Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Service</th>
                <th className="text-left p-4 font-medium">Bookings</th>
                <th className="text-left p-4 font-medium">Revenue</th>
                <th className="text-left p-4 font-medium">Avg. Rating</th>
                <th className="text-left p-4 font-medium">Conversion Rate</th>
                <th className="text-left p-4 font-medium">Performance</th>
              </tr>
            </thead>
            <tbody>
              {data.map(service => {
                const performance = getServicePerformance(service)
                const revenuePercentage = totalRevenue > 0 ? (service.totalRevenue / totalRevenue) * 100 : 0
                const bookingPercentage = totalBookings > 0 ? (service.totalBookings / totalBookings) * 100 : 0
                
                return (
                  <tr key={service.id} className="border-b hover:bg-muted/25">
                    <td className="p-4">
                      <div className="font-medium">{service.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{service.totalBookings}</div>
                      <div className="text-sm text-muted-foreground">
                        {bookingPercentage.toFixed(1)}% of total
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{formatCurrency(service.totalRevenue)}</div>
                      <div className="text-sm text-muted-foreground">
                        {revenuePercentage.toFixed(1)}% of total
                      </div>
                    </td>
                    <td className="p-4">
                      {getRatingStars(service.averageRating)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getConversionColor(service.conversionRate)}`}>
                        {formatPercentage(service.conversionRate)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{performance.icon}</span>
                        <span className={`font-medium ${performance.color}`}>
                          {performance.level}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top Performing Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Revenue Services</h3>
          <div className="space-y-4">
            {sortedByRevenue.slice(0, 5).map((service, index) => {
              const percentage = totalRevenue > 0 ? (service.totalRevenue / totalRevenue) * 100 : 0
              
              return (
                <div key={service.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.totalBookings} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(service.totalRevenue)}</p>
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

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Popular Services</h3>
          <div className="space-y-4">
            {sortedByBookings.slice(0, 5).map((service, index) => {
              const percentage = totalBookings > 0 ? (service.totalBookings / totalBookings) * 100 : 0
              
              return (
                <div key={service.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(service.totalRevenue)} revenue
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{service.totalBookings}</p>
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
      </div>

      {/* Service Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Highest Rated Services</h3>
          <div className="space-y-3">
            {sortedByRating.slice(0, 5).map((service, index) => (
              <div key={service.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{service.averageRating.toFixed(1)} ⭐</div>
                  <div className="text-sm text-muted-foreground">
                    {service.totalBookings} reviews
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Best Conversion Rates</h3>
          <div className="space-y-3">
            {sortedByConversion.slice(0, 5).map((service, index) => (
              <div key={service.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatPercentage(service.conversionRate)}</div>
                  <div className="text-sm text-muted-foreground">
                    {service.totalBookings} bookings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Service Performance Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Rating Distribution</h4>
            <div className="space-y-2">
              {[
                { label: 'Excellent (4.5+)', count: data.filter(s => s.averageRating >= 4.5).length, color: 'bg-green-500' },
                { label: 'Good (4.0-4.4)', count: data.filter(s => s.averageRating >= 4.0 && s.averageRating < 4.5).length, color: 'bg-blue-500' },
                { label: 'Average (3.0-3.9)', count: data.filter(s => s.averageRating >= 3.0 && s.averageRating < 4.0).length, color: 'bg-yellow-500' },
                { label: 'Below Average (<3.0)', count: data.filter(s => s.averageRating < 3.0).length, color: 'bg-red-500' }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded ${item.color}`}></div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Conversion Rates</h4>
            <div className="space-y-2">
              {[
                { label: 'High (80%+)', count: data.filter(s => s.conversionRate >= 80).length, color: 'bg-green-500' },
                { label: 'Medium (60-79%)', count: data.filter(s => s.conversionRate >= 60 && s.conversionRate < 80).length, color: 'bg-yellow-500' },
                { label: 'Low (<60%)', count: data.filter(s => s.conversionRate < 60).length, color: 'bg-red-500' }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded ${item.color}`}></div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}