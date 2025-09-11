"use client"

import { useState, useEffect } from 'react'
import { Card, Select, Button } from '@bizbox/shared-ui'
import { AnalyticsOverview } from '@/components/analytics/analytics-overview'
import { BookingAnalytics } from '@/components/analytics/booking-analytics'
import { RevenueAnalytics } from '@/components/analytics/revenue-analytics'
import { StaffPerformance } from '@/components/analytics/staff-performance'
import { ServiceAnalytics } from '@/components/analytics/service-analytics'

interface AnalyticsData {
  overview: {
    totalBookings: number
    totalRevenue: number
    averageBookingValue: number
    customerRetentionRate: number
    bookingGrowth: number
    revenueGrowth: number
  }
  bookings: {
    byStatus: Array<{ status: string; count: number }>
    byDay: Array<{ date: string; count: number }>
    byHour: Array<{ hour: number; count: number }>
    byMonth: Array<{ month: string; count: number }>
  }
  revenue: {
    byDay: Array<{ date: string; amount: number }>
    byMonth: Array<{ month: string; amount: number }>
    byService: Array<{ serviceName: string; amount: number; count: number }>
    byStaff: Array<{ staffName: string; amount: number; count: number }>
  }
  staff: Array<{
    id: string
    name: string
    totalBookings: number
    totalRevenue: number
    averageRating: number
    utilizationRate: number
  }>
  services: Array<{
    id: string
    name: string
    totalBookings: number
    totalRevenue: number
    averageRating: number
    conversionRate: number
  }>
  customers: {
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
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/analytics?range=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch(`/api/analytics/export?range=${dateRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'bookings', name: 'Bookings', icon: '📅' },
    { id: 'revenue', name: 'Revenue', icon: '💰' },
    { id: 'staff', name: 'Staff Performance', icon: '👥' },
    { id: 'services', name: 'Services', icon: '⚙️' },
  ]

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Track your business performance and insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </Select>
            <Button onClick={exportData} variant="outline">
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Content */}
      {analyticsData && (
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <AnalyticsOverview 
              data={analyticsData.overview}
              customers={analyticsData.customers}
              dateRange={dateRange}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingAnalytics 
              data={analyticsData.bookings}
              dateRange={dateRange}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueAnalytics 
              data={analyticsData.revenue}
              dateRange={dateRange}
            />
          )}

          {activeTab === 'staff' && (
            <StaffPerformance 
              data={analyticsData.staff}
              dateRange={dateRange}
            />
          )}

          {activeTab === 'services' && (
            <ServiceAnalytics 
              data={analyticsData.services}
              dateRange={dateRange}
            />
          )}
        </div>
      )}
    </div>
  )
}