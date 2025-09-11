"use client"

import { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Input, 
  Textarea, 
  Select,
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormDescription
} from '@bizbox/shared-ui'

interface Service {
  id?: string
  name: string
  description: string
  duration: number
  price: number
  currency: string
  bufferBefore: number
  bufferAfter: number
  requiredSkills: string[]
  category: string
  isActive: boolean
  maxAdvanceBooking?: number
  minAdvanceBooking?: number
  cancellationPolicy: {
    allowCancellation: boolean
    cancellationDeadline: number
    cancellationFee?: number
  }
}

interface ServiceFormProps {
  initialData?: Partial<Service>
  onSave: (data: Service) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  availableSkills?: string[]
}

const serviceCategories = [
  'Hair & Beauty',
  'Car Valeting',
  'Body Shop',
  'Barbering',
  'Spa & Wellness',
  'Nail Services',
  'Massage Therapy',
  'Other'
]

export function ServiceForm({ 
  initialData, 
  onSave, 
  onCancel, 
  isLoading, 
  availableSkills = [] 
}: ServiceFormProps) {
  const [formData, setFormData] = useState<Service>({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    currency: 'GBP',
    bufferBefore: 0,
    bufferAfter: 0,
    requiredSkills: [],
    category: '',
    isActive: true,
    maxAdvanceBooking: 30,
    minAdvanceBooking: 2,
    cancellationPolicy: {
      allowCancellation: true,
      cancellationDeadline: 24,
      cancellationFee: 0,
    },
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        cancellationPolicy: {
          ...prev.cancellationPolicy,
          ...initialData.cancellationPolicy,
        },
      }))
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (formData.duration < 1) {
      newErrors.duration = 'Duration must be at least 1 minute'
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative'
    }

    if (formData.bufferBefore < 0) {
      newErrors.bufferBefore = 'Buffer time cannot be negative'
    }

    if (formData.bufferAfter < 0) {
      newErrors.bufferAfter = 'Buffer time cannot be negative'
    }

    if (formData.minAdvanceBooking && formData.minAdvanceBooking < 0) {
      newErrors.minAdvanceBooking = 'Minimum advance booking cannot be negative'
    }

    if (formData.maxAdvanceBooking && formData.maxAdvanceBooking < 1) {
      newErrors.maxAdvanceBooking = 'Maximum advance booking must be at least 1 day'
    }

    if (formData.cancellationPolicy.cancellationDeadline < 0) {
      newErrors.cancellationDeadline = 'Cancellation deadline cannot be negative'
    }

    if (formData.cancellationPolicy.cancellationFee && formData.cancellationPolicy.cancellationFee < 0) {
      newErrors.cancellationFee = 'Cancellation fee cannot be negative'
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
      console.error('Error saving service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current = newData as any
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })

    // Clear error for this field
    if (errors[path]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[path]
        return newErrors
      })
    }
  }

  const formatPrice = (pence: number): string => {
    return (pence / 100).toFixed(2)
  }

  const parsePrice = (pounds: string): number => {
    return Math.round(parseFloat(pounds || '0') * 100)
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) {
      return `${mins} minutes`
    } else if (mins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">
          {initialData?.id ? 'Edit Service' : 'Add New Service'}
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure service details, pricing, and booking policies
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          <FormField>
            <FormLabel htmlFor="name">Service Name *</FormLabel>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="e.g., Full Car Wash & Wax"
            />
            {errors.name && <FormMessage>{errors.name}</FormMessage>}
          </FormField>

          <FormField>
            <FormLabel htmlFor="description">Description</FormLabel>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Describe what's included in this service"
              rows={3}
            />
            <FormDescription>
              Detailed description of the service for customers
            </FormDescription>
          </FormField>

          <FormField>
            <FormLabel htmlFor="category">Category *</FormLabel>
            <Select
              id="category"
              value={formData.category}
              onChange={(e) => updateFormData('category', e.target.value)}
            >
              <option value="">Select a category</option>
              {serviceCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            {errors.category && <FormMessage>{errors.category}</FormMessage>}
          </FormField>
        </div>

        {/* Timing & Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Timing & Pricing</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="duration">Duration (minutes) *</FormLabel>
              <Input
                id="duration"
                type="number"
                min="1"
                max="1440"
                value={formData.duration}
                onChange={(e) => updateFormData('duration', parseInt(e.target.value) || 0)}
              />
              {errors.duration && <FormMessage>{errors.duration}</FormMessage>}
              <FormDescription>
                Current: {formatDuration(formData.duration)}
              </FormDescription>
            </FormField>

            <FormField>
              <FormLabel htmlFor="price">Price (£) *</FormLabel>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formatPrice(formData.price)}
                onChange={(e) => updateFormData('price', parsePrice(e.target.value))}
              />
              {errors.price && <FormMessage>{errors.price}</FormMessage>}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="bufferBefore">Buffer Before (minutes)</FormLabel>
              <Input
                id="bufferBefore"
                type="number"
                min="0"
                max="120"
                value={formData.bufferBefore}
                onChange={(e) => updateFormData('bufferBefore', parseInt(e.target.value) || 0)}
              />
              {errors.bufferBefore && <FormMessage>{errors.bufferBefore}</FormMessage>}
              <FormDescription>
                Time to prepare before the service
              </FormDescription>
            </FormField>

            <FormField>
              <FormLabel htmlFor="bufferAfter">Buffer After (minutes)</FormLabel>
              <Input
                id="bufferAfter"
                type="number"
                min="0"
                max="120"
                value={formData.bufferAfter}
                onChange={(e) => updateFormData('bufferAfter', parseInt(e.target.value) || 0)}
              />
              {errors.bufferAfter && <FormMessage>{errors.bufferAfter}</FormMessage>}
              <FormDescription>
                Time to clean up after the service
              </FormDescription>
            </FormField>
          </div>
        </div>

        {/* Skills & Requirements */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Skills & Requirements</h3>
          
          <FormField>
            <FormLabel>Required Skills</FormLabel>
            <div className="space-y-2">
              {availableSkills.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableSkills.map(skill => (
                    <label key={skill} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.requiredSkills.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData('requiredSkills', [...formData.requiredSkills, skill])
                          } else {
                            updateFormData('requiredSkills', formData.requiredSkills.filter(s => s !== skill))
                          }
                        }}
                        className="rounded border-input"
                      />
                      <span className="text-sm">{skill}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No skills available. Add staff members with skills first.
                </p>
              )}
            </div>
            <FormDescription>
              Select skills required to perform this service
            </FormDescription>
          </FormField>
        </div>

        {/* Booking Policies */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Booking Policies</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="minAdvanceBooking">Minimum Advance Booking (hours)</FormLabel>
              <Input
                id="minAdvanceBooking"
                type="number"
                min="0"
                max="168"
                value={formData.minAdvanceBooking || ''}
                onChange={(e) => updateFormData('minAdvanceBooking', parseInt(e.target.value) || undefined)}
              />
              {errors.minAdvanceBooking && <FormMessage>{errors.minAdvanceBooking}</FormMessage>}
              <FormDescription>
                How far in advance customers must book
              </FormDescription>
            </FormField>

            <FormField>
              <FormLabel htmlFor="maxAdvanceBooking">Maximum Advance Booking (days)</FormLabel>
              <Input
                id="maxAdvanceBooking"
                type="number"
                min="1"
                max="365"
                value={formData.maxAdvanceBooking || ''}
                onChange={(e) => updateFormData('maxAdvanceBooking', parseInt(e.target.value) || undefined)}
              />
              {errors.maxAdvanceBooking && <FormMessage>{errors.maxAdvanceBooking}</FormMessage>}
              <FormDescription>
                How far in advance customers can book
              </FormDescription>
            </FormField>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Cancellation Policy</h4>
            
            <FormField>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.cancellationPolicy.allowCancellation}
                  onChange={(e) => updateFormData('cancellationPolicy.allowCancellation', e.target.checked)}
                  className="rounded border-input"
                />
                <span>Allow cancellations</span>
              </label>
            </FormField>

            {formData.cancellationPolicy.allowCancellation && (
              <>
                <FormField>
                  <FormLabel htmlFor="cancellationDeadline">Cancellation Deadline (hours before)</FormLabel>
                  <Input
                    id="cancellationDeadline"
                    type="number"
                    min="0"
                    max="168"
                    value={formData.cancellationPolicy.cancellationDeadline}
                    onChange={(e) => updateFormData('cancellationPolicy.cancellationDeadline', parseInt(e.target.value) || 0)}
                  />
                  {errors.cancellationDeadline && <FormMessage>{errors.cancellationDeadline}</FormMessage>}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="cancellationFee">Cancellation Fee (%)</FormLabel>
                  <Input
                    id="cancellationFee"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.cancellationPolicy.cancellationFee || ''}
                    onChange={(e) => updateFormData('cancellationPolicy.cancellationFee', parseInt(e.target.value) || undefined)}
                  />
                  {errors.cancellationFee && <FormMessage>{errors.cancellationFee}</FormMessage>}
                  <FormDescription>
                    Percentage of service price charged for late cancellations
                  </FormDescription>
                </FormField>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Status</h3>
          
          <FormField>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => updateFormData('isActive', e.target.checked)}
                className="rounded border-input"
              />
              <span>Service is active and available for booking</span>
            </label>
            <FormDescription>
              Inactive services won't be shown to customers
            </FormDescription>
          </FormField>
        </div>

        <div className="flex justify-end space-x-4 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isLoading}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Service' : 'Create Service'}
          </Button>
        </div>
      </Form>
    </Card>
  )
}