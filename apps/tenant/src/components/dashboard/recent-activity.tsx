"use client"

import { Card, Button } from '@bizbox/shared-ui'

interface ActivityItem {
  id: string
  type: 'booking' | 'payment' | 'review' | 'staff' | 'system'
  title: string
  description: string
  time: string
  user?: string
  status?: 'success' | 'pending' | 'failed' | 'info'
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const icons = {
    booking: '📅',
    payment: '💰',
    review: '⭐',
    staff: '👥',
    system: '⚙️'
  }
  return <span className="text-lg">{icons[type]}</span>
}

function StatusBadge({ status }: { status: ActivityItem['status'] }) {
  if (!status) return null
  
  const styles = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
  }

  const labels = {
    success: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
    info: 'Info'
  }

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export function RecentActivity() {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'booking',
      title: 'New booking confirmed',
      description: 'Hair cut appointment with Sarah Johnson for tomorrow at 2:00 PM',
      time: '5 minutes ago',
      user: 'Sarah Johnson',
      status: 'success'
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment received',
      description: '£45.00 payment for mens haircut service',
      time: '23 minutes ago',
      user: 'Michael Smith',
      status: 'success'
    },
    {
      id: '3',
      type: 'review',
      title: 'New 5-star review',
      description: '"Excellent service! Will definitely come back again."',
      time: '1 hour ago',
      user: 'Emma Wilson',
      status: 'info'
    },
    {
      id: '4',
      type: 'booking',
      title: 'Booking cancelled',
      description: 'Customer cancelled appointment for today at 3:30 PM',
      time: '2 hours ago',
      user: 'James Brown',
      status: 'pending'
    },
    {
      id: '5',
      type: 'staff',
      title: 'Staff availability updated',
      description: 'Tom Miller updated availability for next week',
      time: '3 hours ago',
      user: 'Tom Miller',
      status: 'info'
    },
    {
      id: '6',
      type: 'system',
      title: 'Backup completed',
      description: 'Daily data backup completed successfully',
      time: '6 hours ago',
      status: 'success'
    },
    {
      id: '7',
      type: 'payment',
      title: 'Payment failed',
      description: 'Failed payment attempt for £28.00 - insufficient funds',
      time: '8 hours ago',
      user: 'David Wilson',
      status: 'failed'
    }
  ]

  return (
    <Card className="h-fit">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </div>
      
      <div className="divide-y">
        {activities.map((activity) => (
          <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <ActivityIcon type={activity.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={activity.status} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {activity.description}
                </p>
                {activity.user && (
                  <p className="text-xs text-muted-foreground">
                    by {activity.user}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t bg-muted/20">
        <div className="text-center">
          <Button variant="outline" size="sm">
            Load More Activity
          </Button>
        </div>
      </div>
    </Card>
  )
}