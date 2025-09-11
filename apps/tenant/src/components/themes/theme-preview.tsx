"use client"

import { Card, Button } from '@bizbox/shared-ui'

export function ThemePreview() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Preview</h3>
        <Button variant="ghost" size="sm">
          🔄
        </Button>
      </div>

      <div className="space-y-4">
        {/* Mobile Preview */}
        <div>
          <p className="text-sm font-medium mb-2">Mobile View</p>
          <div className="w-full bg-muted rounded-lg p-4 border-2">
            <div className="bg-white rounded-md shadow-sm h-64 overflow-hidden">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-3 text-center">
                <div className="text-sm font-semibold">Your Business</div>
              </div>
              
              {/* Hero Section */}
              <div className="p-4 text-center bg-gray-50">
                <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-2"></div>
                <div className="text-xs font-semibold">Welcome</div>
                <div className="text-xs text-gray-600 mt-1">Professional Services</div>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-2">
                <div className="bg-primary/10 rounded p-2">
                  <div className="text-xs font-medium">Book Now</div>
                </div>
                <div className="bg-gray-100 rounded p-2">
                  <div className="text-xs">Our Services</div>
                </div>
                <div className="bg-gray-100 rounded p-2">
                  <div className="text-xs">About Us</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Preview */}
        <div>
          <p className="text-sm font-medium mb-2">Desktop View</p>
          <div className="w-full bg-muted rounded-lg p-3 border-2">
            <div className="bg-white rounded-md shadow-sm h-32 overflow-hidden">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-2 flex justify-between items-center">
                <div className="text-xs font-semibold">Your Business</div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary-foreground/50 rounded-full"></div>
                  <div className="w-2 h-2 bg-primary-foreground/50 rounded-full"></div>
                  <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                </div>
              </div>
              
              {/* Content Layout */}
              <div className="p-2 flex space-x-2 h-full">
                <div className="flex-1 space-y-1">
                  <div className="bg-gray-100 h-4 rounded"></div>
                  <div className="bg-gray-50 h-3 rounded"></div>
                  <div className="bg-gray-50 h-3 rounded w-3/4"></div>
                  <div className="bg-primary/10 h-4 rounded w-1/2 mt-2"></div>
                </div>
                <div className="w-8 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Color Swatches */}
        <div>
          <p className="text-sm font-medium mb-2">Current Colors</p>
          <div className="flex space-x-2">
            <div className="w-6 h-6 bg-primary rounded border-2 border-white shadow-sm"></div>
            <div className="w-6 h-6 bg-secondary rounded border-2 border-white shadow-sm"></div>
            <div className="w-6 h-6 bg-accent rounded border-2 border-white shadow-sm"></div>
            <div className="w-6 h-6 bg-muted rounded border-2 border-white shadow-sm"></div>
          </div>
        </div>

        {/* Preview Actions */}
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full">
            👁️ Preview Full Site
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            📱 Test on Mobile
          </Button>
        </div>

        {/* Responsive Breakpoints */}
        <div>
          <p className="text-sm font-medium mb-2">Test Breakpoints</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" className="text-xs">
              📱 Mobile
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              💻 Tablet
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              🖥️ Desktop
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              📺 Large
            </Button>
          </div>
        </div>

        {/* Theme Score */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Theme Score</span>
            <span className="text-lg font-bold text-green-600">92/100</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Accessibility</span>
              <span className="text-green-600">✓ Good</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Mobile Friendly</span>
              <span className="text-green-600">✓ Excellent</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Performance</span>
              <span className="text-green-600">✓ Good</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Brand Consistency</span>
              <span className="text-yellow-600">⚠ Fair</span>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="space-y-2 pt-4 border-t">
          <Button className="w-full">
            💾 Save Changes
          </Button>
          <Button variant="outline" className="w-full">
            🔄 Reset to Default
          </Button>
        </div>
      </div>
    </Card>
  )
}