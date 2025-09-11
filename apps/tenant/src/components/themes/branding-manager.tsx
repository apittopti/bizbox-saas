"use client"

import { useState } from 'react'
import { Card, Button, Input } from '@bizbox/shared-ui'

interface BrandAssets {
  logo: File | null
  favicon: File | null
  backgroundImages: File[]
  brandColors: string[]
}

export function BrandingManager() {
  const [brandAssets, setBrandAssets] = useState<BrandAssets>({
    logo: null,
    favicon: null,
    backgroundImages: [],
    brandColors: ['#2563eb', '#10b981', '#f59e0b']
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setBrandAssets(prev => ({ ...prev, logo: file }))
      const reader = new FileReader()
      reader.onload = (e) => setLogoPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setBrandAssets(prev => ({ ...prev, favicon: file }))
      const reader = new FileReader()
      reader.onload = (e) => setFaviconPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setBrandAssets(prev => ({ 
      ...prev, 
      backgroundImages: [...prev.backgroundImages, ...files]
    }))
  }

  const removeBackgroundImage = (index: number) => {
    setBrandAssets(prev => ({
      ...prev,
      backgroundImages: prev.backgroundImages.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Brand Assets</h3>
        <p className="text-muted-foreground">
          Upload and manage your business logos, images, and brand elements
        </p>
      </div>

      {/* Logo Upload */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Business Logo</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              {logoPreview ? (
                <div>
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-24 mx-auto mb-4"
                  />
                  <p className="text-sm text-muted-foreground">
                    {brandAssets.logo?.name}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="text-muted-foreground mb-2">Upload your logo</p>
                  <p className="text-xs text-muted-foreground">
                    Recommended: PNG or SVG, max 2MB
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 flex space-x-2">
              <Button variant="outline" className="flex-1" asChild>
                <label className="cursor-pointer">
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </Button>
              {logoPreview && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setLogoPreview(null)
                    setBrandAssets(prev => ({ ...prev, logo: null }))
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-3">Logo Guidelines</h5>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Use high-resolution images (300 DPI minimum)</li>
              <li>• Transparent background recommended</li>
              <li>• SVG format for best scalability</li>
              <li>• Keep file size under 2MB</li>
              <li>• Ensure logo is readable at small sizes</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Favicon */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Favicon</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              {faviconPreview ? (
                <div>
                  <img
                    src={faviconPreview}
                    alt="Favicon preview"
                    className="w-8 h-8 mx-auto mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    {brandAssets.favicon?.name}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">🔖</div>
                  <p className="text-sm text-muted-foreground">Upload favicon</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex space-x-2">
              <Button variant="outline" className="flex-1" asChild>
                <label className="cursor-pointer">
                  Upload Favicon
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                </label>
              </Button>
              {faviconPreview && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setFaviconPreview(null)
                    setBrandAssets(prev => ({ ...prev, favicon: null }))
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-3">Favicon Requirements</h5>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Square format (32x32px minimum)</li>
              <li>• ICO or PNG format</li>
              <li>• Simple, recognizable design</li>
              <li>• Works well at small sizes</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Background Images */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Background Images</h4>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <div className="text-4xl mb-2">📸</div>
            <p className="text-muted-foreground mb-2">Upload background images</p>
            <p className="text-xs text-muted-foreground mb-4">
              High-quality images for hero sections and backgrounds
            </p>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                Choose Images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
              </label>
            </Button>
          </div>

          {brandAssets.backgroundImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {brandAssets.backgroundImages.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Background ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeBackgroundImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {image.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Brand Colors */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Brand Color Palette</h4>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Define your brand colors to maintain consistency across all materials
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            {brandAssets.brandColors.map((color, index) => (
              <div key={index} className="space-y-2">
                <div
                  className="w-full h-12 rounded-lg border-2 border-white shadow-md"
                  style={{ backgroundColor: color }}
                />
                <Input
                  value={color}
                  onChange={(e) => {
                    const newColors = [...brandAssets.brandColors]
                    newColors[index] = e.target.value
                    setBrandAssets(prev => ({ ...prev, brandColors: newColors }))
                  }}
                  className="text-center font-mono text-sm"
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBrandAssets(prev => ({
                ...prev,
                brandColors: [...prev.brandColors, '#000000']
              }))
            }}
          >
            + Add Color
          </Button>
        </div>
      </Card>

      {/* Brand Guidelines */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Brand Guidelines</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Business Tagline</label>
              <Input placeholder="Your business tagline..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Brand Voice</label>
              <select className="w-full p-2 border rounded-md bg-background">
                <option>Professional</option>
                <option>Friendly</option>
                <option>Authoritative</option>
                <option>Casual</option>
                <option>Luxurious</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Brand Description</label>
            <textarea
              placeholder="Describe your brand personality and values..."
              className="w-full p-3 border rounded-md bg-background h-24 resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}