"use client"

import { useState } from 'react'
import { Card, Button, Badge, Input } from '@bizbox/shared-ui'

interface Plugin {
  id: string
  name: string
  description: string
  icon: string
  category: string
  status: 'enabled' | 'available' | 'marketplace'
  price: string
  rating?: number
  installs?: string
  features: string[]
  developer: string
  compatibility: 'core' | 'business' | 'enterprise'
}

interface PluginCardProps {
  plugin: Plugin
  onToggle: (pluginId: string, action: 'enable' | 'disable' | 'install') => void
}

function PluginCard({ plugin, onToggle }: PluginCardProps) {
  const isEnabled = plugin.status === 'enabled'
  const isMarketplace = plugin.status === 'marketplace'

  const compatibilityColors = {
    core: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    business: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
    enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
  }

  return (
    <Card className="p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{plugin.icon}</div>
          <div>
            <h3 className="font-semibold text-lg">{plugin.name}</h3>
            <p className="text-sm text-muted-foreground">by {plugin.developer}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <Badge className={compatibilityColors[plugin.compatibility]}>
            {plugin.compatibility}
          </Badge>
          {isEnabled && (
            <Badge variant="default">
              Enabled
            </Badge>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-4">
        {plugin.description}
      </p>

      <div className="mb-4">
        <p className="text-sm font-medium mb-2">Key Features:</p>
        <div className="flex flex-wrap gap-1">
          {plugin.features.slice(0, 3).map((feature, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
          {plugin.features.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{plugin.features.length - 3} more
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{plugin.price}</span>
          {plugin.rating && (
            <div className="flex items-center space-x-1">
              <span>⭐</span>
              <span>{plugin.rating}</span>
            </div>
          )}
          {plugin.installs && (
            <span>{plugin.installs} installs</span>
          )}
        </div>
        <div className="flex space-x-2">
          {isEnabled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggle(plugin.id, 'disable')}
              >
                Disable
              </Button>
              <Button size="sm">Configure</Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onToggle(plugin.id, isMarketplace ? 'install' : 'enable')}
            >
              {isMarketplace ? 'Install' : 'Enable'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

interface PluginGridProps {
  filter: 'enabled' | 'available' | 'marketplace'
}

export function PluginGrid({ filter }: PluginGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Mock plugin data - in real app, this would come from API
  const allPlugins: Plugin[] = [
    {
      id: 'booking-system',
      name: 'Advanced Booking System',
      description: 'Intelligent booking system with staff matching, automated scheduling, and customer management',
      icon: '📅',
      category: 'booking',
      status: 'enabled',
      price: 'Free',
      rating: 4.9,
      installs: '5.2k',
      features: ['Smart Scheduling', 'Staff Matching', 'Customer Portal', 'SMS Notifications'],
      developer: 'BizBox Team',
      compatibility: 'core'
    },
    {
      id: 'payment-processing',
      name: 'Payment Processing',
      description: 'Accept payments online and in-person with Stripe integration',
      icon: '💳',
      category: 'payments',
      status: 'enabled',
      price: 'Free',
      rating: 4.8,
      installs: '4.8k',
      features: ['Online Payments', 'Card Present', 'Apple Pay', 'Google Pay'],
      developer: 'BizBox Team',
      compatibility: 'core'
    },
    {
      id: 'ecommerce',
      name: 'E-commerce Store',
      description: 'Sell products and services online with integrated inventory management',
      icon: '🛒',
      category: 'ecommerce',
      status: 'available',
      price: 'Free',
      features: ['Product Catalog', 'Inventory Tracking', 'Order Management', 'Shipping Calculator'],
      developer: 'BizBox Team',
      compatibility: 'business'
    },
    {
      id: 'marketing-automation',
      name: 'Marketing Automation',
      description: 'Automated email campaigns, customer retention, and loyalty programs',
      icon: '📧',
      category: 'marketing',
      status: 'available',
      price: '£9.99/month',
      features: ['Email Campaigns', 'Customer Segmentation', 'Loyalty Programs', 'Analytics'],
      developer: 'BizBox Team',
      compatibility: 'business'
    },
    {
      id: 'instagram-integration',
      name: 'Instagram Business',
      description: 'Sync your Instagram business account, showcase work, and book directly from posts',
      icon: '📸',
      category: 'social',
      status: 'marketplace',
      price: '£4.99/month',
      rating: 4.6,
      installs: '2.1k',
      features: ['Post Sync', 'Direct Booking', 'Stories Integration', 'Analytics'],
      developer: 'Social Media Pro',
      compatibility: 'business'
    },
    {
      id: 'quickbooks-sync',
      name: 'QuickBooks Integration',
      description: 'Sync all your business transactions and customer data with QuickBooks',
      icon: '📊',
      category: 'accounting',
      status: 'marketplace',
      price: '£14.99/month',
      rating: 4.7,
      installs: '1.8k',
      features: ['Transaction Sync', 'Invoice Generation', 'Tax Reports', 'Customer Sync'],
      developer: 'Accounting Solutions Ltd',
      compatibility: 'enterprise'
    }
  ]

  const categories = ['all', 'booking', 'payments', 'ecommerce', 'marketing', 'social', 'accounting']

  const filteredPlugins = allPlugins
    .filter(plugin => filter === 'all' || plugin.status === filter)
    .filter(plugin => {
      if (selectedCategory !== 'all' && plugin.category !== selectedCategory) return false
      if (searchQuery && !plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !plugin.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })

  const handlePluginToggle = (pluginId: string, action: 'enable' | 'disable' | 'install') => {
    console.log(`${action} plugin:`, pluginId)
    // In real app, this would call API to enable/disable/install plugin
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            onToggle={handlePluginToggle}
          />
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No plugins found matching your criteria.</p>
          <Button variant="outline" onClick={() => {
            setSearchQuery('')
            setSelectedCategory('all')
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}