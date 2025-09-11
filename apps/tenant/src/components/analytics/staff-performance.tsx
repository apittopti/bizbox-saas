"use client"

import { Card } from '@bizbox/shared-ui'

interface StaffData {
  id: string
  name: string
  totalBookings: number
  totalRevenue: number
  averageRating: number
  utilizationRate: number
}

interface StaffPerformanceProps {
  data: StaffData[]
  dateRange: string
}

export function StaffPerformance({ data, dateRange }: StaffPerformanceProps) {
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

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getPerformanceLevel = (staff: StaffData) => {
    const score = (staff.utilizationRate * 0.4) + (staff.averageRating * 20 * 0.4) + 
                  (Math.min(staff.totalBookings / 50, 1) * 100 * 0.2)
    
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', icon: '🌟' }
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', icon: '👍' }
    if (score >= 40) return { level: 'Average', color: 'text-yellow-600', icon: '👌' }
    return { level: 'Needs Improvement', color: 'text-red-600', icon: '📈' }
  }

  const sortedByRevenue = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const sortedByBookings = [...data].sort((a, b) => b.totalBookings - a.totalBookings)
  const sortedByRating = [...data].sort((a, b) => b.averageRating - a.averageRating)

  const totalRevenue = data.reduce((sum, staff) => sum + staff.totalRevenue, 0)
  const totalBookings = data.reduce((sum, staff) => sum + staff.totalBookings, 0)
  const averageUtilization = data.length > 0 
    ? data.reduce((sum, staff) => sum + staff.utilizationRate, 0) / data.length 
    : 0

  return (
    <div className="space-y-8">
      {/* Staff Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
            <p className="text-3xl font-bold">{data.length}</p>
            <p className="text-sm text-muted-foreground">Active members</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm font-medium text-muted-foreground">Avg. Utilization</p>
            <p className="text-3xl font-bold">{formatPercentage(averageUtilization)}</p>
            <p className="text-sm text-muted-foreground">Team efficiency</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">⭐</div>
            <p className="text-sm font-medium text-muted-foreground">Avg. Rating</p>
            <p className="text-3xl font-bold">
              {data.length > 0 
                ? (data.reduce((sum, s) => sum + s.averageRating, 0) / data.length).toFixed(1)
                : '0.0'
              }
            </p>
            <p className="text-sm text-muted-foreground">Customer satisfaction</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-sm font-medium text-muted-foreground">Revenue per Staff</p>
            <p className="text-3xl font-bold">
              {data.length > 0 ? formatCurrency(totalRevenue / data.length) : formatCurrency(0)}
            </p>
            <p className="text-sm text-muted-foreground">Average contribution</p>
          </div>
        </Card>
      </div>

      {/* Staff Performance Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Staff Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Staff Member</th>
                <th className="text-left p-4 font-medium">Bookings</th>
                <th className="text-left p-4 font-medium">Revenue</th>
                <th className="text-left p-4 font-medium">Avg. Rating</th>
                <th className="text-left p-4 font-medium">Utilization</th>
                <th className="text-left p-4 font-medium">Performance</th>
              </tr>
            </thead>
            <tbody>
              {data.map(staff => {
                const performance = getPerformanceLevel(staff)
                const revenuePercentage = totalRevenue > 0 ? (staff.totalRevenue / totalRevenue) * 100 : 0
                
                return (
                  <tr key={staff.id} className="border-b hover:bg-muted/25">
                    <td className="p-4">
                      <div className="font-medium">{staff.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{staff.totalBookings}</div>
                      <div className="text-sm text-muted-foreground">
                        {totalBookings > 0 ? ((staff.totalBookings / totalBookings) * 100).toFixed(1) : 0}% of total
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{formatCurrency(staff.totalRevenue)}</div>
                      <div className="text-sm text-muted-foreground">
                        {revenuePercentage.toFixed(1)}% of total
                      </div>
                    </td>
                    <td className="p-4">
                      {getRatingStars(staff.averageRating)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getUtilizationColor(staff.utilizationRate)}`}>
                        {formatPercentage(staff.utilizationRate)}
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

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Revenue Generators</h3>
          <div className="space-y-4">
            {sortedByRevenue.slice(0, 5).map((staff, index) => (
              <div key={staff.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{staff.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(staff.totalRevenue)}</div>
                  <div className="text-sm text-muted-foreground">
                    {staff.totalBookings} bookings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Bookings</h3>
          <div className="space-y-4">
            {sortedByBookings.slice(0, 5).map((staff, index) => (
              <div key={staff.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{staff.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{staff.totalBookings}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(staff.totalRevenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Highest Rated</h3>
          <div className="space-y-4">
            {sortedByRating.slice(0, 5).map((staff, index) => (
              <div key={staff.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{staff.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{staff.averageRating.toFixed(1)} ⭐</div>
                  <div className="text-sm text-muted-foreground">
                    {staff.totalBookings} reviews
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Performance Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Utilization Rates</h4>
            <div className="space-y-2">
              {[
                { label: 'High (80%+)', count: data.filter(s => s.utilizationRate >= 80).length, color: 'bg-green-500' },
                { label: 'Medium (60-79%)', count: data.filter(s => s.utilizationRate >= 60 && s.utilizationRate < 80).length, color: 'bg-yellow-500' },
                { label: 'Low (<60%)', count: data.filter(s => s.utilizationRate < 60).length, color: 'bg-red-500' }
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
        </div>
      </Card>
    </div>
  )
}