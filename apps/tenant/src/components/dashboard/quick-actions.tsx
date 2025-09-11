"use client"

import Link from 'next/link'
import { Button, Card } from '@bizbox/shared-ui'

interface QuickActionProps {
  title: string
  description: string
  icon: string
  href: string
  color: string
  urgent?: boolean
}

function QuickActionCard({ title, description, icon, href, color, urgent }: QuickActionProps) {
  return (
    <Card className={`p-4 hover:shadow-md transition-all ${urgent ? 'ring-2 ring-orange-200 dark:ring-orange-800' : ''}`}>
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            {urgent && (
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full dark:bg-orange-900 dark:text-orange-200">
                Urgent
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs mt-1">{description}</p>
        </div>
        <Button size="sm" variant="ghost" asChild>
          <Link href={href}>Go →</Link>
        </Button>
      </div>
    </Card>
  )
}

export function QuickActions() {
  const actions = [
    {
      title: "Book Appointment",
      description: "Create a new booking for a customer",
      icon: "📅",
      href: "/bookings/new",
      color: "bg-blue-100 dark:bg-blue-900/20"
    },
    {
      title: "Add New Service",
      description: "Create a new service offering",
      icon: "➕",
      href: "/services/new",
      color: "bg-green-100 dark:bg-green-900/20"
    },
    {
      title: "Staff Schedule",
      description: "View today's staff availability",
      icon: "🗓️",
      href: "/staff?view=schedule",
      color: "bg-purple-100 dark:bg-purple-900/20"
    },
    {
      title: "Customer Messages",
      description: "2 unread messages from customers",
      icon: "💬",
      href: "/messages",
      color: "bg-yellow-100 dark:bg-yellow-900/20",
      urgent: true
    },
    {
      title: "Update Business Hours",
      description: "Manage your opening times",
      icon: "🕐",
      href: "/business?section=hours",
      color: "bg-orange-100 dark:bg-orange-900/20"
    },
    {
      title: "View Reports",
      description: "Check this week's performance",
      icon: "📊",
      href: "/analytics",
      color: "bg-indigo-100 dark:bg-indigo-900/20"
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <Button variant="outline" size="sm">
          Customize
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <QuickActionCard
            key={index}
            title={action.title}
            description={action.description}
            icon={action.icon}
            href={action.href}
            color={action.color}
            urgent={action.urgent}
          />
        ))}
      </div>
    </div>
  )
}