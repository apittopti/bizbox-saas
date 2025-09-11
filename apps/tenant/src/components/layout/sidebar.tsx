"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button, CollapsibleMenu } from '@bizbox/shared-ui'
import { cn } from '@bizbox/shared-ui/lib/utils'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: '📊',
  },
  {
    name: 'Business Info',
    href: '/business',
    icon: '🏢',
  },
  {
    name: 'Services',
    href: '/services',
    icon: '⚙️',
  },
  {
    name: 'Staff',
    href: '/staff',
    icon: '👥',
  },
  {
    name: 'Bookings',
    href: '/bookings',
    icon: '📅',
  },
  {
    name: 'Website Builder',
    href: '/website',
    icon: '🎨',
  },
  {
    name: 'Media Library',
    href: '/media',
    icon: '📸',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: '📈',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: '⚙️',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold">BizBox</h2>
              <p className="text-sm text-muted-foreground">Tenant Admin</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
          >
            {isCollapsed ? '→' : '←'}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="ml-3">{item.name}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground">
            <p>© 2024 BizBox</p>
            <p>Version 1.0.0</p>
          </div>
        )}
      </div>
    </div>
  )
}