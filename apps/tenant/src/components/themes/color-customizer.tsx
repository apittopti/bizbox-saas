"use client"

import { useState } from 'react'
import { Card, Button } from '@bizbox/shared-ui'

interface ColorScheme {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
}

export function ColorCustomizer() {
  const [currentColors, setCurrentColors] = useState<ColorScheme>({
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#10b981',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9'
  })

  const presetPalettes = [
    {
      name: 'Ocean Blue',
      colors: {
        primary: '#0ea5e9',
        secondary: '#0284c7',
        accent: '#06b6d4',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#f0f9ff'
      }
    },
    {
      name: 'Forest Green',
      colors: {
        primary: '#059669',
        secondary: '#047857',
        accent: '#10b981',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#f0fdf4'
      }
    },
    {
      name: 'Sunset Orange',
      colors: {
        primary: '#ea580c',
        secondary: '#dc2626',
        accent: '#f59e0b',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#fff7ed'
      }
    },
    {
      name: 'Royal Purple',
      colors: {
        primary: '#7c3aed',
        secondary: '#6d28d9',
        accent: '#a855f7',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#faf5ff'
      }
    },
    {
      name: 'Rose Gold',
      colors: {
        primary: '#ec4899',
        secondary: '#db2777',
        accent: '#f97316',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#fdf2f8'
      }
    },
    {
      name: 'Midnight Dark',
      colors: {
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#06b6d4',
        background: '#0f172a',
        foreground: '#f1f5f9',
        muted: '#1e293b'
      }
    }
  ]

  const handleColorChange = (colorType: keyof ColorScheme, value: string) => {
    setCurrentColors(prev => ({
      ...prev,
      [colorType]: value
    }))
  }

  const handlePresetSelect = (preset: typeof presetPalettes[0]) => {
    setCurrentColors(preset.colors)
  }

  const generateRandomColors = () => {
    const randomColor = () => {
      const hue = Math.floor(Math.random() * 360)
      const saturation = Math.floor(Math.random() * 30) + 60 // 60-90%
      const lightness = Math.floor(Math.random() * 20) + 40 // 40-60%
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    }

    setCurrentColors({
      primary: randomColor(),
      secondary: randomColor(),
      accent: randomColor(),
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Color Scheme</h3>
        <p className="text-muted-foreground">
          Customize your brand colors and create a cohesive visual identity
        </p>
      </div>

      {/* Color Presets */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Color Presets</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {presetPalettes.map((preset, index) => (
            <button
              key={index}
              onClick={() => handlePresetSelect(preset)}
              className="p-3 border rounded-lg hover:shadow-md transition-all text-left group"
            >
              <div className="flex space-x-1 mb-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: preset.colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: preset.colors.secondary }}
                />
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: preset.colors.accent }}
                />
              </div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">
                {preset.name}
              </p>
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={generateRandomColors}>
          🎲 Generate Random
        </Button>
      </Card>

      {/* Custom Color Picker */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Custom Colors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(currentColors).map(([colorType, value]) => (
            <div key={colorType} className="space-y-2">
              <label className="text-sm font-medium capitalize">
                {colorType.replace(/([A-Z])/g, ' $1')}
              </label>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-12 h-12 rounded-lg border-2 border-white shadow-md"
                  style={{ backgroundColor: value }}
                />
                <div className="flex-1">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(colorType as keyof ColorScheme, e.target.value)}
                    className="w-full h-10 rounded-md border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleColorChange(colorType as keyof ColorScheme, e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border rounded font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Color Preview */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Color Preview</h4>
        <div className="space-y-4">
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: currentColors.background,
              color: currentColors.foreground,
              border: `1px solid ${currentColors.muted}`
            }}
          >
            <h5 className="font-semibold mb-2">Sample Content</h5>
            <p className="text-sm mb-3">
              This is how your content will look with the selected color scheme.
            </p>
            <div className="flex space-x-2">
              <button
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: currentColors.primary }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: currentColors.accent }}
              >
                Accent Button
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Options */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Advanced Options</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto Dark Mode</p>
              <p className="text-sm text-muted-foreground">
                Automatically generate dark mode colors
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Color Accessibility</p>
              <p className="text-sm text-muted-foreground">
                Ensure WCAG AA compliance for color contrast
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>
    </div>
  )
}