"use client"

import { useState } from 'react'
import { Card, Button, Badge } from '@bizbox/shared-ui'

interface ThemeTemplate {
  id: string
  name: string
  description: string
  industry: string
  preview: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  features: string[]
  isActive: boolean
  isPremium: boolean
}

export function ThemeTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('professional')

  const templates: ThemeTemplate[] = [
    {
      id: 'professional',
      name: 'Professional',
      description: 'Clean and modern design perfect for service-based businesses',
      industry: 'General',
      preview: '🎨',
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#10b981'
      },
      features: ['Responsive Design', 'Dark Mode', 'Accessibility Ready'],
      isActive: true,
      isPremium: false
    },
    {
      id: 'salon-elegant',
      name: 'Salon Elegance',
      description: 'Sophisticated design tailored for beauty salons and spas',
      industry: 'Beauty & Wellness',
      preview: '💅',
      colors: {
        primary: '#ec4899',
        secondary: '#9333ea',
        accent: '#f59e0b'
      },
      features: ['Gallery Showcase', 'Booking Integration', 'Social Media Ready'],
      isActive: false,
      isPremium: false
    },
    {
      id: 'automotive-pro',
      name: 'Automotive Pro',
      description: 'Bold and trustworthy design for car services and garages',
      industry: 'Automotive',
      preview: '🚗',
      colors: {
        primary: '#ef4444',
        secondary: '#374151',
        accent: '#f97316'
      },
      features: ['Service Showcase', 'Before/After Gallery', 'Trust Badges'],
      isActive: false,
      isPremium: true
    },
    {
      id: 'barber-classic',
      name: 'Barber Classic',
      description: 'Vintage-inspired design perfect for barbershops',
      industry: 'Barbershop',
      preview: '✂️',
      colors: {
        primary: '#8b5a00',
        secondary: '#1f2937',
        accent: '#dc2626'
      },
      features: ['Vintage Styling', 'Staff Profiles', 'Appointment Calendar'],
      isActive: false,
      isPremium: false
    },
    {
      id: 'medical-clean',
      name: 'Medical Clean',
      description: 'Clean and trustworthy design for healthcare providers',
      industry: 'Healthcare',
      preview: '🏥',
      colors: {
        primary: '#0ea5e9',
        secondary: '#475569',
        accent: '#059669'
      },
      features: ['HIPAA Compliant', 'Clean Layout', 'Professional Color Scheme'],
      isActive: false,
      isPremium: true
    },
    {
      id: 'creative-studio',
      name: 'Creative Studio',
      description: 'Bold and creative design for artists and designers',
      industry: 'Creative',
      preview: '🎨',
      colors: {
        primary: '#7c3aed',
        secondary: '#f59e0b',
        accent: '#06b6d4'
      },
      features: ['Portfolio Showcase', 'Creative Layouts', 'Animation Ready'],
      isActive: false,
      isPremium: true
    }
  ]

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    // In real app, this would update the theme globally
    console.log('Selected template:', templateId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Industry Templates</h3>
        <p className="text-muted-foreground">
          Choose a template designed specifically for your industry or customize your own
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`p-6 cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{template.preview}</div>
                <div>
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.industry}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {template.isPremium && (
                  <Badge variant="secondary">Premium</Badge>
                )}
                {template.isActive && (
                  <Badge>Current</Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {template.description}
            </p>

            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xs text-muted-foreground">Colors:</span>
              <div className="flex space-x-1">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: template.colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: template.colors.secondary }}
                />
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: template.colors.accent }}
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Features:</p>
              <div className="flex flex-wrap gap-1">
                {template.features.map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={selectedTemplate === template.id ? 'default' : 'outline'}
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  handleTemplateSelect(template.id)
                }}
              >
                {selectedTemplate === template.id ? 'Selected' : 'Select'}
              </Button>
              <Button size="sm" variant="ghost">
                Preview
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <h4 className="font-semibold mb-1">Need a Custom Design?</h4>
          <p className="text-sm text-muted-foreground">
            Our design team can create a unique template for your business
          </p>
        </div>
        <Button variant="outline">
          Get Custom Design
        </Button>
      </div>
    </div>
  )
}