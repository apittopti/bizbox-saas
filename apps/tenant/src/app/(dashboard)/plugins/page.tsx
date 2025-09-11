"use client"

import { Card, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@bizbox/shared-ui'
import { PluginGrid } from '@/components/plugins/plugin-grid'
import { EnabledPlugins } from '@/components/plugins/enabled-plugins'
import { PluginUsageOverview } from '@/components/plugins/plugin-usage-overview'

export default function PluginsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plugin Management</h1>
          <p className="text-muted-foreground mt-2">
            Extend your business with powerful plugins and integrations
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Usage Report
          </Button>
          <Button size="sm">
            🔍 Browse Marketplace
          </Button>
        </div>
      </div>

      {/* Plugin Usage Overview */}
      <div className="mb-8">
        <PluginUsageOverview />
      </div>

      {/* Plugin Management Tabs */}
      <Tabs defaultValue="enabled" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enabled">Enabled Plugins</TabsTrigger>
          <TabsTrigger value="available">Available Plugins</TabsTrigger>
          <TabsTrigger value="marketplace">Plugin Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="enabled" className="space-y-6">
          <EnabledPlugins />
        </TabsContent>

        <TabsContent value="available" className="space-y-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Available Plugins</h3>
            <p className="text-muted-foreground">
              These plugins are included with your BizBox subscription and ready to enable.
            </p>
          </div>
          <PluginGrid filter="available" />
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Plugin Marketplace</h3>
            <p className="text-muted-foreground">
              Discover additional plugins and integrations from our marketplace.
            </p>
          </div>
          <PluginGrid filter="marketplace" />
        </TabsContent>
      </Tabs>
    </div>
  )
}