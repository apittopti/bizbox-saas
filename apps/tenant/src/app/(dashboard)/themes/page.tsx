"use client"

import { Card, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@bizbox/shared-ui'
import { ThemeTemplates } from '@/components/themes/theme-templates'
import { ColorCustomizer } from '@/components/themes/color-customizer'
import { TypographySettings } from '@/components/themes/typography-settings'
import { BrandingManager } from '@/components/themes/branding-manager'
import { ThemePreview } from '@/components/themes/theme-preview'

export default function ThemesPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Theme Customization</h1>
          <p className="text-muted-foreground mt-2">
            Customize your business appearance and create a unique brand experience
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            💾 Save Changes
          </Button>
          <Button size="sm">
            👁️ Preview Live Site
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Theme Customization Panel */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="typography">Typography</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-6">
              <ThemeTemplates />
            </TabsContent>

            <TabsContent value="colors" className="space-y-6">
              <ColorCustomizer />
            </TabsContent>

            <TabsContent value="typography" className="space-y-6">
              <TypographySettings />
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <BrandingManager />
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <ThemePreview />
          </div>
        </div>
      </div>
    </div>
  )
}