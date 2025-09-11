"use client"

import { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Input,
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormDescription
} from '@bizbox/shared-ui'

interface SocialMedia {
  facebook?: string
  instagram?: string
  twitter?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
}

interface SocialMediaFormProps {
  initialData?: Partial<SocialMedia>
  onSave: (data: SocialMedia) => Promise<void>
  isLoading?: boolean
}

const socialPlatforms = [
  {
    key: 'facebook' as keyof SocialMedia,
    label: 'Facebook',
    placeholder: 'https://www.facebook.com/yourbusiness',
    icon: '📘',
    description: 'Your Facebook business page URL'
  },
  {
    key: 'instagram' as keyof SocialMedia,
    label: 'Instagram',
    placeholder: 'https://www.instagram.com/yourbusiness',
    icon: '📷',
    description: 'Your Instagram business profile URL'
  },
  {
    key: 'twitter' as keyof SocialMedia,
    label: 'Twitter/X',
    placeholder: 'https://twitter.com/yourbusiness',
    icon: '🐦',
    description: 'Your Twitter/X business profile URL'
  },
  {
    key: 'linkedin' as keyof SocialMedia,
    label: 'LinkedIn',
    placeholder: 'https://www.linkedin.com/company/yourbusiness',
    icon: '💼',
    description: 'Your LinkedIn company page URL'
  },
  {
    key: 'youtube' as keyof SocialMedia,
    label: 'YouTube',
    placeholder: 'https://www.youtube.com/c/yourbusiness',
    icon: '📺',
    description: 'Your YouTube channel URL'
  },
  {
    key: 'tiktok' as keyof SocialMedia,
    label: 'TikTok',
    placeholder: 'https://www.tiktok.com/@yourbusiness',
    icon: '🎵',
    description: 'Your TikTok business profile URL'
  },
]

export function SocialMediaForm({ initialData, onSave, isLoading }: SocialMediaFormProps) {
  const [formData, setFormData] = useState<SocialMedia>({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }))
    }
  }, [initialData])

  const validateUrl = (url: string, platform: string): string | null => {
    if (!url.trim()) return null // Empty URLs are allowed

    try {
      const urlObj = new URL(url)
      
      // Check if it's a valid URL
      if (!urlObj.protocol.startsWith('http')) {
        return 'URL must start with http:// or https://'
      }

      // Platform-specific validation
      const platformDomains: Record<string, string[]> = {
        facebook: ['facebook.com', 'www.facebook.com', 'fb.com'],
        instagram: ['instagram.com', 'www.instagram.com'],
        twitter: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'],
        linkedin: ['linkedin.com', 'www.linkedin.com'],
        youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'],
        tiktok: ['tiktok.com', 'www.tiktok.com'],
      }

      const allowedDomains = platformDomains[platform]
      if (allowedDomains && !allowedDomains.includes(urlObj.hostname)) {
        return `Please enter a valid ${platform} URL`
      }

      return null
    } catch {
      return 'Please enter a valid URL'
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate each social media URL
    socialPlatforms.forEach(platform => {
      const url = formData[platform.key] || ''
      const error = validateUrl(url, platform.key)
      if (error) {
        newErrors[platform.key] = error
      }
    })

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
      // Filter out empty URLs before saving
      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value && value.trim()) {
          acc[key as keyof SocialMedia] = value.trim()
        }
        return acc
      }, {} as SocialMedia)

      await onSave(cleanedData)
    } catch (error) {
      console.error('Error saving social media:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof SocialMedia, value: string) => {
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

  const getConnectedCount = (): number => {
    return Object.values(formData).filter(url => url && url.trim()).length
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Social Media Links</h2>
        <p className="text-muted-foreground mt-1">
          Connect your social media profiles to display on your website
        </p>
        <div className="mt-2">
          <span className="text-sm font-medium">
            Connected platforms: {getConnectedCount()}/{socialPlatforms.length}
          </span>
        </div>
      </div>

      <Form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {socialPlatforms.map(platform => (
            <FormField key={platform.key}>
              <FormLabel htmlFor={platform.key} className="flex items-center space-x-2">
                <span className="text-lg">{platform.icon}</span>
                <span>{platform.label}</span>
              </FormLabel>
              <Input
                id={platform.key}
                type="url"
                value={formData[platform.key] || ''}
                onChange={(e) => updateFormData(platform.key, e.target.value)}
                placeholder={platform.placeholder}
              />
              {errors[platform.key] && <FormMessage>{errors[platform.key]}</FormMessage>}
              <FormDescription>
                {platform.description}
              </FormDescription>
            </FormField>
          ))}
        </div>

        {/* Preview Section */}
        {getConnectedCount() > 0 && (
          <div className="mt-8 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            <p className="text-sm text-muted-foreground mb-3">
              These social media links will appear on your website:
            </p>
            <div className="flex flex-wrap gap-2">
              {socialPlatforms.map(platform => {
                const url = formData[platform.key]
                if (!url || !url.trim()) return null

                return (
                  <a
                    key={platform.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-background border rounded-full text-sm hover:bg-accent transition-colors"
                  >
                    <span>{platform.icon}</span>
                    <span>{platform.label}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-6">
          <Button 
            type="submit" 
            disabled={isSubmitting || isLoading}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Form>
    </Card>
  )
}