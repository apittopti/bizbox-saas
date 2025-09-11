import * as React from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { useTheme, Theme, ThemeBuilder, themeVariants, validateTheme } from "./theme-engine"
import { cn } from "../lib/utils"

interface ThemeCustomizerProps {
  className?: string
  trigger?: React.ReactNode
}

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, className }) => {
  const [inputValue, setInputValue] = React.useState(value)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center space-x-2">
        <div 
          className="w-8 h-8 rounded border border-border"
          style={{ backgroundColor: value }}
        />
        <Input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="hsl(0 0% 100%)"
          className="flex-1"
        />
      </div>
    </div>
  )
}

interface ThemePreviewProps {
  theme: Theme
  className?: string
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your theme looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button variant="default">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </div>
          
          <div className="space-y-2">
            <Input placeholder="Input field" />
            <div className="text-sm text-muted-foreground">
              This is muted text
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Card Example</CardTitle>
              <CardDescription>This is a card description</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Card content goes here</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ 
  className, 
  trigger = <Button variant="outline">Customize Theme</Button> 
}) => {
  const { theme, setTheme, previewTheme, stopPreview, isPreviewMode } = useTheme()
  const [customTheme, setCustomTheme] = React.useState<Theme>(theme)
  const [activeTab, setActiveTab] = React.useState<'presets' | 'colors' | 'typography'>('presets')
  const [errors, setErrors] = React.useState<string[]>([])

  React.useEffect(() => {
    setCustomTheme(theme)
  }, [theme])

  React.useEffect(() => {
    const validationErrors = validateTheme(customTheme)
    setErrors(validationErrors)
  }, [customTheme])

  const handleColorChange = (colorKey: keyof Theme['colors'], value: string) => {
    setCustomTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }))
  }

  const handleTypographyChange = (key: string, value: string) => {
    setCustomTheme(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [key]: value
      }
    }))
  }

  const handlePresetSelect = (presetTheme: Theme) => {
    setCustomTheme(presetTheme)
  }

  const handlePreview = () => {
    if (errors.length === 0) {
      previewTheme(customTheme)
    }
  }

  const handleApply = () => {
    if (errors.length === 0) {
      setTheme(customTheme)
      stopPreview()
    }
  }

  const handleReset = () => {
    setCustomTheme(theme)
    stopPreview()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Theme Customizer</DialogTitle>
          <DialogDescription>
            Customize your theme colors, typography, and more
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customization Panel */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              {[
                { id: 'presets', label: 'Presets' },
                { id: 'colors', label: 'Colors' },
                { id: 'typography', label: 'Typography' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Theme Presets</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(themeVariants).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(preset)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-colors",
                        customTheme.id === preset.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="font-medium capitalize">{key}</div>
                      <div className="flex space-x-1 mt-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: preset.colors.secondary }}
                        />
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'colors' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Colors</h3>
                <div className="space-y-4">
                  <ColorPicker
                    label="Primary"
                    value={customTheme.colors.primary}
                    onChange={(value) => handleColorChange('primary', value)}
                  />
                  <ColorPicker
                    label="Secondary"
                    value={customTheme.colors.secondary}
                    onChange={(value) => handleColorChange('secondary', value)}
                  />
                  <ColorPicker
                    label="Accent"
                    value={customTheme.colors.accent}
                    onChange={(value) => handleColorChange('accent', value)}
                  />
                  <ColorPicker
                    label="Background"
                    value={customTheme.colors.background}
                    onChange={(value) => handleColorChange('background', value)}
                  />
                  <ColorPicker
                    label="Foreground"
                    value={customTheme.colors.foreground}
                    onChange={(value) => handleColorChange('foreground', value)}
                  />
                  <ColorPicker
                    label="Border"
                    value={customTheme.colors.border}
                    onChange={(value) => handleColorChange('border', value)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'typography' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Typography</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Font Family</label>
                    <Input
                      value={customTheme.typography.fontFamily}
                      onChange={(e) => handleTypographyChange('fontFamily', e.target.value)}
                      placeholder="Inter, system-ui, sans-serif"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {errors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Validation Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {errors.map((error, index) => (
                      <li key={index} className="text-destructive">{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <Button 
                onClick={handlePreview}
                disabled={errors.length > 0}
                variant={isPreviewMode ? "secondary" : "outline"}
              >
                {isPreviewMode ? "Previewing" : "Preview"}
              </Button>
              <Button 
                onClick={handleApply}
                disabled={errors.length > 0}
              >
                Apply Theme
              </Button>
              <Button 
                onClick={handleReset}
                variant="outline"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div>
            <ThemePreview theme={customTheme} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ThemeCustomizer