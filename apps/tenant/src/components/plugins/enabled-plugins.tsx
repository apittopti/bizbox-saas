"use client"

import { Card, Button, Badge, Switch } from '@bizbox/shared-ui'

interface EnabledPlugin {
  id: string
  name: string
  description: string
  icon: string
  status: 'active' | 'inactive' | 'error'
  lastUpdated: string
  version: string
  usage: {
    label: string
    value: string
  }
  settings: boolean
}

function EnabledPluginCard({ plugin }: { plugin: EnabledPlugin }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
  }

  const statusIcons = {
    active: '✅',
    inactive: '⏸️',
    error: '❌'
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{plugin.icon}</div>
          <div>
            <h3 className="font-semibold text-lg">{plugin.name}</h3>
            <p className="text-sm text-muted-foreground">Version {plugin.version}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[plugin.status]}>
            {statusIcons[plugin.status]} {plugin.status}
          </Badge>
          <Switch defaultChecked={plugin.status === 'active'} />
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-4">
        {plugin.description}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Usage</p>
          <p className="font-semibold">{plugin.usage.value}</p>
          <p className="text-xs text-muted-foreground">{plugin.usage.label}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
          <p className="font-semibold">{plugin.lastUpdated}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {plugin.settings && (
            <Button variant="outline" size="sm">
              ⚙️ Settings
            </Button>
          )}
          <Button variant="outline" size="sm">
            📊 Analytics
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
          Disable
        </Button>
      </div>
    </Card>
  )
}

export function EnabledPlugins() {
  const enabledPlugins: EnabledPlugin[] = [
    {
      id: 'booking-system',
      name: 'Advanced Booking System',
      description: 'Intelligent booking system with staff matching and automated scheduling',
      icon: '📅',
      status: 'active',
      lastUpdated: '2 days ago',
      version: '2.1.4',
      usage: {
        label: 'bookings this month',
        value: '124'
      },
      settings: true
    },
    {
      id: 'payment-processing',
      name: 'Payment Processing',
      description: 'Accept payments online and in-person with Stripe integration',
      icon: '💳',
      status: 'active',
      lastUpdated: '1 week ago',
      version: '3.0.2',
      usage: {
        label: 'transactions processed',
        value: '£3,247'
      },
      settings: true
    },
    {
      id: 'customer-reviews',
      name: 'Customer Reviews',
      description: 'Collect and manage customer reviews and ratings',
      icon: '⭐',
      status: 'active',
      lastUpdated: '3 days ago',
      version: '1.2.1',
      usage: {
        label: 'reviews received',
        value: '47'
      },
      settings: true
    },
    {
      id: 'sms-notifications',
      name: 'SMS Notifications',
      description: 'Send automated SMS reminders and confirmations to customers',
      icon: '📱',
      status: 'inactive',
      lastUpdated: '1 month ago',
      version: '1.1.0',
      usage: {
        label: 'messages sent',
        value: '0'
      },
      settings: true
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold mb-2">Your Enabled Plugins</h3>
          <p className="text-muted-foreground">
            Manage and monitor your active plugins and integrations
          </p>
        </div>
        <Button variant="outline" size="sm">
          🔄 Check for Updates
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {enabledPlugins.map((plugin) => (
          <EnabledPluginCard key={plugin.id} plugin={plugin} />
        ))}
      </div>

      {enabledPlugins.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-semibold mb-2">No Plugins Enabled</h3>
          <p className="text-muted-foreground mb-6">
            Enable plugins to extend your business functionality and improve customer experience.
          </p>
          <Button>Browse Available Plugins</Button>
        </Card>
      )}
    </div>
  )
}