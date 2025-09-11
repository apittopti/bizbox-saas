"use client"

import Link from 'next/link'
import { Card, Button } from '@bizbox/shared-ui'
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { PerformanceIndicators } from '@/components/dashboard/performance-indicators'

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 View Reports
          </Button>
          <Button size="sm">
            ➕ Quick Book
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-8">
        <DashboardMetrics />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* Performance Indicators - Takes 1 column */}
        <div>
          <PerformanceIndicators />
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
              🏢
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/business">
                Configure →
              </Link>
            </Button>
          </div>
          <h3 className="text-lg font-semibold mb-2">Business Settings</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Manage your business details, branding, operating hours, and legal documents
          </p>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
              ⚙️
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/services">
                Manage →
              </Link>
            </Button>
          </div>
          <h3 className="text-lg font-semibold mb-2">Services & Pricing</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Configure your service catalog, pricing, and booking rules
          </p>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
              👥
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff">
                Manage →
              </Link>
            </Button>
          </div>
          <h3 className="text-lg font-semibold mb-2">Staff Management</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Add staff members, set availability, and assign service permissions
          </p>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20">
              📅
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bookings">
                View Calendar →
              </Link>
            </Button>
          </div>
          <h3 className="text-lg font-semibold mb-2">Booking System</h3>
          <p className="text-muted-foreground text-sm mb-4">
            View appointments, manage schedules, and handle customer bookings
          </p>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-pink-100 rounded-lg dark:bg-pink-900/20">
              🎨
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/themes">
                Customize →
              </Link>
            </Button>
          </div>
          <h3 className="text-lg font-semibold mb-2">Themes & Branding</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Customize your business theme, colors, and visual identity
          </p>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/20">
              🔌
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/plugins">
                Manage →
              </Link>
            </Button>
          </div>
          <h3 className="text-lg font-semibold mb-2">Plugin Management</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Enable and configure plugins to extend your business functionality
          </p>
        </Card>
      </div>
    </div>
  )
}