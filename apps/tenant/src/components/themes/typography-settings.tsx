"use client"

import { useState } from 'react'
import { Card, Button, Select } from '@bizbox/shared-ui'

interface TypographySettings {
  headingFont: string
  bodyFont: string
  fontScale: string
  lineHeight: string
  letterSpacing: string
}

export function TypographySettings() {
  const [typography, setTypography] = useState<TypographySettings>({
    headingFont: 'Inter',
    bodyFont: 'Inter',
    fontScale: 'medium',
    lineHeight: 'normal',
    letterSpacing: 'normal'
  })

  const fontOptions = [
    { value: 'Inter', label: 'Inter (Modern Sans-serif)' },
    { value: 'Roboto', label: 'Roboto (Google Sans-serif)' },
    { value: 'Open Sans', label: 'Open Sans (Friendly Sans-serif)' },
    { value: 'Lato', label: 'Lato (Humanist Sans-serif)' },
    { value: 'Montserrat', label: 'Montserrat (Geometric Sans-serif)' },
    { value: 'Playfair Display', label: 'Playfair Display (Elegant Serif)' },
    { value: 'Merriweather', label: 'Merriweather (Readable Serif)' },
    { value: 'Crimson Text', label: 'Crimson Text (Classic Serif)' },
    { value: 'Poppins', label: 'Poppins (Rounded Sans-serif)' },
    { value: 'Nunito', label: 'Nunito (Soft Sans-serif)' }
  ]

  const fontScales = [
    { value: 'small', label: 'Small (0.875x)', multiplier: 0.875 },
    { value: 'medium', label: 'Medium (1x)', multiplier: 1 },
    { value: 'large', label: 'Large (1.125x)', multiplier: 1.125 },
    { value: 'extra-large', label: 'Extra Large (1.25x)', multiplier: 1.25 }
  ]

  const lineHeights = [
    { value: 'tight', label: 'Tight (1.25)', numeric: 1.25 },
    { value: 'normal', label: 'Normal (1.5)', numeric: 1.5 },
    { value: 'relaxed', label: 'Relaxed (1.625)', numeric: 1.625 },
    { value: 'loose', label: 'Loose (2)', numeric: 2 }
  ]

  const letterSpacings = [
    { value: 'tight', label: 'Tight (-0.025em)', numeric: -0.025 },
    { value: 'normal', label: 'Normal (0em)', numeric: 0 },
    { value: 'wide', label: 'Wide (0.025em)', numeric: 0.025 },
    { value: 'wider', label: 'Wider (0.05em)', numeric: 0.05 }
  ]

  const handleTypographyChange = (property: keyof TypographySettings, value: string) => {
    setTypography(prev => ({
      ...prev,
      [property]: value
    }))
  }

  const getPreviewStyles = () => {
    const scale = fontScales.find(s => s.value === typography.fontScale)?.multiplier || 1
    const lineHeight = lineHeights.find(lh => lh.value === typography.lineHeight)?.numeric || 1.5
    const letterSpacing = letterSpacings.find(ls => ls.value === typography.letterSpacing)?.numeric || 0

    return {
      headingFont: typography.headingFont,
      bodyFont: typography.bodyFont,
      scale,
      lineHeight,
      letterSpacing: `${letterSpacing}em`
    }
  }

  const previewStyles = getPreviewStyles()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Typography</h3>
        <p className="text-muted-foreground">
          Choose fonts and text styles that reflect your brand personality
        </p>
      </div>

      {/* Font Selection */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Font Selection</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Heading Font</label>
            <select
              value={typography.headingFont}
              onChange={(e) => handleTypographyChange('headingFont', e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {fontOptions.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Body Font</label>
            <select
              value={typography.bodyFont}
              onChange={(e) => handleTypographyChange('bodyFont', e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {fontOptions.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Typography Scale */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Typography Scale</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Size</label>
            <select
              value={typography.fontScale}
              onChange={(e) => handleTypographyChange('fontScale', e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {fontScales.map(scale => (
                <option key={scale.value} value={scale.value}>
                  {scale.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Line Height</label>
            <select
              value={typography.lineHeight}
              onChange={(e) => handleTypographyChange('lineHeight', e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {lineHeights.map(lh => (
                <option key={lh.value} value={lh.value}>
                  {lh.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Letter Spacing</label>
            <select
              value={typography.letterSpacing}
              onChange={(e) => handleTypographyChange('letterSpacing', e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {letterSpacings.map(ls => (
                <option key={ls.value} value={ls.value}>
                  {ls.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Typography Preview */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Preview</h4>
        <div className="space-y-6 p-6 border rounded-lg bg-background">
          <div>
            <h1 
              style={{ 
                fontFamily: previewStyles.headingFont,
                fontSize: `${2.5 * previewStyles.scale}rem`,
                lineHeight: previewStyles.lineHeight,
                letterSpacing: previewStyles.letterSpacing,
                fontWeight: 'bold'
              }}
            >
              Your Business Name
            </h1>
            <h2 
              style={{ 
                fontFamily: previewStyles.headingFont,
                fontSize: `${1.875 * previewStyles.scale}rem`,
                lineHeight: previewStyles.lineHeight,
                letterSpacing: previewStyles.letterSpacing,
                fontWeight: '600',
                marginTop: '1rem'
              }}
            >
              Professional Services
            </h2>
            <h3 
              style={{ 
                fontFamily: previewStyles.headingFont,
                fontSize: `${1.5 * previewStyles.scale}rem`,
                lineHeight: previewStyles.lineHeight,
                letterSpacing: previewStyles.letterSpacing,
                fontWeight: '600',
                marginTop: '1rem'
              }}
            >
              About Our Services
            </h3>
          </div>

          <div>
            <p 
              style={{ 
                fontFamily: previewStyles.bodyFont,
                fontSize: `${1 * previewStyles.scale}rem`,
                lineHeight: previewStyles.lineHeight,
                letterSpacing: previewStyles.letterSpacing,
                marginBottom: '1rem'
              }}
            >
              Welcome to our professional service business. We provide high-quality solutions 
              tailored to meet your specific needs. Our experienced team is dedicated to 
              delivering exceptional results that exceed your expectations.
            </p>
            <p 
              style={{ 
                fontFamily: previewStyles.bodyFont,
                fontSize: `${0.875 * previewStyles.scale}rem`,
                lineHeight: previewStyles.lineHeight,
                letterSpacing: previewStyles.letterSpacing,
                color: '#6b7280'
              }}
            >
              This is smaller text that might be used for captions, metadata, or additional 
              information throughout your website.
            </p>
          </div>

          <div className="flex space-x-4">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
              style={{ 
                fontFamily: previewStyles.bodyFont,
                fontSize: `${0.875 * previewStyles.scale}rem`,
                fontWeight: '500'
              }}
            >
              Book Now
            </button>
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md"
              style={{ 
                fontFamily: previewStyles.bodyFont,
                fontSize: `${0.875 * previewStyles.scale}rem`,
                fontWeight: '500'
              }}
            >
              Learn More
            </button>
          </div>
        </div>
      </Card>

      {/* Font Pairing Suggestions */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Popular Font Pairings</h4>
        <div className="space-y-3">
          <button
            onClick={() => {
              setTypography(prev => ({ ...prev, headingFont: 'Playfair Display', bodyFont: 'Open Sans' }))
            }}
            className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium">Playfair Display + Open Sans</div>
            <div className="text-sm text-muted-foreground">Elegant serif headings with clean sans-serif body</div>
          </button>
          
          <button
            onClick={() => {
              setTypography(prev => ({ ...prev, headingFont: 'Montserrat', bodyFont: 'Merriweather' }))
            }}
            className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium">Montserrat + Merriweather</div>
            <div className="text-sm text-muted-foreground">Modern sans-serif headings with readable serif body</div>
          </button>
          
          <button
            onClick={() => {
              setTypography(prev => ({ ...prev, headingFont: 'Poppins', bodyFont: 'Nunito' }))
            }}
            className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium">Poppins + Nunito</div>
            <div className="text-sm text-muted-foreground">Friendly and approachable sans-serif combination</div>
          </button>
        </div>
      </Card>
    </div>
  )
}