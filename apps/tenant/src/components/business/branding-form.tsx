"use client"

import { useState, useEffect, useRef } from 'react'
import { 
  Card, 
  Button, 
  Input,
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormDescription,
  Select
} from '@bizbox/shared-ui'

interface Branding {
  logo?: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  theme: 'light' | 'dark'
}

interface BrandingFormProps {
  initialData?: Partial<Branding>
  onSave: (data: Branding) => Promise<void>
  onLogoUpload: (file: File) => Promise<string>
  isLoading?: boolean
}

const fontFamilies = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
]

export function BrandingForm({ initialData, onSave, onLogoUpload, isLoading }: BrandingFormProps) {
  const [formData, setFormData] = useState<Branding>({
    logo: '',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    fontFamily: 'Inter',
    theme: 'light',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }))
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Color validation
    const colorRegex = /^#[0-9A-F]{6}$/i
    if (!colorRegex.test(formData.primaryColor)) {
      newErrors.primaryColor = 'Invalid hex color format'
    }

    if (!colorRegex.test(formData.secondaryColor)) {
      newErrors.secondaryColor = 'Invalid hex color format'
    }

    // Check color contrast
    if (formData.primaryColor.toLowerCase() === formData.secondaryColor.toLowerCase()) {
      newErrors.secondaryColor = 'Secondary color should be different from primary color'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error saving branding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'Please select an image file' }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'Image must be smaller than 5MB' }))
      return
    }

    setIsUploadingLogo(true)
    try {
      const logoUrl = await onLogoUpload(file)
      setFormData(prev => ({ ...prev, logo: logoUrl }))
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.logo
        return newErrors
      })
    } catch (error) {
      console.error('Error uploading logo:', error)
      setErrors(prev => ({ ...prev, logo: 'Failed to upload logo' }))
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateFormData = (field: keyof Branding, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Branding & Visual Identity</h2>
        <p className="text-muted-foreground mt-1">
          Customize your brand colors, logo, and visual appearance
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Logo Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Logo</h3>
          
          <FormField>
            <FormLabel>Business Logo</FormLabel>
            <div className="space-y-4">
              {formData.logo && (
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img 
                      src={formData.logo} 
                      alt="Business Logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={removeLogo}
                    disabled={isUploadingLogo}
                  >
                    Remove Logo
                  </Button>
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? 'Uploading...' : formData.logo ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </div>
            </div>
            {errors.logo && <FormMessage>{errors.logo}</FormMessage>}
            <FormDescription>
              Upload your business logo. Recommended size: 200x200px. Max file size: 5MB.
            </FormDescription>
          </FormField>
        </div>

        {/* Color Scheme */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Color Scheme</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="primaryColor">Primary Color</FormLabel>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={(e) => updateFormData('primaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-input cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => updateFormData('primaryColor', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              {errors.primaryColor && <FormMessage>{errors.primaryColor}</FormMessage>}
              <FormDescription>
                Main brand color used for buttons, links, and accents
              </FormDescription>
            </FormField>

            <FormField>
              <FormLabel htmlFor="secondaryColor">Secondary Color</FormLabel>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-input cursor-pointer"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
              {errors.secondaryColor && <FormMessage>{errors.secondaryColor}</FormMessage>}
              <FormDescription>
                Supporting color for backgrounds and secondary elements
              </FormDescription>
            </FormField>
          </div>

          {/* Color Preview */}
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium mb-3">Color Preview</h4>
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 rounded-lg border"
                style={{ backgroundColor: formData.primaryColor }}
                title="Primary Color"
              />
              <div 
                className="w-16 h-16 rounded-lg border"
                style={{ backgroundColor: formData.secondaryColor }}
                title="Secondary Color"
              />
              <div className="flex-1">
                <div 
                  className="px-4 py-2 rounded text-sm font-medium"
                  style={{ 
                    backgroundColor: formData.primaryColor, 
                    color: formData.secondaryColor 
                  }}
                >
                  Sample Button
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Typography</h3>
          
          <FormField>
            <FormLabel htmlFor="fontFamily">Font Family</FormLabel>
            <Select
              id="fontFamily"
              value={formData.fontFamily}
              onChange={(e) => updateFormData('fontFamily', e.target.value)}
            >
              {fontFamilies.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </Select>
            <FormDescription>
              Choose the primary font for your website and materials
            </FormDescription>
          </FormField>

          {/* Font Preview */}
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium mb-3">Font Preview</h4>
            <div style={{ fontFamily: formData.fontFamily }}>
              <h3 className="text-xl font-bold mb-2">Sample Heading</h3>
              <p className="text-base mb-2">
                This is how your regular text will appear using the selected font family.
              </p>
              <p className="text-sm text-muted-foreground">
                Small text and descriptions will look like this.
              </p>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Theme</h3>
          
          <FormField>
            <FormLabel htmlFor="theme">Default Theme</FormLabel>
            <Select
              id="theme"
              value={formData.theme}
              onChange={(e) => updateFormData('theme', e.target.value as 'light' | 'dark')}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
            <FormDescription>
              Default theme for your website (visitors can still switch themes)
            </FormDescription>
          </FormField>
        </div>

        <div className="flex justify-end pt-6">
          <Button 
            type="submit" 
            disabled={isSubmitting || isLoading || isUploadingLogo}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Form>
    </Card>
  )
}